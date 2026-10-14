"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Zap,
  ShieldCheck,
  Truck,
  Shirt,
  ImageIcon,
  Minus,
  Plus,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product, ProductVariant } from "@/types";
import {
  findImageForColor,
  getDistinctColors,
  getDistinctSizes,
  findMatchingVariant,
} from "@/lib/product-utils";

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart?: (
    product: Product,
    variant: ProductVariant,
    quantity: number,
    imageUrl?: string,
    openCartImmediately?: boolean
  ) => void;
}

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
  onAddToCart,
}: ProductDetailModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [imageErrorMap, setImageErrorMap] = useState<Record<number, boolean>>({});

  const variants = product?.variants ?? [];
  const images = product?.images ?? [];

  const colors = getDistinctColors(variants);
  const availableSizes = getDistinctSizes(variants, selectedColor);

  // Khởi tạo state khi mở sản phẩm
  useEffect(() => {
    if (product && variants.length > 0) {
      const firstVar = variants[0];
      const initialColor = firstVar.color?.trim() || "Tiêu chuẩn";
      const initialSize = firstVar.size?.trim() || "FreeSize";
      setSelectedColor(initialColor);
      setSelectedSize(initialSize);
      setQuantity(1);
      setImageErrorMap({});

      // Chọn ảnh phù hợp với màu ban đầu
      const colorImgUrl = findImageForColor(product, initialColor);
      const colorImgIdx = images.findIndex((img) => img.imageUrl === colorImgUrl);
      if (colorImgIdx >= 0) {
        setActiveImageIndex(colorImgIdx);
      } else {
        const primaryIdx = images.findIndex((img) => img.isPrimary);
        setActiveImageIndex(primaryIdx >= 0 ? primaryIdx : 0);
      }
    }
  }, [product]);

  if (!product) return null;

  // Lấy biến thể khớp chính xác với Màu và Size đang chọn
  const currentVariant = findMatchingVariant(variants, selectedColor, selectedSize);
  const currentPrice = currentVariant?.price ?? variants[0]?.price ?? 0;
  const inStock = currentVariant ? currentVariant.stock > 0 : false;
  const currentStock = currentVariant?.stock ?? 0;
  const activeImage = images[activeImageIndex]?.imageUrl;

  // Xử lý khi khách chọn đổi Màu
  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);

    // Tự động chuyển ảnh sang ảnh tương ứng của màu mới
    const targetImgUrl = findImageForColor(product, newColor);
    if (targetImgUrl) {
      const targetIdx = images.findIndex((img) => img.imageUrl === targetImgUrl);
      if (targetIdx >= 0) {
        setActiveImageIndex(targetIdx);
      }
    }

    // Kiểm tra xem size hiện tại có còn trong màu mới không
    const newSizes = getDistinctSizes(variants, newColor);
    if (!newSizes.includes(selectedSize)) {
      setSelectedSize(newSizes[0] || "");
    }
  };

  // Xử lý khi khách chọn đổi Size
  const handleSizeChange = (newSize: string) => {
    setSelectedSize(newSize);
  };

  // Xử lý khi khách click hoặc hover vào thumbnail trong gallery Shopee
  const handleThumbnailSelect = (index: number) => {
    setActiveImageIndex(index);

    // Nếu số ảnh tương ứng với các màu, tự động chọn màu của ảnh đó
    if (colors.length > 1 && colors[index]) {
      const associatedColor = colors[index];
      setSelectedColor(associatedColor);
      const sizesForColor = getDistinctSizes(variants, associatedColor);
      if (!sizesForColor.includes(selectedSize)) {
        setSelectedSize(sizesForColor[0] || "");
      }
    }
  };

  const handlePrevImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (currentStock > 0 && next > currentStock) return currentStock;
      return next;
    });
  };

  const handleAddToCartClick = (openCartImmediately = false) => {
    if (!currentVariant || !onAddToCart) return;
    // Gửi đúng variant (màu, size) và đúng ảnh của màu khách đang xem
    const imgForCart = activeImage || findImageForColor(product, selectedColor);
    onAddToCart(product, currentVariant, quantity, imgForCart, openCartImmediately);
    if (openCartImmediately) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[96vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-950/95 text-slate-100 border-slate-800/80 backdrop-blur-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
          {/* CỘT TRÁI: Gallery ảnh kiểu Shopee */}
          <div className="md:col-span-6 flex flex-col space-y-3">
            {/* Ảnh lớn chính */}
            <div className="relative aspect-[4/3] sm:aspect-square max-h-[280px] sm:max-h-none w-full rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center overflow-hidden group shadow-sm">
              {activeImage && !imageErrorMap[activeImageIndex] ? (
                <img
                  src={activeImage}
                  alt={`${product.name} - ${selectedColor}`}
                  onError={() =>
                    setImageErrorMap((prev) => ({ ...prev, [activeImageIndex]: true }))
                  }
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-400">
                  <Shirt className="w-16 h-16 mb-2 opacity-30 text-neutral-400" />
                  <span className="text-xs font-mono font-medium tracking-wider text-neutral-500">
                    {product.code}
                  </span>
                </div>
              )}

              {/* Mũi tên Previous / Next */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-neutral-900/80 text-white border border-neutral-700/80 hover:bg-neutral-800 flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-sm"
                    title="Ảnh trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-neutral-900/80 text-white border border-neutral-700/80 hover:bg-neutral-800 flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-sm"
                    title="Ảnh kế tiếp"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Bộ đếm ảnh */}
              {images.length > 0 && (
                <div className="absolute bottom-3 right-3 bg-neutral-900/80 border border-neutral-700/80 text-neutral-200 text-xs px-2.5 py-1 rounded-md font-mono flex items-center gap-1 shadow-sm">
                  <ImageIcon className="w-3 h-3 text-neutral-400" />
                  <span>
                    {activeImageIndex + 1} / {images.length}
                  </span>
                </div>
              )}

              {/* Badge màu đang xem */}
              {selectedColor && (
                <Badge className="absolute top-3 left-3 bg-[#17c1e8] text-slate-950 text-[11px] font-mono font-bold border-none shadow-sm">
                  Màu: {selectedColor}
                </Badge>
              )}
            </div>

            {/* Dải Thumbnail kiểu Shopee */}
            {images.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-neutral-500 font-medium">
                  Rê chuột hoặc nhấp để xem chi tiết từng góc ảnh:
                </p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                  {images.map((img, idx) => {
                    const isSelected = idx === activeImageIndex;
                    return (
                      <button
                        key={img.id || idx}
                        type="button"
                        onMouseEnter={() => handleThumbnailSelect(idx)}
                        onClick={() => handleThumbnailSelect(idx)}
                        className={`relative w-16 h-16 shrink-0 rounded-md overflow-hidden border transition-colors bg-neutral-100 dark:bg-neutral-900 ${
                          isSelected
                            ? "border-neutral-900 dark:border-neutral-100 ring-1 ring-neutral-900 dark:ring-neutral-100 opacity-100"
                            : "border-neutral-200 dark:border-neutral-800 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={img.imageUrl}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: Thông tin & Bộ chọn Màu - Size theo chuẩn Shopee */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Danh mục & Trạng thái tồn kho */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700 text-xs font-mono">
                  {product.category?.name || "Thời trang"}
                </Badge>
                <Badge variant="outline" className="text-neutral-500 border-neutral-200 dark:border-neutral-800 text-xs font-mono">
                  Mã SP: {product.code}
                </Badge>
                {inStock ? (
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs font-mono">
                    Còn hàng ({currentStock})
                  </Badge>
                ) : (
                  <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800 text-xs font-mono">
                    Tạm hết hàng
                  </Badge>
                )}
              </div>

              {/* Tên sản phẩm */}
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-snug">
                {product.name}
              </h2>

              {/* Cam kết bán hàng */}
              <div className="flex items-center gap-4 text-xs text-neutral-500 border-y border-neutral-200 dark:border-neutral-800 py-2.5">
                <span className="flex items-center gap-1 text-neutral-900 dark:text-neutral-100 font-mono">
                  <Check className="w-3.5 h-3.5" /> 100% Chính hãng
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Truck className="w-3.5 h-3.5 text-neutral-400" /> Miễn phí đổi size
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" /> Bảo hành 30 ngày
                </span>
              </div>

              {/* Khung Giá bán */}
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-baseline gap-3">
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {formatVND(currentPrice)}
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  ({selectedColor} / {selectedSize})
                </span>
              </div>

              {/* 1. BỘ CHỌN MÀU SẮC */}
              {colors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Màu sắc: <strong className="text-neutral-900 dark:text-neutral-100 font-mono normal-case">{selectedColor}</strong>
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {colors.length} màu
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {colors.map((c) => {
                      const isSelected = selectedColor === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleColorChange(c)}
                          className={`text-xs font-mono px-3 py-1 rounded-md font-medium transition-colors border ${
                            isSelected
                              ? "bg-[#17c1e8] text-slate-950 border-[#17c1e8] font-bold shadow-sm"
                              : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. BỘ CHỌN KÍCH CỠ / SIZE */}
              {availableSizes.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Size: <strong className="text-neutral-900 dark:text-neutral-100 font-mono normal-case">{selectedSize}</strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSizes.map((s) => {
                      const isSelected = selectedSize === s;
                      const sizeVariant = variants.find(
                        (v) => (v.color?.trim() || "Tiêu chuẩn") === selectedColor && (v.size?.trim() || "FreeSize") === s
                      );
                      const hasStock = sizeVariant ? sizeVariant.stock > 0 : false;

                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={!hasStock}
                          onClick={() => handleSizeChange(s)}
                          className={`text-xs font-mono px-3 py-1 rounded-md font-medium transition-colors border ${
                            isSelected
                              ? "bg-[#17c1e8] text-slate-950 border-[#17c1e8] font-bold shadow-sm"
                              : hasStock
                              ? "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-800 cursor-not-allowed line-through opacity-50"
                          }`}
                        >
                          {s} {sizeVariant ? `(${sizeVariant.stock})` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bộ chọn số lượng */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Số lượng:
                </span>
                <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 py-1 text-xs font-mono font-medium text-neutral-900 dark:text-neutral-100 min-w-8 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={currentStock > 0 && quantity >= currentStock}
                    className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs font-mono text-neutral-500">
                  Kho: {currentStock}
                </span>
              </div>
            </div>

            {/* Nút Thêm vào giỏ & Mua ngay */}
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={!inStock}
                onClick={() => handleAddToCartClick(false)}
                className="h-9 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium"
              >
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                Thêm vào giỏ
              </Button>
              <Button
                type="button"
                disabled={!inStock}
                onClick={() => handleAddToCartClick(true)}
                className="h-9 rounded-md bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] text-xs font-bold shadow-sm"
              >
                <Zap className="w-4 h-4 mr-1.5 text-slate-950" />
                Mua ngay
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
