"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  LogIn,
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  Store,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BrandLogo } from "@/components/ui/brand-logo";
import { authService } from "@/lib/auth";

const loginSchema = z.object({
  identifier: z.string().min(1, "Vui lòng nhập Email hoặc Số điện thoại"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setLoading(true);
    try {
      const res: any = await authService.login({
        email: values.identifier,
        identifier: values.identifier,
        password: values.password,
      });

      const role = res.role || res.user?.role || "staff";
      const name =
        res.user?.fullName || res.user?.name || res.staff?.fullName || "bạn";

      if (role === "customer") {
        toast.success(`Đăng nhập thành công! Chào mừng khách hàng ${name}.`);
      } else {
        toast.success(`Đăng nhập thành công với quyền ${role}!`);
      }

      // Điều hướng tải mới hoàn toàn để Next.js Server Components nhận cookie role chính xác ngay lập tức
      window.location.href = "/";
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message || "Tài khoản hoặc mật khẩu không đúng."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 overflow-hidden">
      {/* 1. Background Image: Bãi biển nhiệt đới sắc nét */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=95')`,
        }}
      />

      {/* 2. Gradient Overlay nhẹ nhàng, trong suốt, KHÔNG blur để giữ ảnh nét căng */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/65 via-slate-900/30 to-cyan-950/20" />

      {/* 3. Nút bấm quay về cửa hàng nhanh */}
      <div className="absolute top-5 left-5 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/30 hover:border-white/50 transition-all shadow-lg group"
        >
          <Store className="w-3.5 h-3.5 text-[#17c1e8] group-hover:-translate-x-0.5 transition-transform" />
          <span>Về trang mua sắm</span>
        </Link>
      </div>

      {/* 4. Khối nội dung chính */}
      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Cột trái: Giới thiệu thương hiệu */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-2">
          <div className="backdrop-blur-md bg-black/45 p-7 rounded-2xl border border-white/20 shadow-2xl space-y-4 text-white">
            <BrandLogo size="xl" subtitle="Thời Trang Công Nghệ" lightText />

            <div className="space-y-3">
              <Badge className="bg-white/20 backdrop-blur-md text-[#55dcf7] border-white/30 px-3 py-1 font-mono text-xs w-fit flex items-center gap-1.5 shadow-sm font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#17c1e8]" />
                Boutique 2026 Collection
              </Badge>
              <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
                Thời Trang Cao Cấp & Trải Nghiệm Hiện Đại
              </h2>
              <p className="text-white/90 text-sm leading-relaxed drop-shadow-sm font-normal">
                Đăng nhập để trải nghiệm không gian mua sắm cá nhân hóa, gợi ý phối đồ chuẩn size từ trợ lý AI và theo dõi đơn hàng của bạn.
              </p>
            </div>
          </div>
        </div>

        {/* Cột phải: Form Đăng Nhập Glassmorphism */}
        <div className="lg:col-span-7 w-full max-w-md mx-auto">
          <div className="rounded-2xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl border border-white/50 dark:border-white/10 p-7 sm:p-8 shadow-2xl shadow-black/40 transition-all">
            {/* Header trong Card */}
            <div className="text-center mb-6 space-y-2">
              <div className="flex justify-center mb-2 lg:hidden">
                <BrandLogo size="lg" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Đăng Nhập
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Nhập tài khoản để tiếp tục mua sắm hoặc quản lý
              </p>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} suppressHydrationWarning className="space-y-4">
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Email hoặc Số điện thoại
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            placeholder="Nhập email hoặc số điện thoại..."
                            className="bg-white/90 dark:bg-neutral-950/80 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 pl-9 h-10 rounded-lg text-xs focus:border-[#17c1e8] focus:ring-1 focus:ring-[#17c1e8] transition-all shadow-inner"
                            disabled={loading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          Mật khẩu
                        </FormLabel>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="bg-white/90 dark:bg-neutral-950/80 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 pl-9 pr-9 h-10 rounded-lg text-xs focus:border-[#17c1e8] focus:ring-1 focus:ring-[#17c1e8] transition-all shadow-inner"
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 bg-gradient-to-r from-[#17c1e8] to-[#14a7c9] text-slate-950 hover:from-[#19d3fc] hover:to-[#17c1e8] font-bold h-10 rounded-lg text-xs shadow-lg shadow-[#17c1e8]/25 hover:shadow-[#17c1e8]/40 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý đăng nhập...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Đăng Nhập Ngay
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Chuyển hướng Đăng ký */}
            <div className="mt-6 text-center pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Bạn chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="text-[#0c8ba8] dark:text-[#17c1e8] hover:underline font-bold inline-flex items-center gap-1 transition-colors ml-1"
                >
                  Đăng ký ngay
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
