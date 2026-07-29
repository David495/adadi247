"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export async function updateProduct(
  productId: string,
  formData: FormData
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
    console.error(
      "UPDATE PRODUCT - AUTH ERROR:",
      userError
    );

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
    .select("id, owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  // =========================================
  // 5. CHECK BUSINESS
  // =========================================

  if (businessError) {
    console.error(
      "UPDATE PRODUCT - BUSINESS FETCH ERROR MESSAGE:",
      businessError.message
    );

    console.error(
      "UPDATE PRODUCT - BUSINESS FETCH ERROR DETAILS:",
      businessError.details
    );

    console.error(
      "UPDATE PRODUCT - BUSINESS FETCH ERROR HINT:",
      businessError.hint
    );

    console.error(
      "UPDATE PRODUCT - BUSINESS FETCH ERROR CODE:",
      businessError.code
    );

    throw new Error(
      `Failed to find your business: ${businessError.message}`
    );
  }

  if (!business) {
    redirect("/register/businesses");
  }

  // =========================================
  // 6. GET FORM VALUES
  // =========================================

  const name = String(
    formData.get("name") || ""
  ).trim();

  const categoryId =
    String(
      formData.get("category_id") || ""
    ).trim() || null;

  const description =
    String(
      formData.get("description") || ""
    ).trim() || null;

  const priceValue = String(
    formData.get("price") || ""
  ).trim();

  const imageUrl =
    String(
      formData.get("image_url") || ""
    ).trim() || null;

  const isAvailable =
    formData.get("is_available") === "on";

  // =========================================
  // 7. VALIDATE PRODUCT ID
  // =========================================

  if (!productId) {
    throw new Error(
      "Product ID is missing."
    );
  }

  // =========================================
  // 8. VALIDATE PRODUCT NAME
  // =========================================

  if (!name) {
    throw new Error(
      "Product name is required."
    );
  }

  // =========================================
  // 9. VALIDATE PRICE
  // =========================================

  if (!priceValue) {
    throw new Error(
      "Product price is required."
    );
  }

  const price = Number(priceValue);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new Error(
      "Please enter a valid price."
    );
  }

  // =========================================
  // 10. VERIFY PRODUCT BELONGS TO BUSINESS
  // =========================================

  const {
    data: existingProduct,
    error: existingProductError,
  } = await supabase
    .from("products")
    .select("id, business_id")
    .eq("id", productId)
    .eq("business_id", business.id)
    .maybeSingle();

  // =========================================
  // 11. CHECK EXISTING PRODUCT
  // =========================================

  if (existingProductError) {
    console.error(
      "UPDATE PRODUCT - EXISTING PRODUCT ERROR:",
      existingProductError
    );

    throw new Error(
      `Failed to verify product: ${existingProductError.message}`
    );
  }

  if (!existingProduct) {
    throw new Error(
      "Product not found or you do not have permission to edit it."
    );
  }

  // =========================================
  // 12. PREPARE UPDATED PRODUCT DATA
  // =========================================

  const productData = {
    name,
    category_id: categoryId,
    description,
    price,
    image_url: imageUrl,
    is_available: isAvailable,
  };

  console.log(
    "UPDATING PRODUCT:",
    {
      productId,
      businessId: business.id,
      productData,
    }
  );

  // =========================================
  // 13. UPDATE PRODUCT
  // =========================================

  const {
    data: updatedProduct,
    error: updateError,
  } = await supabase
    .from("products")
    .update(productData)
    .eq("id", productId)
    .eq("business_id", business.id)
    .select()
    .maybeSingle();

  // =========================================
  // 14. HANDLE UPDATE ERROR
  // =========================================

  if (updateError) {
    console.error(
      "PRODUCT UPDATE ERROR MESSAGE:",
      updateError.message
    );

    console.error(
      "PRODUCT UPDATE ERROR DETAILS:",
      updateError.details
    );

    console.error(
      "PRODUCT UPDATE ERROR HINT:",
      updateError.hint
    );

    console.error(
      "PRODUCT UPDATE ERROR CODE:",
      updateError.code
    );

    throw new Error(
      `Failed to update product: ${updateError.message}`
    );
  }

  // =========================================
  // 15. CHECK IF PRODUCT WAS UPDATED
  // =========================================

  if (!updatedProduct) {
    console.error(
      "PRODUCT UPDATE FAILED: No product was updated."
    );

    console.error(
      "PRODUCT ID:",
      productId
    );

    console.error(
      "BUSINESS ID:",
      business.id
    );

    throw new Error(
      "Product could not be updated. The product may not belong to your business."
    );
  }

  // =========================================
  // 16. SUCCESS
  // =========================================

  console.log(
    "PRODUCT UPDATED SUCCESSFULLY:",
    updatedProduct
  );

  // =========================================
  // 17. REDIRECT TO PRODUCTS PAGE
  // =========================================

  redirect(
    "/dashboard/businesses/products"
  );
}