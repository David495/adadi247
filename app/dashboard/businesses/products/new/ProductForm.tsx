"use client";

import Link from "next/link";
import {
  ImagePlus,
  Package,
  X,
  ExternalLink,
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
        URL.revokeObjectURL(imagePreview);
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

    if (!allowedTypes.includes(file.type)) {
      setImageError(
        "Please select a PNG, JPG, JPEG or WEBP image."
      );

      event.target.value = "";
      return;
    }

    const maxFileSize =
      5 * 1024 * 1024;

    if (file.size > maxFileSize) {
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
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
    setImageName(file.name);
    setImageError(null);
  }

  function removeImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(null);
    setImageName("");
    setImageError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <form
      action={createProduct}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#242424]">
            Product Information
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Provide the basic information about your product.
          </p>
        </div>

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

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
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
            placeholder="Describe your product or service..."
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-[#242424] outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
          />
        </div>
      </div>

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

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#242424]">
            Product Image
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Upload a clear image of your product.
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
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <X size={16} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800">
                  Image file is too large
                </p>

                <p className="mt-1 text-sm leading-5 text-red-700">
                  {imageError}
                </p>

                <a
                  href="https://tinypng.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B1E3F] underline underline-offset-2 hover:text-[#64152E]"
                >
                  Compress image with TinyPNG
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        )}

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
              <Package size={14} />

              <span>
                Maximum file size: 5MB
              </span>
            </div>
          </label>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
              <img
                src={imagePreview}
                alt="Product preview"
                className="h-full w-full object-contain"
              />

              <button
                type="button"
                onClick={removeImage}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-md transition hover:bg-red-50 hover:text-red-600"
                aria-label="Remove image"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#242424]">
                  Image selected
                </p>

                <p className="mt-1 truncate text-xs text-gray-500">
                  {imageName}
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