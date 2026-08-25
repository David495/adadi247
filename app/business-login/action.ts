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

export async function loginBusinessOwner(formData: FormData) {
  console.log(
    "========== BUSINESS OWNER LOGIN START =========="
  );

  try {
    // 1. GET FORM DATA

    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    console.log("BUSINESS LOGIN DATA RECEIVED:", {
      email: data.email,
    });

    // 2. VALIDATE FORM DATA

    const result = businessLoginSchema.safeParse(data);

    if (!result.success) {
      console.error(
        "BUSINESS LOGIN VALIDATION ERROR:",
        result.error.flatten()
      );

      return {
        success: false,
        error:
          result.error.issues[0]?.message ||
          "Please provide valid login details.",
      };
    }

    const { email, password } = result.data;

    // 3. CREATE SUPABASE SERVER CLIENT

    const supabase = await createClient();

    // 4. AUTHENTICATE BUSINESS OWNER

    console.log("AUTHENTICATING BUSINESS OWNER...");

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // 5. HANDLE AUTH ERROR

    if (authError) {
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

    // 6. CHECK AUTH USER

    if (!authData.user) {
      console.error(
        "NO BUSINESS OWNER USER RETURNED"
      );

      return {
        success: false,
        error:
          "Unable to log you in. Please try again.",
      };
    }

    const userId = authData.user.id;

    console.log(
      "BUSINESS OWNER AUTHENTICATED:",
      userId
    );

    // 7. GET PROFILE

    console.log(
      "FETCHING BUSINESS OWNER PROFILE..."
    );

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

    // 8. VERIFY PROFILE

    if (profileError || !profile) {
      console.error(
        "BUSINESS OWNER PROFILE ERROR:",
        profileError
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "We could not verify your account profile. Please contact support.",
      };
    }

    // 9. VERIFY BUSINESS OWNER ROLE

    if (profile.role !== "business_owner") {
      console.error(
        "INVALID BUSINESS OWNER ROLE:",
        profile.role
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "This login is for registered business owners only.",
      };
    }

    console.log(
      "BUSINESS OWNER ROLE VERIFIED"
    );

    // 10. FIND OWNED BUSINESS

    console.log(
      "FETCHING OWNED BUSINESS..."
    );

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

    // 11. HANDLE BUSINESS DATABASE ERROR

    if (businessError) {
      console.error(
        "BUSINESS FETCH ERROR:",
        businessError
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "We could not verify your business account. Please try again.",
      };
    }

    // 12. CHECK BUSINESS EXISTS

    if (!business) {
      console.error(
        "NO BUSINESS FOUND FOR OWNER:",
        userId
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "No business is associated with this account. Please contact ADADI support.",
      };
    }

    console.log(
      "OWNED BUSINESS FOUND:",
      {
        id: business.id,
        name: business.name,
        status: business.status,
      }
    );

    // 13. VERIFY BUSINESS OWNERSHIP

    if (business.owner_id !== userId) {
      console.error(
        "BUSINESS OWNERSHIP VERIFICATION FAILED"
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "You are not authorized to access this business.",
      };
    }

    console.log(
      "BUSINESS OWNERSHIP VERIFIED"
    );

    // 14. CHECK FOR ACTIVE PAID SUBSCRIPTION

    console.log(
      "CHECKING BUSINESS SUBSCRIPTION..."
    );

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select(
        `
          id,
          status,
          starts_at,
          expires_at
        `
      )
      .eq("business_id", business.id)
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
          "We could not verify your subscription. Please try again.",
      };
    }

    // 15. VERIFY THAT THE SUBSCRIPTION HAS NOT EXPIRED

    const now = new Date();

    const hasValidSubscription =
      !!subscription &&
      !!subscription.expires_at &&
      new Date(subscription.expires_at).getTime() >
        now.getTime();

    console.log(
      "SUBSCRIPTION STATUS:",
      {
        hasSubscription: !!subscription,
        hasValidSubscription,
        expiresAt:
          subscription?.expires_at || null,
      }
    );

    // 16. BUSINESS HAS NOT PAID
    //
    // Send the business owner directly to Paystack.

    if (!hasValidSubscription) {
      console.log(
        "BUSINESS HAS NO VALID SUBSCRIPTION."
      );

      console.log(
        "INITIALIZING PAYSTACK BUSINESS PAYMENT..."
      );

      const paystackSecretKey =
        process.env.PAYSTACK_SECRET_KEY;

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL;

      if (!paystackSecretKey || !appUrl) {
        console.error(
          "PAYSTACK CONFIGURATION IS MISSING"
        );

        return {
          success: false,
          error:
            "Payment service is not properly configured. Please contact ADADI support.",
        };
      }

      const paymentResponse = await fetch(
        `${appUrl}/api/paystack/business/initialize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cookie":
              (
                await (
                  await import("next/headers")
                ).cookies()
              ).toString(),
          },
          body: JSON.stringify({
            businessId: business.id,
          }),
          cache: "no-store",
        }
      );

      const paymentData =
        await paymentResponse.json();

      console.log(
        "PAYSTACK INITIALIZATION RESULT:",
        paymentData
      );

      if (
        !paymentResponse.ok ||
        !paymentData.success ||
        !paymentData.authorizationUrl
      ) {
        console.error(
          "PAYSTACK INITIALIZATION FAILED:",
          paymentData
        );

        return {
          success: false,
          error:
            paymentData.error ||
            "Unable to initialize your subscription payment. Please try again.",
        };
      }

      console.log(
        "REDIRECTING BUSINESS OWNER TO PAYSTACK..."
      );

      redirect(
        paymentData.authorizationUrl
      );
    }

    // 17. BUSINESS HAS A VALID SUBSCRIPTION
    //
    // Payment is complete.
    // Now check whether the business has been approved.

    console.log(
      "BUSINESS HAS A VALID SUBSCRIPTION."
    );

    console.log(
      "BUSINESS STATUS:",
      business.status
    );

    // 18. ONLY APPROVED BUSINESSES ENTER DASHBOARD

    if (business.status !== "approved") {
      console.log(
        "BUSINESS IS PAID BUT NOT YET APPROVED."
      );

      redirect(
        "/business-pending"
      );
    }

    // 19. APPROVED BUSINESS

    console.log(
      "BUSINESS IS APPROVED."
    );

    console.log(
      "BUSINESS OWNER LOGIN SUCCESSFUL"
    );

    console.log(
      "REDIRECTING TO BUSINESS DASHBOARD..."
    );

    redirect(
      "/dashboard/businesses"
    );
  } catch (error) {
    // 20. PRESERVE NEXT.JS REDIRECT

    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
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