import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

const ADADI_COMMISSION_RATE = 5;

export async function POST(request: Request) {
  try {
    // =========================================
    // 1. GET REQUEST DATA
    // =========================================

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

    // =========================================
    // 2. VALIDATE REQUEST
    // =========================================

    if (!businessId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business ID is required.",
        },
        { status: 400 }
      );
    }

    if (!businessName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business name is required.",
        },
        { status: 400 }
      );
    }

    if (!accountNumber?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bank account number is required.",
        },
        { status: 400 }
      );
    }

    if (!bankCode?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bank code is required.",
        },
        { status: 400 }
      );
    }

    if (!accountName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bank account name is required.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 3. PAYSTACK SECRET KEY
    // =========================================

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY IS NOT CONFIGURED"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 4. AUTHENTICATE BUSINESS OWNER
    // =========================================

    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

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

    // =========================================
    // 5. ADMIN CLIENT
    // =========================================

    const adminSupabase =
      createAdminClient();

    // =========================================
    // 6. GET BUSINESS
    // =========================================

    const {
      data: business,
      error: businessError,
    } =
      await adminSupabase
        .from("businesses")
        .select(
          `
            id,
            owner_id,
            name,
            status,
            paystack_subaccount_code,
            paystack_subaccount_id,
            paystack_subaccount_active
          `
        )
        .eq(
          "id",
          businessId.trim()
        )
        .single();

    if (
      businessError ||
      !business
    ) {
      console.error(
        "BUSINESS NOT FOUND:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Business account could not be found.",
        },
        { status: 404 }
      );
    }

    // =========================================
    // 7. VERIFY OWNERSHIP
    // =========================================

    if (
      business.owner_id !==
      user.id
    ) {
      console.error(
        "UNAUTHORIZED PAYSTACK SUBACCOUNT CREATION:",
        {
          businessId:
            business.id,

          authenticatedUserId:
            user.id,

          businessOwnerId:
            business.owner_id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to connect a bank account to this business.",
        },
        { status: 403 }
      );
    }

    // =========================================
    // 8. EXISTING SUBACCOUNT
    // =========================================

    if (
      business.paystack_subaccount_code
    ) {
      return NextResponse.json({
        success: true,

        message:
          "Paystack subaccount already exists.",

        businessId:
          business.id,

        subaccountCode:
          business.paystack_subaccount_code,

        subaccountId:
          business.paystack_subaccount_id,

        active:
          business.paystack_subaccount_active,
      });
    }

    // =========================================
    // 9. CLEAN DATA
    // =========================================

    const cleanBusinessName =
      businessName.trim();

    const cleanAccountNumber =
      accountNumber.trim();

    const cleanBankCode =
      bankCode.trim();

    const cleanAccountName =
      accountName.trim();

    // =========================================
    // 10. CREATE PAYSTACK SUBACCOUNT
    // =========================================
    //
    // IMPORTANT:
    //
    // Paystack's percentage_charge is the
    // percentage that goes to the MAIN account.
    //
    // Therefore:
    //
    // 5 = ADADI
    // 95 = BUSINESS
    //
    // We use 5 here so the subaccount's default
    // configuration agrees with ADADI's 5%
    // commission model.
    //
    // Our order initialization route still
    // explicitly sends transaction_charge for
    // every customer order.
    //
    // =========================================

    console.log(
      "CREATING PAYSTACK SUBACCOUNT:",
      {
        businessId:
          business.id,

        businessName:
          cleanBusinessName,

        accountNumber:
          cleanAccountNumber,

        bankCode:
          cleanBankCode,

        accountName:
          cleanAccountName,

        adadiCommissionPercentage:
          ADADI_COMMISSION_RATE,

        businessPercentage:
          100 -
          ADADI_COMMISSION_RATE,
      }
    );

    const paystackResponse =
      await fetch(
        "https://api.paystack.co/subaccount",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${paystackSecretKey}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            business_name:
              cleanBusinessName,

            settlement_bank:
              cleanBankCode,

            account_number:
              cleanAccountNumber,

            // =====================================
            // ADADI GETS 5%
            // BUSINESS GETS 95%
            // =====================================

            percentage_charge:
              ADADI_COMMISSION_RATE,

            description:
              `ADADI business payment account for ${cleanBusinessName}`,

            primary_contact_email:
              user.email ||
              undefined,

            primary_contact_name:
              cleanAccountName,
          }),
        }
      );

    // =========================================
    // 11. READ PAYSTACK RESPONSE
    // =========================================

    let paystackData: any;

    try {
      paystackData =
        await paystackResponse.json();
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

    // =========================================
    // 12. HANDLE PAYSTACK ERROR
    // =========================================

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data
    ) {
      console.error(
        "PAYSTACK SUBACCOUNT CREATION FAILED:",
        {
          httpStatus:
            paystackResponse.status,

          response:
            paystackData,
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

    // =========================================
    // 13. GET SUBACCOUNT DATA
    // =========================================

    const subaccount =
      paystackData.data;

    const subaccountCode =
      subaccount.subaccount_code;

    const subaccountId =
      subaccount.id;

    if (!subaccountCode) {
      console.error(
        "PAYSTACK DID NOT RETURN A SUBACCOUNT CODE:",
        subaccount
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack did not return a valid subaccount code.",
        },
        { status: 502 }
      );
    }

    // =========================================
    // 14. SAVE SUBACCOUNT TO DATABASE
    // =========================================

    const {
      data: updatedBusiness,
      error:
        updateBusinessError,
    } =
      await adminSupabase
        .from("businesses")
        .update({
          paystack_subaccount_code:
            subaccountCode,

          paystack_subaccount_id:
            subaccountId,

          paystack_subaccount_active:
            true,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          business.id
        )
        .eq(
          "owner_id",
          user.id
        )
        .select(
          `
            id,
            name,
            paystack_subaccount_code,
            paystack_subaccount_id,
            paystack_subaccount_active
          `
        )
        .single();

    // =========================================
    // 15. DATABASE ERROR
    // =========================================

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
            "Paystack subaccount was created, but we could not save it to your business account. Please contact support before trying again.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // 16. SUCCESS
    // =========================================

    console.log(
      "=========================================="
    );

    console.log(
      "PAYSTACK SUBACCOUNT CREATED SUCCESSFULLY"
    );

    console.log({
      businessId:
        updatedBusiness.id,

      businessName:
        updatedBusiness.name,

      subaccountCode:
        updatedBusiness.paystack_subaccount_code,

      subaccountId:
        updatedBusiness.paystack_subaccount_id,

      active:
        updatedBusiness.paystack_subaccount_active,

      percentageCharge:
        ADADI_COMMISSION_RATE,
    });

    console.log(
      "=========================================="
    );

    return NextResponse.json({
      success: true,

      message:
        "Your business payment account has been connected successfully.",

      businessId:
        updatedBusiness.id,

      businessName:
        updatedBusiness.name,

      subaccountCode:
        updatedBusiness.paystack_subaccount_code,

      subaccountId:
        updatedBusiness.paystack_subaccount_id,

      active:
        updatedBusiness.paystack_subaccount_active,

      commissionRate:
        ADADI_COMMISSION_RATE,
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