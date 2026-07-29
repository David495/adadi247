import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // =========================================
    // 1. GET REQUEST DATA
    // =========================================

    const body = await request.json();

    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "Business ID is required.",
        },
        {
          status: 400,
        }
      );
    }

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

    console.log(
      "SUPABASE CLIENT CREATED"
    );

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
            "You must be logged in to make this payment.",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "PAYMENT USER:",
      {
        id: user.id,
        email: user.email,
      }
    );

    // =========================================
    // 5. MAKE SURE USER HAS AN EMAIL
    // =========================================

    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your account does not have a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // 6. FIND BUSINESS
    // =========================================

    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select(
        "id, owner_id, name, status, onboarding_status"
      )
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      console.error(
        "BUSINESS NOT FOUND:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Business account not found. Please complete your business registration first.",
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
    // 7. VERIFY BUSINESS OWNERSHIP
    // =========================================

    if (business.owner_id !== user.id) {
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
            "You are not authorized to pay for this business.",
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
    // 8. CREATE PAYSTACK REFERENCE
    // =========================================

    const reference =
      `ADADI-${business.id}-${Date.now()}`;

    console.log(
      "PAYSTACK REFERENCE:",
      reference
    );

    // =========================================
    // 9. INITIALIZE PAYSTACK PAYMENT
    // =========================================

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${paystackSecretKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          // Use authenticated user's email.
          email: user.email,

          // ₦2,500
          // Paystack amount is in kobo.
          amount: 250000,

          currency: "NGN",

          reference,

          // =========================================
          // IMPORTANT:
          // The webhook will use businessId
          // to create the subscription.
          // =========================================

          metadata: {
            businessId:
              business.id,

            ownerId:
              business.owner_id,

            businessName:
              business.name,
          },

          callback_url:
            `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
        }),
      }
    );

    // =========================================
    // 10. READ PAYSTACK RESPONSE
    // =========================================

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.status
    ) {
      console.error(
        "PAYSTACK INITIALIZATION ERROR:",
        data
      );

      return NextResponse.json(
        {
          success: false,
          error:
            data.message ||
            "Unable to initialize payment.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // 11. PAYMENT INITIALIZED
    // =========================================

    console.log(
      "PAYSTACK PAYMENT INITIALIZED SUCCESSFULLY:",
      {
        businessId:
          business.id,

        reference:
          data.data.reference,

        authorizationUrl:
          data.data.authorization_url,
      }
    );

    // =========================================
    // 12. RETURN PAYMENT DETAILS
    // =========================================

    return NextResponse.json({
      success: true,

      authorizationUrl:
        data.data.authorization_url,

      accessCode:
        data.data.access_code,

      reference:
        data.data.reference,

      businessId:
        business.id,
    });

  } catch (error) {
    console.error(
      "PAYSTACK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while initializing payment.",
      },
      {
        status: 500,
      }
    );
  }
}