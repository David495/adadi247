import type { MetadataRoute } from "next";
import { createAdminClient } from "@/app/lib/supabase/admin";

const BASE_URL = "https://adadi247.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

  // =========================================
  // STATIC PAGES
  // =========================================

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/businesses`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/register/business`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // =========================================
  // FETCH APPROVED BUSINESSES
  // =========================================

  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("slug, updated_at, status")
    .eq("status", "approved");

  if (businessesError) {
    console.error(
      "Error fetching businesses for sitemap:",
      businessesError
    );
  }

  const businessPages: MetadataRoute.Sitemap =
    businesses?.map((business) => ({
      url: `${BASE_URL}/businesses/${business.slug}`,
      lastModified: business.updated_at
        ? new Date(business.updated_at)
        : new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    })) ?? [];

  // =========================================
  // FETCH PRODUCTS
  // =========================================

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      `
      slug,
      updated_at,
      is_available,
      businesses (
        slug,
        status
      )
    `
    )
    .eq("is_available", true);

  if (productsError) {
    console.error(
      "Error fetching products for sitemap:",
      productsError
    );
  }

  const productPages: MetadataRoute.Sitemap =
    products
      ?.filter(
        (product: any) =>
          product.businesses &&
          product.businesses.status === "approved"
      )
      .map((product: any) => ({
        url: `${BASE_URL}/businesses/${product.businesses.slug}/products/${product.slug}`,
        lastModified: product.updated_at
          ? new Date(product.updated_at)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      })) ?? [];

  // =========================================
  // RETURN COMPLETE SITEMAP
  // =========================================

  return [
    ...staticPages,
    ...businessPages,
    ...productPages,
  ];
}