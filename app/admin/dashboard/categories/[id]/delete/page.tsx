import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Trash2,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

type AdminDeleteCategoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminDeleteCategoryPage({
  params,
}: AdminDeleteCategoryPageProps) {
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
      "ADMIN DELETE CATEGORY FETCH ERROR:",
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
    count: productCount,
    error: productCountError,
  } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("category_id", category.id);

  if (productCountError) {
    console.error(
      "ADMIN CATEGORY PRODUCT COUNT ERROR:",
      productCountError
    );

    throw new Error(
      "Unable to check category products."
    );
  }

  const hasProducts =
    (productCount ?? 0) > 0;

  return (
    <main className="min-h-screen">
      <Link
        href={`/admin/dashboard/categories/${category.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
      >
        <ArrowLeft size={17} />
        Back to Category
      </Link>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <Trash2 size={28} />
          </div>

          <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-red-600">
            Delete Category
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#242424]">
            {category.name}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            This action cannot be undone.
          </p>
        </div>

        {hasProducts ? (
          <div className="rounded-2xl border border-yellow-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                <AlertTriangle size={22} />
              </div>

              <div>
                <h2 className="font-bold text-[#242424]">
                  Category cannot be deleted
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  This category currently has{" "}
                  <span className="font-bold text-[#242424]">
                    {productCount}{" "}
                    {productCount === 1
                      ? "product"
                      : "products"}
                  </span>{" "}
                  attached to it.
                </p>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  To protect your product data,
                  you must first remove the
                  products from this category or
                  assign them to another category.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/admin/dashboard/categories"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Back to Categories
              </Link>

              <Link
                href={`/admin/categories/${category.id}`}
                className="inline-flex items-center justify-center rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#721832]"
              >
                View Products
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="rounded-xl border border-red-100 bg-red-50 p-5">
              <p className="font-semibold text-red-800">
                You are about to permanently delete
                this category.
              </p>

              <p className="mt-2 text-sm leading-6 text-red-700">
                The category{" "}
                <span className="font-bold">
                  {category.name}
                </span>{" "}
                does not have any products attached
                to it and can be safely deleted.
              </p>
            </div>

            <form
              action={async () => {
                "use server";

                const supabase =
                  await createClient();

                const {
                  data: { user },
                } =
                  await supabase.auth.getUser();

                if (!user) {
                  redirect("/admin-login");
                }

                const {
                  data: adminProfile,
                } = await supabase
                  .from("profiles")
                  .select("id, role")
                  .eq("id", user.id)
                  .maybeSingle();

                if (
                  !adminProfile ||
                  adminProfile.role !== "admin"
                ) {
                  redirect(
                    "/customer/dashboard"
                  );
                }

                const {
                  count,
                  error: countError,
                } = await supabase
                  .from("products")
                  .select("id", {
                    count: "exact",
                    head: true,
                  })
                  .eq(
                    "category_id",
                    id
                  );

                if (countError) {
                  console.error(
                    "ADMIN DELETE CATEGORY RECHECK ERROR:",
                    countError
                  );

                  throw new Error(
                    "Unable to verify category products."
                  );
                }

                if ((count ?? 0) > 0) {
                  throw new Error(
                    "This category now has products attached and cannot be deleted."
                  );
                }

                const {
                  error: deleteError,
                } = await supabase
                  .from("categories")
                  .delete()
                  .eq("id", id);

                if (deleteError) {
                  console.error(
                    "ADMIN CATEGORY DELETE ERROR:",
                    deleteError
                  );

                  throw new Error(
                    "Unable to delete category."
                  );
                }

                redirect(
                  "/admin/dashboard/categories"
                );
              }}
              className="mt-6"
            >
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link
                  href={`/admin/dashboard/categories/${category.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <Trash2 size={17} />
                  Delete Category
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}