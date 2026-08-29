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
  console.log("========== ADMIN LOGIN START ==========");

  try {
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    console.log("ADMIN LOGIN DATA RECEIVED:", {
      email: data.email,
    });

    const result = adminLoginSchema.safeParse(data);

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

    const { email, password } = result.data;

    const supabase = await createClient();

    console.log("AUTHENTICATING ADMIN...");

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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

    if (!authData.user) {
      console.error("NO ADMIN USER RETURNED");

      return {
        success: false,
        error:
          "Unable to log you in. Please try again.",
      };
    }

    const userId = authData.user.id;

    console.log("ADMIN AUTHENTICATED:", userId);

    console.log("FETCHING ADMIN PROFILE...");

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

    console.log("ADMIN ROLE VERIFIED:", {
      userId: profile.id,
      role: profile.role,
    });

    console.log("ADMIN LOGIN SUCCESSFUL");

    redirect("/admin/dashboard");
  } catch (error) {
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