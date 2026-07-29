import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createProduct } from "./actions";
import ProductForm from "./ProductForm";

import { createClient } from "@/app/lib/supabase/server";

export default async function NewProductPage() {
  // =========================================
  // 1. CREATE SUPABASE CLIENT
  // =========================================

  const supabase = await createClient();

  // =========================================
  // 2. GET CURRENTLY LOGGED-IN USER
  // =========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // =========================================
  // 3. CHECK AUTHENTICATION
  // =========================================

  if (userError || !user) {
    console.error(
      "AUTH ERROR:",
      userError
    );

    redirect("/login");
  }

  // =========================================
  // 4. FIND USER'S BUSINESS
  // =========================================

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(
      "id, name, owner_id"
    )
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();

  // =========================================
  // 5. CHECK BUSINESS
  // =========================================

  if (
    businessError ||
    !business
  ) {
    console.error(
      "BUSINESS ERROR:",
      businessError
    );

    redirect(
      "/register/businesses"
    );
  }

  console.log(
    "NEW PRODUCT PAGE BUSINESS:",
    business
  );

  // =========================================
  // 6. GET CATEGORIES
  // =========================================

  const {
    data: categories,
    error: categoryError,
  } = await supabase
    .from("categories")
    .select(
      "id, name"
    )
    .order(
      "name",
      {
        ascending: true,
      }
    );

  // =========================================
  // 7. CHECK CATEGORY ERROR
  // =========================================

  if (categoryError) {
    console.error(
      "CATEGORY ERROR:",
      categoryError
    );
  }

  // =========================================
  // 8. RENDER PAGE
  // =========================================

  return (
    <div className="mx-auto max-w-3xl">

      {/* ========================================= */}
      {/* BACK BUTTON */}
      {/* ========================================= */}

      <Link
        href="/dashboard/businesses/products"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#8B1E3F]"
      >
        <ArrowLeft size={18} />

        Back to Products
      </Link>

      {/* ========================================= */}
      {/* HEADER */}
      {/* ========================================= */}

      <div className="mb-8">

        <p className="text-sm font-semibold text-[#8B1E3F]">
          Business Management
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#242424]">
          Add Product
        </h1>

        <p className="mt-2 text-gray-500">
          Add a new product or service to{" "}

          <span className="font-semibold text-[#64152E]">
            {business.name}
          </span>
          .
        </p>

      </div>

      {/* ========================================= */}
      {/* PRODUCT FORM */}
      {/* ========================================= */}

      <ProductForm
        categories={
          categories ?? []
        }
        createProduct={
          createProduct
        }
      />

    </div>
  );
}