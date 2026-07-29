import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

type AdminCategoryDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCategoryDetailsPage({
  params,
}: AdminCategoryDetailsPageProps) {
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
    data: category,
    error: categoryError,
  } = await supabase
    .from("categories")
    .select(
      "id, name, slug, description, image_url"
    )
    .eq("id", id)
    .maybeSingle();

  if (categoryError) {
    console.error(
      "ADMIN CATEGORY FETCH ERROR:",
      categoryError
    );

    throw new Error(
      "Unable to load category."
    );
  }

  if (!category) {
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
        name,
        slug,
        description,
        price,
        image_url,
        is_available,
        created_at,
        businesses (
          id,
          name,
          slug
        )
      `
    )
    .eq("category_id", category.id)
    .order("created_at", {
      ascending: false,
    });

  if (productsError) {
    console.error(
      "ADMIN CATEGORY PRODUCTS ERROR:",
      productsError
    );
  }

  const categoryProducts = products ?? [];
  const productCount = categoryProducts.length;

  const availableProducts =
    categoryProducts.filter(
      (product) =>
        product.is_available === true
    ).length;

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

  return (
    <main className="min-h-screen">
      <Link
        href="/admin/dashboard/categories"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
      >
        <ArrowLeft size={17} />
        Back to Categories
      </Link>

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F7E9EE] text-[#8B1E3F]">
            {category.image_url ? (
              <img
                src={category.image_url}
                alt={category.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <FolderOpen size={30} />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
              Category Details
            </p>

            <h1 className="mt-1 text-3xl font-bold text-[#242424]">
              {category.name}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              /{category.slug}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/dashboard/categories/${category.id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8B1E3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#721832]"
          >
            <Pencil size={16} />
            Edit Category
          </Link>

          {productCount === 0 && (
            <Link
              href={`/admin/dashboard/categories/${category.id}/delete`}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <Trash2 size={16} />
              Delete Category
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Products
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {productCount}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <Package size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Available Products
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {availableProducts}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <Package size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Category ID
            </p>

            <p className="mt-3 break-all text-sm font-medium text-[#242424]">
              {category.id}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <FolderOpen size={21} />
            </div>

            <h2 className="font-bold text-[#242424]">
              Category Information
            </h2>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Name
              </p>

              <p className="mt-2 font-medium text-[#242424]">
                {category.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Slug
              </p>

              <p className="mt-2 break-all text-sm text-gray-600">
                {category.slug}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Description
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                {category.description ||
                  "No description provided."}
              </p>
            </div>

            {productCount > 0 && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-semibold text-yellow-800">
                  Category cannot be deleted yet
                </p>

                <p className="mt-1 text-sm text-yellow-700">
                  This category currently has{" "}
                  {productCount}{" "}
                  {productCount === 1
                    ? "product"
                    : "products"}{" "}
                  attached to it. Remove or
                  reassign those products before
                  deleting this category.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#242424]">
                  Products in This Category
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Products currently assigned to{" "}
                  {category.name}.
                </p>
              </div>

              <span className="rounded-full bg-[#F7E9EE] px-3 py-1 text-sm font-semibold text-[#8B1E3F]">
                {productCount}
              </span>
            </div>
          </div>

          {productsError ? (
            <div className="p-10 text-center">
              <Package
                size={32}
                className="mx-auto text-red-400"
              />

              <p className="mt-3 font-semibold text-[#242424]">
                Unable to load products
              </p>

              <p className="mt-1 text-sm text-gray-500">
                There was a problem retrieving
                products in this category.
              </p>
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
                <Package size={25} />
              </div>

              <h3 className="mt-5 font-bold text-[#242424]">
                No products yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                No products have been assigned to
                this category.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categoryProducts.map(
                (product) => {
                  const business =
                    Array.isArray(
                      product.businesses
                    )
                      ? product.businesses[0]
                      : product.businesses;

                  return (
                    <div
                      key={product.id}
                      className="p-6 transition hover:bg-[#FCF7F9]"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F7E9EE]">
                            {product.image_url ? (
                              <img
                                src={
                                  product.image_url
                                }
                                alt={
                                  product.name
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#8B1E3F]">
                                <Package
                                  size={22}
                                />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#242424]">
                              {product.name}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {business?.name ||
                                "Unknown Business"}
                            </p>

                            <p className="mt-1 text-sm font-semibold text-[#8B1E3F]">
                              {formatCurrency(
                                product.price
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              product.is_available
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {product.is_available
                              ? "Available"
                              : "Unavailable"}
                          </span>

                          <Link
                            href={`/admin/dashboard/products/${product.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#E8D5DC] px-3 py-2 text-sm font-semibold text-[#8B1E3F] transition hover:bg-[#F7E9EE]"
                          >
                            View
                            <ArrowRight
                              size={15}
                            />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}