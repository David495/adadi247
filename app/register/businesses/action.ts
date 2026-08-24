"use server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { z } from "zod";

const registrationSchema = z.object({
  ownerName: z
    .string()
    .min(2, "Full name is required."),
  email: z
    .string()
    .email("Please provide a valid email address."),
  phone: z
    .string()
    .min(7, "Please provide a valid phone number."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters."),
  businessName: z
    .string()
    .min(2, "Business name is required."),
  category: z
    .string()
    .min(1, "Please select a business category."),
});

export async function registerBusiness(formData: FormData) {
  console.log(
    "========== BUSINESS REGISTRATION START =========="
  );

  try {
    const data = {
      ownerName: String(
        formData.get("ownerName") || ""
      ).trim(),

      email: String(
        formData.get("email") || ""
      )
        .trim()
        .toLowerCase(),

      phone: String(
        formData.get("phone") || ""
      ).trim(),

      password: String(
        formData.get("password") || ""
      ),

      businessName: String(
        formData.get("businessName") || ""
      ).trim(),

      category: String(
        formData.get("category") || ""
      ).trim(),
    };

    console.log("FORM DATA RECEIVED:", {
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone,
      businessName: data.businessName,
      category: data.category,
    });

    // =========================================
    // 1. VALIDATE FORM DATA
    // =========================================

    const result = registrationSchema.safeParse(data);

    if (!result.success) {
      console.error(
        "VALIDATION ERROR:",
        result.error.flatten()
      );

      return {
        success: false,
        error:
          "Please provide valid registration details.",
      };
    }

    const {
      ownerName,
      email,
      phone,
      password,
      businessName,
      category,
    } = result.data;

    console.log("VALIDATION SUCCESS");

    // =========================================
    // 2. CREATE SUPABASE CLIENTS
    // =========================================

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    console.log("SUPABASE CLIENTS CREATED");

    // =========================================
    // 3. CREATE AUTH USER
    // =========================================

    console.log("CREATING AUTH USER...");

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: ownerName,
          phone,
          role: "business_owner",
        },
      },
    });

    if (authError) {
      console.error("AUTH ERROR:", authError);

      if (
        authError.message
          .toLowerCase()
          .includes("already registered")
      ) {
        return {
          success: false,
          error:
            "This email is already registered. Please use the business login instead.",
        };
      }

      return {
        success: false,
        error: `Auth error: ${authError.message}`,
      };
    }

    if (!authData.user) {
      console.error("NO AUTH USER RETURNED");

      return {
        success: false,
        error: "Unable to create account.",
      };
    }

    const userId = authData.user.id;

    console.log(
      "AUTH USER CREATED:",
      userId
    );

    // =========================================
    // 4. CREATE / UPDATE PROFILE
    // =========================================

    console.log("CREATING PROFILE...");

    const {
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: ownerName,
          email,
          phone,
          role: "business_owner",
        },
        {
          onConflict: "id",
        }
      );

    if (profileError) {
      console.error(
        "PROFILE CREATION ERROR:",
        profileError
      );

      return {
        success: false,
        error: `Profile creation failed: ${profileError.message}`,
      };
    }

    console.log(
      "PROFILE CREATED SUCCESSFULLY"
    );

    // =========================================
    // 5. GENERATE BUSINESS SLUG
    // =========================================

    const slugBase = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const slug = `${slugBase}-${Date.now()}`;

    console.log(
      "BUSINESS SLUG GENERATED:",
      slug
    );

    // =========================================
    // 6. CREATE BUSINESS
    // =========================================

    console.log("CREATING BUSINESS...");

    const {
      data: business,
      error: businessError,
    } = await supabaseAdmin
      .from("businesses")
      .insert({
        owner_id: userId,
        name: businessName,
        slug,
        category,
        phone,
        status: "pending",
        onboarding_status: "incomplete",
      })
      .select()
      .single();

    if (businessError) {
      console.error(
        "BUSINESS CREATION ERROR:",
        businessError
      );

      return {
        success: false,
        error: `Business creation failed: ${businessError.message}`,
      };
    }

    if (!business) {
      console.error(
        "BUSINESS CREATION FAILED: NO BUSINESS RETURNED"
      );

      return {
        success: false,
        error: "Business was not created.",
      };
    }

    console.log(
      "BUSINESS CREATED SUCCESSFULLY:",
      {
        id: business.id,
        name: business.name,
        owner_id: business.owner_id,
      }
    );

    // =========================================
    // 7. REGISTRATION SUCCESS
    // =========================================

    console.log(
      "========== BUSINESS REGISTRATION SUCCESS =========="
    );

    return {
      success: true,
      userId,
      businessId: business.id,
      message:
        "Business account created successfully.",
    };
  } catch (error) {
    console.error(
      "UNEXPECTED REGISTRATION ERROR:",
      error
    );

    return {
      success: false,
      error:
        "Something went wrong during registration. Please try again.",
    };
  }
}