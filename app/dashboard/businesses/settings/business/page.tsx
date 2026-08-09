"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Save,
  Store,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase/client";

type Business = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  phone: string | null;
  address: string | null;
  status: string | null;
  is_open: boolean | null;
  onboarding_status: string | null;
};

export default function BusinessProfilePage() {
  const supabase = createClient();

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploadingLogo, setUploadingLogo] =
    useState(false);

  const [uploadingCover, setUploadingCover] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // =========================================
  // FORM
  // =========================================

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [slug, setSlug] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [logoUrl, setLogoUrl] =
    useState("");

  const [coverImageUrl, setCoverImageUrl] =
    useState("");

  const [isOpen, setIsOpen] =
    useState(true);

  // =========================================
  // LOAD BUSINESS
  // =========================================

  useEffect(() => {
    async function loadBusiness() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          window.location.href = "/business-login";
          return;
        }

        const {
          data,
          error: businessError,
        } = await supabase
          .from("businesses")
          .select(
            `
              id,
              name,
              slug,
              description,
              logo_url,
              cover_image_url,
              category,
              phone,
              address,
              status,
              is_open,
              onboarding_status
            `
          )
          .eq("owner_id", user.id)
          .maybeSingle();

        if (businessError) {
          console.error(
            "BUSINESS PROFILE SETTINGS ERROR:",
            businessError
          );

          setError(
            businessError.message ||
              "Unable to load your business profile."
          );

          return;
        }

        if (!data) {
          setError(
            "We could not find a business connected to your account."
          );

          return;
        }

        const loadedBusiness =
          data as Business;

        setBusiness(loadedBusiness);

        setName(
          loadedBusiness.name || ""
        );

        setDescription(
          loadedBusiness.description || ""
        );

        setSlug(
          loadedBusiness.slug || ""
        );

        setCategory(
          loadedBusiness.category || ""
        );

        setPhone(
          loadedBusiness.phone || ""
        );

        setAddress(
          loadedBusiness.address || ""
        );

        setLogoUrl(
          loadedBusiness.logo_url || ""
        );

        setCoverImageUrl(
          loadedBusiness.cover_image_url || ""
        );

        setIsOpen(
          loadedBusiness.is_open ?? true
        );
      } catch (err) {
        console.error(
          "BUSINESS PROFILE LOAD ERROR:",
          err
        );

        setError(
          "Unable to load your business profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBusiness();
  }, []);

  // =========================================
  // IMAGE UPLOAD
  // =========================================

// =========================================
// IMAGE UPLOAD
// =========================================

async function uploadImage(
  file: File,
  type: "logo" | "cover"
) {
  setError("");
  setMessage("");

  if (!business) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setError("Please select a valid image file.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setError("Image must be smaller than 5MB.");
    return;
  }

  if (type === "logo") {
    setUploadingLogo(true);
  } else {
    setUploadingCover(true);
  }

  try {
    // =========================================
    // GET CURRENT USER
    // =========================================

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    // =========================================
    // SELECT BUCKET
    // =========================================

    const bucket =
      type === "logo"
        ? "business-logos"
        : "business-covers";

    // =========================================
    // FILE EXTENSION
    // =========================================

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    // =========================================
    // UNIQUE FILE NAME
    // =========================================

    const fileName =
      `${business.id}/${type}-${Date.now()}.${extension}`;

    // =========================================
    // UPLOAD
    // =========================================

    const {
      error: uploadError,
    } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error(
        "BUSINESS IMAGE UPLOAD ERROR:",
        uploadError
      );

      setError(
        uploadError.message ||
          "Unable to upload image."
      );

      return;
    }

    // =========================================
    // PUBLIC URL
    // =========================================

    const {
      data: publicUrlData,
    } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    const publicUrl =
      publicUrlData.publicUrl;

    // =========================================
    // UPDATE FORM STATE
    // =========================================

    if (type === "logo") {
      setLogoUrl(publicUrl);

      setMessage(
        "Business logo uploaded successfully. Click Save Changes to apply it."
      );
    } else {
      setCoverImageUrl(publicUrl);

      setMessage(
        "Cover image uploaded successfully. Click Save Changes to apply it."
      );
    }
  } catch (err) {
    console.error(
      "BUSINESS IMAGE ERROR:",
      err
    );

    setError(
      "Unable to upload the image."
    );
  } finally {
    if (type === "logo") {
      setUploadingLogo(false);
    } else {
      setUploadingCover(false);
    }
  }
}

  // =========================================
  // SAVE
  // =========================================

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!business) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const cleanSlug = slug
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-");

      if (!name.trim()) {
        setError(
          "Business name is required."
        );
        return;
      }

      const {
        error: updateError,
      } = await supabase
        .from("businesses")
        .update({
          name: name.trim(),
          slug: cleanSlug || null,
          description:
            description.trim() || null,
          logo_url:
            logoUrl.trim() || null,
          cover_image_url:
            coverImageUrl.trim() || null,
          category:
            category.trim() || null,
          phone:
            phone.trim() || null,
          address:
            address.trim() || null,
          is_open: isOpen,
        })
        .eq("id", business.id);

      if (updateError) {
        console.error(
          "BUSINESS PROFILE UPDATE ERROR:",
          updateError
        );

        setError(
          updateError.message ||
            "Unable to save your changes."
        );

        return;
      }

      setSlug(cleanSlug);

      setMessage(
        "Business profile updated successfully."
      );
    } catch (err) {
      console.error(
        "BUSINESS PROFILE SAVE ERROR:",
        err
      );

      setError(
        "Unable to save your business profile."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2
            size={22}
            className="animate-spin text-[#8B1E3F]"
          />

          <span>
            Loading business profile...
          </span>
        </div>
      </div>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (error && !business) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-xl font-bold text-red-800">
          Unable to Load Business Profile
        </h1>

        <p className="mt-2 text-sm text-red-700">
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
          className="mt-5 rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#64152E]"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="space-y-8">

      {/* =====================================
          HEADER
      ===================================== */}

      <div>
        <Link
          href="/dashboard/businesses"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#8B1E3F] transition hover:text-[#64152E]"
        >
          <ArrowLeft size={16} />

          Back to Business Dashboard
        </Link>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Business Settings
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Business Profile
          </h1>

          <p className="mt-2 max-w-2xl text-gray-500">
            Manage how your business appears
            across ADADI.
          </p>
        </div>
      </div>

      {/* =====================================
          ALERTS
      ===================================== */}

      {message && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0 text-green-600"
          />

          <p>{message}</p>
        </div>
      )}

      {error && business && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-6"
      >

        {/* =====================================
            BUSINESS BRANDING
        ===================================== */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Business Branding
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add the images customers will see
              on your ADADI storefront.
            </p>
          </div>

          <div className="space-y-8 p-6">

            {/* LOGO */}

            <div>
              <label className="text-sm font-semibold text-gray-900">
                Business Logo
              </label>

              <p className="mt-1 text-xs text-gray-500">
                Recommended: square image,
                preferably at least 500 × 500px.
              </p>

              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">

                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${name || "Business"} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store
                      size={36}
                      className="text-gray-300"
                    />
                  )}
                </div>

                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#8B1E3F] hover:text-[#8B1E3F]">
                    {uploadingLogo ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />

                        Uploading...
                      </>
                    ) : (
                      <>
                        <ImageIcon size={17} />

                        Upload Logo
                      </>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0];

                        if (file) {
                          uploadImage(
                            file,
                            "logo"
                          );
                        }

                        event.currentTarget.value =
                          "";
                      }}
                    />
                  </label>

                  <p className="mt-2 text-xs text-gray-400">
                    PNG, JPG or WebP · Max 5MB
                  </p>
                </div>

              </div>
            </div>

            {/* COVER */}

            <div>
              <label className="text-sm font-semibold text-gray-900">
                Cover Image
              </label>

              <p className="mt-1 text-xs text-gray-500">
                This image can be displayed at the
                top of your public business page.
              </p>

              <div className="mt-4">

                <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 sm:h-56">
                  {coverImageUrl ? (
                    <img
                      src={coverImageUrl}
                      alt={`${name || "Business"} cover`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <ImageIcon
                          size={34}
                          className="mx-auto text-gray-300"
                        />

                        <p className="mt-2 text-sm text-gray-400">
                          No cover image
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#8B1E3F] hover:text-[#8B1E3F]">
                  {uploadingCover ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImageIcon size={17} />

                      Upload Cover Image
                    </>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingCover}
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0];

                      if (file) {
                        uploadImage(
                          file,
                          "cover"
                        );
                      }

                      event.currentTarget.value =
                        "";
                    }}
                  />
                </label>

                <p className="mt-2 text-xs text-gray-400">
                  PNG, JPG or WebP · Max 5MB
                </p>

              </div>
            </div>

          </div>
        </div>

        {/* =====================================
            BUSINESS INFORMATION
        ===================================== */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Business Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Tell customers what your business
              is about.
            </p>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">

            {/* BUSINESS NAME */}

            <div>
              <label
                htmlFor="business-name"
                className="text-sm font-semibold text-gray-900"
              >
                Business Name
              </label>

              <input
                id="business-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="e.g. David's Fashion Store"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
              />
            </div>

            {/* CATEGORY */}

            <div>
              <label
                htmlFor="business-category"
                className="text-sm font-semibold text-gray-900"
              >
                Category
              </label>

              <input
                id="business-category"
                type="text"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
                placeholder="e.g. Fashion, Food, Electronics"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
              />
            </div>

            {/* PHONE */}

            <div>
              <label
                htmlFor="business-phone"
                className="text-sm font-semibold text-gray-900"
              >
                Phone Number
              </label>

              <input
                id="business-phone"
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="e.g. 08012345678"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
              />
            </div>

            {/* ADDRESS */}

            <div>
              <label
                htmlFor="business-address"
                className="text-sm font-semibold text-gray-900"
              >
                Business Address
              </label>

              <input
                id="business-address"
                type="text"
                value={address}
                onChange={(event) =>
                  setAddress(
                    event.target.value
                  )
                }
                placeholder="Enter your business address"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
              />
            </div>

            {/* DESCRIPTION */}

            <div className="md:col-span-2">
              <label
                htmlFor="business-description"
                className="text-sm font-semibold text-gray-900"
              >
                Business Description
              </label>

              <textarea
                id="business-description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                rows={6}
                placeholder="Tell customers about your business, what you sell and what makes your business special..."
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
              />

              <p className="mt-2 text-xs text-gray-400">
                Give customers a clear idea of what
                your business offers.
              </p>
            </div>

          </div>
        </div>

        {/* =====================================
            STORE URL
        ===================================== */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Store URL
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              This is the address customers use
              to visit your public ADADI store.
            </p>
          </div>

          <div className="p-6">

            <label
              htmlFor="business-slug"
              className="text-sm font-semibold text-gray-900"
            >
              Store Slug
            </label>

            <div className="mt-2 flex flex-col sm:flex-row">
              <div className="flex items-center rounded-t-xl border border-b-0 border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 sm:rounded-l-xl sm:rounded-r-none sm:border-b">
                /businesses/
              </div>

              <input
                id="business-slug"
                type="text"
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(
                        /[^a-z0-9-]/g,
                        ""
                      )
                  )
                }
                placeholder="your-business"
                className="w-full rounded-b-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10 sm:rounded-l-none sm:rounded-r-xl"
              />
            </div>

            {slug && (
              <p className="mt-3 text-xs text-gray-500">
                Your public store:
                <span className="ml-1 font-medium text-[#8B1E3F]">
                  /businesses/{slug}
                </span>
              </p>
            )}

          </div>
        </div>

        {/* =====================================
            STORE STATUS
        ===================================== */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Store Availability
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Control whether your storefront is
              currently accepting customers.
            </p>
          </div>

          <div className="flex items-center justify-between gap-5 p-6">

            <div className="flex items-center gap-4">

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  isOpen
                    ? "bg-green-100"
                    : "bg-gray-100"
                }`}
              >
                <Store
                  size={21}
                  className={
                    isOpen
                      ? "text-green-600"
                      : "text-gray-500"
                  }
                />
              </div>

              <div>
                <p className="font-semibold text-gray-900">
                  {isOpen
                    ? "Store is Open"
                    : "Store is Closed"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {isOpen
                    ? "Customers can view and interact with your storefront."
                    : "Your store is currently marked as closed."}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setIsOpen(!isOpen)
              }
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                isOpen
                  ? "bg-[#8B1E3F]"
                  : "bg-gray-300"
              }`}
              aria-label={
                isOpen
                  ? "Close store"
                  : "Open store"
              }
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  isOpen
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>

          </div>
        </div>

        {/* =====================================
            SAVE BAR
        ===================================== */}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-gray-400">
            Changes are saved to your ADADI
            business profile.
          </p>

          <button
            type="submit"
            disabled={
              saving ||
              uploadingLogo ||
              uploadingCover
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Saving...
              </>
            ) : (
              <>
                <Save size={18} />

                Save Changes
              </>
            )}
          </button>

        </div>

      </form>
    </div>
  );
}