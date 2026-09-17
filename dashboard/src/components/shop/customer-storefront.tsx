"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api";
import { cartService } from "@/lib/cart";
import { CartSheet } from "@/components/shop/cart-sheet";
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
        <Shirt className="w-20 h-20 mb-2 opacity-40 text-[#17c1e8]" />
        <span className="text-xs font-mono font-semibold tracking-wider text-slate-400">
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

  const { data: products, isLoading } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () => {
      const { data } = await apiClient.get<Product[]>("/products");
      return data;
    },
  });

  useEffect(() => {
    setCartCount(cartService.getTotalCount());
    const unsubscribe = cartService.subscribe(() => {
      setCartCount(cartService.getTotalCount());
    });
    return () => unsubscribe();
  }, []);

  const handleSelectVariant = (productId: string, variant: ProductVariant) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variant }));
  };

  const handleAddToCart = (product: Product, openCartImmediately = false) => {
    const variants = product.variants ?? [];
    const selected = selectedVariants[product.id] || variants[0];
    if (!selected) {
      toast.error("Vui lòng chọn biến thể size/màu.");
      return;
    }

    const primaryImg =
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
      quantity: 1,
      imageUrl: primaryImg,
    });

    if (openCartImmediately) {
      setIsCartOpen(true);
    } else {
      toast.success(
        `Đã thêm [${product.name} - ${selected.color} ${selected.size}] vào giỏ hàng!`,
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 border border-[#17c1e8]/20 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <Badge className="bg-[#17c1e8]/20 text-[#17c1e8] border-[#17c1e8]/30 gap-1 px-3 py-1">
            <Sparkles className="w-3.5 h-3.5" />
            Bộ Sưu Tập Mới 2026
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Thời Trang Hiện Đại & Phong Cách
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Khám phá các mẫu áo thun cotton, quần jean và phụ kiện chất lượng cao. Trợ lý AI ở góc màn hình luôn sẵn sàng tư vấn chọn size và phối đồ cho bạn!
          </p>
        </div>

        {/* Action Button */}
        <div className="relative z-10 pt-2 flex items-center gap-3">
          <Button
            onClick={() => setIsCartOpen(true)}
            className="bg-gradient-to-r from-[#17c1e8] to-cyan-600 hover:from-cyan-400 hover:to-[#17c1e8] text-slate-950 rounded-2xl px-5 h-11 shadow-lg shadow-[#17c1e8]/30 flex items-center gap-2 font-bold transition-all"
          >
            <ShoppingCart className="w-5 h-5 text-slate-950" />
            Xem Giỏ Hàng
            {cartCount > 0 && (
              <span className="bg-slate-950 text-[#17c1e8] text-xs px-2 py-0.5 rounded-full font-extrabold animate-pulse border border-[#17c1e8]/40">
                {cartCount}
              </span>
            )}
          </Button>
        </div>

        {/* Ambient Glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#17c1e8]/15 to-transparent pointer-events-none" />
      </div>

      {/* Products Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#17c1e8]" />
              Sản phẩm đang bán
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hàng chính hãng sẵn kho, giao hàng toàn quốc
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCartOpen(true)}
            className="border-[#17c1e8]/40 text-[#17c1e8] hover:bg-[#17c1e8]/10 relative font-semibold"
          >
            <ShoppingCart className="w-4 h-4 mr-1.5" />
            Giỏ hàng ({cartCount})
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : (products ?? []).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Shirt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Cửa hàng đang cập nhật thêm sản phẩm mới...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(products ?? []).map((product) => {
              const variants = product.variants ?? [];
              const selected = selectedVariants[product.id] || variants[0];
              const price = selected ? selected.price : variants[0]?.price || 0;
              const inStock = selected ? selected.stock > 0 : false;
              const primaryImg =
                product.images?.find((img) => img.isPrimary)?.imageUrl ||
                product.images?.[0]?.imageUrl;

              return (
                <Card
                  key={product.id}
                  className="group overflow-hidden rounded-2xl border-border/40 bg-card/60 backdrop-blur-sm hover:border-[#17c1e8]/50 hover:shadow-xl hover:shadow-cyan-950/40 transition-all duration-300 flex flex-col"
                >
                  <div className="relative aspect-square w-full bg-slate-900 flex items-center justify-center overflow-hidden border-b border-border/30">
                    <ProductImage src={primaryImg} alt={product.name} code={product.code} />

                    <Badge className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-xs border-border/40 text-slate-200">
                      {product.category?.name || "Thời trang"}
                    </Badge>

                    {inStock ? (
                      <Badge className="absolute top-3 right-3 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                        Còn hàng ({selected?.stock})
                      </Badge>
                    ) : (
                      <Badge className="absolute top-3 right-3 bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                        Tạm hết hàng
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-base text-foreground group-hover:text-[#17c1e8] transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {product.description || "Chất vải cao cấp, mềm mịn, mang lại cảm giác thoải mái suốt cả ngày."}
                      </p>

                      {variants.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <span className="text-xs text-muted-foreground font-medium">Chọn phân loại:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {variants.map((v) => {
                              const isCur = selected?.id === v.id;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => handleSelectVariant(product.id, v)}
                                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                                    isCur
                                      ? "bg-[#17c1e8] text-slate-950 font-bold shadow-md shadow-[#17c1e8]/30 scale-105"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                  }`}
                                >
                                  {v.color} - {v.size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground block">Giá bán</span>
                        <span className="text-lg font-bold text-[#17c1e8] tabular-nums">
                          {formatVND(price)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!inStock}
                          onClick={() => handleAddToCart(product, false)}
                          className="border-[#17c1e8]/40 text-[#17c1e8] hover:bg-[#17c1e8]/10 rounded-xl text-xs font-semibold"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                          Thêm giỏ
                        </Button>

                        <Button
                          size="sm"
                          disabled={!inStock}
                          onClick={() => handleAddToCart(product, true)}
                          className="bg-gradient-to-r from-[#17c1e8] to-cyan-600 hover:from-cyan-400 hover:to-[#17c1e8] text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-[#17c1e8]/25"
                        >
                          <Zap className="w-3.5 h-3.5 mr-1 text-slate-950" />
                          Mua ngay
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

      {}
      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </div>
  );
}
