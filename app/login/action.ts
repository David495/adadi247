"use server";

import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .email(
      "Please provide a valid email address."
    ),

  password: z
    .string()
    .min(
      1,
      "Please enter your password."
    ),
});

export async function loginCustomer(
  formData: FormData
) {
  console.log(
    "========== CUSTOMER LOGIN START =========="
  );

  try {
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

    const supabase =
      await createClient();

    console.log(
      "AUTHENTICATING CUSTOMER..."
    );

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

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

    if (profileError) {
      console.error(
        "CUSTOMER PROFILE FETCH ERROR:",
        profileError
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          "We could not verify your account profile. Please contact support.",
      };
    }

    if (
      !profile ||
      profile.role !== "customer"
    ) {
      console.error(
        "INVALID CUSTOMER ROLE:",
        profile?.role
      );

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

    console.log(
      "CUSTOMER LOGIN AUTHENTICATION SUCCESSFUL"
    );

    return {
      success: true,
    };
  } catch (error) {
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