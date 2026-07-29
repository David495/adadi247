"use server";

import { createClient } from "@/app/lib/supabase/server";
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
  console.log(
    "========== BUSINESS OWNER LOGIN START =========="
  );

  try {
    // =========================================
    // 1. GET FORM DATA
    // =========================================

    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    console.log(
      "BUSINESS LOGIN DATA RECEIVED:",
      {
        email: data.email,
      }
    );

    // =========================================
    // 2. VALIDATE FORM DATA
    // =========================================

    const result =
      businessLoginSchema.safeParse(data);

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

    const {
      email,
      password,
    } = result.data;

    // =========================================
    // 3. CREATE SUPABASE SERVER CLIENT
    // =========================================

    const supabase = await createClient();

    // =========================================
    // 4. AUTHENTICATE BUSINESS OWNER
    // =========================================

    console.log(
      "AUTHENTICATING BUSINESS OWNER..."
    );

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
        "BUSINESS LOGIN AUTH ERROR:",
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
        "NO BUSINESS OWNER USER RETURNED"
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
      "BUSINESS OWNER AUTHENTICATED:",
      userId
    );

    // =========================================
    // 7. GET PROFILE
    // =========================================

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

    // =========================================
    // 8. VERIFY PROFILE
    // =========================================

    if (
      profileError ||
      !profile
    ) {
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

    // =========================================
    // 9. VERIFY BUSINESS OWNER ROLE
    // =========================================

    if (
      profile.role !==
      "business_owner"
    ) {
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

    // =========================================
    // 10. FIND OWNED BUSINESS
    // =========================================

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
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    // =========================================
    // 11. HANDLE BUSINESS DATABASE ERROR
    // =========================================

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

    // =========================================
    // 12. CHECK BUSINESS EXISTS
    // =========================================

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

    // =========================================
    // 13. VERIFY BUSINESS OWNERSHIP
    // =========================================

    if (
      business.owner_id !==
      userId
    ) {
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

    // =========================================
    // 14. CHECK BUSINESS STATUS
    // =========================================

    if (
      business.status !==
      "active"
    ) {
      console.log(
        "BUSINESS IS NOT ACTIVE:",
        business.status
      );

      redirect(
        "/business-pending"
      );
    }

    // =========================================
    // 15. BUSINESS IS ACTIVE
    // =========================================

    console.log(
      "BUSINESS IS ACTIVE"
    );

    console.log(
      "BUSINESS OWNER LOGIN SUCCESSFUL"
    );

    console.log(
      "REDIRECTING TO BUSINESS DASHBOARD..."
    );

    redirect(
      "/dashboard/businesses/"
    );

  } catch (error) {
    // =========================================
    // 16. PRESERVE NEXT.JS REDIRECT
    // =========================================

    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest ===
        "string" &&
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