"use client";

import { useState, useEffect } from "react";
import { ShoppingCart } from "lucide-react";
import { cartService } from "@/lib/cart";

export function HeaderCartButton() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(cartService.getTotalCount());
    const unsubscribe = cartService.subscribe(() => {
      setCartCount(cartService.getTotalCount());
    });
    return () => unsubscribe();
  }, []);

  const handleClick = () => {
    window.dispatchEvent(new Event("open_cart_sheet"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 transition-colors shadow-sm"
      title="Xem giỏ hàng"
    >
      <div className="relative">
        <ShoppingCart className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-[#17c1e8] text-slate-950 text-[10px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </div>
      <span className="text-xs font-medium hidden sm:inline text-neutral-900 dark:text-neutral-100">
        Giỏ hàng
      </span>
    </button>
  );
}
