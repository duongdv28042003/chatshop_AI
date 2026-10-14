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
  const [isDraggingOver, setIsDraggingOver] = useState(false);
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
      // 1. Sắp xếp ảnh: Đưa ảnh chính lên vị trí đầu tiên (index 0)
      // Điều này đảm bảo backend luôn chỉ nhận và lưu đúng 1 ảnh chính duy nhất, tránh lỗi 500
      const primaryIndex = data.images.findIndex((img) => img.isPrimary);
      const reorderedImages = [...data.images];
      if (primaryIndex > 0) {
        const [primaryImg] = reorderedImages.splice(primaryIndex, 1);
        reorderedImages.unshift(primaryImg);
      }

      const cleanImages = reorderedImages.map((img, idx) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        isPrimary: idx === 0,
      }));

      const payload = {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        categoryId: data.categoryId || null,
        description: data.description,
        isActive: data.isActive,
        variants: data.variants.map((v) => ({
          id: v.id,
          sku: v.sku || `${data.code.trim().toUpperCase()}-${v.color.trim().toUpperCase()}-${v.size.trim().toUpperCase()}`,
          color: v.color.trim(),
          size: v.size.trim().toUpperCase(),
          price: Number(v.price),
          stock: Number(v.stock),
          isActive: true,
        })),
        images: cleanImages,
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
      const msg = err.response?.data?.message || err.message || "Không thể lưu sản phẩm";
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

  const handleFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    let successCount = 0;

    for (const file of files) {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

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
                isPrimary: prev.images.length === 0 && successCount === 0,
              },
            ],
          }));
          successCount++;
        }
      } catch {
        const reader = new FileReader();
        reader.onload = (event) => {
          const localUrl = event.target?.result as string;
          if (localUrl) {
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
          }
        };
        reader.readAsDataURL(file);
        successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Đã thêm ${successCount} ảnh vào sản phẩm`);
    }
    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
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
          className="bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] font-bold rounded-md text-xs h-9 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2 text-slate-950" />
          Thêm sản phẩm
        </Button>
      </div>

      {/* Product List Table */}
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
                        <div className="relative w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                          {primaryImg ? (
                            <img
                              src={primaryImg}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                          )}
                          {product.images && product.images.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[9px] font-mono font-bold px-1 rounded-tl-md">
                              +{product.images.length - 1}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100">
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

      {/* Product Form Modal (Create & Edit) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-neutral-500" />
              {editingProduct ? `Chỉnh sửa sản phẩm: ${editingProduct.code}` : "Thêm sản phẩm mới"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Kiểm tra biến thể trùng lặp Màu sắc & Size trước khi gửi
              const seenVariants = new Set<string>();
              for (let i = 0; i < formData.variants.length; i++) {
                const v = formData.variants[i];
                const c = v.color.trim().toLowerCase();
                const s = v.size.trim().toLowerCase();
                if (!c || !s) {
                  toast.error(`Biến thể #${i + 1} chưa điền đầy đủ Màu sắc và Size!`);
                  return;
                }
                const key = `${c}-${s}`;
                if (seenVariants.has(key)) {
                  toast.error(`Trùng lặp: Màu "${v.color}" và Size "${v.size}" đã có ở biến thể khác! Vui lòng điều chỉnh.`);
                  return;
                }
                seenVariants.add(key);
              }

              saveMutation.mutate(formData);
            }}
            className="space-y-6 pt-4"
          >
            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left Column: Basic Info & Image Upload */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/50 space-y-3.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-neutral-500" />
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
                        className="w-full h-9 px-2.5 bg-background border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
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
                      className="w-full h-9 px-2.5 bg-background border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
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
                      className="w-full p-2.5 bg-background border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                    />
                  </div>
                </div>

                {/* Images Manager */}
                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-neutral-500" />
                      Hình ảnh sản phẩm
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {formData.images.length} ảnh đã chọn
                    </span>
                  </div>

                  {/* Dropzone Upload Box with Drag & Drop & Multiple */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(false);
                      const files = Array.from(e.dataTransfer.files || []).filter((f) =>
                        f.type.startsWith("image/")
                      );
                      handleFiles(files);
                    }}
                    className={`border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      isDraggingOver
                        ? "border-neutral-900 bg-neutral-100 dark:border-neutral-100 dark:bg-neutral-800"
                        : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 bg-neutral-50/50 dark:bg-neutral-900/50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {isUploadingImage ? (
                      <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-500" /> Đang tải các ảnh lên...
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-neutral-400 mb-1" />
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Bấm để tải hoặc kéo thả nhiều ảnh cùng lúc
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          Hỗ trợ định dạng JPG, PNG, WEBP (chọn nhiều ảnh)
                        </p>
                      </>
                    )}
                  </div>

                  {/* Add by URL */}
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

                  {/* Image Previews */}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                      {formData.images.map((img, idx) => (
                        <div
                          key={idx}
                          className={`relative group rounded-md overflow-hidden border aspect-square bg-neutral-100 dark:bg-neutral-800 ${
                            img.isPrimary ? "border-neutral-900 dark:border-neutral-100 ring-1 ring-neutral-900 dark:ring-neutral-100" : "border-neutral-200 dark:border-neutral-800"
                          }`}
                        >
                          <img
                            src={img.imageUrl}
                            alt="Ảnh SP"
                            className="w-full h-full object-cover"
                          />

                          {/* Index badge */}
                          <span className="absolute bottom-1 right-1 bg-black/70 text-neutral-200 text-[9px] font-mono px-1 rounded">
                            #{idx + 1}
                          </span>

                          {img.isPrimary && (
                            <span className="absolute top-1 left-1 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-current" /> Chính
                            </span>
                          )}

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

              {/* Right Column: Variants Manager */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-border/50 space-y-3.5 h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-neutral-500" />
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
                      className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 font-medium h-8 px-3 text-xs rounded-md shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Thêm biến thể
                    </Button>
                  </div>

                  {/* Variant Items List */}
                  <div className="flex-1 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {formData.variants.map((variant, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center gap-3 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-mono font-medium flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
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
                className="bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] font-bold rounded-md shadow-sm px-6 h-9 text-xs"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-950" />}
                {editingProduct ? "Lưu thay đổi sản phẩm" : "Hoàn tất tạo sản phẩm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
              <strong className="text-neutral-900 dark:text-neutral-100 font-mono font-bold">
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
