"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
};

const CartContext = createContext<
  CartContextType | undefined
>(undefined);

const CART_STORAGE_KEY = "adadi-cart";

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // =========================================
  // LOAD CART FROM LOCAL STORAGE
  // =========================================

  useEffect(() => {
    try {
      const savedCart =
        localStorage.getItem(CART_STORAGE_KEY);

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setItems(parsedCart);
        }
      }
    } catch (error) {
      console.error(
        "Failed to load ADADI cart:",
        error
      );
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // =========================================
  // SAVE CART TO LOCAL STORAGE
  // =========================================

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch (error) {
      console.error(
        "Failed to save ADADI cart:",
        error
      );
    }
  }, [items, isHydrated]);

  // =========================================
  // ADD TO CART
  // =========================================

  function addToCart(newItem: CartItem) {
    setItems((currentItems) => {
      // -----------------------------------------
      // CHECK IF CART HAS ANOTHER BUSINESS
      // -----------------------------------------

      if (
        currentItems.length > 0 &&
        currentItems[0].businessId !==
          newItem.businessId
      ) {
        const shouldReplace = window.confirm(
          `Your cart contains products from ${currentItems[0].businessName}.\n\nWould you like to clear your cart and add this product from ${newItem.businessName}?`
        );

        if (!shouldReplace) {
          return currentItems;
        }

        return [
          {
            ...newItem,
            quantity: 1,
          },
        ];
      }

      // -----------------------------------------
      // CHECK IF PRODUCT ALREADY EXISTS
      // -----------------------------------------

      const existingItem = currentItems.find(
        (item) => item.id === newItem.id
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === newItem.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      // -----------------------------------------
      // ADD NEW PRODUCT
      // -----------------------------------------

      return [
        ...currentItems,
        {
          ...newItem,
          quantity: 1,
        },
      ];
    });
  }

  // =========================================
  // REMOVE FROM CART
  // =========================================

  function removeFromCart(productId: string) {
    setItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== productId
      )
    );
  }

  // =========================================
  // INCREASE QUANTITY
  // =========================================

  function increaseQuantity(productId: string) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  // =========================================
  // DECREASE QUANTITY
  // =========================================

  function decreaseQuantity(productId: string) {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  // =========================================
  // CLEAR CART
  // =========================================

  function clearCart() {
    setItems([]);
  }

  // =========================================
  // CHECK IF PRODUCT IS IN CART
  // =========================================

  function isInCart(productId: string) {
    return items.some(
      (item) => item.id === productId
    );
  }

  // =========================================
  // TOTAL ITEM COUNT
  // =========================================

  const itemCount = useMemo(() => {
    return items.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [items]);

  // =========================================
  // CART SUBTOTAL
  // =========================================

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [items]);

  // =========================================
  // CONTEXT VALUE
  // =========================================

  const value: CartContextType = {
    items,
    itemCount,
    subtotal,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
    isInCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// =========================================
// USE CART HOOK
// =========================================

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside a CartProvider"
    );
  }

  return context;
}