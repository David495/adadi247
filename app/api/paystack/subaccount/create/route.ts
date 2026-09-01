import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      businessId,
      businessName,
      accountNumber,
      bankCode,
      accountName,
    } = body as {
      businessId?: string;
      businessName?: string;
      accountNumber?: string;
      bankCode?: string;
      accountName?: string;
    };

    if (!businessId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Business ID is required.",
        },
        { status: 400 }
      );
    }

    if (!businessName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Business name is required.",
        },
        { status: 400 }
      );
    }

    if (!accountNumber?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Bank account number is required.",
        },
        { status: 400 }
      );
    }

    if (!bankCode?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Bank code is required.",
        },
        { status: 400 }
      );
    }

    if (!accountName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Bank account must be verified first.",
        },
        { status: 400 }
      );
    }

    const cleanBusinessId = businessId.trim();
    const cleanBusinessName = businessName.trim();
    const cleanAccountNumber = accountNumber.trim();
    const cleanBankCode = bankCode.trim();
    const cleanAccountName = accountName.trim();

    if (!/^\d{10}$/.test(cleanAccountNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bank account number must be exactly 10 digits.",
        },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY IS NOT CONFIGURED");

      return NextResponse.json(
        {
          success: false,
          error: "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "BUSINESS OWNER AUTHENTICATION ERROR:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in to connect a bank account.",
        },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    const {
      data: platformSettings,
      error: platformSettingsError,
    } = await adminSupabase
      .from("platform_settings")
      .select("commission_rate")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (platformSettingsError || !platformSettings) {
      console.error(
        "PLATFORM SETTINGS ERROR:",
        platformSettingsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load platform commission settings.",
        },
        { status: 500 }
      );
    }

    const commissionRate = Number(
      platformSettings.commission_rate
    );

    if (
      !Number.isFinite(commissionRate) ||
      commissionRate < 0 ||
      commissionRate > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid platform commission configuration.",
        },
        { status: 500 }
      );
    }

    const {
      data: business,
      error: businessError,
    } = await adminSupabase
      .from("businesses")
      .select(
        `
          id,
          owner_id,
          name,
          status,
          paystack_subaccount_code,
          paystack_subaccount_id,
          paystack_subaccount_active,
          paystack_subaccount_verified
        `
      )
      .eq("id", cleanBusinessId)
      .single();

    if (businessError || !business) {
      console.error(
        "BUSINESS NOT FOUND:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Business account could not be found.",
        },
        { status: 404 }
      );
    }

    if (business.owner_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to connect a bank account to this business.",
        },
        { status: 403 }
      );
    }

    if (business.paystack_subaccount_code) {
      return NextResponse.json({
        success: true,
        message: "Paystack subaccount already exists.",
        businessId: business.id,
        subaccountCode:
          business.paystack_subaccount_code,
        subaccountId:
          business.paystack_subaccount_id,
        active:
          business.paystack_subaccount_active,
        verified:
          business.paystack_subaccount_verified ?? false,
        commissionRate,
      });
    }

    const paystackResponse = await fetch(
      "https://api.paystack.co/subaccount",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_name: cleanBusinessName,
          bank_code: cleanBankCode,
          account_number: cleanAccountNumber,
          percentage_charge: commissionRate,
          description:
            `ADADI business payment account for ${cleanBusinessName}`,
          primary_contact_email:
            user.email || undefined,
          primary_contact_name: cleanAccountName,
          settlement_schedule: "auto",
        }),
      }
    );

    let paystackData: any;

    try {
      paystackData = await paystackResponse.json();
    } catch (parseError) {
      console.error(
        "PAYSTACK RESPONSE PARSE ERROR:",
        parseError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to read the response from Paystack.",
        },
        { status: 502 }
      );
    }

    console.log(
      "PAYSTACK SUBACCOUNT RESPONSE:",
      paystackData
    );

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data
    ) {
      console.error(
        "PAYSTACK SUBACCOUNT CREATION FAILED:",
        {
          httpStatus: paystackResponse.status,
          response: paystackData,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Unable to create Paystack subaccount.",
        },
        {
          status:
            paystackResponse.status >= 400 &&
            paystackResponse.status < 500
              ? 400
              : 502,
        }
      );
    }

    const subaccount = paystackData.data;

    const subaccountCode =
      subaccount.subaccount_code;

    const subaccountId = subaccount.id;

    if (!subaccountCode) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack did not return a valid subaccount code.",
        },
        { status: 502 }
      );
    }

    const paystackVerified = Boolean(
      subaccount.is_verified
    );

    const {
      data: updatedBusiness,
      error: updateBusinessError,
    } = await adminSupabase
      .from("businesses")
      .update({
        paystack_subaccount_code:
          subaccountCode,
        paystack_subaccount_id:
          subaccountId,
        paystack_subaccount_active:
          Boolean(subaccount.active),
        paystack_subaccount_verified:
          paystackVerified,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", business.id)
      .eq("owner_id", user.id)
      .select(
        `
          id,
          name,
          paystack_subaccount_code,
          paystack_subaccount_id,
          paystack_subaccount_active,
          paystack_subaccount_verified
        `
      )
      .single();

    if (
      updateBusinessError ||
      !updatedBusiness
    ) {
      console.error(
        "FAILED TO SAVE PAYSTACK SUBACCOUNT:",
        updateBusinessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack subaccount was created, but we could not save it to your business account.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Your business payment account has been connected successfully.",
      businessId: updatedBusiness.id,
      businessName: updatedBusiness.name,
      subaccountCode:
        updatedBusiness.paystack_subaccount_code,
      subaccountId:
        updatedBusiness.paystack_subaccount_id,
      active:
        updatedBusiness.paystack_subaccount_active,
      verified:
        updatedBusiness.paystack_subaccount_verified,
      commissionRate,
    });
  } catch (error) {
    console.error(
      "PAYSTACK SUBACCOUNT CREATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while connecting your business payment account.",
      },
      { status: 500 }
    );
  }
}