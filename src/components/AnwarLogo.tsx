/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AnwarLogoProps {
  className?: string; // e.g. "w-10 h-10"
  showText?: boolean;
  brandTextClass?: string; // custom color class
  taglineClass?: string;
  isDarkTheme?: boolean;
}

export default function AnwarLogo({
  className = "w-11 h-11",
  showText = false,
  brandTextClass = "text-white",
  taglineClass = "text-slate-400",
  isDarkTheme = true
}: AnwarLogoProps) {
  return (
    <div className="flex items-center gap-3 select-none" dir="rtl">
      {/* SVG Vector Graphic Logo representing Golden Sun & slant 3x2 Green Solar Panel */}
      <svg
        viewBox="0 0 500 500"
        className={`${className} shrink-0`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Definition gradients for extreme premium look */}
        <defs>
          <radialGradient id="sunGlow" cx="250" cy="210" r="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFA800" />
            <stop offset="100%" stopColor="#FFCC00" />
          </radialGradient>
          <linearGradient id="panelGrad" x1="140" y1="230" x2="360" y2="370" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0B5F1F" />
            <stop offset="50%" stopColor="#12822E" />
            <stop offset="100%" stopColor="#156C27" />
          </linearGradient>
          <linearGradient id="silverGrid" x1="140" y1="230" x2="360" y2="370" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF299" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
          <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* 1. Yellow Sun Burst (Aesthetically complete with 16 distinct pointy rays) */}
        <g id="sunburst" filter="url(#shadowFilter)">
          {/* Main glowing sun core */}
          <circle cx="250" cy="210" r="110" fill="url(#sunGlow)" />
          
          {/* Circular arrays of beautiful geometric rays */}
          {[
            0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5
          ].map((angle, idx) => {
            const rad = (angle * Math.PI) / 180;
            const length = 175;
            
            // Ray Point coord
            const rx = 250 + Math.cos(rad) * length;
            const ry = 210 + Math.sin(rad) * length;
            
            // Ray Base coords
            const radL = ((angle - 12) * Math.PI) / 180;
            const radR = ((angle + 12) * Math.PI) / 180;
            const baseRadius = 110;
            const rxl = 250 + Math.cos(radL) * baseRadius;
            const ryl = 210 + Math.sin(radL) * baseRadius;
            const rxr = 250 + Math.cos(radR) * baseRadius;
            const ryr = 210 + Math.sin(radR) * baseRadius;
            
            return (
              <polygon
                key={idx}
                points={`${rx},${ry} ${rxl},${ryl} ${rxr},${ryr}`}
                fill="#FFB800"
              />
            );
          })}
        </g>

        {/* 2. Slanted 3x2 Green Solar Panel Grid in Perspective */}
        <g id="solar-panels" filter="url(#shadowFilter)">
          {/* Background casing */}
          <polygon
            points="110,380 390,380 330,230 170,230"
            fill="url(#panelGrad)"
            stroke="url(#silverGrid)"
            strokeWidth="12"
            strokeLinejoin="round"
          />

          {/* Grid Separation lines (3 Columns x 2 Rows) */}
          {/* Horizontal division */}
          <polygon
            points="140,305 360,305 360,311 140,311"
            fill="url(#silverGrid)"
          />

          {/* Column Divisions (slanted according to perspective) */}
          {/* Center line */}
          <polygon
            points="247,230 253,230 253,380 247,380"
            fill="url(#silverGrid)"
          />
          {/* Left vertical division */}
          <polygon
            points="208,230 213,230 183,380 177,380"
            fill="url(#silverGrid)"
          />
          {/* Right vertical division */}
          <polygon
            points="287,230 292,230 323,380 317,380"
            fill="url(#silverGrid)"
          />

          {/* Dynamic glass gloss streaks */}
          <path d="M 190 240 L 220 240 L 160 375 L 130 375 Z" fill="white" fillOpacity="0.12" />
          <path d="M 270 240 L 295 240 L 260 375 L 235 375 Z" fill="white" fillOpacity="0.12" />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col text-right">
          <h1 className={`font-black text-[15px] leading-tight tracking-tight ${brandTextClass} transition-colors`}>
            أنوار الإبداع
          </h1>
          <span className={`text-[9px] font-black tracking-wider ${taglineClass} transition-colors mt-0.5`}>
            بوابة الإدارة السحابية للطاقة الشمسية
          </span>
        </div>
      )}
    </div>
  );
}
