/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { api, setToken } from './api';
import LoginScreen from './components/LoginScreen';
import { Toaster, toast } from 'sonner';

// Lazy loaded screens for better performance and code splitting
const DashboardScreen = React.lazy(() => import('./components/DashboardScreen'));
const CustomersScreen = React.lazy(() => import('./components/CustomersScreen'));
const ProductsScreen = React.lazy(() => import('./components/ProductsScreen'));
const POSScreen = React.lazy(() => import('./components/POSScreen'));
const InvoicesScreen = React.lazy(() => import('./components/InvoicesScreen'));
const InstallmentsScreen = React.lazy(() => import('./components/InstallmentsScreen'));
const MaintenanceScreen = React.lazy(() => import('./components/MaintenanceScreen'));
const InstallationsScreen = React.lazy(() => import('./components/InstallationsScreen'));
const EmployeesScreen = React.lazy(() => import('./components/EmployeesScreen'));
const ReportsScreen = React.lazy(() => import('./components/ReportsScreen'));
const SettingsScreen = React.lazy(() => import('./components/SettingsScreen'));
const BankSettlementScreen = React.lazy(() => import('./components/BankSettlementScreen'));
const ContractsScreen = React.lazy(() => import('./components/ContractsScreen'));

import {
  BarChart3, Users, Package, ShoppingCart, Receipt, Calendar,
  Wrench, ShieldCheck, TrendingUp, Settings, LogOut, Moon, Sun,
  Bell, Building2, UserCircle, AlignRight, X, Landmark, FileSignature
} from 'lucide-react';
import AnwarLogo from './components/AnwarLogo';
import SolarLoader from './components/SolarLoader';
import { THEMES, getTheme } from './theme';

export default function App() {
  const injectPermissions = (parsedUser: any) => {
    if (!parsedUser || !parsedUser.permissions) return parsedUser;
    
    // Auto-inject contracts permission if missing
    if (!parsedUser.permissions.contracts) {
      parsedUser.permissions.contracts = {
        view: true, create: true, edit: true, delete: true, approve: true, export: true, viewWidget: true
      };
    }
    // Auto-inject workerSettlement permission if missing
    if (!parsedUser.permissions.workerSettlement) {
      parsedUser.permissions.workerSettlement = {
        view: false, create: false, edit: false, delete: false, approve: false, export: false, viewWidget: false
      };
    }
    // Auto-inject viewInvoice permission for installationBookings if missing
    if (parsedUser.permissions.installationBookings && parsedUser.permissions.installationBookings.viewInvoice === undefined) {
      parsedUser.permissions.installationBookings.viewInvoice = !!parsedUser.permissions.installationBookings.view;
    }
    // Auto-inject viewWidget for all permissions if missing or explicitly false (force migration for old roles)
    Object.keys(parsedUser.permissions).forEach(key => {
      if (parsedUser.permissions[key].viewWidget !== true) {
        parsedUser.permissions[key].viewWidget = !!parsedUser.permissions[key].view;
      }
    });

    return parsedUser;
  };

  const [token, setTokenState] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(() => {
    try {
      const parsedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (parsedUser) {
        const injected = injectPermissions(parsedUser);
        localStorage.setItem('user', JSON.stringify(injected));
        return injected;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!localStorage.getItem('user'));

  // Theme Manager — only 'cosmic' (dark) and 'light' are used
  const savedTheme = localStorage.getItem('solar_erp_theme');
  const initialTheme = (savedTheme === 'cosmic' || savedTheme === 'light') ? savedTheme : 'cosmic';
  const [themeId, setThemeId] = useState<string>(initialTheme);
  const activeTheme = getTheme(themeId);

  const handleThemeChange = (id: string) => {
    localStorage.setItem('solar_erp_theme', id);
    setThemeId(id);
  };

  // Navigation — persisted in sessionStorage so page reloads keep you on the same tab
  const [activeTab, setActiveTab] = useState<string>(
    () => sessionStorage.getItem('active_tab') || 'dashboard'
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleNavigate = (tab: string) => {
    sessionStorage.setItem('active_tab', tab);
    setActiveTab(tab);
  };

  // Notifications drawer helper
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_alerts') || '[]'); } catch { return []; }
  });
  const shownToastsRef = useRef<Set<number>>(new Set());

  const handleDismissAlert = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = [...dismissedAlerts, id];
    setDismissedAlerts(updated);
    localStorage.setItem('dismissed_alerts', JSON.stringify(updated));
    toast.dismiss(id);
  };

  const handleClearAllAlerts = () => {
    const allIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...dismissedAlerts, ...allIds]));
    setDismissedAlerts(updated);
    localStorage.setItem('dismissed_alerts', JSON.stringify(updated));
    allIds.forEach(id => toast.dismiss(id));
  };

  const checkSession = async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      setToken(savedToken);
      const profile = await api.getMe();
      setUser(profile.user || profile);
    } catch (err) {
      // Stale token
      localStorage.removeItem('token');
      setTokenState(null);
    } finally {
      setLoading(false);
    }
  };

  const loadERPNotifications = async () => {
    if (!token) return;
    try {
      const stats = await api.getSalesProfitStats();
      const list = [];

      if (stats.lowStockAlertsCount > 0) {
        list.push({
          id: 'low_stock_' + stats.lowStockAlertsCount,
          text: `هناك عدد (${stats.lowStockAlertsCount}) موديلات طاقة شمسية شارفت على النفاذ من المخازن!`,
          type: 'alert',
          targetTab: 'products'
        });
      }

      if (stats.lateInstallmentsCount > 0) {
        list.push({
          id: 'late_inst_' + stats.lateInstallmentsCount,
          text: `يوجد (${stats.lateInstallmentsCount}) قسط متجاوز لتاريخ الاستحقاق الواجب سداده!`,
          type: 'warning',
          targetTab: 'installments'
        });
      }

      setNotifications(list);

      // Trigger sonner toast notifications for new alerts
      const currentDismissed = JSON.parse(localStorage.getItem('dismissed_alerts') || '[]');
      list.forEach((n) => {
        if (!shownToastsRef.current.has(n.id) && !currentDismissed.includes(n.id)) {
          toast(n.text, {
            id: n.id,
            description: "اضغط هنا للانتقال إلى الصفحة المعنية ومتابعة التفاصيل.",
            duration: 10000,
            action: {
              label: "انتقال",
              onClick: () => {
                handleNavigate(n.targetTab);
              }
            } as any,
            style: { cursor: 'pointer' }
          });
          shownToastsRef.current.add(n.id);
        }
      });

      // Clear/dismiss stale notifications
      const activeIds = new Set(list.map(n => n.id));
      Array.from(shownToastsRef.current).forEach((id: any) => {
        if (!activeIds.has(id)) {
          toast.dismiss(id);
          shownToastsRef.current.delete(id);
        }
      });
    } catch (err) {
      // benign
    }
  };

  useEffect(() => {
    checkSession();
  }, [token]);

  useEffect(() => {
    if (token && user?.permissions?.reports?.view) {
      loadERPNotifications();
      // Polling removed for performance optimization
      window.addEventListener('refresh_erp_notifications', loadERPNotifications);
      return () => {
        window.removeEventListener('refresh_erp_notifications', loadERPNotifications);
      };
    }
  }, [token, user]);

  // Prefetch most-used screens in background after login for instant navigation
  useEffect(() => {
    if (token && user) {
      const timer = setTimeout(() => {
        if (user.permissions?.customers?.view) import('./components/CustomersScreen');
        if (user.permissions?.products?.view) import('./components/ProductsScreen');
        if (user.permissions?.invoices?.view) import('./components/InvoicesScreen');
        if (user.permissions?.sales?.view) import('./components/POSScreen');
      }, 1500); // Wait 1.5s after login to avoid competing with initial render
      return () => clearTimeout(timer);
    }
  }, [token, user]);

  const handleLoginSuccess = (userProfile: any) => {
    const injected = injectPermissions(userProfile);
    localStorage.setItem('user', JSON.stringify(injected));
    setTokenState(localStorage.getItem('token'));
    setUser(injected);
  };

  const handleLogout = () => {
    toast('هل ترغب بتأكيد تسجيل الخروج من نظام أنوار الإبداع؟', {
      action: {
        label: 'تأكيد',
        onClick: () => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('active_tab');
          setToken('');
          setTokenState(null);
          setUser(null);
          setActiveTab('dashboard');
        },
      },
      cancel: {
        label: 'إلغاء',
        onClick: () => { },
      },
    });
  };

  // Enforce access control on the active tab
  useEffect(() => {
    if (user && user.permissions) {
      const perms = user.permissions;
      const accessMap: Record<string, boolean> = {
        dashboard: !!perms?.dashboard?.view,
        customers: !!perms?.customers?.view,
        products: !!perms?.products?.view,
        pos: !!perms?.sales?.view,
        invoices: !!perms?.invoices?.view,
        contracts: !!perms?.contracts?.view,
        bankSettlement: !!perms?.bankSettlement?.view,
        installments: !!perms?.installments?.view,
        maintenance: !!(perms?.maintenance?.view || perms?.faults?.view),
        installations: !!(perms?.installationBookings?.view || perms?.installationTeams?.view),
        employees: !!perms?.employees?.view,
        reports: !!(perms?.reports?.view || perms?.backups?.view || perms?.auditLogs?.view),
        settings: !!perms?.settings?.view,
      };

      if (!accessMap[activeTab]) {
        const firstAllowed = Object.keys(accessMap).find(k => accessMap[k]);
        if (firstAllowed) {
          handleNavigate(firstAllowed);
        }
      }
    }
  }, [user, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans overflow-hidden">
        <SolarLoader size={130} />
        <span className="text-amber-500 text-sm mt-4 font-black tracking-wide animate-pulse">أنوار الإبداع</span>
        <span className="text-slate-400 text-xs mt-1.5 font-bold">جاري مراجعة شهادات التشفير وفحص الاتصال بالمقر الفرعي...</span>
      </div>
    );
  }

  // Not logged in -> Show Login
  if (!token || !user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const { permissions } = user;

  // Sidebar link details matching requirements
  const menuItems = [
    { id: 'dashboard', name: 'لوحة التحكم', icon: BarChart3, show: permissions?.dashboard?.view },
    { id: 'customers', name: 'العملاء', icon: Users, show: permissions?.customers?.view },
    { id: 'products', name: 'المنتجات والأسعار', icon: Package, show: permissions?.products?.view },
    { id: 'pos', name: 'نقطة البيع', icon: ShoppingCart, show: permissions?.sales?.view },
    { id: 'invoices', name: 'الفواتير', icon: Receipt, show: permissions?.invoices?.view },
    { id: 'contracts', name: 'العقود', icon: FileSignature, show: !!permissions?.contracts?.view },
    { id: 'bankSettlement', name: 'تسوية الماستركارد', icon: Landmark, show: permissions?.bankSettlement?.view },
    { id: 'installments', name: 'الأقساط والديون', icon: Calendar, show: permissions?.installments?.view },
    { id: 'maintenance', name: 'الصيانة والأعطال', icon: Wrench, show: (permissions?.maintenance?.view || permissions?.faults?.view) },
    { id: 'installations', name: 'الحجوزات والتركيب', icon: Calendar, show: (permissions?.installationBookings?.view || permissions?.installationTeams?.view) },
    { id: 'employees', name: 'الموظفين والصلاحيات', icon: ShieldCheck, show: permissions?.employees?.view },
    { id: 'reports', name: 'التقارير والأمان', icon: TrendingUp, show: !!(permissions?.reports?.view || permissions?.backups?.view || permissions?.auditLogs?.view) },
    { id: 'settings', name: 'الإعدادات', icon: Settings, show: permissions?.settings?.view },
  ];

  const activeLinkName = menuItems.find(item => item.id === activeTab)?.name || '';

  return (
    <div
      data-theme={activeTheme.isDark ? 'dark' : 'light'}
      className={`min-h-screen ${activeTheme.bgClass} flex font-sans leading-normal`}
      dir="rtl"
    >
      {/* Background Liquid Blobs (Global) */}
      <div className="liquid-bg-1"></div>
      <div className="liquid-bg-2"></div>
      <div className="liquid-bg-3"></div>

      {/* 1. SIDEBAR NAVIGATION WRAPPER */}
      <aside className={`fixed inset-y-0 right-0 z-40 ${activeTheme.sidebarClass} w-64 border-l flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>

        {/* Brand details */}
        <div>
          <div className={`p-5 border-b ${activeTheme.sidebarDivider} flex items-center justify-between`}>
            <div className="flex items-center justify-center flex-1 py-1">
              <img
                src={activeTheme.isDark ? "/images/anwar-logo.png" : "/images/anwar-logo-dark.png"}
                alt="Logo"
                className="h-16 w-full object-contain drop-shadow-md"
              />
            </div>

            {/* Mobile close sidebar */}
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links navigation list */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[70vh]">
            {menuItems.map((item) => {
              if (!item.show) return null;
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { handleNavigate(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                  className={`w-full text-right p-3 rounded-xl text-xs font-bold transition flex items-center gap-3 ${active
                      ? activeTheme.sidebarItemActive
                      : `${activeTheme.sidebarTextInactive} ${activeTheme.sidebarItemHover}`
                    }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? 'text-inherit' : 'opacity-65'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile capsule and logout */}
        <div className={`p-4 border-t ${activeTheme.sidebarDivider} bg-black/10`}>
          <div className={`flex items-center justify-between ${activeTheme.sidebarProfile} p-2.5 rounded-xl border`}>
            <div className="flex items-center gap-2 min-w-0">
              <UserCircle className="w-8 h-8 text-slate-400 shrink-0" />
              <div className="min-w-0 text-right">
                <div className="text-xs font-extrabold truncate">{user.username}</div>
                <div className="text-[9px] opacity-70 truncate mt-0.5">{user.position}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded bg-black/30 hover:bg-black/50 transition"
              title="تسجيل الخروج الآمن"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

      </aside>

      {/* 2. CHOOSE CORRESPONDING MAIN SCREEN AREA */}
      <div className="flex-1 flex flex-col min-w-0 lg:pr-64">

        {/* Main top dashboard bar */}
        <header className={`sticky top-0 z-30 ${activeTheme.headerClass} py-3.5 px-4 md:px-6 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 bg-slate-100/10 rounded-xl text-inherit"
            >
              <AlignRight className="w-5 h-5" />
            </button>
            <h2 className="font-extrabold text-sm hidden sm:block">
              {activeLinkName}
            </h2>
          </div>

          <div className="flex items-center gap-3 relative">

            {/* DAY/NIGHT THEME SEGMENTED TOGGLE */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${activeTheme.isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/50 border-slate-200/60'
              }`}>
              {/* Day Button */}
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 ${!activeTheme.isDark
                    ? 'bg-white text-amber-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
                title="تفعيل المظهر النهاري"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">نهاري</span>
              </button>

              {/* Night Button */}
              <button
                onClick={() => handleThemeChange('cosmic')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 ${activeTheme.isDark
                    ? 'bg-slate-800 text-amber-400 shadow-xs border border-slate-700/50'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
                title="تفعيل المظهر الليلي"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">ليلي</span>
              </button>
            </div>

            {/* Quick alert indicator block and notifications popup */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl relative transition ${activeTheme.isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                title="تنبيهات حالة المستودعات والذمم"
              >
                <Bell className="w-4 h-4" />
                {notifications.filter(n => !dismissedAlerts.includes(n.id)).length > 0 && (
                  <span className="absolute -top-1 -left-1 bg-rose-500 text-white font-mono text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold animate-pulse">
                    {notifications.filter(n => !dismissedAlerts.includes(n.id)).length}
                  </span>
                )}
              </button>

              {/* Notification overlay drawer */}
              {showNotifications && (
                <div className={`absolute left-0 mt-2.5 w-[90vw] sm:w-80 max-w-[320px] rounded-2xl shadow-xl overflow-hidden z-50 text-xs border ${activeTheme.isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                  }`}>
                  <div className={`p-3 flex justify-between items-center ${activeTheme.isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-800 text-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-[11px]">التنبيهات</span>
                      {notifications.filter(n => !dismissedAlerts.includes(n.id)).length > 0 && (
                        <button onClick={handleClearAllAlerts} className="text-[10px] text-amber-500 hover:text-amber-400 font-semibold transition">حذف الكل</button>
                      )}
                    </div>
                    <button onClick={() => setShowNotifications(false)} className="text-[10px] text-slate-400 hover:text-white font-semibold">إغلاق</button>
                  </div>
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {notifications.filter(n => !dismissedAlerts.includes(n.id)).length === 0 ? (
                      <p className="p-5 text-slate-400 text-center italic">لا توجد تنبيهات حالياً.</p>
                    ) : (
                      notifications.filter(n => !dismissedAlerts.includes(n.id)).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (n.targetTab) {
                              handleNavigate(n.targetTab);
                              setShowNotifications(false);
                            }
                          }}
                          className={`p-3 leading-snug transition cursor-pointer flex justify-between items-start gap-3 ${activeTheme.isDark
                              ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                              : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900'
                            }`}
                        >
                          <span className="flex-1">{n.text}</span>
                          <button
                            onClick={(e) => handleDismissAlert(e, n.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition shrink-0"
                            title="إخفاء هذا التنبيه"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>


          </div>
        </header>

        {/* 3. DYNAMICALLY LOADED SCREEN */}
        <main className="p-4 md:p-6 lg:p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto relative">
          <React.Suspense fallback={
            <div className="w-full h-full flex flex-col gap-4">
              <div className="w-1/3 h-8 skeleton"></div>
              <div className="w-full h-48 skeleton"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-32 skeleton"></div>
                <div className="h-32 skeleton"></div>
                <div className="h-32 skeleton"></div>
              </div>
            </div>
          }>
            {activeTab === 'dashboard' && permissions?.dashboard?.view && <DashboardScreen onNavigate={handleNavigate} permissions={permissions} />}
            {activeTab === 'customers' && permissions?.customers?.view && <CustomersScreen permissions={permissions} />}
            {activeTab === 'products' && permissions?.products?.view && <ProductsScreen permissions={permissions} />}
            {activeTab === 'pos' && permissions?.sales?.view && <POSScreen permissions={permissions} user={user} onInvoiceCreated={loadERPNotifications} isDarkTheme={activeTheme.isDark} />}
            {activeTab === 'invoices' && permissions?.invoices?.view && <InvoicesScreen permissions={permissions} />}
            {activeTab === 'contracts' && permissions?.contracts?.view && <ContractsScreen permissions={permissions} />}
            {activeTab === 'bankSettlement' && permissions?.bankSettlement?.view && <BankSettlementScreen permissions={permissions} user={user} />}
            {activeTab === 'installments' && permissions?.installments?.view && <InstallmentsScreen permissions={permissions} />}
            {activeTab === 'maintenance' && (permissions?.maintenance?.view || permissions?.faults?.view) && <MaintenanceScreen permissions={permissions} />}
            {activeTab === 'installations' && (permissions?.installationBookings?.view || permissions?.installationTeams?.view) && <InstallationsScreen permissions={permissions} currentUser={user} />}
            {activeTab === 'employees' && permissions?.employees?.view && <EmployeesScreen permissions={permissions} currentUser={user} />}
            {activeTab === 'reports' && (permissions?.reports?.view || permissions?.backups?.view || permissions?.auditLogs?.view) && <ReportsScreen onNavigate={handleNavigate} permissions={permissions} />}
            {activeTab === 'settings' && permissions?.settings?.view && <SettingsScreen />}
          </React.Suspense>
        </main>

      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-left"
        dir="rtl"
        richColors
        closeButton
        duration={3000}
        toastOptions={{
          className: 'font-sans text-sm',
          style: {
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
        }}
      />
    </div>
  );
}
