"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Check,
  Package,
  MapPin,
  Phone,
  User,
  ArrowRight,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cartService, type CartItem } from "@/lib/cart";
import { authService, type UnifiedUser } from "@/lib/auth";
import apiClient from "@/lib/api";

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<UnifiedUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [shippingInfo, setShippingInfo] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });

  const refreshCart = () => {
    setItems(cartService.getItems());
  };

  useEffect(() => {
    refreshCart();
    const unsubscribe = cartService.subscribe(refreshCart);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    if (user) {
      setShippingInfo((prev) => ({
        ...prev,
        name: prev.name || user.fullName || user.name || "",
        phone: prev.phone || user.phone || "",
        address: prev.address || user.address || "",
      }));
    }
  }, [open]);

  const { totalCount, totalPrice, selectedItems } = cartService.getSelectedTotal();
  const isAllSelected = items.length > 0 && items.every((i) => i.selected);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.warning("Vui lòng tích chọn ít nhất 1 sản phẩm để đặt hàng.");
      return;
    }

    if (!shippingInfo.name.trim() || !shippingInfo.phone.trim()) {
      toast.warning("Vui lòng điền Họ tên và Số điện thoại nhận hàng.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customerId: currentUser?.id && currentUser.role === "customer" ? currentUser.id : null,
        note: `Khách: ${shippingInfo.name} - SĐT: ${shippingInfo.phone} - Đ/C: ${shippingInfo.address || "Tại shop"}${
          shippingInfo.note ? ` | Ghi chú: ${shippingInfo.note}` : ""
        }`,
        items: selectedItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      };

      await apiClient.post("/orders", orderPayload);

      cartService.removePurchased(selectedItems.map((i) => i.variantId));

      await queryClient.invalidateQueries({ queryKey: ["my-orders"] });

      toast.success("🎉 Đặt hàng thành công! Đơn hàng đã được lưu vào mục 'Đơn mua của tôi'.");
      onOpenChange(false);
      router.push("/my-orders");
    } catch (err: any) {
      console.error("Order creation failed", err);
      const errMsg = err?.response?.data?.message || "Không thể tạo đơn hàng. Hãy chắc chắn Backend C# đã được khởi động lại!";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-violet-500" />
              Giỏ hàng của bạn
              <Badge variant="secondary" className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/20">
                {cartService.getTotalCount()} món
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8 opacity-60" />
            </div>
            <div>
              <p className="font-semibold text-lg text-foreground">Giỏ hàng đang trống</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hãy ghé qua Cửa Hàng để thêm các mẫu quần áo yêu thích vào giỏ nhé!
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-md shadow-violet-500/20"
            >
              Tiếp tục mua sắm
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-6 pt-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {}
              <div className="lg:col-span-7 space-y-3">
                {}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border/50 text-xs font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => cartService.toggleSelectAll(e.target.value === "true" || e.target.checked)}
                      className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 rounded border-slate-300 dark:border-slate-700"
                    />
                    <span>Chọn tất cả ({items.length} sản phẩm)</span>
                  </label>
                  <span className="text-muted-foreground">
                    Đã tích chọn: <strong className="text-violet-500">{totalCount}</strong> món
                  </span>
                </div>

                {}
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.variantId}
                      className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                        item.selected
                          ? "bg-violet-50/40 dark:bg-violet-950/20 border-violet-500/40 shadow-sm"
                          : "bg-white dark:bg-slate-900/60 border-border/50 opacity-80"
                      }`}
                    >
                      {}
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => cartService.toggleSelect(item.variantId)}
                        className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-slate-700 cursor-pointer shrink-0"
                      />

                      {}
                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border/60 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-400 opacity-60" />
                        )}
                      </div>

                      {}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.productName}
                          </h4>
                          <span className="text-xs font-bold text-violet-500 dark:text-violet-400 tabular-nums shrink-0">
                            {formatVND(item.price * item.quantity)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                            {item.color} / {item.size}
                          </span>
                          <span>Đơn giá: {formatVND(item.price)}</span>
                        </div>

                        {}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center border border-border/60 rounded-lg overflow-hidden bg-background">
                            <button
                              type="button"
                              onClick={() => cartService.updateQuantity(item.variantId, -1)}
                              className="px-2 py-0.5 hover:bg-muted text-slate-600 dark:text-slate-300 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold tabular-nums min-w-[24px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => cartService.updateQuantity(item.variantId, 1)}
                              className="px-2 py-0.5 hover:bg-muted text-slate-600 dark:text-slate-300 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => cartService.removeItem(item.variantId)}
                            className="text-slate-400 hover:text-red-500 text-xs p-1 transition-colors"
                            title="Xóa khỏi giỏ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/50 space-y-3.5">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-violet-500" />
                    Địa chỉ nhận hàng
                  </h3>

                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="ship-name" className="text-xs">Họ tên người nhận *</Label>
                      <Input
                        id="ship-name"
                        placeholder="Nguyễn Văn A..."
                        value={shippingInfo.name}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                        required
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="ship-phone" className="text-xs">Số điện thoại *</Label>
                      <Input
                        id="ship-phone"
                        placeholder="0901234567..."
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                        required
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="ship-addr" className="text-xs">Địa chỉ chi tiết</Label>
                      <Input
                        id="ship-addr"
                        placeholder="Số nhà, đường, quận/huyện, TP..."
                        value={shippingInfo.address}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="ship-note" className="text-xs">Ghi chú đơn hàng</Label>
                      <Input
                        id="ship-note"
                        placeholder="Giao giờ hành chính, gọi trước..."
                        value={shippingInfo.note}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, note: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>

                {}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 via-slate-900 to-slate-900 border border-violet-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Số lượng đã chọn:</span>
                    <strong className="text-white font-bold">{totalCount} món</strong>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/40 pt-2 text-sm">
                    <span className="font-medium text-slate-200">Tổng thanh toán:</span>
                    <span className="text-lg font-extrabold text-violet-400 tabular-nums">
                      {formatVND(totalPrice)}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || selectedItems.length === 0}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl h-10 font-bold shadow-lg shadow-violet-500/25"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Đặt hàng ({totalCount} món)
                  </Button>
                </div>
              </div>

            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
