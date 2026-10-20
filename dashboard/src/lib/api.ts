import axios from "axios";
import Cookies from "js-cookie";

function getBaseUrl(): string {
  // Khi chạy trong trình duyệt (client), LUÔN dùng relative "/api"
  // để mọi thiết bị (máy tính, điện thoại qua IP Wi-Fi, domain) đều đi qua Next.js rewrite proxy
  if (typeof window !== "undefined") {
    return "/api";
  }
  // Khi chạy phía server (SSR)
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
}

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.baseURL = "/api";
  }
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
