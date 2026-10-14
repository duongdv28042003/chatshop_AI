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

      router.push("/");
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
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 py-12 px-4 sm:px-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Side: Brand Showcase */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-2">
          <BrandLogo size="xl" subtitle="Thời Trang Công Nghệ" />

          <div className="space-y-3">
            <Badge className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 px-2.5 py-1 font-mono text-xs w-fit">
              Boutique 2026
            </Badge>
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight tracking-tight">
              Thời Trang Cao Cấp & Trải Nghiệm Hiện Đại
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
              Đăng nhập để trải nghiệm không gian mua sắm cá nhân hóa, gợi ý phối đồ chuẩn size và theo dõi đơn hàng của bạn.
            </p>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-7 w-full max-w-md mx-auto">
          {/* Card Container */}
          <div className="rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
            {/* Header in Card */}
            <div className="text-center mb-6 space-y-2">
              <div className="flex justify-center mb-2 lg:hidden">
                <BrandLogo size="lg" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Đăng Nhập
              </h3>
              <p className="text-xs text-neutral-500">
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
                      <FormLabel className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Email hoặc Số điện thoại
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            placeholder="Nhập email hoặc số điện thoại..."
                            className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 pl-9 h-9 rounded-md text-xs focus:border-neutral-400 dark:focus:border-neutral-600"
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
                        <FormLabel className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
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
                            className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 pl-9 pr-9 h-9 rounded-md text-xs focus:border-neutral-400 dark:focus:border-neutral-600"
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
                  className="w-full mt-2 bg-[#17c1e8] text-slate-950 hover:bg-[#15afcf] font-bold h-9 rounded-md text-xs shadow-sm transition-colors"
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

            {/* Switch to Register */}
            <div className="mt-6 text-center pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-xs text-neutral-500">
                Bạn chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="text-neutral-900 dark:text-neutral-100 hover:underline font-medium inline-flex items-center gap-1 transition-colors ml-1"
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
