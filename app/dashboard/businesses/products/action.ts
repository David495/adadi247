"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export async function deleteProduct(
  productId: string
) {
  // =========================================
  // 1. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. GET CURRENT USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // =========================================
  // 3. CHECK AUTHENTICATION
  // =========================================

  if (userError || !user) {
    redirect("/login");
  }

  // =========================================
  // 4. GET BUSINESS OWNED BY USER
  // =========================================

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error(
      "DELETE PRODUCT - BUSINESS ERROR:",
      businessError
    );

    throw new Error(
      `Failed to verify business ownership: ${businessError.message}`
    );
  }

  if (!business) {
    throw new Error(
      "Business not found."
    );
  }

  // =========================================
  // 5. VALIDATE PRODUCT ID
  // =========================================

  if (!productId) {
    throw new Error(
      "Product ID is required."
    );
  }

  // =========================================
  // 6. DELETE PRODUCT
  // =========================================

  const {
    error: deleteError,
  } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("business_id", business.id);

  // =========================================
  // 7. HANDLE DELETE ERROR
  // =========================================

  if (deleteError) {
    console.error(
      "DELETE PRODUCT ERROR MESSAGE:",
      deleteError.message
    );

    console.error(
      "DELETE PRODUCT ERROR DETAILS:",
      deleteError.details
    );

    console.error(
      "DELETE PRODUCT ERROR HINT:",
      deleteError.hint
    );

    console.error(
      "DELETE PRODUCT ERROR CODE:",
      deleteError.code
    );

    throw new Error(
      `Failed to delete product: ${deleteError.message}`
    );
  }

  // =========================================
  // 8. REFRESH PRODUCTS PAGE
  // =========================================

  revalidatePath(
    "/dashboard/businesses/products"
  );
}