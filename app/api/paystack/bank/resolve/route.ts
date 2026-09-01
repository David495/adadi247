import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
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

    const response = await fetch(
      "https://api.paystack.co/bank?country=nigeria&perPage=100",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (
      !response.ok ||
      !data?.status ||
      !Array.isArray(data?.data)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            "Unable to load Nigerian banks.",
        },
        { status: 502 }
      );
    }

    const banks = data.data
      .filter(
        (bank: any) =>
          bank?.name && bank?.code
      )
      .map((bank: any) => ({
        name: bank.name,
        code: bank.code,
      }));

    return NextResponse.json({
      success: true,
      banks,
    });
  } catch (error) {
    console.error(
      "BANK LIST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load Nigerian banks.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const {
      accountNumber,
      bankCode,
    } = body as {
      accountNumber?: string;
      bankCode?: string;
    };

    if (!accountNumber?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Account number is required.",
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

    const cleanAccountNumber =
      accountNumber.trim();

    const cleanBankCode =
      bankCode.trim();

    if (!/^\d{10}$/.test(cleanAccountNumber)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bank account number must be exactly 10 digits.",
        },
        { status: 400 }
      );
    }

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

    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const paystackUrl =
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
        cleanAccountNumber
      )}&bank_code=${encodeURIComponent(
        cleanBankCode
      )}`;

    const response = await fetch(
      paystackUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    console.log(
      "PAYSTACK ACCOUNT RESOLUTION:",
      {
        userId: user.id,
        bankCode: cleanBankCode,
        accountNumber:
          cleanAccountNumber,
        status: response.status,
        success: data?.status,
      }
    );

    if (
      !response.ok ||
      !data?.status ||
      !data?.data
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            "Unable to verify this bank account.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      accountName:
        data.data.account_name,
      accountNumber:
        data.data.account_number,
      bankId:
        data.data.bank_id,
    });
  } catch (error) {
    console.error(
      "BANK ACCOUNT RESOLUTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while verifying the bank account.",
      },
      { status: 500 }
    );
  }
}