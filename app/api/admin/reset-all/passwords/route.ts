import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST() {
  try {
    const supabaseAdmin = createAdminClient();

    const temporaryPassword =
      process.env.ADMIN_TEMP_PASSWORD;

    if (!temporaryPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "ADMIN_TEMP_PASSWORD is not configured.",
        },
        { status: 500 }
      );
    }

    if (temporaryPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ADMIN_TEMP_PASSWORD must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const { data: admins, error: adminsError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("role", "admin");

    if (adminsError) {
      console.error(
        "ADMIN PASSWORD RESET - PROFILE ERROR:",
        adminsError
      );

      return NextResponse.json(
        {
          success: false,
          error: adminsError.message,
        },
        { status: 500 }
      );
    }

    if (!admins || admins.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No admin accounts were found.",
        updated: [],
        failed: [],
      });
    }

    const updated: string[] = [];
    const failed: {
      id: string;
      email: string | null;
      error: string;
    }[] = [];

    for (const admin of admins) {
      const { error } =
        await supabaseAdmin.auth.admin.updateUserById(
          admin.id,
          {
            password: temporaryPassword,
          }
        );

      if (error) {
        failed.push({
          id: admin.id,
          email: admin.email,
          error: error.message,
        });
      } else {
        updated.push(admin.email || admin.id);
      }
    }

    return NextResponse.json({
      success: failed.length === 0,
      message:
        failed.length === 0
          ? "All admin passwords were successfully reset."
          : "Some admin passwords could not be reset.",
      totalAdmins: admins.length,
      updated,
      failed,
    });
  } catch (error) {
    console.error(
      "ADMIN PASSWORD RESET - UNEXPECTED ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}