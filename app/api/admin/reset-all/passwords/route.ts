import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const setupSecret = process.env.ADMIN_SETUP_SECRET;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!setupSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "ADMIN_SETUP_SECRET is not configured.",
        },
        { status: 500 }
      );
    }

    if (!adminPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "ADMIN_PASSWORD is not configured.",
        },
        { status: 500 }
      );
    }

    if (adminPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "ADMIN_PASSWORD must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || body.secret !== setupSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const {
      data: admins,
      error: adminsError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("role", "admin");

    if (adminsError) {
      console.error(
        "ADMIN PASSWORD SYNC - PROFILE ERROR:",
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
        message: "No admin profiles found.",
        totalAdmins: 0,
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
      const {
        data: authUser,
        error: authUserError,
      } = await supabaseAdmin.auth.admin.getUserById(admin.id);

      if (authUserError || !authUser.user) {
        failed.push({
          id: admin.id,
          email: admin.email,
          error:
            authUserError?.message ||
            "Auth user does not exist.",
        });

        continue;
      }

      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(
          admin.id,
          {
            password: adminPassword,
          }
        );

      if (updateError) {
        failed.push({
          id: admin.id,
          email: admin.email,
          error: updateError.message,
        });
      } else {
        updated.push(admin.email || admin.id);
      }
    }

    return NextResponse.json({
      success: failed.length === 0,
      message:
        failed.length === 0
          ? "Admin passwords synchronized successfully."
          : "Some admin passwords could not be synchronized.",
      totalAdmins: admins.length,
      updated,
      failed,
    });
  } catch (error) {
    console.error(
      "ADMIN PASSWORD SYNC - UNEXPECTED ERROR:",
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