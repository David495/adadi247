"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Save,
  Store,
  Trash2,
  X,
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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function BusinessProfilePage() {
  const supabase = createClient();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [deletingLogo, setDeletingLogo] = useState(false);
  const [deletingCover, setDeletingCover] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const [originalLogoUrl, setOriginalLogoUrl] = useState("");
  const [originalCoverImageUrl, setOriginalCoverImageUrl] = useState("");

  const [logoPreview, setLogoPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");

  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingCover, setPendingCover] = useState<File | null>(null);

  const [isOpen, setIsOpen] = useState(true);

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

        const loadedBusiness = data as Business;

        setBusiness(loadedBusiness);

        setName(loadedBusiness.name || "");
        setDescription(loadedBusiness.description || "");
        setSlug(loadedBusiness.slug || "");
        setCategory(loadedBusiness.category || "");
        setPhone(loadedBusiness.phone || "");
        setAddress(loadedBusiness.address || "");

        setLogoUrl(loadedBusiness.logo_url || "");
        setCoverImageUrl(
          loadedBusiness.cover_image_url || ""
        );

        setOriginalLogoUrl(
          loadedBusiness.logo_url || ""
        );

        setOriginalCoverImageUrl(
          loadedBusiness.cover_image_url || ""
        );

        setLogoPreview(loadedBusiness.logo_url || "");
        setCoverPreview(
          loadedBusiness.cover_image_url || ""
        );

        setIsOpen(loadedBusiness.is_open ?? true);
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

  function validateImage(file: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError(
        "Please upload a JPG, PNG, or WebP image."
      );

      return false;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(
        "Image must be smaller than 5MB."
      );

      return false;
    }

    return true;
  }

  function handleLogoSelection(file: File) {
    setError("");
    setMessage("");

    if (!validateImage(file)) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setPendingLogo(file);
    setLogoPreview(previewUrl);
  }

  function handleCoverSelection(file: File) {
    setError("");
    setMessage("");

    if (!validateImage(file)) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setPendingCover(file);
    setCoverPreview(previewUrl);
  }

  function cancelLogoSelection() {
    if (logoPreview && pendingLogo) {
      URL.revokeObjectURL(logoPreview);
    }

    setPendingLogo(null);
    setLogoPreview(logoUrl);
    setMessage("");
    setError("");
  }

  function cancelCoverSelection() {
    if (coverPreview && pendingCover) {
      URL.revokeObjectURL(coverPreview);
    }

    setPendingCover(null);
    setCoverPreview(coverImageUrl);
    setMessage("");
    setError("");
  }

  function getStoragePath(
    url: string,
    bucket:
      | "business-logos"
      | "business-covers"
  ) {
    if (!url) {
      return null;
    }

    const marker = `/storage/v1/object/public/${bucket}/`;

    const index = url.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      url.slice(index + marker.length)
    );
  }

  async function uploadImage(
    file: File,
    type: "logo" | "cover"
  ) {
    if (!business) {
      setError(
        "Business information is unavailable."
      );

      return null;
    }

    const bucket =
      type === "logo"
        ? "business-logos"
        : "business-covers";

    const extensionMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension =
      extensionMap[file.type] || "jpg";

    const fileName = `${business.id}/${type}-${Date.now()}.${extension}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
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

      return null;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    const publicUrl =
      publicUrlData.publicUrl;

    if (!publicUrl) {
      setError(
        "Image uploaded but its public URL could not be created."
      );

      return null;
    }

    return {
      publicUrl,
      storagePath: fileName,
      bucket,
    };
  }

  async function deleteImage(
    type: "logo" | "cover"
  ) {
    if (!business) {
      return;
    }

    setError("");
    setMessage("");

    if (type === "logo") {
      setDeletingLogo(true);
    } else {
      setDeletingCover(true);
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      const currentUrl =
        type === "logo"
          ? logoUrl
          : coverImageUrl;

      const bucket =
        type === "logo"
          ? "business-logos"
          : "business-covers";

      const storagePath = getStoragePath(
        currentUrl,
        bucket
      );

      if (storagePath) {
        const {
          error: removeError,
        } = await supabase.storage
          .from(bucket)
          .remove([storagePath]);

        if (removeError) {
          console.error(
            "IMAGE DELETE ERROR:",
            removeError
          );

          setError(
            removeError.message ||
              "Unable to remove the image."
          );

          return;
        }
      }

      if (type === "logo") {
        setLogoUrl("");
        setLogoPreview("");
        setPendingLogo(null);
      } else {
        setCoverImageUrl("");
        setCoverPreview("");
        setPendingCover(null);
      }

      setMessage(
        `${
          type === "logo"
            ? "Logo"
            : "Cover image"
        } removed. Click Save Changes to apply it.`
      );
    } catch (err) {
      console.error(
        "BUSINESS IMAGE DELETE ERROR:",
        err
      );

      setError(
        "Unable to remove the image."
      );
    } finally {
      if (type === "logo") {
        setDeletingLogo(false);
      } else {
        setDeletingCover(false);
      }
    }
  }

  function cleanSlugValue(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!business) {
      return;
    }

    if (
      saving ||
      uploadingLogo ||
      uploadingCover ||
      deletingLogo ||
      deletingCover
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    let newLogoStoragePath: string | null = null;
    let newCoverStoragePath: string | null = null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      const trimmedName = name.trim();
      const cleanSlug = cleanSlugValue(slug);

      if (!trimmedName) {
        setError(
          "Business name is required."
        );

        return;
      }

      if (!cleanSlug) {
        setError(
          "Please provide a valid store slug."
        );

        return;
      }

      const {
        data: existingBusiness,
        error: slugCheckError,
      } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", cleanSlug)
        .neq("id", business.id)
        .maybeSingle();

      if (slugCheckError) {
        console.error(
          "SLUG CHECK ERROR:",
          slugCheckError
        );

        setError(
          "Unable to verify your store URL."
        );

        return;
      }

      if (existingBusiness) {
        setError(
          "That store URL is already being used by another business."
        );

        return;
      }

      let finalLogoUrl = logoUrl;
      let finalCoverUrl = coverImageUrl;

      if (pendingLogo) {
        setUploadingLogo(true);

        const result = await uploadImage(
          pendingLogo,
          "logo"
        );

        setUploadingLogo(false);

        if (!result) {
          return;
        }

        finalLogoUrl = result.publicUrl;
        newLogoStoragePath =
          result.storagePath;
      }

      if (pendingCover) {
        setUploadingCover(true);

        const result = await uploadImage(
          pendingCover,
          "cover"
        );

        setUploadingCover(false);

        if (!result) {
          if (newLogoStoragePath) {
            await supabase.storage
              .from("business-logos")
              .remove([
                newLogoStoragePath,
              ]);
          }

          return;
        }

        finalCoverUrl = result.publicUrl;
        newCoverStoragePath =
          result.storagePath;
      }

      const {
        data: updatedBusiness,
        error: updateError,
      } = await supabase
        .from("businesses")
        .update({
          name: trimmedName,
          slug: cleanSlug,
          description:
            description.trim() || null,
          logo_url:
            finalLogoUrl.trim() || null,
          cover_image_url:
            finalCoverUrl.trim() || null,
          category:
            category.trim() || null,
          phone:
            phone.trim() || null,
          address:
            address.trim() || null,
          is_open: isOpen,
        })
        .eq("id", business.id)
        .eq("owner_id", user.id)
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
        .single();

      if (updateError) {
        console.error(
          "BUSINESS PROFILE UPDATE ERROR:",
          updateError
        );

        if (newLogoStoragePath) {
          await supabase.storage
            .from("business-logos")
            .remove([
              newLogoStoragePath,
            ]);
        }

        if (newCoverStoragePath) {
          await supabase.storage
            .from("business-covers")
            .remove([
              newCoverStoragePath,
            ]);
        }

        setError(
          updateError.message ||
            "Unable to save your changes."
        );

        return;
      }

      if (!updatedBusiness) {
        setError(
          "Your business could not be updated."
        );

        return;
      }

      if (
        originalLogoUrl &&
        originalLogoUrl !== finalLogoUrl
      ) {
        const oldLogoPath =
          getStoragePath(
            originalLogoUrl,
            "business-logos"
          );

        if (oldLogoPath) {
          await supabase.storage
            .from("business-logos")
            .remove([oldLogoPath]);
        }
      }

      if (
        originalCoverImageUrl &&
        originalCoverImageUrl !== finalCoverUrl
      ) {
        const oldCoverPath =
          getStoragePath(
            originalCoverImageUrl,
            "business-covers"
          );

        if (oldCoverPath) {
          await supabase.storage
            .from("business-covers")
            .remove([oldCoverPath]);
        }
      }

      setBusiness(
        updatedBusiness as Business
      );

      setLogoUrl(
        updatedBusiness.logo_url || ""
      );

      setCoverImageUrl(
        updatedBusiness.cover_image_url || ""
      );

      setLogoPreview(
        updatedBusiness.logo_url || ""
      );

      setCoverPreview(
        updatedBusiness.cover_image_url || ""
      );

      setOriginalLogoUrl(
        updatedBusiness.logo_url || ""
      );

      setOriginalCoverImageUrl(
        updatedBusiness.cover_image_url || ""
      );

      setSlug(
        updatedBusiness.slug || ""
      );

      setPendingLogo(null);
      setPendingCover(null);

      setMessage(
        "Business profile updated successfully."
      );
    } catch (err) {
      console.error(
        "BUSINESS PROFILE SAVE ERROR:",
        err
      );

      if (newLogoStoragePath) {
        await supabase.storage
          .from("business-logos")
          .remove([
            newLogoStoragePath,
          ]);
      }

      if (newCoverStoragePath) {
        await supabase.storage
          .from("business-covers")
          .remove([
            newCoverStoragePath,
          ]);
      }

      setError(
        "Unable to save your business profile."
      );
    } finally {
      setUploadingLogo(false);
      setUploadingCover(false);
      setSaving(false);
    }
  }

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
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#8B1E3F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#64152E]"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  const busy =
    saving ||
    uploadingLogo ||
    uploadingCover ||
    deletingLogo ||
    deletingCover;

  const hasPendingLogo =
    Boolean(pendingLogo);

  const hasPendingCover =
    Boolean(pendingCover);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/businesses"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#8B1E3F] transition hover:text-[#64152E]"
        >
          <ArrowLeft size={16} />
          Back to Business Dashboard
        </Link>

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
            <div>
              <label className="text-sm font-semibold text-gray-900">
                Business Logo
              </label>

              <p className="mt-1 text-xs text-gray-500">
                Recommended: square image,
                preferably at least 500 × 500px.
              </p>

              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  {logoPreview ? (
                    <>
                      <img
                        src={logoPreview}
                        alt={`${name || "Business"} logo`}
                        className="h-full w-full object-cover"
                      />

                      {hasPendingLogo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800">
                            Preview
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <Store
                      size={36}
                      className="text-gray-300"
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-wrap gap-3">
                  <label
                    className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition ${
                      busy
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:border-[#8B1E3F] hover:text-[#8B1E3F]"
                    }`}
                  >
                    <ImageIcon size={17} />

                    {hasPendingLogo
                      ? "Choose Different Logo"
                      : logoUrl
                      ? "Change Logo"
                      : "Choose Logo"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={busy}
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0];

                        if (file) {
                          handleLogoSelection(
                            file
                          );
                        }

                        event.currentTarget.value =
                          "";
                      }}
                    />
                  </label>

                  {hasPendingLogo && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={
                        cancelLogoSelection
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X size={17} />
                      Cancel
                    </button>
                  )}

                  {logoUrl &&
                    !hasPendingLogo && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          deleteImage("logo")
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingLogo ? (
                          <>
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 size={17} />
                            Remove
                          </>
                        )}
                      </button>
                    )}

                  <p className="w-full text-xs text-gray-400">
                    PNG, JPG or WebP · Max 5MB
                  </p>

                  {hasPendingLogo && (
                    <p className="w-full text-xs font-medium text-[#8B1E3F]">
                      Logo selected. Click Save
                      Changes to upload it.
                    </p>
                  )}
                </div>
              </div>
            </div>

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
                  {coverPreview ? (
                    <>
                      <img
                        src={coverPreview}
                        alt={`${name || "Business"} cover`}
                        className="h-full w-full object-cover"
                      />

                      {hasPendingCover && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800">
                            Preview
                          </span>
                        </div>
                      )}
                    </>
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

                <div className="mt-4 flex flex-wrap gap-3">
                  <label
                    className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition ${
                      busy
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:border-[#8B1E3F] hover:text-[#8B1E3F]"
                    }`}
                  >
                    <ImageIcon size={17} />

                    {hasPendingCover
                      ? "Choose Different Cover"
                      : coverImageUrl
                      ? "Change Cover"
                      : "Choose Cover Image"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={busy}
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0];

                        if (file) {
                          handleCoverSelection(
                            file
                          );
                        }

                        event.currentTarget.value =
                          "";
                      }}
                    />
                  </label>

                  {hasPendingCover && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={
                        cancelCoverSelection
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X size={17} />
                      Cancel
                    </button>
                  )}

                  {coverImageUrl &&
                    !hasPendingCover && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          deleteImage("cover")
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingCover ? (
                          <>
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 size={17} />
                            Remove
                          </>
                        )}
                      </button>
                    )}

                  <p className="w-full text-xs text-gray-400">
                    PNG, JPG or WebP · Max 5MB
                  </p>

                  {hasPendingCover && (
                    <p className="w-full text-xs font-medium text-[#8B1E3F]">
                      Cover image selected. Click
                      Save Changes to upload it.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

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
                  setCategory(event.target.value)
                }
                placeholder="e.g. Fashion, Food, Electronics"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
              />
            </div>

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
                  setAddress(event.target.value)
                }
                placeholder="Enter your business address"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
              />
            </div>

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
                maxLength={1000}
                placeholder="Tell customers about your business, what you sell and what makes your business special..."
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10"
              />

              <div className="mt-2 flex justify-between text-xs text-gray-400">
                <span>
                  Give customers a clear idea of
                  what your business offers.
                </span>

                <span>
                  {description.length}/1000
                </span>
              </div>
            </div>
          </div>
        </div>

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
                    cleanSlugValue(
                      event.target.value
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

          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
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
              disabled={busy}
              onClick={() =>
                setIsOpen(!isOpen)
              }
              className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
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

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-400">
            Changes are saved to your ADADI
            business profile.
          </p>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B1E3F] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#64152E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ||
            uploadingLogo ||
            uploadingCover ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                {uploadingLogo
                  ? "Uploading Logo..."
                  : uploadingCover
                  ? "Uploading Cover..."
                  : "Saving..."}
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