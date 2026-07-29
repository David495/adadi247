import Link from "next/link";
import {
  Plus,
  Package,
  Pencil,
} from "lucide-react";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";
import DeleteButton from "./delete-button";

// Always fetch fresh data from Supabase
export const dynamic = "force-dynamic";

export default async function BusinessProductsPage() {
  // =========================================
  // 1. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. GET LOGGED-IN USER
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
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  // =========================================
  // 5. HANDLE BUSINESS ERROR
  // =========================================

  if (businessError) {
    console.error(
      "BUSINESS PRODUCTS - BUSINESS ERROR:",
      businessError
    );

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-xl font-bold text-red-800">
          Unable to Load Business
        </h1>

        <p className="mt-2 text-sm text-red-700">
          Something went wrong while loading your
          business information.
        </p>

        <p className="mt-3 text-xs text-red-600">
          {businessError.message}
        </p>
      </div>
    );
  }

  // =========================================
  // 6. HANDLE BUSINESS NOT FOUND
  // =========================================

  if (!business) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-[#242424]">
          Business Not Found
        </h1>

        <p className="mt-2 text-gray-500">
          We could not find a business connected to
          your account.
        </p>
      </div>
    );
  }

  // =========================================
  // 7. GET PRODUCTS BELONGING TO THIS BUSINESS
  // =========================================

  const {
    data: products,
    error: productsError,
  } = await supabase
    .from("products")
    .select(`
      id,
      business_id,
      name,
      slug,
      description,
      price,
      image_url,
      is_available,
      created_at
    `)
    .eq(
      "business_id",
      business.id
    )
    .order("created_at", {
      ascending: false,
    });

  // =========================================
  // 8. HANDLE PRODUCTS FETCH ERROR
  // =========================================

  if (productsError) {
    console.error(
      "PRODUCTS FETCH ERROR:",
      productsError
    );
  }

  // =========================================
  // 9. DEBUG PRODUCT IMAGE DATA
  // =========================================

  console.log(
    "PRODUCT IMAGE DATA:",
    products?.map((product) => ({
      name: product.name,
      image_url: product.image_url,
    }))
  );

  // =========================================
  // 10. RETURN PRODUCTS PAGE
  // =========================================

  return (
    <div className="space-y-8">

      {/* ========================================= */}
      {/* PAGE HEADER */}
      {/* ========================================= */}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <p className="text-sm font-medium text-[#8B1E3F]">
            Business Management
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#242424]">
            Products & Services
          </h1>

          <p className="mt-2 text-gray-500">
            Manage the products and services offered by{" "}

            <span className="font-semibold text-[#64152E]">
              {business.name}
            </span>
            .
          </p>

        </div>

        {/* ========================================= */}
        {/* ADD PRODUCT BUTTON */}
        {/* ========================================= */}

        <Link
          href="/dashboard/businesses/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#64152E] focus:outline-none focus:ring-2 focus:ring-[#8B1E3F] focus:ring-offset-2"
        >
          <Plus size={18} />

          Add Product
        </Link>

      </div>


      {/* ========================================= */}
      {/* PRODUCT ERROR */}
      {/* ========================================= */}

      {productsError && (

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">

          <p className="font-semibold">
            Unable to load your products.
          </p>

          <p className="mt-1 text-sm">
            Please refresh the page and try again.
          </p>

          <p className="mt-3 rounded-lg bg-white/60 p-3 text-xs">
            Error: {productsError.message}
          </p>

        </div>

      )}


      {/* ========================================= */}
      {/* EMPTY STATE */}
      {/* ========================================= */}

      {!productsError &&
        (!products ||
          products.length === 0) && (

          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#8B1E3F]/10">

              <Package
                size={34}
                className="text-[#8B1E3F]"
              />

            </div>

            <h2 className="mt-6 text-xl font-bold text-[#242424]">
              No products yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              You haven't added any products or services
              to your business yet. Add your first product
              to start building your digital storefront.
            </p>

            {/* ========================================= */}
            {/* ADD FIRST PRODUCT */}
            {/* ========================================= */}

            <Link
              href="/dashboard/businesses/products/new"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#64152E]"
            >
              <Plus size={18} />

              Add Your First Product
            </Link>

          </div>

        )}


      {/* ========================================= */}
      {/* PRODUCTS GRID */}
      {/* ========================================= */}

      {products &&
        products.length > 0 && (

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

            {products.map(
              (product) => (

                <div
                  key={product.id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >

                  {/* ========================================= */}
                  {/* PRODUCT IMAGE */}
                  {/* ========================================= */}

                  <div className="relative h-52 overflow-hidden bg-[#FAF8F6]">

                    {product.image_url ? (

                      <img
                        src={
                          product.image_url
                        }
                        alt={
                          product.name
                        }
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                    ) : (

                      <div className="flex h-full items-center justify-center">

                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B1E3F]/10">

                          <Package
                            size={32}
                            className="text-[#8B1E3F]"
                          />

                        </div>

                      </div>

                    )}

                    {/* ========================================= */}
                    {/* AVAILABILITY BADGE */}
                    {/* ========================================= */}

                    <div className="absolute right-4 top-4">

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
                          product.is_available
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                        }`}
                      >
                        {product.is_available
                          ? "Available"
                          : "Unavailable"}
                      </span>

                    </div>

                  </div>


                  {/* ========================================= */}
                  {/* PRODUCT DETAILS */}
                  {/* ========================================= */}

                  <div className="p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <h2 className="truncate text-lg font-bold text-[#242424]">
                          {product.name}
                        </h2>

                        <p className="mt-1 text-xl font-bold text-[#8B1E3F]">
                          ₦
                          {Number(
                            product.price
                          ).toLocaleString(
                            "en-NG"
                          )}
                        </p>

                      </div>

                    </div>


                    {/* ========================================= */}
                    {/* DESCRIPTION */}
                    {/* ========================================= */}

                    {product.description && (

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">
                        {
                          product.description
                        }
                      </p>

                    )}


                    {/* ========================================= */}
                    {/* ACTIONS */}
                    {/* ========================================= */}

                    <div className="mt-5 flex gap-3 border-t border-gray-100 pt-5">

                      {/* ========================================= */}
                      {/* EDIT */}
                      {/* ========================================= */}

                      <Link
                        href={`/dashboard/businesses/products/${product.id}/edit`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#8B1E3F]/30 hover:bg-[#8B1E3F]/5 hover:text-[#8B1E3F]"
                      >
                        <Pencil size={16} />

                        Edit
                      </Link>


                      {/* ========================================= */}
                      {/* DELETE */}
                      {/* ========================================= */}

                      <DeleteButton
                        productId={
                          product.id
                        }
                        productName={
                          product.name
                        }
                      />

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

    </div>
  );
}