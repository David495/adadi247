import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export default async function NewCategoryPage() {
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

  return (
    <main className="min-h-screen">
      <Link
        href="/dashboard/categories"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline"
      >
        <ArrowLeft size={17} />
        Back to Categories
      </Link>

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
          Category Management
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#242424]">
          Create New Category
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Add a new product category to the ADADI marketplace.
        </p>
      </div>

      <div className="max-w-3xl">
        <form
          action={async (formData) => {
            "use server";

            const supabase = await createClient();

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
              redirect("/app/admin/dashboard/customer");
            }

            const name = String(
              formData.get("name") ?? ""
            ).trim();

            const slug = String(
              formData.get("slug") ?? ""
            )
              .trim()
              .toLowerCase();

            const description = String(
              formData.get("description") ?? ""
            ).trim();

            const imageUrl = String(
              formData.get("image_url") ?? ""
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
              .maybeSingle();

            if (existingCategory) {
              throw new Error(
                "A category with this slug already exists."
              );
            }

            const {
              error: insertError,
            } = await supabase
              .from("categories")
              .insert({
                name,
                slug,
                description: description || null,
                image_url: imageUrl || null,
              });

            if (insertError) {
              console.error(
                "ADMIN CATEGORY CREATE ERROR:",
                insertError
              );

              throw new Error(
                "Unable to create category."
              );
            }

            redirect("/admin/dashboard/categories");
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
                required
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                placeholder="e.g. Fashion"
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
                required
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                placeholder="fashion"
              />

              <p className="mt-2 text-xs text-gray-500">
                Use lowercase letters, numbers, and hyphens.
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
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
                placeholder="https://example.com/image.jpg"
              />

              <p className="mt-2 text-xs text-gray-500">
                Enter a publicly accessible image URL.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/admin/dashboard/categories"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#721832]"
              >
                <Plus size={17} />
                Create Category
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}