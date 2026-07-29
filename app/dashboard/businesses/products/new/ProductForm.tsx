"use client";

import Link from "next/link";
import {
  ImagePlus,
  Package,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

type Category = {
  id: string;
  name: string;
};

type ProductFormProps = {
  categories: Category[];

  createProduct: (
    formData: FormData
  ) => void | Promise<void>;
};

// =========================================
// SUBMIT BUTTON
// =========================================

function SubmitButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-xl bg-[#8B1E3F] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#64152E] focus:outline-none focus:ring-2 focus:ring-[#8B1E3F] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? "Creating Product..."
        : "Create Product"}
    </button>
  );
}

// =========================================
// PRODUCT FORM
// =========================================

export default function ProductForm({
  categories,
  createProduct,
}: ProductFormProps) {
  // =========================================
  // IMAGE PREVIEW STATE
  // =========================================

  const [
    imagePreview,
    setImagePreview,
  ] = useState<
    string | null
  >(null);

  // =========================================
  // IMAGE NAME STATE
  // =========================================

  const [
    imageName,
    setImageName,
  ] = useState<string>("");

  // =========================================
  // FILE INPUT REF
  // =========================================

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  // =========================================
  // CLEAN UP PREVIEW URL
  // =========================================

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(
          imagePreview
        );
      }
    };
  }, [
    imagePreview,
  ]);

  // =========================================
  // HANDLE IMAGE SELECTION
  // =========================================

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    // =========================================
    // VALIDATE IMAGE TYPE
    // =========================================

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      alert(
        "Please select a PNG, JPG, JPEG or WEBP image."
      );

      event.target.value = "";

      return;
    }

    // =========================================
    // VALIDATE IMAGE SIZE
    // =========================================

    const maxFileSize =
      5 * 1024 * 1024;

    if (
      file.size >
      maxFileSize
    ) {
      alert(
        "Image is too large. Please select an image smaller than 5MB."
      );

      event.target.value = "";

      return;
    }

    // =========================================
    // CLEAN OLD PREVIEW
    // =========================================

    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    // =========================================
    // CREATE NEW PREVIEW
    // =========================================

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setImagePreview(
      previewUrl
    );

    setImageName(
      file.name
    );
  }

  // =========================================
  // REMOVE IMAGE
  // =========================================

  function removeImage() {
    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    setImagePreview(
      null
    );

    setImageName(
      ""
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  // =========================================
  // RETURN FORM
  // =========================================

  return (
    <form
      action={createProduct}
      className="space-y-6"
    >

      {/* ========================================= */}
      {/* PRODUCT INFORMATION */}
      {/* ========================================= */}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">

        <div className="mb-6">

          <h2 className="text-lg font-bold text-[#242424]">
            Product Information
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Provide the basic information about your product.
          </p>

        </div>

        {/* PRODUCT NAME */}

        <div>

          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Product Name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Classic Sneakers"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#242424] outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
          />

        </div>

        {/* CATEGORY */}

        <div className="mt-5">

          <label
            htmlFor="category_id"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Category
          </label>

          <select
            id="category_id"
            name="category_id"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#242424] outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
          >

            <option value="">
              Select a category
            </option>

            {categories.map(
              (
                category
              ) => (

                <option
                  key={
                    category.id
                  }
                  value={
                    category.id
                  }
                >
                  {
                    category.name
                  }
                </option>

              )
            )}

          </select>

        </div>

        {/* DESCRIPTION */}

        <div className="mt-5">

          <label
            htmlFor="description"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Description
          </label>

          <textarea
            id="description"
            name="description"
            rows={5}
            placeholder="Describe your product or service..."
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-[#242424] outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
          />

        </div>

      </div>


      {/* ========================================= */}
      {/* PRICING */}
      {/* ========================================= */}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">

        <div className="mb-6">

          <h2 className="text-lg font-bold text-[#242424]">
            Pricing
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Set the price customers will pay.
          </p>

        </div>

        <div>

          <label
            htmlFor="price"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Price (₦)
          </label>

          <div className="relative">

            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[#8B1E3F]">
              ₦
            </span>

            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-4 text-sm text-[#242424] outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
            />

          </div>

        </div>

      </div>


      {/* ========================================= */}
      {/* PRODUCT IMAGE */}
      {/* ========================================= */}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">

        <div className="mb-6">

          <h2 className="text-lg font-bold text-[#242424]">
            Product Image
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Upload a clear image of your product.
          </p>

        </div>

        {/* ========================================= */}
        {/* HIDDEN FILE INPUT */}
        {/* ========================================= */}

        <input
          ref={
            fileInputRef
          }
          id="product_image"
          name="product_image"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={
            handleImageChange
          }
          className="sr-only"
        />

        {/* ========================================= */}
        {/* IMAGE UPLOAD AREA */}
        {/* ========================================= */}

        {!imagePreview ? (

          <label
            htmlFor="product_image"
            className="block cursor-pointer rounded-2xl border-2 border-dashed border-[#8B1E3F]/20 bg-[#FAF8F6] p-10 text-center transition hover:border-[#8B1E3F]/40 hover:bg-[#8B1E3F]/5"
          >

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B1E3F]/10">

              <ImagePlus
                size={30}
                className="text-[#8B1E3F]"
              />

            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#242424]">
              Click to upload product image
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              PNG, JPG, JPEG or WEBP
            </p>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">

              <Package
                size={14}
              />

              <span>
                Recommended: clear, high-quality product photos
              </span>

            </div>

          </label>

        ) : (

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">

            {/* ========================================= */}
            {/* IMAGE PREVIEW */}
            {/* ========================================= */}

            <div className="relative aspect-video w-full overflow-hidden bg-gray-100">

              <img
                src={
                  imagePreview
                }
                alt="Product preview"
                className="h-full w-full object-contain"
              />

              <button
                type="button"
                onClick={
                  removeImage
                }
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-md transition hover:bg-red-50 hover:text-red-600"
                aria-label="Remove image"
              >

                <X
                  size={18}
                />

              </button>

            </div>


            {/* ========================================= */}
            {/* SELECTED IMAGE INFO */}
            {/* ========================================= */}

            <div className="flex items-center justify-between gap-4 p-4">

              <div className="min-w-0">

                <p className="text-sm font-semibold text-[#242424]">
                  Image selected
                </p>

                <p className="mt-1 truncate text-xs text-gray-500">
                  {
                    imageName
                  }
                </p>

              </div>

              <label
                htmlFor="product_image"
                className="shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-[#8B1E3F] transition hover:bg-gray-50"
              >
                Change
              </label>

            </div>

          </div>

        )}

      </div>


      {/* ========================================= */}
      {/* ACTIONS */}
      {/* ========================================= */}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">

        <Link
          href="/dashboard/businesses/products"
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </Link>

        <SubmitButton />

      </div>

    </form>
  );
}