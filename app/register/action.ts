"use server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { z } from "zod";

const registrationSchema = z.object({
  ownerName: z
    .string()
    .min(2, "Please provide your full name."),

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
    .min(2, "Please provide your business name."),

  category: z
    .string()
    .min(1, "Please select a business category."),
});

export async function registerBusiness(
  formData: FormData
) {
  console.log(
    "========== BUSINESS REGISTRATION START =========="
  );

  try {
    const data = {
      ownerName: formData.get("ownerName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      businessName: formData.get("businessName"),
      category: formData.get("category"),
    };

    console.log(
      "BUSINESS REGISTRATION DATA RECEIVED:",
      {
        ownerName: data.ownerName,
        email: data.email,
        phone: data.phone,
        businessName: data.businessName,
        category: data.category,
      }
    );

    const result =
      registrationSchema.safeParse(data);

    if (!result.success) {
      console.error(
        "BUSINESS VALIDATION ERROR:",
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
    } = result.data;

    console.log(
      "BUSINESS VALIDATION SUCCESS"
    );

    const supabase = await createClient();

    console.log(
      "CREATING BUSINESS OWNER AUTH USER..."
    );

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: ownerName,
            phone,
            role: "business_owner",
            business_name: businessName,
          },
        },
      });

    if (authError) {
      console.error(
        "BUSINESS AUTH ERROR:",
        authError
      );

      return {
        success: false,
        error: authError.message,
      };
    }

    if (!authData.user) {
      console.error(
        "NO BUSINESS OWNER AUTH USER RETURNED"
      );

      return {
        success: false,
        error:
          "Unable to create your business account. Please try again.",
      };
    }

    const userId = authData.user.id;

    console.log(
      "BUSINESS OWNER AUTH USER CREATED:",
      userId
    );

    const supabaseAdmin =
      createAdminClient();

    console.log(
      "CREATING BUSINESS OWNER PROFILE..."
    );

    const {
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: ownerName,
          email,
          role: "business_owner",
        },
        {
          onConflict: "id",
        }
      );

    if (profileError) {
      console.error(
        "BUSINESS PROFILE CREATION ERROR:",
        profileError
      );

      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      return {
        success: false,
        error:
          "We could not finish setting up your business owner account. Please try again.",
      };
    }

    console.log(
      "BUSINESS OWNER PROFILE CREATED"
    );

    const cleanBusinessName =
      businessName.trim();

    const baseSlug = cleanBusinessName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug || "business";

    const {
      data: existingSlug,
      error: slugCheckError,
    } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (slugCheckError) {
      console.error(
        "BUSINESS SLUG CHECK ERROR:",
        slugCheckError
      );

      return {
        success: false,
        error:
          "Unable to prepare your business account. Please try again.",
      };
    }

    if (existingSlug) {
      slug = `${slug}-${Date.now()
        .toString()
        .slice(-6)}`;
    }

    console.log(
      "CREATING BUSINESS RECORD..."
    );

    const {
      data: business,
      error: businessError,
    } = await supabaseAdmin
      .from("businesses")
      .insert({
        name: cleanBusinessName,
        slug,
        owner_id: userId,
        category: category.trim(),
        phone: phone.trim(),
        status: "pending",
        onboarding_status: "incomplete",
      })
      .select(
        `
          id,
          name,
          slug,
          owner_id,
          category,
          phone,
          status,
          onboarding_status
        `
      )
      .single();

    if (businessError || !business) {
      console.error(
        "BUSINESS CREATION ERROR:",
        businessError
      );

      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      return {
        success: false,
        error:
          businessError?.message ||
          "Unable to create your business account.",
      };
    }

    console.log(
      "BUSINESS CREATED SUCCESSFULLY:",
      {
        businessId: business.id,
        businessName: business.name,
        ownerId: business.owner_id,
        status: business.status,
        onboardingStatus:
          business.onboarding_status,
      }
    );

    return {
      success: true,
      businessId: business.id,
      businessName: business.name,
      email,
      message:
        "Business account created successfully. Preparing payment...",
    };
  } catch (error) {
    console.error(
      "UNEXPECTED BUSINESS REGISTRATION ERROR:",
      error
    );

    return {
      success: false,
      error:
        "Something went wrong during business registration. Please try again.",
    };
  }
}