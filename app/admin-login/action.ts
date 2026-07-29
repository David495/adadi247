"use server";

import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const adminLoginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address."),

  password: z
    .string()
    .min(1, "Please enter your password."),
});

export async function loginAdmin(formData: FormData) {
  console.log(
    "========== ADMIN LOGIN START =========="
  );

  try {
    // =========================================
    // 1. GET FORM DATA
    // =========================================

    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    console.log("ADMIN LOGIN DATA RECEIVED:", {
      email: data.email,
    });

    // =========================================
    // 2. VALIDATE FORM DATA
    // =========================================

    const result =
      adminLoginSchema.safeParse(data);

    if (!result.success) {
      console.error(
        "ADMIN LOGIN VALIDATION ERROR:",
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
    // 4. AUTHENTICATE ADMIN
    // =========================================

    console.log("AUTHENTICATING ADMIN...");

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    // =========================================
    // 5. HANDLE AUTH ERROR
    // =========================================

    if (authError) {
      console.error(
        "ADMIN LOGIN AUTH ERROR:",
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
        "NO ADMIN USER RETURNED"
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
      "ADMIN AUTHENTICATED:",
      userId
    );

    // =========================================
    // 7. GET USER PROFILE
    // =========================================

    console.log(
      "FETCHING ADMIN PROFILE..."
    );

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        `
          id,
          full_name,
          email,
          role
        `
      )
      .eq("id", userId)
      .maybeSingle();

    // =========================================
    // 8. HANDLE PROFILE ERROR
    // =========================================

    if (profileError) {
      console.error(
        "ADMIN PROFILE ERROR:",
        profileError
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "We could not verify your account profile. Please try again.",
      };
    }

    // =========================================
    // 9. CHECK PROFILE EXISTS
    // =========================================

    if (!profile) {
      console.error(
        "NO PROFILE FOUND FOR ADMIN:",
        userId
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "Your account profile could not be found. Please contact support.",
      };
    }

    // =========================================
    // 10. VERIFY ADMIN ROLE
    // =========================================

    if (profile.role !== "admin") {
      console.error(
        "UNAUTHORIZED ADMIN LOGIN ATTEMPT:",
        {
          userId,
          role: profile.role,
        }
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "You are not authorized to access the ADADI admin portal.",
      };
    }

    // =========================================
    // 11. ADMIN VERIFIED
    // =========================================

    console.log(
      "ADMIN ROLE VERIFIED:",
      profile
    );

    console.log(
      "ADMIN LOGIN SUCCESSFUL"
    );

    // =========================================
    // 12. REDIRECT TO ADMIN DASHBOARD
    // =========================================

    redirect("/admin/dashboard");

  } catch (error) {
    // =========================================
    // 13. PRESERVE NEXT.JS REDIRECT
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
      "UNEXPECTED ADMIN LOGIN ERROR:",
      error
    );

    return {
      success: false,
      error:
        "Something went wrong while logging you in. Please try again.",
    };
  }
}