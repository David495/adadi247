"use server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { redirect } from "next/navigation";
import { z } from "zod";

const businessLoginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address."),
  password: z
    .string()
    .min(1, "Please enter your password."),
});

export async function loginBusinessOwner(
  formData: FormData
) {
  try {
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const result =
      businessLoginSchema.safeParse(data);

    if (!result.success) {
      return {
        success: false,
        error:
          result.error.issues[0]?.message ||
          "Please provide valid login details.",
      };
    }

    const { email, password } = result.data;

    // AUTHENTICATE
    const supabase = await createClient();

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      console.error(
        "BUSINESS LOGIN AUTH ERROR:",
        authError
      );

      return {
        success: false,
        error:
          "Invalid email or password. Please try again.",
      };
    }

    const userId = authData.user.id;

    console.log(
      "BUSINESS USER LOGGED IN:",
      userId
    );

    // PROFILE
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role"
      )
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error(
        "PROFILE ERROR:",
        profileError
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "We could not verify your account profile.",
      };
    }

    if (profile.role !== "business_owner") {
      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "This login is for registered business owners only.",
      };
    }

    // BUSINESS
    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select(
        `
          id,
          name,
          slug,
          status,
          onboarding_status,
          owner_id
        `
      )
      .eq("owner_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (businessError) {
      console.error(
        "BUSINESS FETCH ERROR:",
        businessError
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "We could not verify your business account.",
      };
    }

    if (!business) {
      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "No business is associated with this account.",
      };
    }

    if (business.owner_id !== userId) {
      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "You are not authorized to access this business.",
      };
    }

    console.log(
      "BUSINESS FOUND:",
      {
        id: business.id,
        name: business.name,
        status: business.status,
      }
    );

    // ==========================================
    // CHECK SUBSCRIPTION USING ADMIN CLIENT
    // ==========================================

    const adminSupabase =
      createAdminClient();

    const {
      data: subscription,
      error: subscriptionError,
    } =
      await adminSupabase
        .from("subscriptions")
        .select(
          `
            id,
            status,
            expires_at
          `
        )
        .eq(
          "business_id",
          business.id
        )
        .eq("status", "active")
        .order("expires_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (subscriptionError) {
      console.error(
        "SUBSCRIPTION CHECK ERROR:",
        subscriptionError
      );

      return {
        success: false,
        error:
          "We could not check your subscription. Please try again.",
      };
    }

    const hasValidSubscription =
      subscription &&
      subscription.expires_at &&
      new Date(
        subscription.expires_at
      ).getTime() > Date.now();

    console.log(
      "SUBSCRIPTION RESULT:",
      {
        subscription,
        hasValidSubscription,
      }
    );

    // ==========================================
    // NO VALID PAYMENT
    // SEND BUSINESS TO PAYSTACK
    // ==========================================

    if (!hasValidSubscription) {
      console.log(
        "NO VALID SUBSCRIPTION."
      );

      const paystackSecretKey =
        process.env.PAYSTACK_SECRET_KEY;

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL;

      if (!paystackSecretKey) {
        console.error(
          "PAYSTACK_SECRET_KEY IS MISSING"
        );

        return {
          success: false,
          error:
            "Payment service is not configured.",
        };
      }

      if (!appUrl) {
        console.error(
          "NEXT_PUBLIC_APP_URL IS MISSING"
        );

        return {
          success: false,
          error:
            "Application URL is not configured.",
        };
      }

      // GET CURRENT ADADI SUBSCRIPTION SETTINGS

      const {
        data: settings,
        error: settingsError,
      } =
        await adminSupabase
          .from("platform_settings")
          .select(
            `
              business_subscription_fee,
              subscription_period,
              subscription_duration
            `
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (
        settingsError ||
        !settings
      ) {
        console.error(
          "PLATFORM SETTINGS ERROR:",
          settingsError
        );

        return {
          success: false,
          error:
            "Unable to load the current subscription fee.",
        };
      }

      const subscriptionFee =
        Number(
          settings.business_subscription_fee
        );

      const subscriptionPeriod =
        settings.subscription_period;

      const subscriptionDuration =
        Number(
          settings.subscription_duration
        );

      if (
        !Number.isFinite(
          subscriptionFee
        ) ||
        subscriptionFee <= 0
      ) {
        console.error(
          "INVALID SUBSCRIPTION FEE:",
          subscriptionFee
        );

        return {
          success: false,
          error:
            "The ADADI subscription fee is not configured correctly.",
        };
      }

      if (
        !["weekly", "monthly"].includes(
          subscriptionPeriod
        )
      ) {
        return {
          success: false,
          error:
            "The ADADI subscription period is not configured correctly.",
        };
      }

      if (
        !Number.isInteger(
          subscriptionDuration
        ) ||
        subscriptionDuration < 1
      ) {
        return {
          success: false,
          error:
            "The ADADI subscription duration is not configured correctly.",
        };
      }

      const amount =
        Math.round(
          subscriptionFee * 100
        );

      const reference =
        `ADADI-${business.id}-${Date.now()}`;

      console.log(
        "SENDING BUSINESS TO PAYSTACK:",
        {
          businessId: business.id,
          amount,
          subscriptionFee,
          subscriptionPeriod,
          subscriptionDuration,
          reference,
        }
      );

      // PAYSTACK INITIALIZATION

      const paystackResponse =
        await fetch(
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
              email: authData.user.email,
              amount,
              currency: "NGN",
              reference,

              metadata: {
                type: "business_subscription",
                businessId: business.id,
                ownerId: business.owner_id,
                businessName: business.name,
                subscriptionFee,
                subscriptionPeriod,
                subscriptionDuration,
              },

              callback_url:
                `${appUrl}/payment/callback`,
            }),
          }
        );

      const paystackData =
        await paystackResponse.json();

      console.log(
        "PAYSTACK INITIALIZE RESPONSE:",
        paystackData
      );

      if (
        !paystackResponse.ok ||
        !paystackData.status ||
        !paystackData.data?.authorization_url
      ) {
        console.error(
          "PAYSTACK INITIALIZATION FAILED:",
          paystackData
        );

        return {
          success: false,
          error:
            paystackData.message ||
            "Unable to initialize payment.",
        };
      }

      // RETURN PAYSTACK URL TO CLIENT

      return {
        success: true,
        requiresPayment: true,
        authorizationUrl:
          paystackData.data.authorization_url,
      };
    }

    // ==========================================
    // BUSINESS HAS PAID
    // ==========================================

    console.log(
      "BUSINESS HAS VALID SUBSCRIPTION"
    );

    // Payment is complete but admin hasn't approved yet.

    if (business.status !== "approved") {
      redirect(
        "/business-pending"
      );
    }

    // ==========================================
    // PAID + APPROVED
    // ==========================================

    redirect(
      "/dashboard/businesses"
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith(
        "NEXT_REDIRECT"
      )
    ) {
      throw error;
    }

    console.error(
      "UNEXPECTED BUSINESS LOGIN ERROR:",
      error
    );

    return {
      success: false,
      error:
        "Something went wrong while logging you in. Please try again.",
    };
  }
}