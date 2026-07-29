
import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";

export async function POST() {
  // =========================================
  // 1. CREATE SUPABASE SERVER CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. SIGN OUT CURRENT USER
  // =========================================

  const { error } =
    await supabase.auth.signOut();

  // =========================================
  // 3. HANDLE LOGOUT ERROR
  // =========================================

  if (error) {
    console.error(
      "LOGOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to log out. Please try again.",
      },
      {
        status: 500,
      }
    );
  }

  // =========================================
  // 4. REDIRECT TO LOGIN
  // =========================================

  return NextResponse.redirect(
    new URL(
      "/login",
      process.env.NEXT_PUBLIC_SITE_URL ||
        "http://localhost:3000"
    )
  );
}