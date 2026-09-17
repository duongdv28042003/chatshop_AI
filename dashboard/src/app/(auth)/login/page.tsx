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
  Sparkles,
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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden py-12 px-4 sm:px-6">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-[#17c1e8]/15 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[650px] h-[650px] rounded-full bg-cyan-600/10 blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-900/40 rounded-full blur-[110px]" />

        {/* Subtle Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#17c1e8 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Side: Brand Showcase */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-2">
          <BrandLogo size="xl" lightText subtitle="Thời Trang Công Nghệ AI" />

          <div className="space-y-3">
            <Badge className="bg-[#17c1e8]/15 text-[#17c1e8] border-[#17c1e8]/30 px-3 py-1 gap-1.5 font-semibold text-xs w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              Boutique 2026
            </Badge>
            <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              Thời Trang Cao Cấp & Tư Vấn{" "}
              <span className="bg-gradient-to-r from-[#17c1e8] to-cyan-300 bg-clip-text text-transparent">
                AI Thông Minh
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Đăng nhập để trải nghiệm không gian mua sắm cá nhân hóa, gợi ý phối đồ chuẩn size và theo dõi đơn hàng của bạn.
            </p>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-7 w-full max-w-md mx-auto">
          {/* Card Container */}
          <div className="relative rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 p-8 sm:p-10 shadow-2xl shadow-cyan-950/40">
            {/* Glowing Top Line */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#17c1e8] to-transparent" />

            {/* Header in Card (visible on mobile / desktop) */}
            <div className="text-center mb-6 space-y-2">
              <div className="flex justify-center mb-2 lg:hidden">
                <BrandLogo size="lg" lightText />
              </div>
              <h3 className="text-2xl font-extrabold text-white tracking-tight">
                Đăng Nhập
              </h3>
              <p className="text-xs text-slate-400">
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
                      <FormLabel className="text-xs font-semibold text-slate-300">
                        Email hoặc Số điện thoại
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            placeholder="Nhập email hoặc số điện thoại..."
                            className="bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 pl-10 h-11 rounded-xl text-xs focus:border-[#17c1e8] focus:ring-[#17c1e8]/20"
                            disabled={loading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-semibold text-slate-300">
                          Mật khẩu
                        </FormLabel>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 pl-10 pr-10 h-11 rounded-xl text-xs focus:border-[#17c1e8] focus:ring-[#17c1e8]/20"
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-gradient-to-r from-[#17c1e8] via-cyan-400 to-cyan-500 hover:from-cyan-400 hover:to-[#17c1e8] text-slate-950 font-bold h-11 rounded-xl shadow-lg shadow-[#17c1e8]/30 transition-all hover:scale-[1.01]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                      Đang xử lý đăng nhập...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4 text-slate-950" />
                      Đăng Nhập Ngay
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Switch to Register */}
            <div className="mt-6 text-center pt-2">
              <p className="text-xs text-slate-400">
                Bạn chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="text-[#17c1e8] hover:text-cyan-300 font-bold inline-flex items-center gap-1 transition-colors ml-1"
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
