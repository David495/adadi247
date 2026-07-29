import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // =========================================
    // 1. GET PAYMENT REFERENCE
    // =========================================

    const body = await request.json();

    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment reference is required.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "VERIFYING PAYSTACK BUSINESS SUBSCRIPTION PAYMENT:",
      reference
    );

    // =========================================
    // 2. CHECK PAYSTACK SECRET KEY
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
        {
          status: 500,
        }
      );
    }

    // =========================================
    // 3. CREATE SUPABASE CLIENT
    // =========================================

    const supabase = await createClient();

    // =========================================
    // 4. GET CURRENTLY LOGGED-IN USER
    // =========================================

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "AUTHENTICATION ERROR:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in to verify this payment.",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "PAYMENT VERIFICATION USER:",
      {
        id: user.id,
        email: user.email,
      }
    );

    // =========================================
    // 5. VERIFY PAYMENT WITH PAYSTACK
    // =========================================

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${paystackSecretKey}`,

          "Content-Type":
            "application/json",
        },
      }
    );

    const data =
      await response.json();

    console.log(
      "PAYSTACK VERIFICATION RESPONSE:",
      data
    );

    // =========================================
    // 6. CHECK PAYSTACK RESPONSE
    // =========================================

    if (
      !response.ok ||
      !data.status ||
      !data.data
    ) {
      console.error(
        "PAYSTACK VERIFICATION FAILED:",
        data
      );

      return NextResponse.json(
        {
          success: false,
          error:
            data.message ||
            "Unable to verify payment.",
        },
        {
          status: 400,
        }
      );
    }

    const transaction =
      data.data;

    // =========================================
    // 7. CHECK PAYMENT STATUS
    // =========================================

    if (
      transaction.status !==
      "success"
    ) {
      console.error(
        "PAYMENT NOT SUCCESSFUL:",
        transaction.status
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was not successful.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // 8. VERIFY PAYMENT AMOUNT
    // =========================================
    //
    // Business subscription:
    // ₦2,500
    //
    // Paystack amount:
    // 250,000 kobo
    //

    const expectedAmount =
      250000;

    if (
      transaction.amount !==
      expectedAmount
    ) {
      console.error(
        "INVALID PAYMENT AMOUNT:",
        {
          expected:
            expectedAmount,

          received:
            transaction.amount,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid payment amount.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "PAYMENT AMOUNT VERIFIED"
    );

    // =========================================
    // 9. GET BUSINESS ID FROM METADATA
    // =========================================

    const businessId =
      transaction.metadata
        ?.businessId;

    if (!businessId) {
      console.error(
        "BUSINESS ID NOT FOUND IN PAYMENT METADATA"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Business information could not be found for this payment.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "BUSINESS ID FROM PAYMENT:",
      businessId
    );

    // =========================================
    // 10. FIND BUSINESS
    // =========================================

    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select(
        "id, owner_id, name, status, is_open, onboarding_status"
      )
      .eq(
        "id",
        businessId
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
        {
          status: 404,
        }
      );
    }

    console.log(
      "BUSINESS FOUND:",
      business
    );

    // =========================================
    // 11. VERIFY BUSINESS OWNERSHIP
    // =========================================

    if (
      business.owner_id !==
      user.id
    ) {
      console.error(
        "BUSINESS OWNERSHIP ERROR:",
        {
          businessOwner:
            business.owner_id,

          currentUser:
            user.id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to activate this business.",
        },
        {
          status: 403,
        }
      );
    }

    console.log(
      "BUSINESS OWNERSHIP VERIFIED"
    );

    // =========================================
    // 12. CHECK FOR EXISTING ACTIVE SUBSCRIPTION
    // =========================================

    const {
      data: existingSubscription,
      error: subscriptionCheckError,
    } = await supabase
      .from("subscriptions")
      .select(
        "id, status, starts_at, expires_at"
      )
      .eq(
        "business_id",
        businessId
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

    if (
      subscriptionCheckError
    ) {
      console.error(
        "SUBSCRIPTION CHECK ERROR:",
        subscriptionCheckError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to check existing subscription.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================
    // 13. CREATE WEEKLY SUBSCRIPTION
    // =========================================

    let subscriptionId =
      existingSubscription?.id ||
      null;

    if (
      !existingSubscription
    ) {
      const startsAt =
        new Date();

      const expiresAt =
        new Date(
          startsAt.getTime() +
            7 *
              24 *
              60 *
              60 *
              1000
        );

      console.log(
        "CREATING 7-DAY BUSINESS SUBSCRIPTION:",
        {
          businessId,
          startsAt:
            startsAt.toISOString(),
          expiresAt:
            expiresAt.toISOString(),
        }
      );

      const {
        data: newSubscription,
        error: subscriptionError,
      } = await supabase
        .from("subscriptions")
        .insert({
          business_id:
            businessId,

          plan_name:
            "starter",

          amount:
            2500,

          status:
            "active",

          starts_at:
            startsAt.toISOString(),

          expires_at:
            expiresAt.toISOString(),
        })
        .select()
        .single();

      if (
        subscriptionError ||
        !newSubscription
      ) {
        console.error(
          "SUBSCRIPTION CREATION ERROR:",
          subscriptionError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment was successful, but we could not activate your subscription.",
          },
          {
            status: 500,
          }
        );
      }

      subscriptionId =
        newSubscription.id;

      console.log(
        "SUBSCRIPTION CREATED SUCCESSFULLY:",
        subscriptionId
      );
    } else {
      console.log(
        "ACTIVE SUBSCRIPTION ALREADY EXISTS:",
        existingSubscription
      );
    }

    // =========================================
    // 14. ACTIVATE BUSINESS
    // =========================================
    //
    // IMPORTANT:
    // Your businesses.status CHECK constraint
    // does NOT allow "active".
    //
    // ADADI uses:
    //
    // pending  = awaiting activation
    // approved = active and available
    //
    // Therefore, we use "approved".
    //

    const {
      error: businessUpdateError,
    } = await supabase
      .from("businesses")
      .update({
        status:
          "approved",

        onboarding_status:
          "incomplete",
      })
      .eq(
        "id",
        businessId
      );

    if (
      businessUpdateError
    ) {
      console.error(
        "BUSINESS ACTIVATION ERROR:",
        businessUpdateError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was successful, but we could not activate your business.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "BUSINESS ACTIVATED SUCCESSFULLY:",
      {
        businessId,
        status:
          "approved",
      }
    );

    // =========================================
    // 15. RETURN SUCCESS
    // =========================================

    console.log(
      "========== BUSINESS SUBSCRIPTION PAYMENT VERIFICATION SUCCESS =========="
    );

    return NextResponse.json({
      success: true,

      message:
        "Payment verified successfully. Your business subscription is active.",

      businessId,

      subscriptionId,

      subscriptionStatus:
        "active",

      businessStatus:
        "approved",
    });

  } catch (error) {
    console.error(
      "PAYMENT VERIFICATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while verifying your payment.",
      },
      {
        status: 500,
      }
    );
  }
}