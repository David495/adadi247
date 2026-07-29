"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/app/lib/supabase/server";

type ActionResult = {
  success: boolean;
  error?: string;
};

async function verifyAdmin() {
  // =========================================
  // 1. CREATE SUPABASE SERVER CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. GET CURRENT USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      error: "You must be logged in to perform this action.",
    };
  }

  // =========================================
  // 3. GET USER PROFILE
  // =========================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  // =========================================
  // 4. VERIFY ADMIN ROLE
  // =========================================

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    console.error(
      "UNAUTHORIZED ADMIN ACTION:",
      {
        userId: user.id,
        role: profile?.role,
        profileError,
      }
    );

    return {
      supabase,
      user,
      error:
        "You are not authorized to perform this action.",
    };
  }

  return {
    supabase,
    user,
    error: null,
  };
}


// =========================================
// ACTIVATE BUSINESS
// =========================================

export async function activateBusiness(
  businessId: string
): Promise<ActionResult> {
  console.log(
    "========== ADMIN ACTIVATE BUSINESS =========="
  );

  // =========================================
  // 1. VERIFY ADMIN
  // =========================================

  const {
    supabase,
    error: adminError,
  } = await verifyAdmin();

  if (adminError) {
    return {
      success: false,
      error: adminError,
    };
  }

  // =========================================
  // 2. VALIDATE BUSINESS ID
  // =========================================

  if (!businessId) {
    return {
      success: false,
      error: "Business ID is required.",
    };
  }

  // =========================================
  // 3. CHECK BUSINESS EXISTS
  // =========================================

  const {
    data: business,
    error: businessFetchError,
  } = await supabase
    .from("businesses")
    .select("id, name, status")
    .eq("id", businessId)
    .maybeSingle();

  if (businessFetchError) {
    console.error(
      "BUSINESS FETCH ERROR:",
      businessFetchError
    );

    return {
      success: false,
      error:
        "Unable to find the business.",
    };
  }

  if (!business) {
    return {
      success: false,
      error: "Business not found.",
    };
  }

  // =========================================
  // 4. CHECK CURRENT STATUS
  // =========================================

  if (business.status === "active") {
    return {
      success: false,
      error:
        "This business is already active.",
    };
  }

  // =========================================
  // 5. ACTIVATE BUSINESS
  // =========================================

  const {
    error: updateError,
  } = await supabase
    .from("businesses")
    .update({
      status: "active",
      onboarding_status: "complete",
    })
    .eq("id", businessId);

  // =========================================
  // 6. HANDLE UPDATE ERROR
  // =========================================

  if (updateError) {
    console.error(
      "BUSINESS ACTIVATION ERROR:",
      updateError
    );

    return {
      success: false,
      error:
        "Unable to activate this business. Please try again.",
    };
  }

  console.log(
    "BUSINESS ACTIVATED SUCCESSFULLY:",
    business.name
  );

  // =========================================
  // 7. REFRESH ADMIN PAGES
  // =========================================

  revalidatePath(
    "/admin/dashboard"
  );

  revalidatePath(
    "/admin/dashboard/businesses"
  );

  revalidatePath(
    `/admin/dashboard/businesses/${businessId}`
  );

  revalidatePath(
    "/businesses",
    "page"
  );

  // =========================================
  // 8. RETURN SUCCESS
  // =========================================

  return {
    success: true,
  };
}


// =========================================
// SUSPEND BUSINESS
// =========================================

export async function suspendBusiness(
  businessId: string
): Promise<ActionResult> {
  console.log(
    "========== ADMIN SUSPEND BUSINESS =========="
  );

  // =========================================
  // 1. VERIFY ADMIN
  // =========================================

  const {
    supabase,
    error: adminError,
  } = await verifyAdmin();

  if (adminError) {
    return {
      success: false,
      error: adminError,
    };
  }

  // =========================================
  // 2. VALIDATE BUSINESS ID
  // =========================================

  if (!businessId) {
    return {
      success: false,
      error: "Business ID is required.",
    };
  }

  // =========================================
  // 3. CHECK BUSINESS
  // =========================================

  const {
    data: business,
    error: businessFetchError,
  } = await supabase
    .from("businesses")
    .select("id, name, status")
    .eq("id", businessId)
    .maybeSingle();

  if (businessFetchError) {
    console.error(
      "BUSINESS FETCH ERROR:",
      businessFetchError
    );

    return {
      success: false,
      error:
        "Unable to find the business.",
    };
  }

  if (!business) {
    return {
      success: false,
      error: "Business not found.",
    };
  }

  // =========================================
  // 4. CHECK CURRENT STATUS
  // =========================================

  if (business.status === "suspended") {
    return {
      success: false,
      error:
        "This business is already suspended.",
    };
  }

  // =========================================
  // 5. SUSPEND BUSINESS
  // =========================================

  const {
    error: updateError,
  } = await supabase
    .from("businesses")
    .update({
      status: "suspended",
    })
    .eq("id", businessId);

  // =========================================
  // 6. HANDLE UPDATE ERROR
  // =========================================

  if (updateError) {
    console.error(
      "BUSINESS SUSPENSION ERROR:",
      updateError
    );

    return {
      success: false,
      error:
        "Unable to suspend this business. Please try again.",
    };
  }

  console.log(
    "BUSINESS SUSPENDED SUCCESSFULLY:",
    business.name
  );

  // =========================================
  // 7. REFRESH PAGES
  // =========================================

  revalidatePath(
    "/admin/dashboard"
  );

  revalidatePath(
    "/admin/dashboard/businesses"
  );

  revalidatePath(
    `/admin/dashboard/businesses/${businessId}`
  );

  revalidatePath(
    "/businesses",
    "page"
  );

  // =========================================
  // 8. RETURN SUCCESS
  // =========================================

  return {
    success: true,
  };
}