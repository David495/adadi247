"use client";

import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";

import { useCart } from "./CartProvider";

type AddToCartButtonProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    image_url: string | null;
    business_id: string;
  };
  business: {
    id: string;
    name: string;
    slug: string;
  };
};

export default function AddToCartButton({
  product,
  business,
}: AddToCartButtonProps) {
  const { addToCart, isInCart } = useCart();

  const productIsInCart = isInCart(product.id);

  // =========================================
  // ADD PRODUCT TO CART
  // =========================================

  function handleAddToCart() {
    if (productIsInCart) {
      return;
    }

    addToCart({
      id: product.id,
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      imageUrl: product.image_url,
      quantity: 1,
    });
  }

  // =========================================
  // PRODUCT IS ALREADY IN CART
  // =========================================

  if (productIsInCart) {
    return (
      <div className="flex w-full flex-col gap-3">
        {/* ADDED TO CART STATUS */}

        <div className="flex w-full items-center justify-center gap-3 rounded-xl border border-green-200 bg-green-50 px-6 py-4 text-base font-semibold text-green-700">
          <Check className="h-5 w-5" />

          Added to Cart
        </div>

        {/* PROCEED TO CART */}

        <Link
          href="/cart"
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#6b1224] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c] active:scale-[0.99]"
        >
          <ShoppingBag className="h-5 w-5" />

          Proceed to Checkout
        </Link>
      </div>
    );
  }

  // =========================================
  // ADD TO CART BUTTON
  // =========================================

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#6b1224] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#6b1224]/20 transition hover:bg-[#53101c] active:scale-[0.99]"
    >
      <ShoppingBag className="h-5 w-5" />

      Add to Cart
    </button>
  );
}