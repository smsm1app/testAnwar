/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Package } from 'lucide-react';

interface ProductAssetProps {
  name: string;
  className?: string;
  size?: number;
}

// ----------------------------------------------------------------------
// Premium Minimal Industrial Vectors
// ----------------------------------------------------------------------

const SolarPanelSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="16" rx="2" className="fill-slate-100 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
    <path d="M2 12H22" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
    <path d="M8 4V20" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
    <path d="M16 4V20" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
    <rect x="3.5" y="5.5" width="3" height="5" rx="0.5" className="fill-blue-500/10 dark:fill-blue-400/20 stroke-blue-500/50" strokeWidth="0.5" />
    <rect x="3.5" y="13.5" width="3" height="5" rx="0.5" className="fill-blue-500/10 dark:fill-blue-400/20 stroke-blue-500/50" strokeWidth="0.5" />
    <rect x="10.5" y="5.5" width="3" height="5" rx="0.5" className="fill-blue-500/10 dark:fill-blue-400/20 stroke-blue-500/50" strokeWidth="0.5" />
    <rect x="10.5" y="13.5" width="3" height="5" rx="0.5" className="fill-blue-500/10 dark:fill-blue-400/20 stroke-blue-500/50" strokeWidth="0.5" />
    <rect x="17.5" y="5.5" width="3" height="5" rx="0.5" className="fill-blue-500/10 dark:fill-blue-400/20 stroke-blue-500/50" strokeWidth="0.5" />
    <rect x="17.5" y="13.5" width="3" height="5" rx="0.5" className="fill-blue-500/10 dark:fill-blue-400/20 stroke-blue-500/50" strokeWidth="0.5" />
  </svg>
);

const LithiumBatterySvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="16" height="14" rx="2" className="fill-slate-100 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" />
    <path d="M7 6V4C7 3.44772 7.44772 3 8 3H10C10.5523 3 11 3.44772 11 4V6" className="fill-slate-200 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" />
    <path d="M13 6V4C13 3.44772 13.44772 3 14 3H16C16.5523 3 17 3.44772 17 4V6" className="fill-slate-200 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" />
    <path d="M8 3.5H10" className="stroke-rose-500" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 3.5H16" className="stroke-emerald-500" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M15 2.5V4.5" className="stroke-emerald-500" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="7" y="10" width="10" height="7" rx="1" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1" />
    <rect x="8" y="11.5" width="2" height="4" rx="0.5" className="fill-emerald-400 dark:fill-emerald-500" />
    <rect x="11" y="11.5" width="2" height="4" rx="0.5" className="fill-emerald-400 dark:fill-emerald-500" />
    <rect x="14" y="11.5" width="2" height="4" rx="0.5" className="fill-slate-200 dark:fill-slate-700" />
  </svg>
);

const InverterSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="3" width="14" height="18" rx="2" className="fill-slate-50 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" />
    <rect x="7" y="6" width="10" height="5" rx="1" className="fill-blue-50 dark:fill-slate-950 stroke-blue-200 dark:stroke-slate-600" strokeWidth="1" />
    <path d="M8 8.5H11" className="stroke-blue-500 dark:stroke-amber-400" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 8.5H14.01" className="stroke-rose-500" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 8.5H16.01" className="stroke-emerald-500" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M5 14H19" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
    <circle cx="9" cy="17" r="1.5" className="fill-slate-300 dark:fill-slate-600" />
    <circle cx="15" cy="17" r="1.5" className="fill-slate-300 dark:fill-slate-600" />
  </svg>
);

const ConnectorSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12H9M15 12H20" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" strokeLinecap="round" />
    <rect x="8" y="10" width="4" height="4" rx="1" className="fill-slate-200 dark:fill-slate-700 stroke-slate-500 dark:stroke-slate-400" strokeWidth="1.5" />
    <path d="M12 9H16V15H12V9Z" className="fill-slate-100 dark:fill-slate-800 stroke-slate-500 dark:stroke-slate-400" strokeWidth="1.5" />
    <path d="M17 12H18" className="stroke-slate-800 dark:stroke-slate-200" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BreakerSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="12" height="16" rx="2" className="fill-slate-50 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" />
    <path d="M6 10H18" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
    <path d="M6 14H18" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
    <rect x="10" y="6" width="4" height="6" rx="1" className="fill-rose-500 dark:fill-rose-600" />
    <circle cx="12" cy="17" r="1" className="fill-slate-400 dark:fill-slate-500" />
  </svg>
);

const CableSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 19C5 19 3 13 8 10C13 7 14 13 18 10C20 8.5 21 6 21 6" className="stroke-slate-700 dark:stroke-slate-300" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M4 20L6 18" className="stroke-rose-500" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M20 7L22 5" className="stroke-emerald-500" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// ----------------------------------------------------------------------
// Automated Asset Registry
// ----------------------------------------------------------------------

export default function ProductAsset({ name, className = '', size = 48 }: ProductAssetProps) {
  const normalized = name.toLowerCase();

  const getVector = () => {
    if (normalized.includes('لوح') || normalized.includes('شمس') || normalized.includes('panel')) {
      return <SolarPanelSvg size={size} />;
    }
    if (normalized.includes('بطارية') || normalized.includes('ليثيوم') || normalized.includes('جل') || normalized.includes('battery')) {
      return <LithiumBatterySvg size={size} />;
    }
    if (normalized.includes('عاكس') || normalized.includes('محول') || normalized.includes('inverter') || normalized.includes('انفيرتر')) {
      return <InverterSvg size={size} />;
    }
    if (normalized.includes('قاطع') || normalized.includes('breaker') || normalized.includes('fuse')) {
      return <BreakerSvg size={size} />;
    }
    if (normalized.includes('قابلو') || normalized.includes('كيبل') || normalized.includes('سلك') || normalized.includes('cable')) {
      return <CableSvg size={size} />;
    }
    if (normalized.includes('موصل') || normalized.includes('mc4') || normalized.includes('connector')) {
      return <ConnectorSvg size={size} />;
    }

    // Default Fallback
    return <Package size={size} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />;
  };

  return (
    <div className={`flex items-center justify-center shrink-0 ${className}`}>
      {getVector()}
    </div>
  );
}
