import type { Product, ProductVariant, ProductImage } from "@/types";

/**
 * Chuẩn hóa chuỗi tiếng Việt không dấu, chữ thường để so sánh
 */
export function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

/**
 * Tìm ảnh phù hợp nhất với màu sắc của sản phẩm
 */
export function findImageForColor(
  product?: Product | null,
  color?: string | null
): string | undefined {
  if (!product || !product.images || product.images.length === 0) {
    return undefined;
  }

  const images = product.images;
  const primaryImg = images.find((i) => i.isPrimary)?.imageUrl || images[0]?.imageUrl;

  if (!color || color === "Tiêu chuẩn" || color === "Mặc định") {
    return primaryImg;
  }

  const normColor = normalizeText(color);
  const colorFirstWord = normColor.split(" ")[0] || "";

  // 1. So khớp tên màu trong URL ảnh (ví dụ: "ao-thun-den.jpg", "trang.png")
  const matchedByKeyword = images.find((img) => {
    const normUrl = normalizeText(img.imageUrl);
    return normUrl.includes(normColor) || (colorFirstWord && normUrl.includes(colorFirstWord));
  });

  if (matchedByKeyword) {
    return matchedByKeyword.imageUrl;
  }

  // 2. Nếu số lượng ảnh tương ứng với số màu khác nhau, ghép theo thứ tự xuất hiện của màu
  const distinctColors = getDistinctColors(product.variants ?? []);
  const colorIndex = distinctColors.indexOf(color);

  if (colorIndex >= 0 && colorIndex < images.length) {
    return images[colorIndex].imageUrl;
  }

  // 3. Fallback: Ảnh chính
  return primaryImg;
}

/**
 * Lấy danh sách các màu sắc duy nhất từ danh sách biến thể
 */
export function getDistinctColors(variants: ProductVariant[]): string[] {
  const colors: string[] = [];
  for (const v of variants) {
    const c = v.color?.trim() || "Tiêu chuẩn";
    if (!colors.includes(c)) {
      colors.push(c);
    }
  }
  return colors;
}

/**
 * Lấy danh sách các size duy nhất cho một màu cụ thể (hoặc tất cả)
 */
export function getDistinctSizes(variants: ProductVariant[], forColor?: string): string[] {
  const sizes: string[] = [];
  for (const v of variants) {
    const c = v.color?.trim() || "Tiêu chuẩn";
    if (!forColor || c === forColor) {
      const s = v.size?.trim() || "FreeSize";
      if (!sizes.includes(s)) {
        sizes.push(s);
      }
    }
  }
  return sizes;
}

/**
 * Tìm biến thể phù hợp với Màu và Size đã chọn
 */
export function findMatchingVariant(
  variants: ProductVariant[],
  color: string,
  size: string
): ProductVariant | undefined {
  return (
    variants.find((v) => {
      const c = v.color?.trim() || "Tiêu chuẩn";
      const s = v.size?.trim() || "FreeSize";
      return c === color && s === size;
    }) ||
    variants.find((v) => (v.color?.trim() || "Tiêu chuẩn") === color) ||
    variants[0]
  );
}
