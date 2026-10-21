"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

type ProductRatingProps = {
  productId: string;
  businessId: string;
  initialAverage: number;
  initialCount: number;
  initialUserRating: number | null;
};

export default function ProductRating({
  productId,
  businessId,
  initialAverage,
  initialCount,
  initialUserRating,
}: ProductRatingProps) {
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [userRating, setUserRating] = useState<number | null>(initialUserRating);
  const [selected, setSelected] = useState(initialUserRating ?? 0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submitRating() {
    if (selected < 1 || selected > 5 || pending) return;
    setPending(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      setMessage("Please log in to rate this product.");
      setPending(false);
      return;
    }

    const { error } = await supabase
      .from("product_reviews")
      .upsert(
        { product_id: productId, business_id: businessId, user_id: user.id, rating: selected, updated_at: new Date().toISOString() },
        { onConflict: "product_id,user_id" }
      );

    if (error) {
      setMessage("Your rating couldn't be saved. Please try again.");
      setPending(false);
      return;
    }

    const { data: reviews } = await supabase
      .from("product_reviews")
      .select("rating")
      .eq("product_id", productId);

    const ratings = (reviews ?? []).map((review) => Number(review.rating));
    setAverage(ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0);
    setCount(ratings.length);
    setUserRating(selected);
    setMessage("Thanks for rating this product!");
    setPending(false);
  }

  return (
    <section className="rounded-2xl border border-[#6b1224]/10 bg-white p-5 shadow-sm" aria-label="Product ratings">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Customer rating</h2>
          <p className="mt-1 text-sm text-gray-500">
            {count ? <><span className="font-semibold text-gray-900">{average.toFixed(1)}</span> out of 5 · {count} {count === 1 ? "rating" : "ratings"}</> : "No ratings yet"}
          </p>
        </div>
        <div className="flex items-center gap-1" aria-label={`Average rating ${average.toFixed(1)} out of 5`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} size={20} className={star <= Math.round(average) ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700">{userRating ? "Update your rating" : "Rate this product"}</p>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" disabled={pending} onClick={() => setSelected(star)} aria-label={`Rate ${star} out of 5 stars`} className="rounded p-1 transition hover:scale-110 disabled:opacity-50">
              <Star size={27} className={star <= selected ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
            </button>
          ))}
          <button type="button" onClick={submitRating} disabled={pending || selected < 1} className="ml-3 inline-flex items-center gap-2 rounded-xl bg-[#6b1224] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#53101c] disabled:cursor-not-allowed disabled:opacity-60">
            {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {pending ? "Saving..." : "Submit"}
          </button>
        </div>
        {message && <p role="status" className="mt-3 text-sm text-gray-600">{message}</p>}
      </div>
    </section>
  );
}
