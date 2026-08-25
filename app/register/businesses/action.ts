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

  address: z
    .string()
    .min(5, "Business address is required."),
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

      address: String(
        formData.get("address") || ""
      ).trim(),
    };

    const result = registrationSchema.safeParse(data);

    if (!result.success) {
      console.error(
        "VALIDATION ERROR:",
        result.error.flatten()
      );

      return {
        success: false,
        error:
          result.error.issues[0]?.message ||
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
      address,
    } = result.data;

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // =========================================
    // 1. CREATE AUTH USER
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
      console.error(
        "AUTH ERROR:",
        authError
      );

      const message =
        authError.message.toLowerCase();

      if (
        message.includes("already registered") ||
        message.includes("already exists")
      ) {
        return {
          success: false,
          error:
            "This email is already registered. Please use the business login instead.",
        };
      }

      return {
        success: false,
        error: authError.message,
      };
    }

    if (!authData.user) {
      console.error(
        "NO AUTH USER RETURNED"
      );

      return {
        success: false,
        error:
          "Unable to create your account.",
      };
    }

    const userId = authData.user.id;

    console.log(
      "AUTH USER CREATED:",
      userId
    );

    // =========================================
    // 2. CREATE / UPDATE PROFILE
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

  await supabaseAdmin.auth.admin.deleteUser(
    userId
  );

  return {
    success: false,
    error:
      "We could not finish setting up your account. Please try again.",
  };
}

    console.log(
      "PROFILE CREATED SUCCESSFULLY"
    );

    // =========================================
    // 3. GENERATE UNIQUE BUSINESS SLUG
    // =========================================

    const slugBase = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const safeSlugBase =
      slugBase || "business";

    const slug = `${safeSlugBase}-${Date.now()}`;

    console.log(
      "BUSINESS SLUG:",
      slug
    );

    // =========================================
    // 4. CREATE BUSINESS
    // =========================================

    console.log(
      "CREATING BUSINESS..."
    );

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
        address,

        // Registration has been started,
        // but admin approval has not happened yet.
        status: "pending",

        // Business still needs to complete
        // the onboarding process.
        onboarding_status: "incomplete",
      })
      .select(
        `
          id,
          owner_id,
          name,
          slug,
          category,
          phone,
          address,
          status,
          onboarding_status
        `
      )
      .single();

    if (businessError) {
  console.error(
    "BUSINESS CREATION ERROR:",
    businessError
  );

  await supabaseAdmin.auth.admin.deleteUser(
    userId
  );

  return {
    success: false,
    error:
      businessError.message ||
      "Business creation failed.",
  };
}

    if (!business) {
  console.error(
    "BUSINESS CREATION FAILED: NO BUSINESS RETURNED"
  );

  await supabaseAdmin.auth.admin.deleteUser(
    userId
  );

  return {
    success: false,
    error:
      "Business was not created.",
  };
}

    console.log(
      "BUSINESS CREATED SUCCESSFULLY:",
      {
        id: business.id,
        name: business.name,
        ownerId: business.owner_id,
        status: business.status,
        onboardingStatus:
          business.onboarding_status,
      }
    );

    // =========================================
    // 5. REGISTRATION SUCCESS
    // =========================================

    console.log(
      "========== BUSINESS REGISTRATION SUCCESS =========="
    );

    return {
      success: true,
      userId,
      businessId: business.id,
      status: business.status,
      onboardingStatus:
        business.onboarding_status,
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