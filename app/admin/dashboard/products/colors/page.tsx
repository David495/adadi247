import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CheckCircle2, Palette, ArrowLeft } from "lucide-react";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getOptimizedImageUrl } from "@/app/lib/image";
import { bulkUpdateProductColors, updateProductColor } from "./action";

const COLORS = [
  "Black", "White", "Grey", "Brown", "Red", "Pink", "Orange",
  "Yellow", "Green", "Blue", "Purple", "Gold", "Silver", "Multicolor",
];

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function ProductColorsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const query = (params.q ?? "").trim().slice(0, 100);
  const pageSize = 40;

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/admin-login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/dashboard/customer");

  const adminSupabase = createAdminClient();
  let productsQuery = adminSupabase
    .from("products")
    .select("id, name, image_url, color, businesses(name)", { count: "exact" })
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (query) productsQuery = productsQuery.ilike("name", `%${query.replace(/[%_]/g, "")}%`);
  else productsQuery = productsQuery.is("color", null);

  const { data, error, count } = await productsQuery;
  const products = data ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  return (
    <main className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link href="/admin/dashboard/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E3F] hover:underline">
          <ArrowLeft size={16} /> Back to products
        </Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">Marketplace tools</p>
        <h1 className="mt-2 text-3xl font-bold text-[#242424]">Bulk product color assignment</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Assign the actual main color to existing products so customers can filter them by color. Review each product image and save its color. Nothing is guessed or changed until you save it.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-5">
          <p className="text-sm text-gray-500">Products needing colors</p>
          <p className="mt-2 text-2xl font-bold text-[#64152E]">{query ? "Search results" : count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-5 sm:col-span-2">
          <p className="text-sm font-semibold text-[#242424]">Find a product</p>
          <form className="mt-3 flex flex-col gap-2 sm:flex-row" action="/admin/dashboard/products/colors">
            <input name="q" defaultValue={query} placeholder="Search by product name (e.g. red dress)" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#8B1E3F] focus:ring-2 focus:ring-[#8B1E3F]/10" />
            <button className="rounded-xl bg-[#64152E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#7A1B38]" type="submit">Search</button>
            {query && <Link href="/admin/dashboard/products/colors" className="rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600 hover:bg-gray-50">Clear</Link>}
          </form>
        </div>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load products. Please refresh and try again.</div>}

      {!error && products.length === 0 && (
        <div className="rounded-2xl border border-[#E8D5DC] bg-white p-10 text-center">
          <CheckCircle2 className="mx-auto text-green-600" size={32} />
          <h2 className="mt-3 text-lg font-bold text-[#242424]">{query ? "No matching products" : "All products on this page are assigned"}</h2>
          <p className="mt-2 text-sm text-gray-500">{query ? "Try another search term." : "There are no unassigned products left to show."}</p>
        </div>
      )}

      {products.length > 0 && (
        <form action={bulkUpdateProductColors} className="mb-5 rounded-2xl border border-[#E8D5DC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#242424]">Assign one color to multiple products</h2>
          <p className="mt-1 text-sm text-gray-500">Hold Ctrl (Windows) or Command (Mac) to select multiple products from this page. Use this only when the selected products share the same main color.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
            <select name="productIds" multiple required size={Math.min(7, products.length)} className="min-h-28 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm">
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <select name="bulkColor" defaultValue="" required className="w-full self-start rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm">
              <option value="" disabled>Choose shared color</option>
              {COLORS.map((color) => <option key={color} value={color}>{color}</option>)}
            </select>
            <button type="submit" className="min-h-11 self-start rounded-xl bg-[#64152E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7A1B38]">Save selected</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {products.map((product) => {
          const business = Array.isArray(product.businesses) ? product.businesses[0] : product.businesses;
          const imageUrl = product.image_url ? getOptimizedImageUrl(product.image_url, { width: 160, height: 160, quality: 65 }) : null;
          return (
            <article key={product.id} className="grid gap-4 rounded-2xl border border-[#E8D5DC] bg-white p-4 shadow-sm sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center sm:p-5">
              <div className="relative h-22 w-22 overflow-hidden rounded-xl bg-[#FAF8F6]">
                {imageUrl ? <Image src={imageUrl} alt={product.name} fill sizes="88px" className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center"><Palette className="text-[#8B1E3F]" size={24} /></div>}
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-[#242424]">{product.name}</h2>
                <p className="mt-1 text-sm text-gray-500">{business?.name ?? "Unknown business"}</p>
                <p className="mt-1 text-xs text-gray-400">Current color: {product.color ?? "Not assigned"}</p>
                <form action={updateProductColor} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input type="hidden" name="productId" value={product.id} />
                  <select name="color" defaultValue={product.color ?? ""} required className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm sm:max-w-56">
                    <option value="" disabled>Select main color</option>
                    {COLORS.map((color) => <option key={color} value={color}>{color}</option>)}
                  </select>
                  <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#64152E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7A1B38]">
                    <CheckCircle2 size={16} /> Save color
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#E8D5DC] bg-white p-4 sm:flex-row">
        <p className="text-sm text-gray-500">Page {page} of {totalPages} · {count ?? 0} products</p>
        <div className="flex gap-2">
          {page > 1 && <Link href={`/admin/dashboard/products/colors?page=${page - 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Previous</Link>}
          {page < totalPages && <Link href={`/admin/dashboard/products/colors?page=${page + 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className="rounded-xl bg-[#64152E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7A1B38]">Next</Link>}
        </div>
      </div>
    </main>
  );
}
