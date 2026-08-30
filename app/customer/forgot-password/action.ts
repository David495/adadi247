"use server";

import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

const resetSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address."),
});

export async function requestPasswordReset(
  formData: FormData
) {
  try {
    const email = formData.get("email");

    const result = resetSchema.safeParse({
      email,
    });

    if (!result.success) {
      return {
        success: false,
        error:
          result.error.issues[0]?.message ||
          "Please provide a valid email address.",
      };
    }

    const supabase = await createClient();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return {
        success: false,
        error:
          "Application URL is not configured.",
      };
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        result.data.email,
        {
          redirectTo:
            `${appUrl}/auth/callback?next=/auth/reset-password`,
        }
      );

    if (error) {
      console.error(
        "SUPABASE PASSWORD RESET ERROR:",
        error
      );

      return {
        success: false,
        error:
          "Unable to send the password reset email. Please try again.",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "PASSWORD RESET REQUEST ERROR:",
      error
    );

    return {
      success: false,
      error:
        "Something went wrong. Please try again.",
    };
  }
}