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
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 py-12 px-4 sm:px-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Side: Brand Showcase */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-2">
          <BrandLogo size="xl" subtitle="Thành Viên Khách Hàng" />

          <div className="space-y-3">
            <Badge className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 px-2.5 py-1 font-mono text-xs w-fit">
              Đặc Quyền Hội Viên
            </Badge>
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight tracking-tight">
              Gia Nhập Để Nhận Ưu Đãi & Tư Vấn Độc Quyền
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
              Đăng ký tài khoản nhanh chóng chỉ với số điện thoại để tích điểm nâng hạng thành viên và theo dõi đơn hàng tiện lợi.
            </p>
          </div>
        </div>

        {/* Right Side: Register Card */}
        <div className="lg:col-span-7 w-full max-w-md mx-auto">
          <div className="rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
            <div className="text-center mb-6 space-y-2">
              <div className="flex justify-center mb-2 lg:hidden">
                <BrandLogo size="lg" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Đăng Ký Tài Khoản
              </h3>
              <p className="text-xs text-neutral-500">
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
                          <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            placeholder="Nguyễn Văn A"
                            className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 pl-9 h-9 rounded-md text-xs focus:border-neutral-400 dark:focus:border-neutral-600"
                            disabled={loading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Số điện thoại *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                              {...field}
                              placeholder="0901234567"
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Email (tùy chọn)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="email@gmail.com"
                              className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 pl-9 h-9 rounded-md text-xs focus:border-neutral-400 dark:focus:border-neutral-600"
                              disabled={loading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-500 text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Mật khẩu *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Tối thiểu 6 ký tự..."
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

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Địa chỉ nhận hàng (tùy chọn)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <Input
                            {...field}
                            placeholder="Số nhà, tên đường, phường/xã..."
                            className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 pl-9 h-9 rounded-md text-xs focus:border-neutral-400 dark:focus:border-neutral-600"
                            disabled={loading}
                          />
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
                      Đang xử lý đăng ký...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Tạo Tài Khoản Ngay
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-5 text-center border-t border-neutral-200 dark:border-neutral-800 pt-3">
              <p className="text-xs text-neutral-500">
                Đã có tài khoản?{" "}
                <Link
                  href="/login"
                  className="text-neutral-900 dark:text-neutral-100 hover:underline font-medium inline-flex items-center gap-1 transition-colors ml-1"
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
