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
      box: "w-7 h-7 rounded-md p-1",
      icon: "w-full h-full",
      title: "text-xs",
      sub: "text-[10px]",
    },
    md: {
      box: "w-8 h-8 rounded-md p-1.5",
      icon: "w-full h-full",
      title: "text-sm",
      sub: "text-[11px]",
    },
    lg: {
      box: "w-10 h-10 rounded-md p-2",
      icon: "w-full h-full",
      title: "text-base",
      sub: "text-xs",
    },
    xl: {
      box: "w-12 h-12 rounded-lg p-2.5",
      icon: "w-full h-full",
      title: "text-xl",
      sub: "text-xs",
    },
  };

  const s = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Emblem Icon - Clean Minimalist Monogram */}
      <div
        className={`${s.box} bg-[#17c1e8] text-slate-950 border border-[#17c1e8]/30 shadow-sm flex items-center justify-center shrink-0`}
      >
        <svg
          viewBox="0 0 456 347"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${s.icon} text-current`}
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
              className={`${s.title} font-bold tracking-tight ${
                lightText
                  ? "text-white"
                  : "text-neutral-900 dark:text-neutral-100"
              }`}
            >
              FASHION <span className="font-semibold text-neutral-500 dark:text-neutral-400">AI</span>
            </span>
          </div>
          {subtitle !== undefined ? (
            <span
              className={`${s.sub} ${
                lightText
                  ? "text-neutral-400"
                  : "text-neutral-500 dark:text-neutral-400"
              } font-mono mt-1 truncate`}
            >
              {subtitle}
            </span>
          ) : (
            <span className={`${s.sub} text-neutral-500 dark:text-neutral-400 font-mono tracking-wider uppercase text-[10px] mt-0.5`}>
              Smart Boutique
            </span>
          )}
        </div>
      )}
    </div>
  );
}

