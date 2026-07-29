import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateProduct } from "./actions";

import { createClient } from "@/app/lib/supabase/server";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  // =========================================
  // 1. GET PRODUCT ID
  // =========================================

  const { id } = await params;

  // =========================================
  // 2. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 3. GET CURRENTLY LOGGED-IN USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // =========================================
  // 4. CHECK AUTHENTICATION
  // =========================================

  if (userError || !user) {
    redirect("/login");
  }

  // =========================================
  // 5. GET BUSINESS OWNED BY USER
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
  // 6. CHECK BUSINESS
  // =========================================

  if (businessError) {
    console.error(
      "EDIT PRODUCT - BUSINESS FETCH ERROR MESSAGE:",
      businessError.message
    );

    console.error(
      "EDIT PRODUCT - BUSINESS FETCH ERROR DETAILS:",
      businessError.details
    );

    console.error(
      "EDIT PRODUCT - BUSINESS FETCH ERROR HINT:",
      businessError.hint
    );

    console.error(
      "EDIT PRODUCT - BUSINESS FETCH ERROR CODE:",
      businessError.code
    );

    throw new Error(
      `Failed to load your business: ${businessError.message}`
    );
  }

  if (!business) {
    redirect("/register/businesses");
  }

  // =========================================
  // 7. GET PRODUCT
  // =========================================

  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  // =========================================
  // 8. CHECK PRODUCT ERROR
  // =========================================

  if (productError) {
    console.error(
      "EDIT PRODUCT FETCH ERROR MESSAGE:",
      productError.message
    );

    console.error(
      "EDIT PRODUCT FETCH ERROR DETAILS:",
      productError.details
    );

    console.error(
      "EDIT PRODUCT FETCH ERROR HINT:",
      productError.hint
    );

    console.error(
      "EDIT PRODUCT FETCH ERROR CODE:",
      productError.code
    );

    console.error(
      "EDIT PRODUCT ID:",
      id
    );

    console.error(
      "EDIT PRODUCT BUSINESS ID:",
      business.id
    );

    throw new Error(
      `Failed to load product: ${productError.message}`
    );
  }

  // =========================================
  // 9. CHECK IF PRODUCT EXISTS
  // =========================================

  if (!product) {
    notFound();
  }

  // =========================================
  // 10. GET CATEGORIES
  // =========================================

  const {
    data: categories,
    error: categoryError,
  } = await supabase
    .from("categories")
    .select("id, name")
    .order("name", {
      ascending: true,
    });

  // =========================================
  // 11. CHECK CATEGORY ERROR
  // =========================================

  if (categoryError) {
    console.error(
      "EDIT PRODUCT - CATEGORY FETCH ERROR MESSAGE:",
      categoryError.message
    );

    console.error(
      "EDIT PRODUCT - CATEGORY FETCH ERROR DETAILS:",
      categoryError.details
    );

    console.error(
      "EDIT PRODUCT - CATEGORY FETCH ERROR HINT:",
      categoryError.hint
    );

    console.error(
      "EDIT PRODUCT - CATEGORY FETCH ERROR CODE:",
      categoryError.code
    );

    throw new Error(
      `Failed to load categories: ${categoryError.message}`
    );
  }

  // =========================================
  // 12. RENDER EDIT PAGE
  // =========================================

  return (
    <div className="mx-auto max-w-3xl">

      {/* ========================================= */}
      {/* HEADER */}
      {/* ========================================= */}

      <div className="mb-8">

        <Link
          href="/dashboard/businesses/products"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to Products
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Edit Product
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Update your product or service information.
        </p>

      </div>

      {/* ========================================= */}
      {/* FORM */}
      {/* ========================================= */}

      <form
        action={updateProduct.bind(null, product.id)}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-6"
      >

        {/* ========================================= */}
        {/* PRODUCT NAME */}
        {/* ========================================= */}

        <div>

          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Product Name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={product.name}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-900"
          />

        </div>

        {/* ========================================= */}
        {/* CATEGORY */}
        {/* ========================================= */}

        <div>

          <label
            htmlFor="category_id"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Category
          </label>

          <select
            id="category_id"
            name="category_id"
            defaultValue={product.category_id ?? ""}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-gray-900"
          >

            <option value="">
              Select a category
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}

          </select>

        </div>

        {/* ========================================= */}
        {/* DESCRIPTION */}
        {/* ========================================= */}

        <div>

          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Description
          </label>

          <textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={product.description ?? ""}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-900"
          />

        </div>

        {/* ========================================= */}
        {/* PRICE */}
        {/* ========================================= */}

        <div>

          <label
            htmlFor="price"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Price
          </label>

          <input
            id="price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={product.price}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-900"
          />

        </div>

        {/* ========================================= */}
        {/* IMAGE URL */}
        {/* ========================================= */}

        <div>

          <label
            htmlFor="image_url"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Product Image URL
          </label>

          <input
            id="image_url"
            name="image_url"
            type="url"
            defaultValue={product.image_url ?? ""}
            placeholder="https://example.com/image.jpg"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-900"
          />

          <p className="mt-2 text-xs text-gray-500">
            You can add an image URL now. We can add direct image uploads later.
          </p>

        </div>

        {/* ========================================= */}
        {/* AVAILABILITY */}
        {/* ========================================= */}

        <div className="flex items-center gap-3">

          <input
            id="is_available"
            name="is_available"
            type="checkbox"
            defaultChecked={product.is_available}
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />

          <label
            htmlFor="is_available"
            className="text-sm font-medium text-gray-700"
          >
            Product is available for purchase
          </label>

        </div>

        {/* ========================================= */}
        {/* ACTIONS */}
        {/* ========================================= */}

        <div className="flex items-center justify-end gap-3 border-t pt-6">

          <Link
            href="/dashboard/businesses/products"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-[#8B1E3F] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#64152E]"
          >
            Save Changes
          </button>

        </div>

      </form>

    </div>
  );
}