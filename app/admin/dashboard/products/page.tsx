import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Package,
  XCircle,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

export default async function AdminProductsPage() {
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
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/dashboard/customer");
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
        updated_at,
        businesses (
          id,
          name,
          slug
        ),
        categories (
          id,
          name,
          slug
        )
      `
    )
    .order("created_at", {
      ascending: false,
    });

  if (productsError) {
    console.error(
      "ADMIN PRODUCTS FETCH ERROR:",
      productsError
    );
  }

  const allProducts = products ?? [];

  const totalProducts = allProducts.length;

  const availableProducts =
    allProducts.filter(
      (product) =>
        product.is_available === true
    ).length;

  const unavailableProducts =
    allProducts.filter(
      (product) =>
        product.is_available === false
    ).length;

  const totalProductValue =
    allProducts.reduce(
      (sum, product) =>
        sum + Number(product.price ?? 0),
      0
    );

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

  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return "Unknown date";
    }

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
    <main className="min-h-screen">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Marketplace Management
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#242424]">
          Products
        </h1>

        <p className="mt-2 text-gray-500">
          Manage and monitor products listed by businesses across ADADI.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Products
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {totalProducts}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Available
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {availableProducts}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Unavailable
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {unavailableProducts}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <XCircle size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Listed Value
              </p>

              <p className="mt-3 text-2xl font-bold text-[#8B1E3F]">
                {formatCurrency(totalProductValue)}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <Package size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#242424]">
              All Products
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              View all products listed by businesses on ADADI.
            </p>
          </div>

          <div className="text-sm text-gray-500">
            {totalProducts}{" "}
            {totalProducts === 1
              ? "product"
              : "products"}
          </div>
        </div>

        {productsError && (
          <div className="m-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Unable to load products
              </p>

              <p className="mt-1">
                There was a problem loading products from the database.
              </p>
            </div>
          </div>
        )}

        {!productsError &&
        allProducts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
              <Package size={28} />
            </div>

            <h3 className="mt-6 text-xl font-bold text-[#242424]">
              No products yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Products added by businesses will appear here once they are listed on the ADADI marketplace.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-250">
              <thead className="bg-[#FCF7F9]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Product
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Business
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Price
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Availability
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Added
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {allProducts.map(
                  (product) => {
                    const business =
                      Array.isArray(
                        product.businesses
                      )
                        ? product.businesses[0]
                        : product.businesses;

                    const category =
                      Array.isArray(
                        product.categories
                      )
                        ? product.categories[0]
                        : product.categories;

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-[#FCF7F9]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={
                                  product.image_url
                                }
                                alt={
                                  product.name
                                }
                                className="h-12 w-12 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                                <Package
                                  size={20}
                                />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-semibold text-[#242424]">
                                {product.name}
                              </p>

                              <p className="mt-1 max-w-55 truncate text-xs text-gray-500">
                                {product.description ||
                                  "No description"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          {business?.slug ? (
                            <Link
                              href={`/dashboard/businesses/${business.slug}`}
                              target="_blank"
                              className="font-medium text-[#8B1E3F] hover:underline"
                            >
                              {business.name ||
                                "Unknown Business"}
                            </Link>
                          ) : (
                            <p className="font-medium text-[#242424]">
                              {business?.name ||
                                "Unknown Business"}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <span className="text-sm text-gray-600">
                            {category?.name ||
                              "Uncategorized"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-semibold text-[#242424]">
                            {formatCurrency(
                              product.price
                            )}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          {product.is_available ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              <CheckCircle
                                size={14}
                              />
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              <XCircle
                                size={14}
                              />
                              Unavailable
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-sm text-gray-500">
                            {formatDate(
                              product.created_at
                            )}
                          </p>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`/admin/dashboard/products/${product.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#E8D5DC] px-3 py-2 text-sm font-semibold text-[#8B1E3F] transition hover:bg-[#F7E9EE]"
                          >
                            View
                            <ArrowRight
                              size={15}
                            />
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}