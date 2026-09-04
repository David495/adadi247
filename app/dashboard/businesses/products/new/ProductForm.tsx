"use client";

import Link from "next/link";
import {
  ExternalLink,
  ImagePlus,
  Package,
  X,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import type {
  CreateProductState,
} from "./actions";

type Category = {
  id: string;
  name: string;
};

type ProductFormProps = {
  categories: Category[];
  createProduct: (
    previousState: CreateProductState,
    formData: FormData
  ) => Promise<CreateProductState>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#64152E] focus:outline-none focus:ring-2 focus:ring-[#8B1E3F] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          aria-hidden="true"
        />
      )}

      {pending
        ? "Creating Product..."
        : "Create Product"}
    </button>
  );
}

export default function ProductForm({
  categories,
  createProduct,
}: ProductFormProps) {
  const [state, formAction] =
    useActionState(
      createProduct,
      {
        error: null,
      }
    );

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [imageName, setImageName] =
    useState<string>("");

  const [imageError, setImageError] =
    useState<string | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(
          imagePreview
        );
      }
    };
  }, [imagePreview]);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageError(null);

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
      setImageError(
        "Please select a PNG, JPG, JPEG or WEBP image."
      );

      event.target.value = "";

      return;
    }

    const maxFileSize =
      5 * 1024 * 1024;

    if (
      file.size >
      maxFileSize
    ) {
      const fileSizeMB = (
        file.size /
        (1024 * 1024)
      ).toFixed(1);

      setImageError(
        `This image is ${fileSizeMB}MB, but the maximum allowed size is 5MB. Please compress the image using TinyPNG and try again.`
      );

      event.target.value = "";

      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
    setImageName(file.name);
    setImageError(null);
  }

  function removeImage() {
    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    setImagePreview(null);
    setImageName("");
    setImageError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      {state.error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4"
        >
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <X size={16} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800">
                Unable to create product
              </p>

              <p className="mt-1 text-sm leading-5 text-red-700">
                {state.error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-[#242424]">
            Product Information
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Provide the basic information about your product.
          </p>
        </div>

        <div className="mt-6">
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
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
          />
        </div>

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
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
          >
            <option value="">
              Select a category
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              )
            )}
          </select>
        </div>

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
            placeholder="Describe your product..."
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-[#242424]">
            Pricing
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Set the price customers will pay.
          </p>
        </div>

        <div className="mt-6">
          <label
            htmlFor="price"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Price (₦)
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
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
              className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-[#242424]">
            Product Image
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add a clear image of your product.
          </p>
        </div>

        <input
          ref={fileInputRef}
          id="product_image"
          name="product_image"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleImageChange}
          className="sr-only"
        />

        {imageError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <X size={16} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800">
                  Image cannot be uploaded
                </p>

                <p className="mt-1 text-sm leading-5 text-red-700">
                  {imageError}
                </p>

                {imageError.includes(
                  "5MB"
                ) && (
                  <a
                    href="https://tinypng.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B1E3F] underline underline-offset-2 hover:text-[#64152E]"
                  >
                    Compress image with TinyPNG
                    <ExternalLink
                      size={14}
                    />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {!imagePreview ? (
          <label
            htmlFor="product_image"
            className="mt-6 block cursor-pointer rounded-2xl border-2 border-dashed border-[#8B1E3F]/20 bg-[#FAF8F6] p-8 text-center transition hover:border-[#8B1E3F]/40 hover:bg-[#8B1E3F]/5 sm:p-10"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B1E3F]/10 text-[#8B1E3F]">
              <ImagePlus
                size={28}
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-gray-800">
              Click to upload an image
            </p>

            <p className="mt-1 text-sm text-gray-500">
              PNG, JPG, JPEG or WEBP
            </p>

            <p className="mt-2 text-xs text-gray-400">
              Maximum file size: 5MB
            </p>
          </label>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-[#FAF8F6]">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Product preview"
                className="h-64 w-full object-cover sm:h-80"
              />

              <button
                type="button"
                onClick={removeImage}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-600 shadow-md transition hover:bg-red-50"
                aria-label="Remove selected image"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  Image selected
                </p>

                <p className="truncate text-sm text-gray-500">
                  {imageName}
                </p>
              </div>

              <label
                htmlFor="product_image"
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Change Image
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/dashboard/businesses/products"
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Cancel
        </Link>

        <SubmitButton />
      </div>
    </form>
  );
}