import { createClient } from "@/app/lib/supabase/server";
import BusinessDirectory from "./BusinessDirectory";

type Product = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
};

export default async function BusinessesPage() {
  const supabase = await createClient();

  const {
    data: businesses,
    error,
  } = await supabase
    .from("businesses")
    .select(`
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
      is_open
    `)
    .in("status", ["active", "approved"])
    .order("name", {
      ascending: true,
    });

  if (error) {
    console.error("BUSINESS DIRECTORY ERROR:", error);

    return (
      <main className="min-h-screen bg-white">
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <h1 className="text-xl font-semibold text-red-800">
              Unable to load businesses
            </h1>

            <p className="mt-2 text-sm text-red-600">
              Something went wrong while loading the business directory.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const formattedBusinesses =
    (businesses || []).map((business) => ({
      ...business,
      category: business.category || "Other",
      description:
        business.description || "No description available.",
      is_open: business.is_open ?? true,
    }));

  const businessIds = formattedBusinesses.map(
    (business) => business.id
  );

  let products: Product[] = [];

  if (businessIds.length > 0) {
    const {
      data: productData,
      error: productError,
    } = await supabase
      .from("products")
      .select(`
        id,
        business_id,
        name,
        description
      `)
      .in("business_id", businessIds)
      .eq("is_available", true);

    if (productError) {
      console.error(
        "BUSINESS DIRECTORY PRODUCT SEARCH ERROR:",
        productError
      );
    } else {
      products = productData || [];
    }
  }

  return (
    <BusinessDirectory
      businesses={formattedBusinesses}
      products={products}
    />
  );
}