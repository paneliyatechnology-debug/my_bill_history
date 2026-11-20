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
  subtitle = "Accounting & Invoicing Software",
  onDark = false,
}: BrandLogoProps) {
  const sizeMap = {
    sm: { icon: 26, fullH: 26, fullW: 110, text: "text-base", sub: "text-[8px]" },
    md: { icon: 34, fullH: 34, fullW: 148, text: "text-lg", sub: "text-[9px]" },
    lg: { icon: 42, fullH: 42, fullW: 184, text: "text-xl", sub: "text-[10px]" },
    xl: { icon: 50, fullH: 50, fullW: 220, text: "text-2xl", sub: "text-xs" },
  };

  const currentSize = sizeMap[size];

  const content = variant === "icon" ? (
    <div
      className={`relative shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 ${className}`}
      style={{ width: currentSize.icon, height: currentSize.icon }}
    >
      <Image
        src="/logo-icon.png"
        alt="myownbillbook"
        width={currentSize.icon}
        height={currentSize.icon}
        className="object-contain"
        priority
      />
    </div>
  ) : (
    <div className={`flex items-center gap-2 select-none group ${className}`}>
      <div className="relative shrink-0 flex items-center transition-transform group-hover:scale-105">
        <Image
          src="/logo-full.png"
          alt="myownbillbook"
          width={currentSize.fullW}
          height={currentSize.fullH}
          style={{ height: `${currentSize.fullH}px`, width: "auto" }}
          className="object-contain"
          priority
        />
      </div>
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
