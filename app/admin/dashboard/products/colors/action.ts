"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

const ALLOWED_COLORS = [
  "Black", "White", "Grey", "Brown", "Red", "Pink", "Orange",
  "Yellow", "Green", "Blue", "Purple", "Gold", "Silver", "Multicolor",
];

export async function updateProductColor(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/admin-login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/dashboard/customer");

  const productId = String(formData.get("productId") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();

  if (!productId || !ALLOWED_COLORS.includes(color)) {
    throw new Error("Choose a valid product and color.");
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("products")
    .update({ color })
    .eq("id", productId);

  if (error) {
    console.error("ADMIN PRODUCT COLOR UPDATE ERROR:", error);
    throw new Error("Unable to update product color. Please try again.");
  }

  revalidatePath("/admin/dashboard/products/colors");
  revalidatePath("/admin/dashboard/products");
  revalidatePath("/businesses", "layout");
}
