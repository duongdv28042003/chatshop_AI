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
  UserPlus,
  Eye,
  EyeOff,
  User,
  Lock,
  Phone,
  Mail,
  MapPin,
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
import apiClient from "@/lib/api";

const registerSchema = z.object({
  name: z.string().min(2, "Họ và tên ít nhất 2 ký tự"),
  phone: z
    .string()
    .min(10, "Số điện thoại không hợp lệ")
    .max(15, "Số điện thoại không hợp lệ")
    .regex(/^[0-9]+$/, "Chỉ chứa các chữ số"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  password: z.string().min(6, "Mật khẩu ít nhất 6 ký tự"),
  address: z.string().optional(),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      address: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    setLoading(true);
    try {
      await apiClient.post("/customers/register", {
        name: values.name,
        phone: values.phone,
        email: values.email ? values.email : null,
        password: values.password,
        address: values.address ? values.address : null,
      });

      toast.success("Đăng ký tài khoản khách hàng thành công! Vui lòng đăng nhập.");
      router.push("/login");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message ||
          "Đăng ký không thành công. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden py-12 px-4 sm:px-6">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-[#17c1e8]/15 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[650px] h-[650px] rounded-full bg-cyan-600/10 blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-900/40 rounded-full blur-[110px]" />

        {/* Grid overlay */}
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
          <BrandLogo size="xl" lightText subtitle="Thành Viên VIP Boutique" />

          <div className="space-y-3">
            <Badge className="bg-[#17c1e8]/15 text-[#17c1e8] border-[#17c1e8]/30 px-3 py-1 gap-1.5 font-semibold text-xs w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              Đặc Quyền Hội Viên
            </Badge>
            <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              Gia Nhập Để Nhận Ưu Đãi & Tư Vấn{" "}
              <span className="bg-gradient-to-r from-[#17c1e8] to-cyan-300 bg-clip-text text-transparent">
                Độc Quyền
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Đăng ký tài khoản nhanh chóng chỉ với số điện thoại để tích điểm nâng hạng thành viên và theo dõi đơn hàng tiện lợi.
            </p>
          </div>
        </div>

        {/* Right Side: Register Card */}
        <div className="lg:col-span-7 w-full max-w-md mx-auto">
          <div className="relative rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 p-8 sm:p-10 shadow-2xl shadow-cyan-950/40">
            {/* Glowing Top Line */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#17c1e8] to-transparent" />

            <div className="text-center mb-6 space-y-2">
              <div className="flex justify-center mb-2 lg:hidden">
                <BrandLogo size="lg" lightText />
              </div>
              <h3 className="text-2xl font-extrabold text-white tracking-tight">
                Đăng Ký Tài Khoản
              </h3>
              <p className="text-xs text-slate-400">
                Tạo tài khoản khách hàng mới trong 30 giây
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} suppressHydrationWarning className="space-y-3.5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300">
                        Họ và tên *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            placeholder="Nguyễn Văn A"
                            className="bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 pl-10 h-10 rounded-xl text-xs focus:border-[#17c1e8] focus:ring-[#17c1e8]/20"
                            disabled={loading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-300">
                          Số điện thoại *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                              {...field}
                              placeholder="0901234567"
                              className="bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 pl-10 h-10 rounded-xl text-xs focus:border-[#17c1e8] focus:ring-[#17c1e8]/20"
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-slate-300">
                          Email (tùy chọn)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="email@gmail.com"
                              className="bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 pl-10 h-10 rounded-xl text-xs focus:border-[#17c1e8] focus:ring-[#17c1e8]/20"
                              disabled={loading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300">
                        Mật khẩu *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Tối thiểu 6 ký tự..."
                            className="bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 pl-10 pr-10 h-10 rounded-xl text-xs focus:border-[#17c1e8] focus:ring-[#17c1e8]/20"
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

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300">
                        Địa chỉ giao hàng (tùy chọn)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            placeholder="Số nhà, tên đường, phường/xã..."
                            className="bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 pl-10 h-10 rounded-xl text-xs focus:border-[#17c1e8] focus:ring-[#17c1e8]/20"
                            disabled={loading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 bg-gradient-to-r from-[#17c1e8] via-cyan-400 to-cyan-500 hover:from-cyan-400 hover:to-[#17c1e8] text-slate-950 font-bold h-11 rounded-xl shadow-lg shadow-[#17c1e8]/30 transition-all hover:scale-[1.01]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                      Đang xử lý đăng ký...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4 text-slate-950" />
                      Tạo Tài Khoản Ngay
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-5 text-center">
              <p className="text-xs text-slate-400">
                Đã có tài khoản?{" "}
                <Link
                  href="/login"
                  className="text-[#17c1e8] hover:text-cyan-300 font-bold inline-flex items-center gap-1 transition-colors ml-1"
                >
                  Đăng nhập tại đây
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
