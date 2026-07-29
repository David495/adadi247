import Link from "next/link";
import {
  ArrowRight,
  FolderOpen,
  Package,
  Search,
  Tag,
} from "lucide-react";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

type AdminCategoriesPageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

export default async function AdminCategoriesPage({
  searchParams,
}: AdminCategoriesPageProps) {
  const { search } = await searchParams;

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

  const {
    data: categories,
    error: categoriesError,
  } = await supabase
    .from("categories")
    .select(
      `
        id,
        name,
        slug,
        description,
        image_url
      `
    )
    .order("name", {
      ascending: true,
    });

  const {
    data: products,
    error: productsError,
  } = await supabase
    .from("products")
    .select(
      `
        id,
        category_id
      `
    );

  if (categoriesError) {
    console.error(
      "ADMIN CATEGORIES FETCH ERROR:",
      categoriesError
    );
  }

  if (productsError) {
    console.error(
      "ADMIN CATEGORY PRODUCTS FETCH ERROR:",
      productsError
    );
  }

  const allCategories = categories ?? [];
  const allProducts = products ?? [];

  const categorySearch =
    search?.trim().toLowerCase() || "";

  const filteredCategories =
    categorySearch
      ? allCategories.filter(
          (category) =>
            category.name
              .toLowerCase()
              .includes(categorySearch) ||
            category.slug
              .toLowerCase()
              .includes(categorySearch) ||
            category.description
              ?.toLowerCase()
              .includes(categorySearch)
        )
      : allCategories;

  const getProductCount = (
    categoryId: string
  ) => {
    return allProducts.filter(
      (product) =>
        product.category_id === categoryId
    ).length;
  };

  const categoriesWithProducts =
    allCategories.filter(
      (category) =>
        getProductCount(category.id) > 0
    ).length;

  const emptyCategories =
    allCategories.filter(
      (category) =>
        getProductCount(category.id) === 0
    ).length;

  return (
    <main className="min-h-screen">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Marketplace Management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#242424]">
            Categories
          </h1>

          <p className="mt-2 text-gray-500">
            Manage the product categories available across the ADADI marketplace.
          </p>
        </div>

        <Link
          href="/admin/dashboard/categories/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#721832]"
        >
          <Tag size={18} />
          Add Category
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Categories
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {allCategories.length}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
              <FolderOpen size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Active Categories
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {categoriesWithProducts}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Empty Categories
              </p>

              <p className="mt-3 text-3xl font-bold text-[#242424]">
                {emptyCategories}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600">
              <FolderOpen size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#242424]">
              All Categories
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              View and manage categories used by ADADI products.
            </p>
          </div>

          <form
            method="GET"
            className="relative w-full lg:w-80"
          >
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              name="search"
              defaultValue={search || ""}
              placeholder="Search categories..."
              className="w-full rounded-xl border border-[#E8D5DC] bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
            />
          </form>
        </div>

        {categoriesError ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <FolderOpen size={25} />
            </div>

            <h3 className="mt-5 font-bold text-[#242424]">
              Unable to load categories
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              There was a problem retrieving categories from the database.
            </p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7E9EE] text-[#8B1E3F]">
              <FolderOpen size={25} />
            </div>

            <h3 className="mt-5 font-bold text-[#242424]">
              {categorySearch
                ? "No categories found"
                : "No categories yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              {categorySearch
                ? "Try searching with a different category name or slug."
                : "Create your first category to organize products on the ADADI marketplace."}
            </p>

            {!categorySearch && (
              <Link
                href="/admin/dashboard/categories/new"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#721832]"
              >
                <Tag size={17} />
                Create Category
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5">
              <thead className="bg-[#FCF7F9]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Slug
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Description
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Products
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredCategories.map(
                  (category) => {
                    const productCount =
                      getProductCount(
                        category.id
                      );

                    return (
                      <tr
                        key={category.id}
                        className="transition hover:bg-[#FCF7F9]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            {category.image_url ? (
                              <img
                                src={
                                  category.image_url
                                }
                                alt={
                                  category.name
                                }
                                className="h-11 w-11 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                                <FolderOpen
                                  size={20}
                                />
                              </div>
                            )}

                            <div>
                              <p className="font-semibold text-[#242424]">
                                {category.name}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                ID:{" "}
                                {category.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                            {category.slug}
                          </span>
                        </td>

                        <td className="max-w-xs px-6 py-5">
                          <p className="truncate text-sm text-gray-500">
                            {category.description ||
                              "No description"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                              productCount > 0
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <Package
                              size={14}
                            />
                            {productCount}{" "}
                            {productCount ===
                            1
                              ? "product"
                              : "products"}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
  href={`/admin/dashboard/categories/${category.id}`}
  className="inline-flex items-center gap-2 rounded-lg border border-[#E8D5DC] px-3 py-2 text-sm font-semibold text-[#8B1E3F] transition hover:bg-[#F7E9EE]"
>
  Manage
  <ArrowRight size={15} />
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

        <div className="border-t border-gray-100 bg-[#FCF7F9] px-6 py-4">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-[#242424]">
              {filteredCategories.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[#242424]">
              {allCategories.length}
            </span>{" "}
            categories
          </p>
        </div>
      </div>
    </main>
  );
}