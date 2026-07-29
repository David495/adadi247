import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

type BusinessPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BusinessPublicPage({
  params,
}: BusinessPageProps) {
  // =========================================
  // 1. GET SLUG
  // =========================================

  const { slug } = await params;

  // =========================================
  // 2. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 3. GET BUSINESS
  // =========================================

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  // =========================================
  // 4. HANDLE BUSINESS ERROR
  // =========================================

  if (businessError) {
    console.error(
      "Error fetching public business:",
      businessError
    );

    throw new Error(
      `Failed to load business: ${businessError.message}`
    );
  }

  // =========================================
  // 5. BUSINESS NOT FOUND
  // =========================================

  if (!business) {
    notFound();
  }

  // =========================================
  // 6. GET PRODUCTS
  // =========================================

  const {
    data: products,
    error: productsError,
  } = await supabase
    .from("products")
    .select(
      `
        id,
        business_id,
        category_id,
        name,
        slug,
        description,
        price,
        image_url,
        is_available,
        created_at,
        updated_at
      `
    )
    .eq("business_id", business.id)
    .eq("is_available", true)
    .order("created_at", {
      ascending: false,
    });

  // =========================================
  // 7. LOG PRODUCT ERROR
  // =========================================

  if (productsError) {
    console.error(
      "Error fetching public products:",
      productsError
    );
  }

  // =========================================
  // 8. BUSINESS INITIAL
  // =========================================

  const businessInitial =
    business.name?.charAt(0)?.toUpperCase() || "A";

  // =========================================
  // 9. RENDER PUBLIC BUSINESS STOREFRONT
  // =========================================

  return (
    <main className="min-h-screen bg-[#faf7f7]">
      {/* =========================================
          ADADI NAVIGATION
      ========================================= */}

      <header className="sticky top-0 z-50 border-b border-[#5b1020]/20 bg-[#6b1224] text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ADADI LOGO */}

          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#6b1224]">
              <Store className="h-5 w-5" />
            </div>

            <span className="text-xl font-bold tracking-tight">
              ADADI
            </span>
          </Link>

          {/* BACK TO MARKETPLACE */}

          <Link
            href="/businesses"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />

            <span className="hidden sm:inline">
              Back to Marketplace
            </span>

            <span className="sm:hidden">
              Back
            </span>
          </Link>
        </div>
      </header>

      {/* =========================================
          BUSINESS HERO
      ========================================= */}

      <section className="relative overflow-hidden bg-[#6b1224]">
        {/* Decorative background */}

        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />

        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-black/5" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            {/* BUSINESS LOGO */}

            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white/20 bg-white shadow-xl sm:h-32 sm:w-32">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={`${business.name} logo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-5xl font-bold text-[#6b1224]">
                  {businessInitial}
                </span>
              )}
            </div>

            {/* BUSINESS DETAILS */}

            <div className="min-w-0 text-white">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/90">
                <Store className="h-3.5 w-3.5" />

                ADADI Business
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {business.name}
              </h1>

              {business.description && (
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
                  {business.description}
                </p>
              )}

              {/* CONTACT DETAILS */}

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/80">
                {business.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-white" />

                    <span>
                      {business.location}
                    </span>
                  </div>
                )}

                {business.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-white" />

                    <span>
                      {business.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* SECTION HEADER */}

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#6b1224]">
              Shop from this business
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Products
            </h2>

            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              Browse products available from{" "}
              {business.name}.
            </p>
          </div>

          {/* PRODUCT COUNT */}

          {!productsError &&
            products &&
            products.length > 0 && (
              <div className="hidden items-center gap-2 rounded-full border border-[#6b1224]/15 bg-white px-4 py-2 text-sm font-medium text-[#6b1224] shadow-sm sm:flex">
                <ShoppingBag className="h-4 w-4" />

                {products.length}{" "}
                {products.length === 1
                  ? "Product"
                  : "Products"}
              </div>
            )}
        </div>

        {/* =========================================
            PRODUCT ERROR
        ========================================= */}

        {productsError ? (
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <ShoppingBag className="h-6 w-6 text-red-500" />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-gray-900">
              Unable to load products
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              We couldn't load the products for this
              business right now. Please try again later.
            </p>
          </div>
        ) : !products ||
          products.length === 0 ? (
          /* =========================================
             EMPTY PRODUCTS STATE
          ========================================= */

          <div className="rounded-2xl border border-dashed border-[#6b1224]/20 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6b1224]/10">
              <ShoppingBag className="h-7 w-7 text-[#6b1224]" />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-gray-900">
              No products yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              This business hasn't added any available
              products yet. Check back later for new
              products.
            </p>
          </div>
        ) : (
          /* =========================================
             PRODUCT GRID
          ========================================= */

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/businesses/${business.slug}/products/${product.slug}`}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#6b1224]/20 hover:shadow-xl"
              >
                {/* PRODUCT IMAGE */}

                <div className="relative aspect-square overflow-hidden bg-[#f3eeee]">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <ShoppingBag className="h-10 w-10" />

                        <span className="text-sm">
                          No image
                        </span>
                      </div>
                    </div>
                  )}

                  {/* AVAILABLE BADGE */}

                  <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-green-700 shadow-sm backdrop-blur">
                    Available
                  </div>
                </div>

                {/* PRODUCT INFORMATION */}

                <div className="p-5">
                  <h3 className="line-clamp-1 text-lg font-semibold text-gray-900 transition-colors group-hover:text-[#6b1224]">
                    {product.name}
                  </h3>

                  {product.description && (
                    <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-gray-500">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-xl font-bold text-[#6b1224]">
                      ₦
                      {Number(
                        product.price
                      ).toLocaleString()}
                    </span>

                    <span className="rounded-lg bg-[#6b1224] px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-[#53101c]">
                      View
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="border-t border-[#6b1224]/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div>
            <p className="font-bold text-[#6b1224]">
              ADADI
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Discover and shop from local businesses.
            </p>
          </div>

          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} ADADI. All
            rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}