import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { MobileDevTools } from "@/components/mobile-devtools";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fashion Shop AI - Cửa Hàng Thời Trang Thông Minh",
  description: "Cửa hàng thời trang cao cấp & trợ lý tư vấn phối đồ AI",
  icons: {
    icon: "/brand-logo.png",
    apple: "/brand-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "if(typeof window!=='undefined'){window.zaloJSV2=window.zaloJSV2||{};}",
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
          <MobileDevTools />
        </Providers>
      </body>
    </html>
  );
}
