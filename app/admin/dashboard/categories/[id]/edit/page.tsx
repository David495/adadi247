import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

import { createClient } from "@/app/lib/supabase/server";

type AdminEditCategoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminEditCategoryPage({
  params,
}: AdminEditCategoryPageProps) {
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
      "ADMIN EDIT CATEGORY FETCH ERROR:",
      categoryError
    );

    throw new Error(
      "Unable to load category."
    );
  }

  if (!category) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      <Link
        href={`/admin/dashboard/categories/${category.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
      >
        <ArrowLeft size={17} />
        Back to Category
      </Link>

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Category Management
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#242424]">
          Edit Category
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Update the information for{" "}
          <span className="font-semibold text-[#242424]">
            {category.name}
          </span>
          .
        </p>
      </div>

      <div className="max-w-3xl">
        <form
          action={async (formData) => {
            "use server";

            const supabase =
              await createClient();

            const {
              data: { user },
            } = await supabase.auth.getUser();

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
              redirect("/dashboard/customer");
            }

            const name =
              String(
                formData.get("name") ?? ""
              ).trim();

            const slug =
              String(
                formData.get("slug") ?? ""
              )
                .trim()
                .toLowerCase();

            const description =
              String(
                formData.get(
                  "description"
                ) ?? ""
              ).trim();

            const imageUrl =
              String(
                formData.get(
                  "image_url"
                ) ?? ""
              ).trim();

            if (!name || !slug) {
              throw new Error(
                "Category name and slug are required."
              );
            }

            const {
              data: existingCategory,
            } = await supabase
              .from("categories")
              .select("id")
              .eq("slug", slug)
              .neq("id", id)
              .maybeSingle();

            if (existingCategory) {
              throw new Error(
                "A category with this slug already exists."
              );
            }

            const {
              error: updateError,
            } = await supabase
              .from("categories")
              .update({
                name,
                slug,
                description:
                  description || null,
                image_url:
                  imageUrl || null,
              })
              .eq("id", id);

            if (updateError) {
              console.error(
                "ADMIN CATEGORY UPDATE ERROR:",
                updateError
              );

              throw new Error(
                "Unable to update category."
              );
            }

            redirect(
              `/admin/dashboard/categories/${id}`
            );
          }}
          className="rounded-2xl border border-[#E8D5DC] bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-[#242424]"
              >
                Category Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                defaultValue={category.name}
                required
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                placeholder="Enter category name"
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-semibold text-[#242424]"
              >
                Slug
              </label>

              <input
                id="slug"
                name="slug"
                type="text"
                defaultValue={category.slug}
                required
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                placeholder="category-slug"
              />

              <p className="mt-2 text-xs text-gray-500">
                Use lowercase letters, numbers,
                and hyphens.
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-[#242424]"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={
                  category.description ?? ""
                }
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                placeholder="Describe this category..."
              />
            </div>

            <div>
              <label
                htmlFor="image_url"
                className="block text-sm font-semibold text-[#242424]"
              >
                Image URL
              </label>

              <input
                id="image_url"
                name="image_url"
                type="url"
                defaultValue={
                  category.image_url ?? ""
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                placeholder="https://example.com/image.jpg"
              />

              <p className="mt-2 text-xs text-gray-500">
                Enter a publicly accessible image
                URL.
              </p>
            </div>

            {category.image_url && (
              <div>
                <p className="text-sm font-semibold text-[#242424]">
                  Current Image
                </p>

                <div className="mt-3 h-40 w-40 overflow-hidden rounded-2xl border border-gray-100 bg-[#F7E9EE]">
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
              <Link
                href={`/admin/dashboard/categories/${category.id}`}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#721832]"
              >
                <Save size={17} />
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}