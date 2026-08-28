"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(
    formData.get("confirm_password") ?? ""
  );

  if (!fullName || !email || !password || !confirmPassword) {
    return {
      error: "Please fill in all fields.",
    };
  }

  if (password.length < 6) {
    return {
      error: "Password must be at least 6 characters.",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Passwords do not match.",
    };
  }

  const {
    data: { user },
    error: signupError,
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

  if (signupError) {
    if (
      signupError.message.toLowerCase().includes("already registered") ||
      signupError.message.toLowerCase().includes("already exists")
    ) {
      return {
        error: "An account with this email already exists. Please log in.",
      };
    }

    console.error("CUSTOMER SIGNUP ERROR:", signupError);

    return {
      error: signupError.message,
    };
  }

  if (!user) {
    return {
      error: "Unable to create your account. Please try again.",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        full_name: fullName,
        email,
        role: "customer",
      },
      {
        onConflict: "id",
      }
    );

  if (profileError) {
    console.error("CUSTOMER PROFILE CREATION ERROR:", profileError);

    await supabase.auth.signOut();

    return {
      error: "Your account could not be completed. Please try again.",
    };
  }

  if (user.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Please log in.",
    };
  }

  redirect("/login?signup=success");
}

export async function signupWithGoogle() {
  const supabase = await createClient();

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/customer/dashboard`,
    },
  });

  if (error) {
    console.error("CUSTOMER GOOGLE SIGNUP ERROR:", error);

    return {
      error: "Unable to continue with Google. Please try again.",
    };
  }

  if (!data.url) {
    return {
      error: "Google sign up could not be started.",
    };
  }

  redirect(data.url);
}