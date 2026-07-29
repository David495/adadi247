"use server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { z } from "zod";
import { redirect } from "next/navigation";

const registrationSchema = z.object({
  fullName: z
    .string()
    .min(2, "Please provide your full name."),

  email: z
    .string()
    .email("Please provide a valid email address."),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters."),
});

export async function registerCustomer(
  formData: FormData
) {
  console.log(
    "========== CUSTOMER REGISTRATION START =========="
  );

  try {
    // =========================================
    // 1. GET FORM DATA
    // =========================================

    const data = {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    console.log("CUSTOMER FORM DATA RECEIVED:", {
      fullName: data.fullName,
      email: data.email,
    });

    // =========================================
    // 2. VALIDATE FORM DATA
    // =========================================

    const result =
      registrationSchema.safeParse(data);

    if (!result.success) {
      console.error(
        "CUSTOMER VALIDATION ERROR:",
        result.error.flatten()
      );

      return {
        success: false,
        error:
          result.error.issues[0]?.message ||
          "Please provide valid registration details.",
      };
    }

    const {
      fullName,
      email,
      password,
    } = result.data;

    console.log(
      "CUSTOMER VALIDATION SUCCESS"
    );

    // =========================================
    // 3. CREATE SUPABASE CLIENT
    // =========================================

    const supabase = await createClient();

    // =========================================
    // 4. CREATE AUTH USER
    // =========================================

    console.log(
      "CREATING CUSTOMER AUTH USER..."
    );

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          full_name: fullName,
          role: "customer",
        },
      },
    });

    // =========================================
    // 5. HANDLE AUTH ERROR
    // =========================================

    if (authError) {
      console.error(
        "CUSTOMER AUTH ERROR:",
        authError
      );

      return {
        success: false,
        error: authError.message,
      };
    }

    // =========================================
    // 6. CHECK AUTH USER
    // =========================================

    if (!authData.user) {
      console.error(
        "NO CUSTOMER AUTH USER RETURNED"
      );

      return {
        success: false,
        error:
          "Unable to create your account. Please try again.",
      };
    }

    const userId = authData.user.id;

    console.log(
      "CUSTOMER AUTH USER CREATED:",
      userId
    );

    // =========================================
    // 7. CREATE CUSTOMER PROFILE
    // =========================================

    console.log(
      "CREATING CUSTOMER PROFILE..."
    );

    /*
      The Admin client is used here because
      profile creation should not depend on
      the user's current authentication session.

      The role is ALWAYS "customer".

      Users cannot choose their own role
      during registration.
    */

    const supabaseAdmin =
      createAdminClient();

    const {
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: fullName,
          email,
          role: "customer",
        },
        {
          onConflict: "id",
        }
      );

    // =========================================
    // 8. HANDLE PROFILE ERROR
    // =========================================

    if (profileError) {
      console.error(
        "CUSTOMER PROFILE CREATION ERROR:",
        profileError
      );

      return {
        success: false,
        error:
          "Your account was created, but we could not finish setting up your profile. Please contact support.",
      };
    }

    console.log(
      "CUSTOMER PROFILE CREATED SUCCESSFULLY"
    );

    // =========================================
    // 9. CHECK AUTH SESSION
    // =========================================

    /*
      If email confirmation is disabled,
      Supabase normally returns a session.

      The user is then already authenticated
      and can be redirected to the customer
      dashboard.

      If email confirmation is enabled,
      there may be no session yet.
    */

    if (authData.session) {
      console.log(
        "CUSTOMER SESSION CREATED"
      );

      console.log(
        "REDIRECTING TO CUSTOMER DASHBOARD..."
      );

      redirect(
        "/customer/dashboard"
      );
    }

    // =========================================
    // 10. EMAIL CONFIRMATION REQUIRED
    // =========================================

    console.log(
      "EMAIL CONFIRMATION REQUIRED"
    );

    return {
      success: true,
      requiresEmailConfirmation: true,
      message:
        "Your account has been created. Please check your email to confirm your account before logging in.",
    };

  } catch (error) {
    /*
      Next.js redirect() throws internally
      to perform the redirect.

      We must rethrow the redirect error
      instead of treating it as a registration
      failure.
    */

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
      "UNEXPECTED CUSTOMER REGISTRATION ERROR:",
      error
    );

    return {
      success: false,
      error:
        "Something went wrong during registration. Please try again.",
    };
  }
}