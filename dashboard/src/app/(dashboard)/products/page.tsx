"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreHorizontal,
  Package,
  Layers,
  X,
  Loader2,
  Upload,
  Image as ImageIcon,
  Star,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api";
import type { Product, Category, ProductVariant, ProductImage } from "@/types";

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface VariantFormItem {
  id?: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  stock: number;
}

interface ImageFormItem {
  id?: string;
  imageUrl: string;
  isPrimary: boolean;
}

interface ProductFormData {
  id?: string;
  code: string;
  name: string;
  categoryId: string;
  description: string;
  isActive: boolean;
  variants: VariantFormItem[];
  images: ImageFormItem[];
}

const defaultFormData: ProductFormData = {
  code: "",
  name: "",
  categoryId: "",
  description: "",
  isActive: true,
  variants: [
    { sku: "", color: "Đen", size: "M", price: 150000, stock: 10 },
    { sku: "", color: "Trắng", size: "L", price: 150000, stock: 10 },
  ],
  images: [],
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      const { data } = await apiClient.get<Product[]>("/products", {
        params: { search },
      });
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<Category[]>("/products/categories");
        return data;
      } catch {
        return [
          { id: "1", slug: "ao-thun", name: "Áo thun" },
          { id: "2", slug: "quan-jean", name: "Quần Jean" },
          { id: "3", slug: "ao-khoac", name: "Áo khoác" },
        ] as Category[];
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload = {
        code: data.code,
        name: data.name,
        categoryId: data.categoryId || null,
        description: data.description,
        isActive: data.isActive,
        variants: data.variants.map((v) => ({
          id: v.id,
          sku: v.sku || `${data.code}-${v.color}-${v.size}`,
          color: v.color,
          size: v.size,
          price: Number(v.price),
          stock: Number(v.stock),
          isActive: true,
        })),
        images: data.images.map((img, idx) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          isPrimary: img.isPrimary || (idx === 0 && !data.images.some((i) => i.isPrimary)),
        })),
      };

      if (data.id) {
        return apiClient.put(`/products/${data.id}`, payload);
      } else {
        return apiClient.post("/products", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(editingProduct ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới");
      setIsFormOpen(false);
      setEditingProduct(null);
      setFormData(defaultFormData);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "Không thể lưu sản phẩm";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Đã xóa sản phẩm thành công");
      setDeleteId(null);
      setProductToDelete(null);
    },
    onError: () => toast.error("Xóa sản phẩm thất bại"),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    setIsUploadingImage(true);
    try {
      const { data } = await apiClient.post<{ imageUrl: string }>(
        "/products/upload-image",
        uploadFormData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (data?.imageUrl) {
        setFormData((prev) => ({
          ...prev,
          images: [
            ...prev.images,
            {
              imageUrl: data.imageUrl,
              isPrimary: prev.images.length === 0,
            },
          ],
        }));
        toast.success("Đã tải ảnh lên thành công");
      }
    } catch {

      const reader = new FileReader();
      reader.onload = (event) => {
        const localUrl = event.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          images: [
            ...prev.images,
            {
              imageUrl: localUrl,
              isPrimary: prev.images.length === 0,
            },
          ],
        }));
        toast.success("Đã thêm ảnh xem trước");
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddImageUrl = () => {
    if (!customImageUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        {
          imageUrl: customImageUrl.trim(),
          isPrimary: prev.images.length === 0,
        },
      ],
    }));
    setCustomImageUrl("");
    toast.success("Đã thêm URL ảnh");
  };

  const setPrimaryImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      })),
    }));
  };

  const removeImage = (index: number) => {
    setFormData((prev) => {
      const updated = prev.images.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return { ...prev, images: updated };
    });
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      ...defaultFormData,
      categoryId: categories && categories.length > 0 ? categories[0].id : "",
    });
    setIsFormOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      id: product.id,
      code: product.code,
      name: product.name,
      categoryId: product.categoryId || "",
      description: product.description || "",
      isActive: product.isActive,
      variants:
        product.variants && product.variants.length > 0
          ? product.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              color: v.color || "",
              size: v.size || "",
              price: v.price,
              stock: v.stock,
            }))
          : [{ sku: "", color: "Đen", size: "M", price: 150000, stock: 10 }],
      images:
        product.images && product.images.length > 0
          ? product.images.map((img) => ({
              id: img.id,
              imageUrl: img.imageUrl,
              isPrimary: img.isPrimary,
            }))
          : [],
    });
    setIsFormOpen(true);
  };

  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { sku: "", color: "Đen", size: "M", price: 150000, stock: 10 },
      ],
    }));
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length <= 1) {
      toast.warning("Sản phẩm cần có ít nhất 1 biến thể");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const updateVariant = (index: number, field: keyof VariantFormItem, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const filtered = products ?? [];

  const getTotalStock = (product: Product) =>
    (product.variants ?? []).reduce((sum, v) => sum + v.stock, 0);

  const getMinPrice = (product: Product) => {
    const prices = (product.variants ?? []).map((v) => v.price);
    return prices.length ? Math.min(...prices) : 0;
  };

  const getPrimaryImage = (product: Product) => {
    if (!product.images || product.images.length === 0) return null;
    const primary = product.images.find((img) => img.isPrimary);
    return primary ? primary.imageUrl : product.images[0].imageUrl;
  };

  return (
    <div className="space-y-6">
      {}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Sản phẩm</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý kho hàng, giá bán, hình ảnh và biến thể sản phẩm
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm sản phẩm
        </Button>
      </div>

      {}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên hoặc mã SP (A02, Q01...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/50"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Không có sản phẩm nào</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="w-16">Ảnh</TableHead>
                  <TableHead className="w-24">Mã SP</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Biến thể (Màu/Size)</TableHead>
                  <TableHead className="text-right">Giá từ</TableHead>
                  <TableHead className="text-center">Tồn kho</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="w-12 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => {
                  const totalStock = getTotalStock(product);
                  const primaryImg = getPrimaryImage(product);
                  return (
                    <TableRow
                      key={product.id}
                      className="border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell>
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                          {primaryImg ? (
                            <img
                              src={primaryImg}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-bold text-violet-500 dark:text-violet-400">
                        {product.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {product.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {product.category?.name ?? "Thời trang"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(product.variants ?? []).map((v) => (
                            <span
                              key={v.id}
                              className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded"
                            >
                              {v.color}/{v.size}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
                        {formatVND(getMinPrice(product))}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                            totalStock === 0
                              ? "bg-red-500/10 text-red-500"
                              : totalStock <= 5
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-emerald-500/10 text-emerald-500"
                          }`}
                        >
                          {totalStock}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={product.isActive ? "default" : "secondary"}
                          className={
                            product.isActive
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : ""
                          }
                        >
                          {product.isActive ? "Đang bán" : "Tạm ngưng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              />
                            }
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => openEditDialog(product)}>
                              <Pencil className="w-4 h-4 mr-2 text-blue-500" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-500 focus:text-red-500"
                              onClick={() => {
                                setProductToDelete(product);
                                setDeleteId(product.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Xóa SP
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-500" />
              {editingProduct ? `Chỉnh sửa sản phẩm: ${editingProduct.code}` : "Thêm sản phẩm mới"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formData);
            }}
            className="space-y-6 pt-4"
          >
            {}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/50 space-y-3.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-violet-500" />
                    Thông tin cơ bản
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="prod-code" className="text-xs">Mã SP *</Label>
                      <Input
                        id="prod-code"
                        placeholder="VD: A04, Q02..."
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        required
                        className="font-mono font-bold uppercase h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="prod-cat" className="text-xs">Danh mục</Label>
                      <select
                        id="prod-cat"
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full h-9 px-2.5 bg-background border border-input rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {(categories ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="prod-name" className="text-xs">Tên sản phẩm *</Label>
                    <Input
                      id="prod-name"
                      placeholder="VD: Áo Thun Cổ Tròn Cotton 100%"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="prod-status" className="text-xs">Trạng thái bán</Label>
                    <select
                      id="prod-status"
                      value={formData.isActive ? "true" : "false"}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                      className="w-full h-9 px-2.5 bg-background border border-input rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="true">Đang kinh doanh (Active)</option>
                      <option value="false">Tạm ngưng bán (Inactive)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="prod-desc" className="text-xs">Mô tả sản phẩm</Label>
                    <textarea
                      id="prod-desc"
                      rows={3}
                      placeholder="Chất liệu thoáng mát, co giãn, form rộng dễ phối đồ..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2.5 bg-background border border-input rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                {}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-violet-500" />
                      Hình ảnh sản phẩm
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {formData.images.length} ảnh đã chọn
                    </span>
                  </div>

                  {}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-violet-500/40 hover:border-violet-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-violet-500/5 hover:bg-violet-500/10 transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {isUploadingImage ? (
                      <div className="flex items-center gap-2 text-xs text-violet-600 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải ảnh...
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-violet-500 mb-1" />
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Bấm để tải ảnh từ máy tính
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Hỗ trợ định dạng JPG, PNG, WEBP
                        </p>
                      </>
                    )}
                  </div>

                  {}
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="Hoặc dán URL ảnh trực tuyến..."
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleAddImageUrl}
                      className="h-8 px-2.5 text-xs shrink-0"
                    >
                      Thêm
                    </Button>
                  </div>

                  {}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      {formData.images.map((img, idx) => (
                        <div
                          key={idx}
                          className={`relative group rounded-xl overflow-hidden border-2 aspect-square bg-slate-100 dark:bg-slate-800 ${
                            img.isPrimary ? "border-violet-500 shadow-md shadow-violet-500/20" : "border-border/60"
                          }`}
                        >
                          <img
                            src={img.imageUrl}
                            alt="Ảnh SP"
                            className="w-full h-full object-cover"
                          />

                          {}
                          {img.isPrimary && (
                            <span className="absolute top-1 left-1 bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-white" /> Chính
                            </span>
                          )}

                          {}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                            {!img.isPrimary && (
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                onClick={() => setPrimaryImage(idx)}
                                title="Đặt làm ảnh chính"
                                className="h-7 w-7 rounded-full bg-white/90 text-slate-800 hover:bg-white"
                              >
                                <Star className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              onClick={() => removeImage(idx)}
                              title="Xóa ảnh"
                              className="h-7 w-7 rounded-full"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/50 space-y-3.5 h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-violet-500" />
                        Danh sách Biến thể (Màu / Size / Giá / Tồn kho)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Thiết lập từng màu sắc, kích thước và tồn kho riêng biệt
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addVariant}
                      className="bg-violet-600 hover:bg-violet-700 text-white h-8 px-3 text-xs shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Thêm biến thể
                    </Button>
                  </div>

                  {}
                  <div className="flex-1 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {formData.variants.map((variant, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-border/60 shadow-sm flex items-center gap-3 hover:border-violet-500/40 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>

                        <div className="flex-1 grid grid-cols-4 gap-2.5">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground font-semibold">Màu sắc</Label>
                            <Input
                              placeholder="Đen, Trắng..."
                              value={variant.color}
                              onChange={(e) => updateVariant(idx, "color", e.target.value)}
                              className="h-8 text-xs font-medium"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground font-semibold">Size</Label>
                            <Input
                              placeholder="S, M, L, XL..."
                              value={variant.size}
                              onChange={(e) => updateVariant(idx, "size", e.target.value.toUpperCase())}
                              className="h-8 text-xs font-bold uppercase"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground font-semibold">Giá bán (VNĐ)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1000}
                              value={variant.price}
                              onChange={(e) => updateVariant(idx, "price", Number(e.target.value))}
                              className="h-8 text-xs font-semibold tabular-nums"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground font-semibold">Tồn kho</Label>
                            <Input
                              type="number"
                              min={0}
                              value={variant.stock}
                              onChange={(e) => updateVariant(idx, "stock", Number(e.target.value))}
                              className="h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
                              required
                            />
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(idx)}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 shrink-0 mt-3"
                          title="Xóa biến thể này"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            <DialogFooter className="pt-4 border-t border-border/40 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={saveMutation.isPending}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20 px-6"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingProduct ? "Lưu thay đổi sản phẩm" : "Hoàn tất tạo sản phẩm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Xác nhận xóa sản phẩm
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Bạn có chắc chắn muốn xóa sản phẩm{" "}
              <strong className="text-violet-500 font-bold">
                {productToDelete?.code} - {productToDelete?.name}
              </strong>{" "}
              không?
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ Hành động này sẽ xóa toàn bộ các biến thể màu sắc, size, ảnh và tồn kho liên quan trong PostgreSQL.
            </p>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteMutation.isPending}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
