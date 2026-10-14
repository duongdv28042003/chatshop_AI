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
      const phoneToMatch = shippingInfo.phone.trim();
      let validCustomerId: string | null = null;

      // 1. Kiểm tra UUID hợp lệ từ currentUser
      if (currentUser?.id && currentUser.role === "customer") {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);
        if (isUuid) {
          validCustomerId = currentUser.id;
        }
      }

      // 2. Tra cứu khách hàng theo số điện thoại từ API để lấy đúng Id trong DB
      if (phoneToMatch) {
        try {
          const { data: found } = await apiClient.get<any[]>("/customers", {
            params: { search: phoneToMatch },
          });
          const match = found?.find((c: any) => c.phone === phoneToMatch);
          if (match?.id) {
            validCustomerId = match.id;
            try {
              if (currentUser && currentUser.id !== match.id) {
                const updated = { ...currentUser, id: match.id };
                localStorage.setItem("user_info", JSON.stringify(updated));
                localStorage.setItem("staff_info", JSON.stringify(updated));
              }
            } catch { }
          }
        } catch { }
      }

      const orderPayload: { customerId: string | null; note: string; items: any[] } = {
        customerId: validCustomerId,
        note: `Khách: ${shippingInfo.name} - SĐT: ${shippingInfo.phone} - Đ/C: ${shippingInfo.address || "Tại shop"}${shippingInfo.note ? ` | Ghi chú: ${shippingInfo.note}` : ""
          }`,
        items: selectedItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      };

      try {
        await apiClient.post("/orders", orderPayload);
      } catch (firstErr: any) {
        // Fallback retry: Nếu backend báo lỗi (500 do foreign key customerId không khớp), thử lại với customerId: null
        if (orderPayload.customerId) {
          orderPayload.customerId = null;
          await apiClient.post("/orders", orderPayload);
        } else {
          throw firstErr;
        }
      }

      cartService.removePurchased(selectedItems.map((i) => i.variantId));

      await queryClient.invalidateQueries({ queryKey: ["my-orders"] });

      toast.success("Đặt hàng thành công! Đơn hàng đã được lưu vào mục 'Đơn mua của tôi'.");
      onOpenChange(false);
      router.push("/my-orders");
    } catch (err: any) {
      console.error("Order creation failed", err);
      const errMsg = err?.response?.data?.message || "Không thể tạo đơn hàng. Vui lòng kiểm tra lại thông tin.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <DialogHeader className="pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#17c1e8]" />
              <span>Giỏ hàng của bạn</span>
              <Badge variant="secondary" className="text-xs font-mono rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5">
                {cartService.getTotalCount()} món
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6 opacity-60 text-[#17c1e8]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Giỏ hàng đang trống</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Hãy ghé qua Cửa Hàng để thêm các mẫu quần áo yêu thích vào giỏ nhé!
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="rounded-md bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] font-bold text-xs h-8 px-4 shadow-sm"
            >
              Tiếp tục mua sắm
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Left Column: Product List */}
              <div className="lg:col-span-7 space-y-3">
                {/* Select all bar */}
                <div className="flex items-center justify-between p-2.5 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-medium">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => cartService.toggleSelectAll(e.target.value === "true" || e.target.checked)}
                      className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-400 border-neutral-300 dark:border-neutral-700 cursor-pointer"
                    />
                    <span>Chọn tất cả ({items.length} sản phẩm)</span>
                  </label>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Đã chọn: <strong className="font-mono text-neutral-900 dark:text-neutral-100">{totalCount}</strong> món
                  </span>
                </div>

                {/* Items scroll */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.variantId}
                      className={`p-3 rounded-md border transition-colors flex items-center gap-3 ${item.selected
                          ? "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 shadow-sm"
                          : "bg-neutral-50/50 dark:bg-neutral-950/50 border-neutral-200 dark:border-neutral-800 opacity-75"
                        }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => cartService.toggleSelect(item.variantId)}
                        className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-400 border-neutral-300 dark:border-neutral-700 cursor-pointer shrink-0"
                      />

                      {/* Thumb */}
                      <div className="w-14 h-14 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-neutral-400 opacity-60" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {item.productName}
                          </h4>
                          <span className="text-xs font-mono font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums shrink-0">
                            {formatVND(item.price * item.quantity)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                          <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 px-1.5 py-0.5 rounded font-mono text-[10px]">
                            {item.color} • {item.size}
                          </span>
                          <span className="font-mono">Đơn giá: {formatVND(item.price)}</span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden bg-white dark:bg-neutral-900">
                            <button
                              type="button"
                              onClick={() => cartService.updateQuantity(item.variantId, -1)}
                              className="px-2 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-mono font-medium tabular-nums min-w-[24px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => cartService.updateQuantity(item.variantId, 1)}
                              className="px-2 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => cartService.removeItem(item.variantId)}
                            className="text-neutral-400 hover:text-rose-600 text-xs p-1 transition-colors"
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

              {/* Right Column: Checkout Info */}
              <div className="lg:col-span-5 space-y-3">
                <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                    Địa chỉ nhận hàng
                  </h3>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="ship-name" className="text-xs">Họ tên người nhận *</Label>
                      <Input
                        id="ship-name"
                        placeholder="Nguyễn Văn A..."
                        value={shippingInfo.name}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                        required
                        className="h-8 text-xs rounded-md bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
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
                        className="h-8 text-xs rounded-md bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="ship-addr" className="text-xs">Địa chỉ chi tiết</Label>
                      <Input
                        id="ship-addr"
                        placeholder="Số nhà, đường, quận/huyện, TP..."
                        value={shippingInfo.address}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                        className="h-8 text-xs rounded-md bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="ship-note" className="text-xs">Ghi chú đơn hàng</Label>
                      <Input
                        id="ship-note"
                        placeholder="Giao giờ hành chính, gọi trước..."
                        value={shippingInfo.note}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, note: e.target.value })}
                        className="h-8 text-xs rounded-md bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>Số lượng đã chọn:</span>
                    <strong className="font-mono text-neutral-900 dark:text-neutral-100">{totalCount} món</strong>
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-2 text-sm">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Tổng thanh toán:</span>
                    <span className="text-base font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100">
                      {formatVND(totalPrice)}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || selectedItems.length === 0}
                    className="w-full rounded-md bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] h-9 font-bold text-xs sm:text-sm shadow-sm"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-950" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2 text-slate-950" />
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
