import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle,
  Package,
  Tag,
  XCircle,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

type AdminProductDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminProductDetailsPage({
  params,
}: AdminProductDetailsPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin-login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/dashboard/customer");
  }

  if (!id) {
    notFound();
  }

  const {
    data: product,
    error: productError,
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
        updated_at,
        businesses (
          id,
          name,
          slug,
          description,
          logo_url,
          phone,
          address,
          status
        ),
        categories (
          id,
          name,
          slug,
          description,
          image_url
        )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (productError) {
    console.error(
      "ADMIN PRODUCT FETCH ERROR:",
      productError
    );

    throw new Error(
      "Unable to load product."
    );
  }

  if (!product) {
    notFound();
  }

  const business = Array.isArray(
    product.businesses
  )
    ? product.businesses[0]
    : product.businesses;

  const category = Array.isArray(
    product.categories
  )
    ? product.categories[0]
    : product.categories;

  const formatCurrency = (
    amount: number | string | null
  ) => {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2,
      }
    ).format(Number(amount ?? 0));
  };

  const formatDateTime = (
    date: string | null
  ) => {
    if (!date) {
      return "Unknown date";
    }

    return new Date(date).toLocaleString(
      "en-NG",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  return (
    <main className="min-h-screen">
      <Link
        href="/admin/dashboard/products"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
      >
        <ArrowLeft size={17} />
        Back to Products
      </Link>

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Product Details
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#242424]">
            {product.name}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Product ID: {product.id}
          </p>
        </div>

        {product.is_available ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            <CheckCircle size={17} />
            Available
          </span>
        ) : (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
            <XCircle size={17} />
            Unavailable
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm">
            <div className="flex min-h-87.5 items-center justify-center bg-[#FCF7F9]">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full max-h-125 w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-16 text-gray-400">
                  <Package size={64} />

                  <p className="mt-4 text-sm">
                    No product image available
                  </p>
                </div>
              )}
            </div>

            <div className="p-6">
              <h2 className="text-xl font-bold text-[#242424]">
                {product.name}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                /{product.slug}
              </p>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap leading-7 text-gray-600">
                  {product.description ||
                    "No description provided for this product."}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <Building2 size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Business Information
              </h2>
            </div>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
              {business?.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={
                    business.name ||
                    "Business logo"
                  }
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#F7E9EE] text-xl font-bold text-[#8B1E3F]">
                  {business?.name
                    ?.charAt(0)
                    .toUpperCase() ||
                    "B"}
                </div>
              )}

              <div className="flex-1">
                <p className="text-lg font-bold text-[#242424]">
                  {business?.name ||
                    "Unknown Business"}
                </p>

                {business?.slug && (
                  <Link
                    href={`/dashboard/businesses/${business.slug}`}
                    target="_blank"
                    className="mt-1 inline-block text-sm font-semibold text-[#8B1E3F] hover:underline"
                  >
                    View Public Business
                  </Link>
                )}

                {business?.description && (
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    {business.description}
                  </p>
                )}

                {business?.phone && (
                  <p className="mt-4 text-sm text-gray-600">
                    Phone:{" "}
                    <span className="font-medium text-[#242424]">
                      {business.phone}
                    </span>
                  </p>
                )}

                {business?.address && (
                  <p className="mt-2 text-sm text-gray-600">
                    Address:{" "}
                    <span className="font-medium text-[#242424]">
                      {business.address}
                    </span>
                  </p>
                )}

                <div className="mt-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      business?.status ===
                      "approved"
                        ? "bg-green-100 text-green-700"
                        : business?.status ===
                          "suspended"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    Business:{" "}
                    {business?.status ||
                      "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <Tag size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Product Information
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Price
                </p>

                <p className="mt-2 text-2xl font-bold text-[#8B1E3F]">
                  {formatCurrency(
                    product.price
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Category
                </p>

                <p className="mt-2 font-medium text-[#242424]">
                  {category?.name ||
                    "Uncategorized"}
                </p>

                {category?.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {category.description}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Availability
                </p>

                <div className="mt-2">
                  {product.is_available ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                      <CheckCircle
                        size={14}
                      />
                      Available for purchase
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">
                      <XCircle
                        size={14}
                      />
                      Not available
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <CalendarDays size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Product Timeline
              </h2>
            </div>

            <div className="mt-6 space-y-6">
              <div className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#8B1E3F]" />

                <div>
                  <p className="text-sm font-semibold text-[#242424]">
                    Product Added
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatDateTime(
                      product.created_at
                    )}
                  </p>
                </div>
              </div>

              {product.updated_at && (
                <div className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />

                  <div>
                    <p className="text-sm font-semibold text-[#242424]">
                      Last Updated
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDateTime(
                        product.updated_at
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                <Package size={21} />
              </div>

              <h2 className="font-bold text-[#242424]">
                Product ID
              </h2>
            </div>

            <p className="mt-5 break-all rounded-xl bg-[#FCF7F9] p-4 text-xs text-gray-500">
              {product.id}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}