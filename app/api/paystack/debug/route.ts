import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Reference is required.",
        },
        { status: 400 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "PAYSTACK_SECRET_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json({
      httpStatus: response.status,
      paystack: data,
    });
  } catch (error) {
    console.error("PAYSTACK DEBUG ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to contact Paystack.",
      },
      { status: 500 }
    );
  }
}