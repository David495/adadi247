import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=google_auth_failed", requestUrl.origin)
    );
  }

  try {
    const supabase = await createClient();

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error(
        "GOOGLE OAUTH EXCHANGE ERROR:",
        exchangeError
      );

      return NextResponse.redirect(
        new URL("/login?error=google_auth_failed", requestUrl.origin)
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
        new URL("/login?error=google_auth_failed", requestUrl.origin)
      );
    }

    console.log(
      "GOOGLE USER AUTHENTICATED:",
      user.id,
      user.email
    );

    const supabaseAdmin = createAdminClient();

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role")
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
          "/login?error=profile_error",
          requestUrl.origin
        )
      );
    }

    /*
     * If this Google account already has a profile,
     * make sure it is actually a customer.
     */
    if (profile) {
      if (profile.role !== "customer") {
        console.error(
          "NON-CUSTOMER GOOGLE LOGIN ATTEMPT:",
          profile.role
        );

        await supabase.auth.signOut();

        return NextResponse.redirect(
          new URL(
            "/login?error=customer_only",
            requestUrl.origin
          )
        );
      }

      console.log(
        "EXISTING CUSTOMER GOOGLE LOGIN SUCCESSFUL"
      );

      return NextResponse.redirect(
        new URL(
          "/customer/dashboard?welcome=true",
          requestUrl.origin
        )
      );
    }

    /*
     * No profile exists.
     *
     * Create a customer profile automatically
     * for a new Google customer.
     */
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "ADADI Customer";

    const email = user.email || "";

    const { error: createProfileError } =
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
          "/login?error=profile_creation_failed",
          requestUrl.origin
        )
      );
    }

    console.log(
      "NEW GOOGLE CUSTOMER PROFILE CREATED:",
      user.id
    );

    return NextResponse.redirect(
      new URL(
        "/customer/dashboard?welcome=true",
        requestUrl.origin
      )
    );
  } catch (error) {
    console.error(
      "GOOGLE OAUTH CALLBACK ERROR:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=google_auth_failed",
        requestUrl.origin
      )
    );
  }
}