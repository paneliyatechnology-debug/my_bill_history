"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

interface BrandLogoProps {
  variant?: "full" | "icon" | "horizontal";
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
  className?: string;
  showSubtitle?: boolean;
  subtitle?: string;
  onDark?: boolean;
}

export function BrandLogo({
  variant = "horizontal",
  size = "md",
  href = "/",
  className = "",
  showSubtitle = false,
  subtitle = "Paneliya Technology",
  onDark = false,
}: BrandLogoProps) {
  const sizeMap = {
    sm: { icon: 24, text: "text-base", sub: "text-[8px]", height: 24 },
    md: { icon: 32, text: "text-lg", sub: "text-[9px]", height: 32 },
    lg: { icon: 40, text: "text-xl", sub: "text-[10px]", height: 40 },
    xl: { icon: 48, text: "text-2xl", sub: "text-xs", height: 48 },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={`flex items-center gap-2.5 select-none group ${className}`}>
      {/* Logo Icon with Jade Teal Leaf styling */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-xl transition-transform group-hover:scale-105"
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        <Image
          src="/logo-icon.png"
          alt="myownbillbook"
          width={currentSize.icon}
          height={currentSize.icon}
          className="object-contain drop-shadow-xs"
          priority
        />
      </div>

      {/* Brand Text */}
      {variant !== "icon" && (
        <div className="flex flex-col justify-center min-w-0">
          <span
            className={`font-black tracking-tight leading-none whitespace-nowrap ${currentSize.text}`}
          >
            <span className={onDark ? "text-white" : "text-[#174B43]"}>MyOwn</span>
            <span className="text-[#26A58A]">BillBook</span>
          </span>
          {showSubtitle && (
            <span
              className={`tracking-wider uppercase font-semibold mt-0.5 truncate ${
                onDark ? "text-[#A7C7C0]" : "text-[#5A6B66]"
              } ${currentSize.sub}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
