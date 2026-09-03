"use client";

export interface CartItem {
  productId: string;
  variantId: string;
  productCode: string;
  productName: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  quantity: number;
  imageUrl?: string;
  selected: boolean;
}

const CART_STORAGE_KEY = "fashion_shop_cart";
const CART_CHANGE_EVENT = "cart_updated";

export const cartService = {
  getItems(): CartItem[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveItems(items: CartItem[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event(CART_CHANGE_EVENT));
    } catch (e) {
      console.error("Failed to save cart", e);
    }
  },

  addItem(item: Omit<CartItem, "selected">): void {
    const items = this.getItems();
    const existingIndex = items.findIndex((i) => i.variantId === item.variantId);

    if (existingIndex > -1) {
      items[existingIndex].quantity += item.quantity;
      items[existingIndex].selected = true;
    } else {
      items.unshift({ ...item, selected: true });
    }

    this.saveItems(items);
  },

  updateQuantity(variantId: string, delta: number): void {
    const items = this.getItems();
    const item = items.find((i) => i.variantId === variantId);
    if (item) {
      item.quantity = Math.max(1, Math.min(item.stock || 99, item.quantity + delta));
      this.saveItems(items);
    }
  },

  toggleSelect(variantId: string): void {
    const items = this.getItems();
    const item = items.find((i) => i.variantId === variantId);
    if (item) {
      item.selected = !item.selected;
      this.saveItems(items);
    }
  },

  toggleSelectAll(select: boolean): void {
    const items = this.getItems();
    items.forEach((i) => (i.selected = select));
    this.saveItems(items);
  },

  removeItem(variantId: string): void {
    const items = this.getItems().filter((i) => i.variantId !== variantId);
    this.saveItems(items);
  },

  removePurchased(variantIds: string[]): void {
    const items = this.getItems().filter((i) => !variantIds.includes(i.variantId));
    this.saveItems(items);
  },

  getTotalCount(): number {
    return this.getItems().reduce((sum, item) => sum + item.quantity, 0);
  },

  getSelectedTotal(): { totalCount: number; totalPrice: number; selectedItems: CartItem[] } {
    const selected = this.getItems().filter((i) => i.selected);
    const totalCount = selected.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = selected.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { totalCount, totalPrice, selectedItems: selected };
  },

  subscribe(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(CART_CHANGE_EVENT, callback);
    return () => window.removeEventListener(CART_CHANGE_EVENT, callback);
  },
};
