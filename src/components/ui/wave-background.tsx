import React from "react";

export interface WaveBackgroundProps {
  className?: string;
  variant?: "dashboard" | "inner" | "login";
}

/**
 * WaveBackground
 * 
 * Provides calibrated background treatments for myownbillbook:
 * - "inner": Clean, subtle, distraction-free neutral canvas (#F7F8FA) with faint top warm glow.
 *            NO wave vectors crossing content, tables, filters, or cards.
 * - "dashboard": Attractive, premium Bhagwa ambient depth with gentle harmonic contours.
 * - "login": Branded decorative wave backdrop for auth screens.
 */
export function WaveBackground({
  className = "",
  variant = "dashboard",
}: WaveBackgroundProps) {
  // 1. INNER PAGE VARIANT: Clean, distraction-free professional accounting canvas
  if (variant === "inner") {
    return (
      <div
        className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-0 print:hidden ${className}`}
        aria-hidden="true"
        data-testid="inner-page-background"
      >
        {/* Subtle, soft warm ambient gradient wash near the top of content canvas */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#FFF5EC]/60 via-[#F7F8FA]/70 to-transparent pointer-events-none" />

        {/* Faint soft glow orbs strictly behind header area (Zero harsh lines) */}
        <div className="absolute -top-24 right-1/4 w-[480px] h-[340px] rounded-full bg-gradient-to-br from-[#F47721]/[0.025] via-[#FB923C]/[0.015] to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -top-20 left-8 w-[380px] h-[280px] rounded-full bg-gradient-to-tr from-[#F47721]/[0.02] to-transparent blur-2xl pointer-events-none" />
      </div>
    );
  }

  // 2. DASHBOARD / LOGIN VARIANT: Subtle spatial depth & elegant harmonic curves
  const isDashboard = variant === "dashboard";

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-0 print:hidden ${className}`}
      aria-hidden="true"
      data-testid="dashboard-wave-background"
    >
      {/* Ambient Glow Orbs for Subtle Spatial Depth */}
      <div
        className={`absolute -top-32 right-0 ${
          isDashboard ? "w-[500px] h-[500px] opacity-70" : "w-[550px] h-[550px]"
        } rounded-full bg-gradient-to-br from-[#F47721]/8 via-[#F59E0B]/5 to-transparent blur-3xl`}
      />
      <div
        className={`absolute top-1/4 -left-32 ${
          isDashboard ? "w-[500px] h-[500px] opacity-50" : "w-[650px] h-[650px]"
        } rounded-full bg-gradient-to-tr from-[#6366F1]/5 via-[#94A3B8]/6 to-transparent blur-3xl`}
      />
      <div
        className={`absolute -bottom-32 right-1/4 ${
          isDashboard ? "w-[500px] h-[500px] opacity-60" : "w-[600px] h-[600px]"
        } rounded-full bg-gradient-to-tl from-[#F47721]/6 via-[#FBBF24]/5 to-transparent blur-3xl`}
      />

      {/* Precision Minimalist Abstract Wave Lines SVG */}
      <svg
        className={`w-full h-full object-cover ${
          isDashboard ? "opacity-45" : "opacity-85"
        }`}
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Saffron Primary Flow Gradient */}
          <linearGradient id="wave-saffron-flow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F47721" stopOpacity="0.08" />
            <stop offset="35%" stopColor="#F47721" stopOpacity="0.22" />
            <stop offset="65%" stopColor="#FB923C" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.10" />
          </linearGradient>

          {/* Slate & Architectural Contour Gradient */}
          <linearGradient id="wave-slate-flow" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748B" stopOpacity="0.06" />
            <stop offset="45%" stopColor="#64748B" stopOpacity="0.18" />
            <stop offset="85%" stopColor="#475569" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.08" />
          </linearGradient>

          {/* Warm Amber/Gold Accent Gradient */}
          <linearGradient id="wave-amber-flow" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.06" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#F47721" stopOpacity="0.10" />
          </linearGradient>

          {/* Indigo Soft Precision Gradient */}
          <linearGradient id="wave-indigo-flow" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.06" />
            <stop offset="50%" stopColor="#818CF8" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#F47721" stopOpacity="0.10" />
          </linearGradient>
        </defs>

        {/* WAVE STREAM 1: Primary Upper Diagonal Ribbon */}
        <g stroke="url(#wave-saffron-flow)" strokeWidth="1.1" vectorEffect="non-scaling-stroke">
          <path d="M -120 180 C 260 70, 580 340, 960 190 C 1220 90, 1420 280, 1600 170" />
          <path d="M -120 205 C 260 95, 580 365, 960 215 C 1220 115, 1420 305, 1600 195" />
          <path d="M -120 230 C 260 120, 580 390, 960 240 C 1220 140, 1420 330, 1600 220" />
          <path d="M -120 255 C 260 145, 580 415, 960 265 C 1220 165, 1420 355, 1600 245" />
          <path d="M -120 280 C 260 170, 580 440, 960 290 C 1220 190, 1420 380, 1600 270" strokeWidth="1.3" />
          <path d="M -120 305 C 260 195, 580 465, 960 315 C 1220 215, 1420 405, 1600 295" />
          <path d="M -120 330 C 260 220, 580 490, 960 340 C 1220 240, 1420 430, 1600 320" />
          <path d="M -120 355 C 260 245, 580 515, 960 365 C 1220 265, 1420 455, 1600 345" />
          <path
            d="M -120 380 C 260 270, 580 540, 960 390 C 1220 290, 1420 480, 1600 370"
            strokeDasharray="4 6"
            strokeWidth="1.0"
          />
        </g>

        {/* WAVE STREAM 2: Lower-Mid Fluid Ribbon */}
        <g stroke="url(#wave-slate-flow)" strokeWidth="1.1" vectorEffect="non-scaling-stroke">
          <path d="M -100 755 C 340 565, 720 835, 1120 645 C 1320 550, 1480 705, 1620 605" />
          <path d="M -100 780 C 340 590, 720 860, 1120 670 C 1320 575, 1480 730, 1620 630" />
          <path d="M -100 805 C 340 615, 720 885, 1120 695 C 1320 600, 1480 755, 1620 655" strokeWidth="1.3" />
          <path d="M -100 830 C 340 640, 720 910, 1120 720 C 1320 625, 1480 780, 1620 680" />
          <path d="M -100 855 C 340 665, 720 935, 1120 745 C 1320 650, 1480 805, 1620 705" />
        </g>

        {/* WAVE STREAM 3: Harmonic Crossing Waves */}
        <g stroke="url(#wave-amber-flow)" strokeWidth="1.0" vectorEffect="non-scaling-stroke">
          <path d="M -80 480 C 380 310, 840 620, 1240 430 C 1390 360, 1520 480, 1640 410" />
          <path d="M -80 505 C 380 335, 840 645, 1240 455 C 1390 385, 1520 505, 1640 435" />
          <path d="M -80 530 C 380 360, 840 670, 1240 480 C 1390 410, 1520 530, 1640 460" strokeWidth="1.2" />
        </g>

        {/* WAVE STREAM 4: Gentle Ambient Counter-Wave */}
        <g stroke="url(#wave-indigo-flow)" strokeWidth="1.0" vectorEffect="non-scaling-stroke">
          <path d="M -150 90 C 350 240, 750 40, 1150 200 C 1350 280, 1500 120, 1620 180" />
          <path d="M -150 115 C 350 265, 750 65, 1150 225 C 1350 305, 1500 145, 1620 205" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}
