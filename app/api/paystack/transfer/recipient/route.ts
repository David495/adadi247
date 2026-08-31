import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(
  request: Request
) {
  try {
    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not properly configured.",
        },
        { status: 500 }
      );
    }

    const body =
      await request.json();

    const {
      businessId,
      accountNumber,
      bankCode,
      accountName,
      bankName,
    } = body as {
      businessId?: string;
      accountNumber?: string;
      bankCode?: string;
      accountName?: string;
      bankName?: string;
    };

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

    if (!/^\d{10}$/.test(
      accountNumber.trim()
    )) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bank account number must be exactly 10 digits.",
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
            "Bank account must be verified first.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const adminSupabase =
      createAdminClient();

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
            name
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
      return NextResponse.json(
        {
          success: false,
          error:
            "Business account could not be found.",
        },
        { status: 404 }
      );
    }

    if (
      business.owner_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to configure this business payout account.",
        },
        { status: 403 }
      );
    }

    const {
      data: existingAccount,
      error:
        existingAccountError,
    } =
      await adminSupabase
        .from(
          "business_payout_accounts"
        )
        .select(
          `
            id,
            business_id,
            bank_name,
            account_number,
            account_name,
            paystack_recipient_code
          `
        )
        .eq(
          "business_id",
          business.id
        )
        .maybeSingle();

    if (existingAccountError) {
      console.error(
        "PAYOUT ACCOUNT LOOKUP ERROR:",
        existingAccountError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check the business payout account.",
        },
        { status: 500 }
      );
    }

    if (
      existingAccount?.paystack_recipient_code &&
      existingAccount.account_number ===
        accountNumber.trim() &&
      existingAccount.account_name ===
        accountName.trim()
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Paystack transfer recipient already exists.",
        recipientCode:
          existingAccount.paystack_recipient_code,
        payoutAccountId:
          existingAccount.id,
      });
    }

    const paystackResponse =
      await fetch(
        "https://api.paystack.co/transferrecipient",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${paystackSecretKey}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            type:
              "nuban",

            name:
              accountName.trim(),

            account_number:
              accountNumber.trim(),

            bank_code:
              bankCode.trim(),

            currency:
              "NGN",

            description:
              `ADADI payout recipient for ${business.name}`,
          }),
          cache:
            "no-store",
        }
      );

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data
    ) {
      console.error(
        "PAYSTACK RECIPIENT CREATION ERROR:",
        paystackData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Unable to create Paystack transfer recipient.",
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

    const recipient =
      paystackData.data;

    const recipientCode =
      recipient.recipient_code;

    if (!recipientCode) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack did not return a transfer recipient code.",
        },
        { status: 502 }
      );
    }

    const payoutData = {
      business_id:
        business.id,

      bank_name:
        bankName?.trim() ||
        recipient.details?.bank_name ||
        null,

      account_number:
        accountNumber.trim(),

      account_name:
        accountName.trim(),

      paystack_recipient_code:
        recipientCode,
    };

    let savedAccount;

    if (existingAccount) {
      const {
        data,
        error,
      } =
        await adminSupabase
          .from(
            "business_payout_accounts"
          )
          .update(
            payoutData
          )
          .eq(
            "id",
            existingAccount.id
          )
          .select()
          .single();

      if (error || !data) {
        console.error(
          "PAYOUT ACCOUNT UPDATE ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Recipient was created, but the payout account could not be saved.",
          },
          { status: 500 }
        );
      }

      savedAccount =
        data;
    } else {
      const {
        data,
        error,
      } =
        await adminSupabase
          .from(
            "business_payout_accounts"
          )
          .insert(
            payoutData
          )
          .select()
          .single();

      if (error || !data) {
        console.error(
          "PAYOUT ACCOUNT INSERT ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Recipient was created, but the payout account could not be saved.",
          },
          { status: 500 }
        );
      }

      savedAccount =
        data;
    }

    return NextResponse.json({
      success: true,
      message:
        "Business payout recipient created successfully.",
      recipientCode,
      payoutAccountId:
        savedAccount.id,
    });
  } catch (error) {
    console.error(
      "PAYSTACK RECIPIENT ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while creating the payout recipient.",
      },
      { status: 500 }
    );
  }
}