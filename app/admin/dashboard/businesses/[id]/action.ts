"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type ActionResult = {
  success: boolean;
  error?: string;
};

async function verifyAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("ADMIN ACTION AUTH ERROR:", userError);

    return {
      user: null,
      admin: null,
      error: "You must be logged in to perform this action.",
    };
  }

  const admin = createAdminClient();

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  console.log("========== ADMIN ACTION CHECK ==========");
  console.log("User ID:", user.id);
  console.log("User email:", user.email);
  console.log("Profile:", profile);
  console.log("Profile error:", profileError);
  console.log("========================================");

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    console.error("ADMIN ACTION DENIED", {
      userId: user.id,
      email: user.email,
      profile,
      profileError,
    });

    return {
      user,
      admin: null,
      error: "You are not authorized to perform this action.",
    };
  }

  return {
    user,
    admin,
    error: null,
  };
}

// =========================================
// ACTIVATE / APPROVE BUSINESS
// =========================================

export async function activateBusiness(
  businessId: string
): Promise<ActionResult> {
  console.log(
    "========== ADMIN APPROVE BUSINESS =========="
  );

  const {
    admin,
    error: adminError,
  } = await verifyAdmin();

  if (adminError || !admin) {
    return {
      success: false,
      error:
        adminError ||
        "Unable to verify administrator.",
    };
  }

  if (!businessId) {
    return {
      success: false,
      error: "Business ID is required.",
    };
  }

  const {
    data: business,
    error: businessFetchError,
  } = await admin
    .from("businesses")
    .select(
      "id, name, status, onboarding_status"
    )
    .eq("id", businessId)
    .maybeSingle();

  if (businessFetchError) {
    console.error(
      "BUSINESS FETCH ERROR:",
      businessFetchError
    );

    return {
      success: false,
      error: "Unable to find the business.",
    };
  }

  if (!business) {
    return {
      success: false,
      error: "Business not found.",
    };
  }

  console.log(
    "BUSINESS BEFORE APPROVAL:",
    business
  );

  if (business.status === "approved") {
    return {
      success: false,
      error: "This business is already approved.",
    };
  }

  const {
    data: updatedBusiness,
    error: updateError,
  } = await admin
    .from("businesses")
    .update({
      status: "approved",
      onboarding_status: "complete",
    })
    .eq("id", businessId)
    .select(
      "id, name, status, onboarding_status"
    )
    .single();

  if (updateError) {
    console.error(
      "BUSINESS APPROVAL ERROR:",
      updateError
    );

    return {
      success: false,
      error:
        updateError.message ||
        "Unable to approve this business.",
    };
  }

  console.log(
    "BUSINESS APPROVED SUCCESSFULLY:",
    updatedBusiness
  );

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/dashboard/businesses");
  revalidatePath(
    `/admin/dashboard/businesses/${businessId}`
  );
  revalidatePath("/businesses");

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

  const {
    admin,
    error: adminError,
  } = await verifyAdmin();

  if (adminError || !admin) {
    return {
      success: false,
      error:
        adminError ||
        "Unable to verify administrator.",
    };
  }

  if (!businessId) {
    return {
      success: false,
      error: "Business ID is required.",
    };
  }

  const {
    data: business,
    error: businessFetchError,
  } = await admin
    .from("businesses")
    .select(
      "id, name, status, onboarding_status"
    )
    .eq("id", businessId)
    .maybeSingle();

  if (businessFetchError) {
    console.error(
      "BUSINESS FETCH ERROR:",
      businessFetchError
    );

    return {
      success: false,
      error: "Unable to find the business.",
    };
  }

  if (!business) {
    return {
      success: false,
      error: "Business not found.",
    };
  }

  if (business.status === "suspended") {
    return {
      success: false,
      error: "This business is already suspended.",
    };
  }

  const {
    data: updatedBusiness,
    error: updateError,
  } = await admin
    .from("businesses")
    .update({
      status: "suspended",
    })
    .eq("id", businessId)
    .select(
      "id, name, status, onboarding_status"
    )
    .single();

  if (updateError) {
    console.error(
      "BUSINESS SUSPENSION ERROR:",
      updateError
    );

    return {
      success: false,
      error:
        updateError.message ||
        "Unable to suspend this business.",
    };
  }

  console.log(
    "BUSINESS SUSPENDED SUCCESSFULLY:",
    updatedBusiness
  );

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/dashboard/businesses");
  revalidatePath(
    `/admin/dashboard/businesses/${businessId}`
  );
  revalidatePath("/businesses");

  return {
    success: true,
  };
}

// =========================================
// DELETE BUSINESS
// =========================================

export async function deleteBusiness(
  businessId: string
): Promise<ActionResult> {
  console.log(
    "========== ADMIN DELETE BUSINESS =========="
  );

  const {
    admin,
    error: adminError,
  } = await verifyAdmin();

  if (adminError || !admin) {
    return {
      success: false,
      error:
        adminError ||
        "Unable to verify administrator.",
    };
  }

  if (!businessId) {
    return {
      success: false,
      error: "Business ID is required.",
    };
  }

  // =========================================
  // 1. GET BUSINESS + OWNER
  // =========================================

  const {
    data: business,
    error: businessFetchError,
  } = await admin
    .from("businesses")
    .select(
      "id, name, status, owner_id"
    )
    .eq("id", businessId)
    .maybeSingle();

  if (businessFetchError) {
    console.error(
      "BUSINESS FETCH ERROR:",
      businessFetchError
    );

    return {
      success: false,
      error: "Unable to verify the business.",
    };
  }

  if (!business) {
    return {
      success: false,
      error: "Business not found.",
    };
  }

  console.log(
    "BUSINESS BEING DELETED:",
    business
  );

  const ownerId = business.owner_id;

  // =========================================
  // 2. DELETE BUSINESS
  // =========================================

  const {
    error: deleteError,
  } = await admin
    .from("businesses")
    .delete()
    .eq("id", businessId);

  if (deleteError) {
    console.error(
      "BUSINESS DELETE ERROR:",
      deleteError
    );

    return {
      success: false,
      error:
        "Unable to delete this business. It may still have related records such as products or orders.",
    };
  }

  console.log(
    "BUSINESS DELETED SUCCESSFULLY:",
    business
  );

  // =========================================
  // 3. CHECK IF OWNER HAS ANOTHER BUSINESS
  // =========================================

  const {
    data: remainingBusinesses,
    error: remainingBusinessesError,
  } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", ownerId)
    .limit(1);

  if (remainingBusinessesError) {
    console.error(
      "REMAINING BUSINESS CHECK ERROR:",
      remainingBusinessesError
    );

    return {
      success: false,
      error:
        "Business was deleted, but we could not complete account cleanup. Please check the owner's account.",
    };
  }

  // =========================================
  // 4. DELETE OWNER ACCOUNT
  // =========================================
  //
  // Only delete the Auth account if this owner
  // no longer owns any businesses.
  //
  // This allows the same email to register again.
  // =========================================

  if (
    !remainingBusinesses ||
    remainingBusinesses.length === 0
  ) {
    console.log(
      "NO OTHER BUSINESSES FOUND. REMOVING OWNER ACCOUNT:",
      ownerId
    );

    const {
      error: authDeleteError,
    } = await admin.auth.admin.deleteUser(
      ownerId
    );

    if (authDeleteError) {
      console.error(
        "OWNER AUTH DELETE ERROR:",
        authDeleteError
      );

      return {
        success: false,
        error:
          "Business was deleted, but the owner's account could not be removed. The email may still be registered.",
      };
    }

    console.log(
      "OWNER AUTH ACCOUNT DELETED SUCCESSFULLY:",
      ownerId
    );
  } else {
    console.log(
      "OWNER HAS OTHER BUSINESSES. AUTH ACCOUNT KEPT."
    );
  }

  // =========================================
  // 5. REVALIDATE
  // =========================================

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/dashboard/businesses");
  revalidatePath("/businesses");

  return {
    success: true,
  };
}