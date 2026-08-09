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
import AddToCartButton from "@/app/components/cart/AddToCartButton";

type ProductPageProps = {
  params: Promise<{
    slug: string;
    productSlug: string;
  }>;
};

export default async function ProductPublicPage({
  params,
}: ProductPageProps) {

  const { slug, productSlug } = await params;

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
    console.error(
      "Error fetching business:",
      businessError
    );

    throw new Error(
      `Failed to load business: ${businessError.message}`
    );
  }

  if (!business) {
    notFound();
  }

  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", business.id)
    .eq("slug", productSlug)
    .maybeSingle();

  if (productError) {
    console.error(
      "Error fetching product:",
      productError
    );

    throw new Error(
      `Failed to load product: ${productError.message}`
    );
  }

  if (!product) {
    notFound();
  }

  const businessInitial =
    business.name?.charAt(0)?.toUpperCase() || "A";

  return (
    <main className="min-h-screen bg-[#faf7f7]">

      <header className="sticky top-0 z-50 border-b border-[#5b1020]/20 bg-[#6b1224] text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

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

          <Link
            href={`/businesses/${business.slug}`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />

            <span className="hidden sm:inline">
              Back to {business.name}
            </span>

            <span className="sm:hidden">
              Back
            </span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">

        <div className="mb-8">
          <Link
            href={`/businesses/${business.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6b1224] transition hover:text-[#53101c]"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to {business.name}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">

          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="aspect-square bg-[#f3eeee]">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-gray-400">
                  <ShoppingBag className="h-16 w-16" />

                  <span className="text-sm">
                    No image available
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center">

            <Link
              href={`/businesses/${business.slug}`}
              className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#6b1224]/10 px-4 py-2 text-sm font-semibold text-[#6b1224] transition hover:bg-[#6b1224]/15"
            >
              <Store className="h-4 w-4" />

              {business.name}
            </Link>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
              {product.name}
            </h1>

            <div className="mt-6">
              <span className="text-3xl font-bold text-[#6b1224] sm:text-4xl">
                ₦
                {Number(
                  product.price
                ).toLocaleString()}
              </span>
            </div>

            <div className="mt-5">
              {product.is_available ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                  <span className="h-2 w-2 rounded-full bg-green-500" />

                  Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                  <span className="h-2 w-2 rounded-full bg-red-500" />

                  Currently unavailable
                </span>
              )}
            </div>

            <div className="my-7 h-px bg-gray-200" />

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                About this product
              </h2>

              {product.description ? (
                <p className="mt-3 text-base leading-7 text-gray-600">
                  {product.description}
                </p>
              ) : (
                <p className="mt-3 text-base text-gray-500">
                  No description has been provided for this
                  product.
                </p>
              )}
            </div>

            <div className="mt-8">
  {product.is_available ? (
    <AddToCartButton
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        image_url: product.image_url,
        business_id: product.business_id,
      }}
      business={{
        id: business.id,
        name: business.name,
        slug: business.slug,
      }}
    />
  ) : (
    <button
      type="button"
      disabled
      className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl bg-gray-200 px-6 py-4 text-base font-semibold text-gray-500"
    >
      Product Unavailable
    </button>
  )}
</div>

            <div className="mt-8 rounded-2xl border border-[#6b1224]/10 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900">
                About the business
              </h3>

              <Link
                href={`/businesses/${business.slug}`}
                className="mt-4 block font-semibold text-[#6b1224] hover:underline"
              >
                {business.name}
              </Link>

              <div className="mt-3 space-y-2">
                {business.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4 text-[#6b1224]" />

                    <span>
                      {business.location}
                    </span>
                  </div>
                )}

                {business.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="h-4 w-4 text-[#6b1224]" />

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