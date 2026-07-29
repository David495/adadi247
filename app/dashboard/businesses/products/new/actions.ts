"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

// =========================================
// SUPABASE STORAGE BUCKET
// =========================================

const PRODUCT_IMAGE_BUCKET = "product-images";

// =========================================
// CREATE PRODUCT
// =========================================

export async function createProduct(
  formData: FormData
) {
  // =========================================
  // 1. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. GET CURRENT LOGGED-IN USER
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
      "CREATE PRODUCT - AUTH ERROR:",
      userError
    );

    redirect("/login");
  }

  // =========================================
  // 4. GET USER'S BUSINESS
  // =========================================

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  // =========================================
  // 5. CHECK BUSINESS
  // =========================================

  if (businessError) {
    console.error(
      "CREATE PRODUCT - BUSINESS ERROR:",
      businessError
    );

    throw new Error(
      `Failed to find business: ${businessError.message}`
    );
  }

  if (!business) {
    throw new Error(
      "No business was found for your account."
    );
  }

  // =========================================
  // 6. GET FORM DATA
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

  const imageFile =
    formData.get("product_image");

  // =========================================
  // 7. VALIDATE PRODUCT NAME
  // =========================================

  if (!name) {
    throw new Error(
      "Product name is required."
    );
  }

  // =========================================
  // 8. VALIDATE PRICE
  // =========================================

  const price = Number(
    priceValue
  );

  if (
    !priceValue ||
    Number.isNaN(price) ||
    price < 0
  ) {
    throw new Error(
      "Please enter a valid product price."
    );
  }

  // =========================================
  // 9. PREPARE IMAGE URL
  // =========================================

  let imageUrl: string | null =
    null;

  let uploadedImagePath:
    | string
    | null = null;

  // =========================================
  // 10. CHECK IF IMAGE WAS SELECTED
  // =========================================

  if (
    imageFile instanceof File &&
    imageFile.size > 0
  ) {
    // =========================================
    // 10A. VALIDATE IMAGE TYPE
    // =========================================

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        imageFile.type
      )
    ) {
      throw new Error(
        "Invalid image type. Please upload PNG, JPG, JPEG or WEBP."
      );
    }

    // =========================================
    // 10B. VALIDATE IMAGE SIZE
    // =========================================

    const maxFileSize =
      5 * 1024 * 1024;

    if (
      imageFile.size >
      maxFileSize
    ) {
      throw new Error(
        "Image is too large. Please upload an image smaller than 5MB."
      );
    }

    // =========================================
    // 10C. GET FILE EXTENSION
    // =========================================

    const fileExtension =
      imageFile.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    // =========================================
    // 10D. CREATE UNIQUE FILE PATH
    // =========================================

    const fileName =
      `${crypto.randomUUID()}.${fileExtension}`;

    uploadedImagePath =
      `${business.id}/${fileName}`;

    console.log(
      "UPLOADING PRODUCT IMAGE:",
      uploadedImagePath
    );

    // =========================================
    // 10E. CONVERT FILE TO ARRAY BUFFER
    // =========================================

    const arrayBuffer =
      await imageFile.arrayBuffer();

    const fileBuffer =
      new Uint8Array(
        arrayBuffer
      );

    // =========================================
    // 10F. UPLOAD IMAGE TO SUPABASE STORAGE
    // =========================================

    const {
      error: uploadError,
    } = await supabase.storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .upload(
        uploadedImagePath,
        fileBuffer,
        {
          contentType:
            imageFile.type,
          upsert: false,
        }
      );

    // =========================================
    // 10G. HANDLE UPLOAD ERROR
    // =========================================

    if (uploadError) {
      console.error(
        "PRODUCT IMAGE UPLOAD ERROR:",
        uploadError
      );

      throw new Error(
        `Image upload failed: ${uploadError.message}`
      );
    }

    console.log(
      "PRODUCT IMAGE UPLOAD SUCCESS:",
      uploadedImagePath
    );

    // =========================================
    // 10H. GET PUBLIC IMAGE URL
    // =========================================

    const {
      data: publicUrlData,
    } = supabase.storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .getPublicUrl(
        uploadedImagePath
      );

    imageUrl =
      publicUrlData.publicUrl;

    console.log(
      "PRODUCT IMAGE PUBLIC URL:",
      imageUrl
    );
  }

  // =========================================
  // 11. CREATE PRODUCT SLUG
  // =========================================

  const slug =
    `${name
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )}-${Date.now()}`;

  // =========================================
  // 12. INSERT PRODUCT INTO DATABASE
  // =========================================

  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .insert({
      business_id:
        business.id,

      name,

      slug,

      description,

      price,

      category_id:
        categoryId,

      image_url:
        imageUrl,

      is_available:
        true,
    })
    .select(
      "id, name, image_url"
    )
    .single();

  // =========================================
  // 13. HANDLE PRODUCT CREATION ERROR
  // =========================================

  if (productError) {
    console.error(
      "CREATE PRODUCT DATABASE ERROR:",
      productError
    );

    // =========================================
    // DELETE UPLOADED IMAGE IF DB INSERT FAILS
    // =========================================

    if (
      uploadedImagePath
    ) {
      const {
        error:
          cleanupError,
      } = await supabase.storage
        .from(
          PRODUCT_IMAGE_BUCKET
        )
        .remove([
          uploadedImagePath,
        ]);

      if (cleanupError) {
        console.error(
          "IMAGE CLEANUP ERROR:",
          cleanupError
        );
      }
    }

    throw new Error(
      `Failed to create product: ${productError.message}`
    );
  }

  // =========================================
  // 14. LOG SUCCESS
  // =========================================

  console.log(
    "PRODUCT CREATED SUCCESSFULLY:",
    product
  );

  // =========================================
  // 15. REFRESH PRODUCTS PAGE
  // =========================================

  revalidatePath(
    "/dashboard/businesses/products"
  );

  // =========================================
  // 16. REDIRECT TO PRODUCTS PAGE
  // =========================================

  redirect(
    "/dashboard/businesses/products"
  );
}