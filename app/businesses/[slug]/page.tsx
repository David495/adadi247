
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Phone,
  ShoppingBag,
  Store,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/server";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import MessageBusinessButton from "./MessageBusinessButton";
import CopyStoreLinkButton from "../CopyStoreLinkButton";
import ProductPriceFilter from "./ProductPriceFilter";

type BusinessPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BusinessPublicPage({
  params,
}: BusinessPageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (businessError) {
    console.error("Error fetching public business:", businessError);

    throw new Error(
      `Failed to load business: ${businessError.message}`
    );
  }

  if (!business) {
    notFound();
  }

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

  if (productsError) {
    console.error(
      "Error fetching public products:",
      productsError
    );
  }

  const businessInitial =
    business.name?.charAt(0)?.toUpperCase() || "A";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#faf7f7]">
        <section className="relative overflow-hidden bg-[#6b1224]">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-black/5" />

          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
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

                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/80">
                  {business.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-white" />
                      <span>{business.location}</span>
                    </div>
                  )}

                  {business.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-white" />
                      <span>{business.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <MessageBusinessButton
                    businessId={business.id}
                  />

                  <CopyStoreLinkButton
                    slug={business.slug}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#6b1224]">
              Shop from this business
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Products
            </h2>

            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              Browse products available from {business.name}.
            </p>
          </div>

          {productsError ? (
            <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <ShoppingBag className="h-6 w-6 text-red-500" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-gray-900">
                Unable to load products
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                We couldn't load the products for this business
                right now. Please try again later.
              </p>
            </div>
          ) : !products || products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#6b1224]/20 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6b1224]/10">
                <ShoppingBag className="h-7 w-7 text-[#6b1224]" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-gray-900">
                No products yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                This business hasn't added any available products
                yet. Check back later for new products.
              </p>
            </div>
          ) : (
            <ProductPriceFilter
              products={products}
              businessSlug={business.slug}
            />
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}