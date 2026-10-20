"use client";

import React from "react";
import { MapPin, ExternalLink } from "lucide-react";

const SHOP_COORDINATES = "21.344495167401558,106.32968251184367";
const GOOGLE_MAPS_SEARCH_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  SHOP_COORDINATES
)}`;
const GOOGLE_MAPS_EMBED_URL = `https://maps.google.com/maps?q=${encodeURIComponent(
  SHOP_COORDINATES
)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

const FACEBOOK_PROFILE_URL = "https://www.facebook.com/duong.duongvan.3975";
const ZALO_CHAT_URL = "https://zalo.me/0812084494";
const WHATSAPP_CHAT_URL = "https://wa.me/84812084494";

export function SidebarContactLinks() {
  return (
    <div className="px-3 pt-2.5 pb-2">
      {/* Social Buttons */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          Kết nối & Hỗ trợ
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Online
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {/* Facebook */}
        <a
          href={FACEBOOK_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Facebook: duong.duongvan.3975"
          aria-label="Trang cá nhân Facebook"
          className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 hover:bg-[#1877F2]/10 dark:hover:bg-[#1877F2]/20 border border-neutral-200/80 dark:border-neutral-700/80 text-[#1877F2] font-semibold text-xs shadow-2xs hover:scale-[1.02] transition-all"
        >
          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="text-[11px] font-bold">FB</span>
        </a>

        {/* Zalo */}
        <a
          href={ZALO_CHAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat Zalo: 0812084494"
          aria-label="Chat Zalo số 0812084494"
          className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 hover:bg-[#0068FF]/10 dark:hover:bg-[#0068FF]/20 border border-neutral-200/80 dark:border-neutral-700/80 text-[#0068FF] font-semibold text-xs shadow-2xs hover:scale-[1.02] transition-all"
        >
          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 48 48">
            <path d="M24 4C12.95 4 4 12.51 4 23.01c0 5.99 2.92 11.35 7.58 14.97-.24 2.37-1.4 5.92-3.32 8.02 0 0 4.96-.32 9.53-3.23 1.95.53 4.02.82 6.21.82 11.05 0 20-8.51 20-19.01S35.05 4 24 4zm7.5 25.2h-11c-.7 0-1.2-.5-1.2-1.2 0-.4.2-.8.5-1l7.8-8.9h-6.6c-.6 0-1-.4-1-1s.4-1 1-1h10.4c.7 0 1.2.5 1.2 1.2 0 .4-.2.8-.5 1l-7.9 9h7.3c.6 0 1 .4 1 1s-.5.9-1 .9zm4.5-5.2c-.6 0-1-.4-1-1v-5c0-.6.4-1 1-1s1 .4 1 1v5c0 .6-.4 1-1 1z" />
          </svg>
          <span className="text-[11px] font-bold">Zalo</span>
        </a>

        {/* WhatsApp */}
        <a
          href={WHATSAPP_CHAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat WhatsApp: 0812084494"
          aria-label="Chat WhatsApp số 0812084494"
          className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 hover:bg-[#25D366]/10 dark:hover:bg-[#25D366]/20 border border-neutral-200/80 dark:border-neutral-700/80 text-[#25D366] font-semibold text-xs shadow-2xs hover:scale-[1.02] transition-all"
        >
          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          <span className="text-[11px] font-bold">WA</span>
        </a>
      </div>

      {/* Mini Google Map */}
      <div className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shadow-2xs group">
        {/* Header link */}
        <a
          href={GOOGLE_MAPS_SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Nhấn để tìm địa chỉ shop trên Google Maps"
          aria-label="Tìm địa chỉ shop trên Google Maps"
          className="flex items-center justify-between px-2 py-1.5 bg-neutral-100/90 dark:bg-neutral-800/90 border-b border-neutral-200 dark:border-neutral-800 transition-colors group-hover:bg-neutral-200/80 dark:group-hover:bg-neutral-700/80"
        >
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-800 dark:text-neutral-200">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="truncate">Vị trí cửa hàng</span>
          </span>
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#17c1e8] group-hover:underline shrink-0">
            Chỉ đường <ExternalLink className="w-2.5 h-2.5" />
          </span>
        </a>

        {/* Clickable Map Viewport */}
        <a
          href={GOOGLE_MAPS_SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Nhấn để tìm địa chỉ shop trên Google Maps"
          aria-label="Nhấn để tìm địa chỉ shop trên Google Maps"
          className="relative block w-full h-24 bg-neutral-200 dark:bg-neutral-800 cursor-pointer overflow-hidden group/map"
        >
          <iframe
            src={GOOGLE_MAPS_EMBED_URL}
            width="100%"
            height="100%"
            style={{ border: 0, pointerEvents: "none" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Bản đồ vị trí shop trên Google Maps"
            className="w-full h-full"
          />

          {/* Hover Overlay Hint */}
          <div className="absolute inset-0 bg-black/0 group-hover/map:bg-black/20 dark:group-hover/map:bg-white/10 transition-colors flex items-center justify-center pointer-events-none">
            <span className="opacity-0 group-hover/map:opacity-100 transition-opacity bg-neutral-900/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-400" /> Xem trên Google Maps ↗
            </span>
          </div>
        </a>
      </div>
    </div>
  );
}
