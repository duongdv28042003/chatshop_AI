"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  lightText?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "md",
  showText = true,
  subtitle,
  lightText = false,
  className = "",
}: BrandLogoProps) {
  const sizeMap = {
    sm: {
      box: "w-8 h-8 rounded-lg p-1.5",
      icon: "w-full h-full",
      title: "text-sm",
      sub: "text-[10px]",
    },
    md: {
      box: "w-9 h-9 rounded-xl p-1.5",
      icon: "w-full h-full",
      title: "text-sm",
      sub: "text-[11px]",
    },
    lg: {
      box: "w-11 h-11 rounded-xl p-2",
      icon: "w-full h-full",
      title: "text-lg",
      sub: "text-xs",
    },
    xl: {
      box: "w-14 h-14 rounded-2xl p-2.5",
      icon: "w-full h-full",
      title: "text-2xl",
      sub: "text-sm",
    },
  };

  const s = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Emblem Icon - Custom Fashion Shop 'FS' Monogram */}
      <div
        className={`${s.box} bg-slate-950 border border-[#17c1e8]/40 shadow-lg shadow-[#17c1e8]/20 flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-105`}
      >
        <svg
          viewBox="0 0 456 347"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${s.icon} text-[#17c1e8] drop-shadow-[0_0_6px_rgba(23,193,232,0.5)]`}
        >
          {/* S bottom bar */}
          <path d="M 139 326 L 340 326 L 393 275 L 191 275 Z" fill="currentColor" />
          {/* S middle curve */}
          <path d="M 159 204 L 197 242 L 363 241 L 395 272 L 435 236 L 392 192 L 233 192 L 203 162 Z" fill="currentColor" />
          {/* S top bar */}
          <path d="M 205 159 L 384 158 L 434 108 L 258 108 Z" fill="currentColor" />
          {/* F main body */}
          <path d="M 316 21 L 112 21 L 20 109 L 20 284 L 75 231 L 76 158 L 172 158 L 222 109 L 76 109 L 76 72 L 264 72 Z" fill="currentColor" />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col text-left min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`${s.title} font-black tracking-tight ${
                lightText
                  ? "text-white"
                  : "text-foreground"
              }`}
            >
              FASHION{" "}
              <span className="bg-gradient-to-r from-[#17c1e8] to-cyan-400 bg-clip-text text-transparent font-black">
                AI
              </span>
            </span>
            <Sparkles className="w-3.5 h-3.5 text-[#17c1e8] shrink-0" />
          </div>
          {subtitle !== undefined ? (
            <span
              className={`${s.sub} ${
                lightText
                  ? "text-slate-400"
                  : "text-muted-foreground"
              } font-medium mt-1 truncate`}
            >
              {subtitle}
            </span>
          ) : (
            <span className={`${s.sub} text-[#17c1e8] font-bold tracking-wider uppercase text-[10px] mt-0.5`}>
              Smart Boutique
            </span>
          )}
        </div>
      )}
    </div>
  );
}

