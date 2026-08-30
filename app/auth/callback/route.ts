import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code =
    requestUrl.searchParams.get("code");

  const next =
    requestUrl.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/customer/login?error=auth_failed",
        requestUrl.origin
      )
    );
  }

  try {
    const supabase = await createClient();

    const {
      error: exchangeError,
    } =
      await supabase.auth.exchangeCodeForSession(
        code
      );

    if (exchangeError) {
      console.error(
        "AUTH CODE EXCHANGE ERROR:",
        exchangeError
      );

      return NextResponse.redirect(
        new URL(
          "/customer/login?error=auth_failed",
          requestUrl.origin
        )
      );
    }

    if (next === "/auth/reset-password") {
      return NextResponse.redirect(
        new URL(
          "/auth/reset-password",
          requestUrl.origin
        )
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "GOOGLE USER FETCH ERROR:",
        userError
      );

      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/customer/login?error=google_auth_failed",
          requestUrl.origin
        )
      );
    }

    console.log(
      "GOOGLE USER AUTHENTICATED:",
      user.id,
      user.email
    );

    const supabaseAdmin =
      createAdminClient();

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, email, role"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "GOOGLE PROFILE FETCH ERROR:",
        profileError
      );

      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/customer/login?error=profile_error",
          requestUrl.origin
        )
      );
    }

    if (profile) {
      if (
        profile.role !== "customer"
      ) {
        console.error(
          "NON-CUSTOMER GOOGLE LOGIN ATTEMPT:",
          profile.role
        );

        await supabase.auth.signOut();

        return NextResponse.redirect(
          new URL(
            "/customer/login?error=customer_only",
            requestUrl.origin
          )
        );
      }

      return NextResponse.redirect(
        new URL(
          "/customer/dashboard?welcome=true",
          requestUrl.origin
        )
      );
    }

    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "ADADI Customer";

    const email =
      user.email || "";

    const {
      error: createProfileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          full_name: fullName,
          email,
          role: "customer",
        });

    if (createProfileError) {
      console.error(
        "GOOGLE CUSTOMER PROFILE CREATION ERROR:",
        createProfileError
      );

      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/customer/login?error=profile_creation_failed",
          requestUrl.origin
        )
      );
    }

    return NextResponse.redirect(
      new URL(
        "/customer/dashboard?welcome=true",
        requestUrl.origin
      )
    );
  } catch (error) {
    console.error(
      "AUTH CALLBACK ERROR:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/customer/login?error=auth_failed",
        requestUrl.origin
      )
    );
  }
}