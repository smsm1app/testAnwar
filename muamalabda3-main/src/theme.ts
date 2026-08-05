/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThemeConfig {
  id: string;
  name: string;
  desc: string;
  isDark: boolean;

  // Outer Shell
  bgClass: string;
  sidebarClass: string;
  sidebarDivider: string;
  sidebarProfile: string;

  // Brand Logo
  brandBg: string;
  brandText: string;

  // Sidebar Items
  sidebarItemActive: string;
  sidebarItemHover: string;
  sidebarTextActive: string;
  sidebarTextInactive: string;

  // Master Header
  headerClass: string;
  headerText: string;
  headerBadge: string;

  // Primary buttons and highlights across screens
  accentText: string;
  accentBg: string;
  accentHoverBg: string;
  accentRing: string;
}

export const THEMES: ThemeConfig[] = [
  // ── PREMIUM DARK THEME ─────────────────────────────────────────────
  {
    id: 'cosmic',
    name: 'الوضع الليلي (احترافي)',
    desc: 'خلفية داكنة فاخرة مريحة للعين',
    isDark: true,
    bgClass: 'bg-slate-950 text-slate-100',
    sidebarClass: 'bg-slate-900/50 backdrop-blur-xl text-slate-100 border-white/5',
    sidebarDivider: 'border-white/5',
    sidebarProfile: 'bg-slate-950/50 border-white/5',
    brandBg: 'bg-transparent',
    brandText: 'text-white',
    sidebarItemActive: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]',
    sidebarItemHover: 'hover:bg-white/5 hover:text-white',
    sidebarTextActive: 'text-amber-500',
    sidebarTextInactive: 'text-slate-400',
    headerClass: 'bg-slate-950/80 backdrop-blur-lg border-b border-white/5 text-slate-100',
    headerText: 'text-slate-100',
    headerBadge: 'bg-slate-800 text-amber-500 border-white/5',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500',
    accentHoverBg: 'bg-amber-400',
    accentRing: 'focus:ring-amber-500/50',
  },

  // ── PREMIUM LIGHT THEME ────────────────────────────────────────────
  {
    id: 'light',
    name: 'الوضع النهاري (نظيف)',
    desc: 'واجهة بيضاء مريحة ونظيفة للعمل النهاري',
    isDark: false,
    bgClass: 'bg-slate-50 text-slate-900',
    sidebarClass: 'bg-white text-slate-700 border-slate-200 shadow-sm',
    sidebarDivider: 'border-slate-100',
    sidebarProfile: 'bg-slate-50 border-slate-100',
    brandBg: 'bg-transparent',
    brandText: 'text-slate-900',
    sidebarItemActive: 'bg-amber-500 text-slate-950 font-bold border-transparent shadow-md',
    sidebarItemHover: 'hover:bg-slate-100 hover:text-slate-900',
    sidebarTextActive: 'text-slate-950',
    sidebarTextInactive: 'text-slate-500',
    headerClass: 'bg-white border-b border-slate-200 text-slate-900 shadow-sm',
    headerText: 'text-slate-900',
    headerBadge: 'bg-slate-100 text-slate-600 border-slate-200',
    accentText: 'text-amber-600',
    accentBg: 'bg-amber-500',
    accentHoverBg: 'bg-amber-600',
    accentRing: 'focus:ring-amber-500',
  },
];

export function getTheme(id: string | null): ThemeConfig {
  return THEMES.find(t => t.id === id) || THEMES[0];
}
