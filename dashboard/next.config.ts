import type { NextConfig } from "next";
import os from "os";

function getDevOrigins(): string[] {
  const origins = new Set<string>(["localhost", "127.0.0.1", "0.0.0.0"]);

  // Thêm tên máy (.local hỗ trợ Safari / iPhone trực tiếp)
  const host = os.hostname();
  origins.add(host);
  origins.add(`${host}.local`);
  origins.add(`${host.toLowerCase()}.local`);

  // Tự động quét và lấy tất cả IPv4 LAN nội bộ khi khởi động
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        origins.add(net.address);
      }
    }
  }

  // Các IP đã dùng trước đó
  origins.add("192.168.2.158");
  origins.add("192.168.2.110");
  origins.add("*.trycloudflare.com");
  origins.add("trycloudflare.com");
  origins.add("*.ngrok-free.app");
  origins.add("*.loca.lt");

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: getDevOrigins(),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://localhost:5000/uploads/:path*",
      },
      {
        source: "/webhook/zalo",
        destination: "http://localhost:8000/webhook/zalo",
      },
    ];
  },
};

export default nextConfig;
