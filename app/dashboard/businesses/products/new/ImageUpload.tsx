"use client";

import { useState } from "react";
import {
  ImagePlus,
  X,
  Upload,
} from "lucide-react";

type ImageUploadProps = {
  name?: string;
};

export default function ImageUpload({
  name = "image",
}: ImageUploadProps) {
  const [preview, setPreview] =
    useState<string | null>(null);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    // =========================================
    // VALIDATE FILE TYPE
    // =========================================

    if (!file.type.startsWith("image/")) {
      alert(
        "Please select a valid image file."
      );

      event.target.value = "";

      return;
    }

    // =========================================
    // VALIDATE FILE SIZE
    // Maximum: 5MB
    // =========================================

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "Image size must be less than 5MB."
      );

      event.target.value = "";

      return;
    }

    // =========================================
    // CREATE IMAGE PREVIEW
    // =========================================

    const imageUrl =
      URL.createObjectURL(file);

    setPreview(imageUrl);
  }

  function removeImage() {
    setPreview(null);
  }

  return (
    <div className="space-y-4">

      {/* ========================================= */}
      {/* IMAGE PREVIEW */}
      {/* ========================================= */}

      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">

          <img
            src={preview}
            alt="Product preview"
            className="h-64 w-full object-cover"
          />

          {/* ========================================= */}
          {/* REMOVE IMAGE */}
          {/* ========================================= */}

          <button
            type="button"
            onClick={removeImage}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-600 shadow-md transition hover:bg-red-50"
            aria-label="Remove selected image"
          >
            <X size={18} />
          </button>

        </div>
      ) : (
        <label
          htmlFor="product-image"
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#8B1E3F]/20 bg-[#FAF8F6] p-10 text-center transition hover:border-[#8B1E3F]/40 hover:bg-[#8B1E3F]/5"
        >

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B1E3F]/10">

            <ImagePlus
              size={30}
              className="text-[#8B1E3F]"
            />

          </div>

          <h3 className="mt-4 text-sm font-semibold text-[#242424]">
            Upload product image
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Click to select an image from your device
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#8B1E3F] shadow-sm">

            <Upload size={14} />

            Choose Image

          </div>

          <p className="mt-4 text-xs text-gray-400">
            JPG, JPEG, PNG or WEBP · Maximum 5MB
          </p>

          <input
            id="product-image"
            name={name}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            className="hidden"
          />

        </label>
      )}

    </div>
  );
}