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

const ChargeControllerSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="3" width="16" height="18" rx="2" className="fill-slate-50 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" />
    <rect x="7" y="6" width="10" height="5" rx="1" className="fill-emerald-50 dark:fill-slate-900 stroke-emerald-400 dark:stroke-slate-600" strokeWidth="1" />
    <circle cx="8" cy="14" r="1.5" className="fill-slate-400 dark:fill-slate-500" />
    <circle cx="12" cy="14" r="1.5" className="fill-slate-400 dark:fill-slate-500" />
    <circle cx="16" cy="14" r="1.5" className="fill-slate-400 dark:fill-slate-500" />
    <path d="M7 19V21" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 19V21" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M17 19V21" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MountingStructureSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 20H21" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 20L10 6H14L18 20" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 13H16" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 6L20 4" className="stroke-slate-500 dark:stroke-slate-400" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CombinerBoxSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="4" width="14" height="16" rx="2" className="fill-slate-50 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="3" className="stroke-amber-500" strokeWidth="1.5" />
    <path d="M8 20V22" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 20V22" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 20V22" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const WaterPumpSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="8" width="8" height="12" rx="2" className="fill-blue-50 dark:fill-slate-800 stroke-blue-500 dark:stroke-blue-400" strokeWidth="1.5" />
    <path d="M8 12H16" className="stroke-blue-500 dark:stroke-blue-400" strokeWidth="1.5" />
    <path d="M8 16H16" className="stroke-blue-500 dark:stroke-blue-400" strokeWidth="1.5" />
    <path d="M12 8V3" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 3H14" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const LightSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.686 2 6 4.686 6 8C6 10.5 7.5 12.5 9 14V17C9 17.552 9.448 18 10 18H14C14.552 18 15 17.552 15 17V14C16.5 12.5 18 10.5 18 8C18 4.686 15.314 2 12 2Z" className="fill-amber-50 dark:fill-slate-800 stroke-amber-500 dark:stroke-amber-400" strokeWidth="1.5" />
    <path d="M10 21H14" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 18V21" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" />
  </svg>
);

const GeneratorSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="8" width="18" height="12" rx="2" className="fill-slate-100 dark:fill-slate-800 stroke-slate-500 dark:stroke-slate-400" strokeWidth="1.5" />
    <path d="M6 8V6H8V8" className="stroke-slate-500 dark:stroke-slate-400" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M16 8V5H18V8" className="stroke-slate-500 dark:stroke-slate-400" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="5" y="12" width="6" height="4" rx="1" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1" />
    <circle cx="16" cy="14" r="2" className="stroke-emerald-500" strokeWidth="1.5" />
  </svg>
);

const ToolSvg = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" className="fill-slate-100 dark:fill-slate-800 stroke-slate-500 dark:stroke-slate-400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);


// ----------------------------------------------------------------------
// Automated Asset Registry
// ----------------------------------------------------------------------

export default function ProductAsset({ name, className = '', size = 48 }: ProductAssetProps) {
  const normalized = name.toLowerCase();

  const getVector = () => {
    if (normalized.includes('لوح') || normalized.includes('شمس') || normalized.includes('panel') || normalized.includes('jinko') || normalized.includes('longi') || normalized.includes('trina') || normalized.includes('canadian') || normalized.includes('wp')) {
      return <SolarPanelSvg size={size} />;
    }
    if (normalized.includes('بطارية') || normalized.includes('ليثيوم') || normalized.includes('جل') || normalized.includes('battery') || normalized.includes('fla') || normalized.includes('tubular') || normalized.includes('ah') || normalized.match(/\b(12v|24v|48v)\b/)) {
      return <LithiumBatterySvg size={size} />;
    }
    if (normalized.includes('عاكس') || normalized.includes('محول') || normalized.includes('inverter') || normalized.includes('انفيرتر') || normalized.includes('ivem') || normalized.includes('viem') || normalized.includes('growatt') || normalized.includes('deye') || normalized.includes('must') || normalized.match(/\bkw\b/) || normalized.match(/\bkva\b/)) {
      return <InverterSvg size={size} />;
    }
    if (normalized.includes('قاطع') || normalized.includes('breaker') || normalized.includes('fuse') || normalized.includes('جوزة')) {
      return <BreakerSvg size={size} />;
    }
    if (normalized.includes('قابلو') || normalized.includes('كيبل') || normalized.includes('سلك') || normalized.includes('cable') || normalized.match(/\b(dc|ac) cable\b/)) {
      return <CableSvg size={size} />;
    }
    if (normalized.includes('موصل') || normalized.includes('mc4') || normalized.includes('connector')) {
      return <ConnectorSvg size={size} />;
    }
    if (normalized.includes('منظم') || normalized.includes('controller') || normalized.includes('شحن') || normalized.includes('mppt') || normalized.includes('pwm')) {
      return <ChargeControllerSvg size={size} />;
    }
    if (normalized.includes('هيكل') || normalized.includes('حديد') || normalized.includes('قاعدة') || normalized.includes('جسر') || normalized.includes('structure') || normalized.includes('mount') || normalized.includes('aluminum')) {
      return <MountingStructureSvg size={size} />;
    }
    if (normalized.includes('صندوق') || normalized.includes('بوكس') || normalized.includes('تجميع') || normalized.includes('box') || normalized.includes('لوحة') || normalized.includes('بورد')) {
      return <CombinerBoxSvg size={size} />;
    }
    if (normalized.includes('مضخة') || normalized.includes('غطاس') || normalized.includes('pump') || normalized.includes('واتر')) {
      return <WaterPumpSvg size={size} />;
    }
    if (normalized.includes('انارة') || normalized.includes('كشاف') || normalized.includes('مصباح') || normalized.includes('light') || normalized.includes('قلوب') || normalized.includes('led')) {
      return <LightSvg size={size} />;
    }
    if (normalized.includes('مولد') || normalized.includes('ديزل') || normalized.includes('generator') || normalized.includes('جنريتر')) {
      return <GeneratorSvg size={size} />;
    }
    if (normalized.includes('عدة') || normalized.includes('اداة') || normalized.includes('tool') || normalized.includes('قطاعة') || normalized.includes('زرادية')) {
      return <ToolSvg size={size} />;
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
