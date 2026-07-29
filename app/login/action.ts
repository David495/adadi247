"use server";

import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address."),

  password: z
    .string()
    .min(1, "Please enter your password."),
});

export async function loginCustomer(
  formData: FormData
) {
  console.log(
    "========== CUSTOMER LOGIN START =========="
  );

  try {
    // =========================================
    // 1. GET FORM DATA
    // =========================================

    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
      rememberMe:
        formData.get("rememberMe") === "on",
    };

    console.log(
      "CUSTOMER LOGIN DATA RECEIVED:",
      {
        email: data.email,
        rememberMe: data.rememberMe,
      }
    );

    // =========================================
    // 2. VALIDATE FORM DATA
    // =========================================

    const result =
      loginSchema.safeParse({
        email: data.email,
        password: data.password,
      });

    if (!result.success) {
      console.error(
        "CUSTOMER LOGIN VALIDATION ERROR:",
        result.error.flatten()
      );

      return {
        success: false,
        error:
          result.error.issues[0]?.message ||
          "Please provide valid login details.",
      };
    }

    const {
      email,
      password,
    } = result.data;

    // =========================================
    // 3. CREATE SUPABASE SERVER CLIENT
    // =========================================

    const supabase = await createClient();

    // =========================================
    // 4. SIGN IN CUSTOMER
    // =========================================

    console.log(
      "AUTHENTICATING CUSTOMER..."
    );

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // =========================================
    // 5. HANDLE AUTH ERROR
    // =========================================

    if (authError) {
      console.error(
        "CUSTOMER LOGIN AUTH ERROR:",
        authError
      );

      return {
        success: false,
        error:
          "Invalid email or password. Please try again.",
      };
    }

    // =========================================
    // 6. CHECK AUTH USER
    // =========================================

    if (!authData.user) {
      console.error(
        "NO USER RETURNED AFTER LOGIN"
      );

      return {
        success: false,
        error:
          "Unable to log you in. Please try again.",
      };
    }

    const userId =
      authData.user.id;

    console.log(
      "CUSTOMER AUTHENTICATION SUCCESS:",
      userId
    );

    // =========================================
    // 7. GET USER PROFILE
    // =========================================

    console.log(
      "FETCHING CUSTOMER PROFILE..."
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

    // =========================================
    // 8. HANDLE PROFILE ERROR
    // =========================================

    if (profileError) {
      console.error(
        "CUSTOMER PROFILE FETCH ERROR:",
        profileError
      );

      // Sign the user out because
      // we cannot verify their profile.
      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "We could not verify your account profile. Please contact support.",
      };
    }

    // =========================================
    // 9. VERIFY CUSTOMER ROLE
    // =========================================

    if (
      !profile ||
      profile.role !== "customer"
    ) {
      console.error(
        "INVALID CUSTOMER ROLE:",
        profile?.role
      );

      // Prevent business owners or admins
      // from using the customer login.
      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "This login is for customer accounts only.",
      };
    }

    console.log(
      "CUSTOMER ROLE VERIFIED"
    );

    // =========================================
    // 10. LOGIN SUCCESS
    // =========================================

    console.log(
      "CUSTOMER LOGIN SUCCESSFUL"
    );

    console.log(
      "REDIRECTING TO CUSTOMER DASHBOARD..."
    );

    redirect(
      "/customer/dashboard?welcome=true"
    );

  } catch (error) {
    // =========================================
    // 11. PRESERVE NEXT.JS REDIRECT
    // =========================================

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
      "UNEXPECTED CUSTOMER LOGIN ERROR:",
      error
    );

    return {
      success: false,
      error:
        "Something went wrong while logging you in. Please try again.",
    };
  }
}