"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export type CreateProductState = {
  error: string | null;
};

export async function createProduct(
  _previousState: CreateProductState,
  formData: FormData
): Promise<CreateProductState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "CREATE PRODUCT - AUTH ERROR:",
      userError
    );

    redirect("/login");
  }

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error(
      "CREATE PRODUCT - BUSINESS ERROR:",
      businessError
    );

    return {
      error:
        "We couldn't find your business account. Please try again.",
    };
  }

  if (!business) {
    return {
      error:
        "No business was found for your account.",
    };
  }

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

  if (!name) {
    return {
      error: "Product name is required.",
    };
  }

  if (!priceValue) {
    return {
      error: "Product price is required.",
    };
  }

  const price = Number(priceValue);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    return {
      error:
        "Please enter a valid product price.",
    };
  }

  let imageUrl: string | null = null;
  let uploadedImagePath: string | null = null;

  if (
    imageFile instanceof File &&
    imageFile.size > 0
  ) {
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
      return {
        error:
          "Invalid image type. Please upload PNG, JPG, JPEG or WEBP.",
      };
    }

    if (
      imageFile.size >
      MAX_IMAGE_SIZE
    ) {
      const fileSizeMB = (
        imageFile.size /
        (1024 * 1024)
      ).toFixed(1);

      return {
        error:
          `This image is ${fileSizeMB}MB. ` +
          "The maximum allowed size is 5MB.",
      };
    }

    const fileExtension =
      imageFile.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const fileName =
      `${crypto.randomUUID()}.${fileExtension}`;

    uploadedImagePath =
      `${business.id}/${fileName}`;

    try {
      const arrayBuffer =
        await imageFile.arrayBuffer();

      const fileBuffer =
        new Uint8Array(arrayBuffer);

      const {
        error: uploadError,
      } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(
          uploadedImagePath,
          fileBuffer,
          {
            contentType:
              imageFile.type,
            upsert: false,
          }
        );

      if (uploadError) {
        console.error(
          "PRODUCT IMAGE UPLOAD ERROR:",
          uploadError
        );

        return {
          error:
            "We couldn't upload this image. Please try again or use a smaller image.",
        };
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(
          uploadedImagePath
        );

      imageUrl =
        publicUrlData.publicUrl;
    } catch (error) {
      console.error(
        "PRODUCT IMAGE UPLOAD EXCEPTION:",
        error
      );

      return {
        error:
          "Something went wrong while uploading the image. Please try again.",
      };
    }
  }

  const slug =
    `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}-${Date.now()}`;

  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .insert({
      business_id: business.id,
      name,
      slug,
      description,
      price,
      category_id: categoryId,
      image_url: imageUrl,
      is_available: true,
    })
    .select(
      "id, name, image_url"
    )
    .single();

  if (productError) {
    console.error(
      "CREATE PRODUCT DATABASE ERROR:",
      productError
    );

    if (uploadedImagePath) {
      const {
        error: cleanupError,
      } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
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

    return {
      error:
        "The product could not be created. Please try again.",
    };
  }

  console.log(
    "PRODUCT CREATED SUCCESSFULLY:",
    product
  );

  revalidatePath(
    "/dashboard/businesses/products"
  );

  redirect(
    "/dashboard/businesses/products"
  );
}