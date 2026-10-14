"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  Sparkles,
  Tag,
  Check,
  Shirt,
  ShoppingCart,
  Zap,
  Package,
  Eye,
  ImageIcon,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api";
import { cartService } from "@/lib/cart";
import { CartSheet } from "@/components/shop/cart-sheet";
import { ProductDetailModal } from "@/components/shop/product-detail-modal";
import { findImageForColor } from "@/lib/product-utils";
import type { Product, ProductVariant } from "@/types";

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function ProductImage({ src, alt, code }: { src?: string; alt: string; code: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-500 group-hover:scale-105 transition-transform duration-300">
        <Shirt className="w-16 h-16 mb-2 opacity-30 text-neutral-400" />
        <span className="text-xs font-mono font-medium tracking-wider text-neutral-400">
          {code}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
}

export function CustomerStorefront() {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, ProductVariant>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Draggable cart button state
  const [cartPosition, setCartPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingCart, setIsDraggingCart] = useState(false);
  const cartDragRef = useRef<HTMLDivElement>(null);
  const cartDragStartPos = useRef({ x: 0, y: 0 });
  const cartInitialPos = useRef({ x: 0, y: 0 });
  const cartHasMoved = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fs_floating_cart_pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          parsed.x >= 0 &&
          parsed.x <= window.innerWidth - 80 &&
          parsed.y >= 0 &&
          parsed.y <= window.innerHeight - 60
        ) {
          setCartPosition(parsed);
        }
      }
    } catch {}
  }, []);

  const isDraggingCartRef = useRef(false);

  const handleCartPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDraggingCartRef.current = true;
    cartHasMoved.current = false;
    cartDragStartPos.current = { x: e.clientX, y: e.clientY };

    if (cartDragRef.current) {
      const rect = cartDragRef.current.getBoundingClientRect();
      cartInitialPos.current = { x: rect.left, y: rect.top };
    }
  };

  const handleCartPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingCartRef.current) return;

    const deltaX = e.clientX - cartDragStartPos.current.x;
    const deltaY = e.clientY - cartDragStartPos.current.y;

    if (!cartHasMoved.current && Math.hypot(deltaX, deltaY) > 8) {
      cartHasMoved.current = true;
      setIsDraggingCart(true);
      if (cartDragRef.current) {
        try {
          cartDragRef.current.setPointerCapture(e.pointerId);
        } catch {}
      }
    }

    if (cartHasMoved.current) {
      const maxX = window.innerWidth - (cartDragRef.current?.offsetWidth || 140) - 10;
      const maxY = window.innerHeight - (cartDragRef.current?.offsetHeight || 50) - 10;

      const newX = Math.min(Math.max(10, cartInitialPos.current.x + deltaX), maxX);
      const newY = Math.min(Math.max(10, cartInitialPos.current.y + deltaY), maxY);

      setCartPosition({ x: newX, y: newY });
    }
  };

  const handleCartPointerUp = (e: React.PointerEvent) => {
    if (isDraggingCartRef.current) {
      isDraggingCartRef.current = false;
      setIsDraggingCart(false);
      if (cartDragRef.current) {
        try {
          cartDragRef.current.releasePointerCapture(e.pointerId);
        } catch {}
      }

      if (cartHasMoved.current && cartPosition) {
        localStorage.setItem("fs_floating_cart_pos", JSON.stringify(cartPosition));
      }
    }
  };

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartHasMoved.current) {
      cartHasMoved.current = false;
      return;
    }
    setIsCartOpen(true);
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<Product[]>("/products");
        return data;
      } catch (err) {
        console.error("Failed to load products", err);
        return [];
      }
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<{ id: string; slug: string; name: string }[]>("/products/categories");
        return data;
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    setCartCount(cartService.getTotalCount());
    const unsubscribe = cartService.subscribe(() => {
      setCartCount(cartService.getTotalCount());
    });
    const handleOpenCart = () => setIsCartOpen(true);
    window.addEventListener("open_cart_sheet", handleOpenCart);
    return () => {
      unsubscribe();
      window.removeEventListener("open_cart_sheet", handleOpenCart);
    };
  }, []);

  const handleSelectVariant = (productId: string, variant: ProductVariant) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variant }));
  };

  const filteredProducts = (products ?? []).filter((p) => {
    const matchesCategory =
      selectedCategory === "all" ||
      p.categoryId === selectedCategory ||
      p.category?.slug === selectedCategory;

    const matchesSearch =
      !searchTerm.trim() ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (
    product: Product,
    customVariant?: ProductVariant,
    quantity = 1,
    customImageUrl?: string,
    openCartImmediately = false
  ) => {
    const variants = product.variants ?? [];
    const selected = customVariant || selectedVariants[product.id] || variants[0];
    if (!selected) {
      toast.error("Vui lòng chọn biến thể size/màu.");
      return;
    }

    const itemImage =
      customImageUrl ||
      findImageForColor(product, selected.color) ||
      product.images?.find((img) => img.isPrimary)?.imageUrl ||
      product.images?.[0]?.imageUrl;

    cartService.addItem({
      productId: product.id,
      variantId: selected.id,
      productCode: product.code,
      productName: product.name,
      color: selected.color || "Tiêu chuẩn",
      size: selected.size || "FreeSize",
      price: selected.price,
      stock: selected.stock,
      quantity,
      imageUrl: itemImage,
    });

    if (openCartImmediately) {
      setIsCartOpen(true);
    } else {
      toast.success(
        `Đã thêm ${quantity > 1 ? `${quantity}x ` : ""}[${product.name} - Màu ${selected.color}, Size ${selected.size}] vào giỏ hàng!`,
        {
          action: {
            label: "Xem giỏ",
            onClick: () => setIsCartOpen(true),
          },
        }
      );
    }
  };

  return (
    <div className="space-y-6 max-w-[1560px] mx-auto w-full min-w-0">
      {/* Hero Banner (Clean, Minimalist Enterprise Style) */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#17c1e8]/30 bg-[#17c1e8]/10 text-neutral-900 dark:text-[#17c1e8] text-xs font-mono font-medium">
            <Tag className="w-3 h-3 text-[#17c1e8]" />
            CATALOG 2026
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Sản Phẩm & Trang Phục Thiết Kế
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm leading-relaxed">
            Danh mục sản phẩm chất lượng cao, cập nhật tồn kho theo thời gian thực. Hỗ trợ tư vấn size và giải đáp thắc mắc trực tuyến.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => setIsCartOpen(true)}
            className="rounded-md bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] h-9 px-4 text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4 text-slate-950" />
            Xem Giỏ Hàng
            {cartCount > 0 && (
              <span className="font-mono text-xs px-1.5 py-0.2 rounded-full bg-slate-950 text-[#17c1e8] font-bold">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Products Section */}
      <div className="w-full min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#17c1e8]" />
              Danh mục sản phẩm
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Hàng chính hãng sẵn kho, giao hàng toàn quốc
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCartOpen(true)}
            className="hidden sm:inline-flex rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-mono h-8 px-3"
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-1 text-[#17c1e8]" />
            Giỏ ({cartCount})
          </Button>
        </div>

        {/* Category Filter Chips & Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none w-full md:w-auto">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-[#17c1e8] text-slate-950 shadow-sm"
                  : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              Tất cả ({products?.length || 0})
            </button>
            {(categories ?? []).map((cat) => {
              const count = (products ?? []).filter(
                (p) => p.categoryId === cat.id || p.category?.slug === cat.slug
              ).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-[#17c1e8] text-slate-950 shadow-sm"
                      : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã SP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 sm:h-9 pl-8 pr-3 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 shadow-sm"
            />
          </div>
        </div>

        {/* Product Grid / Loading / Empty */}
        {isLoading ? (
          <div className="storefront-product-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 flex flex-col justify-between"
              >
                <div className="aspect-square w-full rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Shirt className="w-8 h-8 text-neutral-400 opacity-40" />
                </div>
                <div className="space-y-2 pt-3">
                  <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-100 dark:bg-neutral-850 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <Shirt className="w-10 h-10 mx-auto mb-3 text-neutral-400 opacity-40" />
            <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100">Không tìm thấy sản phẩm phù hợp</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Thử xóa bộ lọc tìm kiếm hoặc quay lại danh mục tất cả sản phẩm
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchTerm("");
                }}
                className="rounded-md border border-neutral-200 dark:border-neutral-800 text-xs"
              >
                Xem tất cả sản phẩm
              </Button>
            </div>
          </div>
        ) : (
          <div className="storefront-product-grid">
            {filteredProducts.map((product) => {
              const variants = product.variants ?? [];
              const selected = selectedVariants[product.id] || variants[0];
              const price = selected ? selected.price : variants[0]?.price || 0;
              const inStock = selected ? selected.stock > 0 : false;
              const primaryImg =
                product.images?.find((img) => img.isPrimary)?.imageUrl ||
                product.images?.[0]?.imageUrl;
              const currentImg = findImageForColor(product, selected?.color) || primaryImg;
              const imageCount = product.images?.length || 0;

              return (
                <Card
                  key={product.id}
                  className="group min-w-0 w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors flex flex-col"
                >
                  {/* Clickable Image Box */}
                  <div
                    onClick={() => setDetailProduct(product)}
                    className="relative aspect-square w-full max-h-[190px] sm:max-h-none bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center overflow-hidden border-b border-neutral-200 dark:border-neutral-800 cursor-pointer group/img"
                    title="Bấm để xem chi tiết sản phẩm"
                  >
                    <ProductImage src={currentImg} alt={product.name} code={product.code} />

                    {/* Hover overlay hint */}
                    <div className="absolute inset-0 bg-neutral-950/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-neutral-900 text-white text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Xem ảnh
                      </span>
                    </div>

                    <Badge className="absolute top-2 left-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 text-[10px] font-mono px-2 py-0.5 text-neutral-700 dark:text-neutral-300">
                      {product.category?.name || "Thời trang"}
                    </Badge>

                    {inStock ? (
                      <Badge className="absolute top-2 right-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono px-2 py-0.5">
                        Sẵn {selected?.stock}
                      </Badge>
                    ) : (
                      <Badge className="absolute top-2 right-2 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-mono px-2 py-0.5">
                        Hết hàng
                      </Badge>
                    )}

                    {imageCount > 1 && (
                      <span className="absolute bottom-2 right-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 text-[10px] font-mono px-2 py-0.5 text-neutral-700 dark:text-neutral-300 flex items-center gap-1 shadow-sm">
                        <ImageIcon className="w-3 h-3 text-neutral-500" />
                        {imageCount} ảnh
                      </span>
                    )}
                  </div>

                  <CardContent className="p-3 sm:p-4 min-w-0 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3
                        onClick={() => setDetailProduct(product)}
                        className="font-medium text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer line-clamp-1 sm:line-clamp-2"
                      >
                        {product.name}
                      </h3>
                      <p className="hidden sm:block text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                        {product.description || "Chất vải cao cấp, mềm mịn, tạo cảm giác thoải mái khi mặc."}
                      </p>

                      {variants.length > 0 && (
                        <>
                          {/* Desktop Variant Selector */}
                          <div className="hidden sm:block mt-3 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-500 font-medium">Phân loại:</span>
                              <span className="font-mono text-neutral-900 dark:text-neutral-100 font-medium">
                                {selected?.color} - {selected?.size}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {variants.map((v) => {
                                const isCur = selected?.id === v.id;
                                return (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => handleSelectVariant(product.id, v)}
                                    className={`text-xs font-mono px-2 py-0.5 rounded-md transition-colors ${
                                      isCur
                                        ? "bg-[#17c1e8] text-slate-950 font-bold shadow-sm"
                                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                    }`}
                                  >
                                    {v.color} - {v.size}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Mobile Variant Note */}
                          <div className="sm:hidden mt-1 text-[10px] text-neutral-500 truncate font-mono">
                            {selected?.color} - {selected?.size}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Giá</span>
                        <span className="text-xs sm:text-base font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100">
                          {formatVND(price)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!inStock}
                          onClick={() => handleAddToCart(product, selected, 1, currentImg, false)}
                          className="rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[10px] sm:text-xs font-medium h-7 sm:h-8 px-2 sm:px-2.5 shrink-0"
                          title="Thêm vào giỏ hàng"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 sm:mr-1 shrink-0" />
                          <span className="hidden sm:inline">Thêm giỏ</span>
                        </Button>

                        <Button
                          size="sm"
                          disabled={!inStock}
                          onClick={() => handleAddToCart(product, selected, 1, currentImg, true)}
                          className="flex-1 min-w-0 rounded-md bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] text-[10px] sm:text-xs font-bold h-7 sm:h-8 px-2 shadow-sm"
                        >
                          <Zap className="w-3 h-3 mr-1 shrink-0 text-slate-950" />
                          <span className="truncate">Mua ngay</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Draggable Floating Cart Badge */}
      <div
        ref={cartDragRef}
        onPointerDown={handleCartPointerDown}
        onPointerMove={handleCartPointerMove}
        onPointerUp={handleCartPointerUp}
        style={
          cartPosition
            ? {
                position: "fixed",
                left: `${cartPosition.x}px`,
                top: `${cartPosition.y}px`,
                zIndex: 40,
                touchAction: "none",
              }
            : {
                position: "fixed",
                left: "24px",
                bottom: "24px",
                zIndex: 40,
                touchAction: "none",
              }
        }
        className={`select-none cursor-grab active:cursor-grabbing transition-transform duration-150 ${
          isDraggingCart ? "scale-105" : "hover:scale-105"
        }`}
      >
        <button
          type="button"
          onClick={handleCartClick}
          className="flex items-center gap-2.5 rounded-full border border-[#17c1e8]/40 bg-neutral-900/90 text-white dark:bg-neutral-900/95 dark:text-neutral-100 backdrop-blur-md px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-xl hover:border-[#17c1e8] transition-all"
          title="Kéo thả để di chuyển • Nhấn để xem giỏ hàng"
        >
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#17c1e8] text-slate-950 font-bold">
            <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span>Giỏ hàng</span>
          {cartCount > 0 && (
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#17c1e8] text-slate-950 font-bold shadow-sm">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Shopee-style Product Image & Detail Gallery Modal */}
      <ProductDetailModal
        product={detailProduct}
        open={!!detailProduct}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        onAddToCart={(p, v, q, img, openNow) => handleAddToCart(p, v, q, img, openNow)}
      />

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </div>
  );
}
