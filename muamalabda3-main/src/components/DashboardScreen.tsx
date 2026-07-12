import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import { 
  TrendingUp, CircleAlert, DollarSign, Users, Wrench, ShieldAlert,
  Calendar, ShoppingBag, ArrowLeftRight, Clock, Landmark, 
  ChevronLeft, Package, Receipt, CalendarDays, AlertTriangle,
  Zap, BadgeDollarSign, Search, Activity
} from 'lucide-react';
import ProductAsset from './ProductAsset';



interface DashboardScreenProps {
  onNavigate: (tab: string) => void;
  permissions: any;
}

export default function DashboardScreen({ onNavigate, permissions }: DashboardScreenProps) {
  const [stats, setStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [globalSearchType, setGlobalSearchType] = useState<'customers'|'products'>('customers');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{customers: any[], products: any[]}>({customers: [], products: []});
  const [bookings, setBookings] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [bankSettlement, setBankSettlement] = useState<any>({ totalMasterCard: 0, totalWithdrawn: 0, remainingBalance: 0 });
  const [unpaidCustomers, setUnpaidCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await api.getDashboardSummary();

      setStats(res.stats || {
        today: { sales: 0, profit: 0 },
        month: { sales: 0, profit: 0 },
        year: { sales: 0, profit: 0 },
        lateInstallmentsCount: 0,
        overdueInstallments: [],
        lowStockAlertsCount: 0,
        lowStockProducts: []
      });
      setInvoices((res.latestInvoices || []).map((x: any) => ({...x, invoiceNumber: x.invoiceNumber || x.invoice_number, customerName: x.customerName || x.customer_name, invoiceType: x.invoiceType || x.invoice_type, finalAmount: x.finalAmount || x.final_amount})));
      setAllCustomers([]); // Removed for performance
      setCustomers(res.latestCustomers || []);
      setAllProducts([]); // Removed for performance
      setLastBackupTime(res.lastBackupTime || null);
      
      setBookings((res.upcomingBookings || []).map((x: any) => ({...x, appointmentDate: x.appointmentDate || x.appointment_date || '0000-00-00', customerName: x.customerName || x.customer_name, assignedTeamName: x.assignedTeamName || x.assigned_team_name, appointmentTime: x.appointmentTime || x.appointment_time})));
      setMaintenance(res.activeMaintenance || []);
      setFaults(res.activeFaults || []);
      setAudits((res.latestAudits || []).map((x: any) => ({...x, affectedRecord: x.affectedRecord || x.affected_record})));

      setBankSettlement(res.bankSettlementSummary || {
        totalMasterCard: 0,
        totalWithdrawn: 0,
        remainingBalance: 0
      });

      // Unpaid customers are now returned from API
      setUnpaidCustomers(res.unpaidCustomers || []);
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!globalSearchQuery.trim()) {
      setSearchResults({ customers: [], products: [] });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.search(globalSearchQuery);
        setSearchResults({ customers: res.customers || [], products: res.products || [] });
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  const handleGlobalSelect = (type: string, id: number) => {
    sessionStorage.setItem('auto_open_' + type, id.toString());
    onNavigate(type);
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center relative overflow-hidden bg-slate-50/30">

        <div className="glass-card p-12 rounded-[3rem] flex flex-col items-center gap-8 relative z-10 shadow-2xl border-white/80">
          <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-500 liquid-icon-wrapper flex items-center justify-center shadow-lg shadow-orange-200/50">
            <Activity className="w-10 h-10 text-white animate-pulse" />
          </div>
          <span className="text-xl text-slate-700 font-black tracking-wide">جاري تجهيز لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6 relative overflow-hidden bg-slate-50/30">

        <div className="glass-card p-12 rounded-[3rem] flex flex-col items-center gap-6 relative z-10 max-w-lg text-center border-rose-100 bg-white/60 shadow-2xl">
          <div className="w-24 h-24 bg-gradient-to-tr from-rose-400 to-red-500 liquid-icon-wrapper-fast flex items-center justify-center shadow-rose-200/50 shadow-xl">
            <AlertTriangle className="w-12 h-12 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="font-black text-2xl text-slate-800 mb-3">حدث خطأ في تحميل البيانات</h2>
            <p className="text-slate-500 mb-8 font-medium">{error}</p>
            <button onClick={loadDashboardData} className="px-10 py-3.5 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold rounded-full shadow-lg shadow-rose-200 hover:shadow-xl hover:-translate-y-1 transition-all">إعادة المحاولة</button>
          </div>
        </div>
      </div>
    );
  }

  const { today, month, year, lateInstallmentsCount, overdueInstallments, lowStockAlertsCount, lowStockProducts } = stats;

  const BackupCountdownWidget = () => {
    if (!permissions?.backups?.view) return null;
    
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
      const updateCountdown = () => {
        const targetTime = lastBackupTime ? new Date(lastBackupTime).getTime() + (3 * 24 * 60 * 60 * 1000) : 0;
        const now = new Date().getTime();
        const diff = targetTime - now;

        if (diff <= 0) {
          setIsOverdue(true);
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        } else {
          setIsOverdue(false);
          setTimeLeft({
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000)
          });
        }
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }, [lastBackupTime]);

    const handleBackup = async () => {
      try {
        const data = await api.downloadBackup();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        toast.success('تمت عملية النسخ الاحتياطي بنجاح وتصفير العداد');
        setLastBackupTime(new Date().toISOString());
      } catch(e) {
        toast.error('فشل في عملية النسخ الاحتياطي');
      }
    };

    return (
      <WidgetCard title="النسخ الاحتياطي" subtitle="نسخ احتياطي إلزامي كل 3 أيام" icon={ShieldAlert} className={`lg:col-span-1 ${isOverdue ? 'ring-2 ring-rose-500 shadow-rose-200/50 bg-rose-50/50' : 'bg-emerald-50/50'}`}>
        <div className="flex flex-col h-full justify-center gap-5 mt-2">
          {!lastBackupTime ? (
             <div className="text-center py-2">
               <span className="text-xs font-bold text-slate-500 block mb-1">لم يتم أخذ أي نسخة سابقاً</span>
               <span className="text-sm font-black text-rose-600 bg-rose-100 px-3 py-1 rounded-full">العداد متوقف، اسحب نسخة للبدء</span>
             </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 sm:gap-2" dir="ltr">
              <div className="flex flex-col items-center">
                <span className={`text-xl font-black font-mono px-2 py-1.5 rounded-lg border shadow-sm ${isOverdue ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-white text-emerald-700 border-emerald-100'}`}>
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Days</span>
              </div>
              <span className="text-lg font-bold text-slate-300 pb-3">:</span>
              <div className="flex flex-col items-center">
                <span className={`text-xl font-black font-mono px-2 py-1.5 rounded-lg border shadow-sm ${isOverdue ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-white text-emerald-700 border-emerald-100'}`}>
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Hrs</span>
              </div>
              <span className="text-lg font-bold text-slate-300 pb-3">:</span>
              <div className="flex flex-col items-center">
                <span className={`text-xl font-black font-mono px-2 py-1.5 rounded-lg border shadow-sm ${isOverdue ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-white text-emerald-700 border-emerald-100'}`}>
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Min</span>
              </div>
              <span className="text-lg font-bold text-slate-300 pb-3">:</span>
              <div className="flex flex-col items-center">
                <span className={`text-xl font-black font-mono px-2 py-1.5 rounded-lg border shadow-sm ${isOverdue ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-white text-emerald-700 border-emerald-100'}`}>
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Sec</span>
              </div>
            </div>
          )}

          <button 
            onClick={handleBackup}
            className={`w-full py-3 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-1 ${isOverdue ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-rose-200 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-200 hover:-translate-y-0.5'}`}
          >
            <Landmark className="w-4 h-4"/>
            {!lastBackupTime ? 'استخراج نسخة أولى!' : isOverdue ? 'استخراج نسخة الآن!' : 'تنزيل نسخة احتياطية يدوياً'}
          </button>
        </div>
      </WidgetCard>
    );
  };

  // -------------------------
  // COMPONENTS
  // -------------------------

  const WidgetCard = ({ title, subtitle, icon: Icon, children, onClick, badge, className="" }: any) => (
    <div onClick={onClick} className={`glass-card rounded-[2.5rem] p-6 sm:p-8 transition-all duration-500 flex flex-col h-full relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-1' : ''} ${className}`}>
       <div className="flex justify-between items-start mb-6 sm:mb-8 relative z-10">
         <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-white border border-white shadow-sm text-slate-700 flex items-center justify-center liquid-icon-wrapper-fast shrink-0">
             <Icon className="w-6 h-6" />
           </div>
           <div>
             <h3 className="font-bold text-base sm:text-lg text-slate-800">{title}</h3>
             <p className="text-[10px] sm:text-xs font-medium text-slate-400 mt-0.5">{subtitle}</p>
           </div>
         </div>
         {badge && <div className="bg-rose-100/90 backdrop-blur-sm border border-rose-200 text-rose-600 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-sm">{badge}</div>}
       </div>
       <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 relative z-10">
         {children}
       </div>
    </div>
  );

  const getTypeBadge = (type: string) => {
    switch(type) {
      case 'cash': return <span className="bg-emerald-100/60 text-emerald-800 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-emerald-200/50 whitespace-nowrap">نقدي</span>;
      case 'partial': return <span className="bg-blue-100/60 text-blue-800 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-blue-200/50 whitespace-nowrap">ذمم</span>;
      case 'installment': return <span className="bg-amber-100/60 text-amber-800 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-amber-200/50 whitespace-nowrap">أقساط</span>;
      case 'mastercard': return <span className="bg-purple-100/60 text-purple-800 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-purple-200/50 whitespace-nowrap">ماستركارد</span>;
      default: return type;
    }
  };

  return (
    <div className="relative min-h-screen p-2 sm:p-6 lg:p-8 font-sans animate-fade-in bg-slate-50/40">


      <div className="relative z-10 max-w-7xl mx-auto space-y-8 sm:space-y-10 pb-12">
        
        {/* ================= GLOBAL SEARCH ================= */}
        {(permissions?.customers?.view || permissions?.products?.view) && (
          <div className="glass-card rounded-[2.5rem] p-2 flex flex-col sm:flex-row items-center gap-2 max-w-3xl mx-auto shadow-xl relative z-50 transition-all focus-within:shadow-2xl focus-within:ring-4 ring-amber-500/10">
            <div className="flex bg-slate-100/60 backdrop-blur-md p-1.5 rounded-full border border-white w-full sm:w-auto">
              {permissions?.customers?.view && (
                <button 
                  onClick={() => { setGlobalSearchType('customers'); setGlobalSearchQuery(''); }} 
                  className={`flex-1 sm:flex-none px-6 py-3 rounded-full text-xs font-black transition-all duration-300 ${globalSearchType === 'customers' ? 'bg-white shadow-md text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  العملاء
                </button>
              )}
              {permissions?.products?.view && (
                <button 
                  onClick={() => { setGlobalSearchType('products'); setGlobalSearchQuery(''); }} 
                  className={`flex-1 sm:flex-none px-6 py-3 rounded-full text-xs font-black transition-all duration-300 ${globalSearchType === 'products' ? 'bg-white shadow-md text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  المنتجات
                </button>
              )}
            </div>
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-amber-500" />
              <input 
                type="text" 
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none py-4 pr-14 pl-6 text-sm focus:ring-0 focus:outline-none placeholder-slate-400 text-slate-800 font-bold"
                placeholder={globalSearchType === 'customers' ? 'ابحث عن عميل (الاسم، رقم الهاتف)...' : 'ابحث عن منتج (الاسم، الماركة، SKU)...'}
              />
              
              {/* Dropdown Results */}
              {globalSearchQuery.trim() !== '' && (
                <div className="absolute top-[calc(100%+16px)] right-0 left-0 glass-card rounded-3xl border border-white shadow-2xl max-h-80 overflow-y-auto custom-scrollbar z-50 p-2">
                  {globalSearchType === 'customers' ? (
                    (() => {
                      const results = searchResults.customers.slice(0, 10);
                      if (results.length === 0) return <div className="p-6 text-center text-xs font-bold text-slate-400">لا يوجد نتائج تطابق بحثك</div>;
                      return results.map(c => (
                        <div key={c.id} onClick={() => handleGlobalSelect('customers', c.id)} className="p-3 hover:bg-white/60 cursor-pointer rounded-2xl mb-1 text-sm flex justify-between items-center transition border border-transparent hover:border-white/80">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100/60 border border-amber-200/50 text-amber-700 rounded-xl flex items-center justify-center font-black shadow-sm">{c.name.charAt(0)}</div>
                            <span className="font-bold text-slate-800">{c.name}</span>
                          </div>
                          <span className="font-mono font-semibold text-slate-500 text-xs bg-slate-100/50 px-3 py-1 rounded-lg">{c.phone}</span>
                        </div>
                      ));
                    })()
                  ) : (
                    (() => {
                      const results = searchResults.products.slice(0, 10);
                      if (results.length === 0) return <div className="p-6 text-center text-xs font-bold text-slate-400">لا يوجد نتائج تطابق بحثك</div>;
                      return results.map(p => {
                        const isSystem = p.notes && p.notes.startsWith('BUNDLE:');
                        return (
                          <div key={p.id} onClick={() => handleGlobalSelect('products', p.id)} className="p-3 hover:bg-white/60 cursor-pointer rounded-2xl mb-1 text-sm flex justify-between items-center transition border border-transparent hover:border-white/80">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200/50 shadow-sm shrink-0">
                                <ProductAsset name={p.name} size={20} />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{p.name}</span>
                                <span className="font-mono font-semibold text-slate-500 text-[10px] mt-0.5">SKU: {p.sku || p.SKU}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="font-black text-amber-600 font-mono text-sm">{formatIQD(p.sellingPrice)}</span>
                              {!isSystem && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${p.quantity <= (p.minStockAlert || 2) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  المتاح: {p.quantity}
                                </span>
                              )}
                              {isSystem && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-purple-100 text-purple-700">
                                  منظومة متكاملة
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= QUICK ACTION CAPSULES ================= */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-5">
          {[
            { id: 'pos', label: 'نقطة البيع', icon: ShoppingBag, gradient: 'bg-gradient-to-br from-violet-400 to-purple-600', show: permissions?.sales?.view },
            { id: 'invoices', label: 'الفواتير', icon: Receipt, gradient: 'bg-gradient-to-br from-sky-400 to-cyan-500', show: permissions?.invoices?.view },
            { id: 'customers', label: 'العملاء', icon: Users, gradient: 'bg-gradient-to-br from-teal-400 to-emerald-500', show: permissions?.customers?.view },
            { id: 'products', label: 'المنتجات', icon: Package, gradient: 'bg-gradient-to-br from-rose-400 to-pink-500', show: permissions?.products?.view },
            { id: 'installments', label: 'الأقساط', icon: CalendarDays, gradient: 'bg-gradient-to-br from-amber-400 to-orange-500', show: permissions?.installments?.view },
            { id: 'installations', label: 'الحجوزات', icon: Calendar, gradient: 'bg-gradient-to-br from-indigo-400 to-blue-500', show: permissions?.installationBookings?.view },
          ].filter(item => item.show).map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="glass-card flex items-center gap-3 px-5 sm:px-8 py-3.5 sm:py-5 rounded-full group hover:-translate-y-1.5 transition-all duration-300 shadow-md hover:shadow-xl border border-white"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${item.gradient} text-white flex items-center justify-center liquid-icon-wrapper-fast shadow-inner`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-black text-slate-700 text-sm group-hover:text-slate-900">{item.label}</span>
            </button>
          ))}
        </div>



        {/* ================= UNIFIED MAIN WIDGETS GRID ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
          
          {/* Backup Widget */}
          <BackupCountdownWidget />

          {/* Bank Settlement */}
          {permissions?.bankSettlement?.viewWidget && (
            <WidgetCard title="الرصيد المتاح" subtitle="رصيد الماستركارد الحالي" icon={Landmark} onClick={() => onNavigate('bankSettlement')} className="lg:col-span-1">
              <div className="flex flex-col h-full justify-center">
                <h2 className="text-3xl sm:text-4xl font-black font-mono text-slate-800 mb-6 tracking-tighter text-center">
                  {formatIQD(bankSettlement.remainingBalance)}
                </h2>
                <div className="flex w-full gap-4">
                  <div className="flex-1 bg-white/40 border border-white/60 rounded-3xl p-4 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">الوارد</span>
                    <span className="font-black text-emerald-600 font-mono text-sm">{formatIQD(bankSettlement.totalMasterCard)}</span>
                  </div>
                  <div className="flex-1 bg-white/40 border border-white/60 rounded-3xl p-4 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">المسحوب</span>
                    <span className="font-black text-rose-600 font-mono text-sm">{formatIQD(bankSettlement.totalWithdrawn)}</span>
                  </div>
                </div>
              </div>
            </WidgetCard>
          )}

          {/* Overdue Installments */}
          {permissions?.installments?.viewWidget && (
            <WidgetCard title="أقساط متأخرة" subtitle="الديون المتأخرة السداد" icon={ShieldAlert} badge={lateInstallmentsCount > 0 ? `${lateInstallmentsCount} قسط` : undefined} onClick={() => onNavigate('installments')}>
              <div className="space-y-3">
                {overdueInstallments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Zap className="w-10 h-10 mb-3 text-emerald-400/50" />
                    <span className="text-sm font-bold">لا توجد أقساط متأخرة</span>
                  </div>
                ) : (
                  overdueInstallments.map((inst: any, idx: number) => (
                    <div key={idx} className="bg-white/40 p-4 rounded-3xl border border-white/60 flex items-center justify-between hover:bg-white/70 transition-all group">
                      <div>
                        <span className="font-bold text-sm text-slate-800 block mb-1">{inst.customerName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">فاتورة: {inst.invoiceNumber}</span>
                      </div>
                      <div className="text-left shrink-0 bg-rose-50/60 p-2.5 rounded-2xl border border-rose-100/50">
                        <span className="text-xs font-black text-rose-700 font-mono block text-center mb-1">{formatIQD(inst.amount)}</span>
                        <span className="text-[9px] text-rose-600 font-bold bg-rose-100/80 px-2 py-0.5 rounded-lg block text-center">{inst.dueDate}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </WidgetCard>
          )}

          {/* Unpaid Debts */}
          {permissions?.customers?.viewWidget && (
            <WidgetCard title="ذمم غير مسددة" subtitle="أرصدة مستحقة على العملاء" icon={BadgeDollarSign} onClick={() => onNavigate('invoices')}>
              <div className="space-y-3">
                {unpaidCustomers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Zap className="w-10 h-10 mb-3 text-emerald-400/50" />
                    <span className="text-sm font-bold">لا توجد ذمم مسجلة</span>
                  </div>
                ) : (
                  unpaidCustomers.map((cust: any, idx: number) => (
                    <div key={idx} className="bg-white/40 p-4 rounded-3xl border border-white/60 flex items-center justify-between hover:bg-white/70 transition-all">
                      <span className="font-bold text-sm text-slate-800">{cust.name}</span>
                      <span className="font-black font-mono text-blue-700 bg-blue-50/60 px-3 py-1.5 rounded-xl border border-blue-100/50 text-sm">{formatIQD(cust.totalDebt)}</span>
                    </div>
                  ))
                )}
              </div>
            </WidgetCard>
          )}
          
          {/* Low Stock */}
          {permissions?.inventory?.viewWidget && (
            <WidgetCard title="تنبيهات المخزون" subtitle="منتجات اقتربت من النفاد" icon={CircleAlert} badge={lowStockAlertsCount > 0 ? `${lowStockAlertsCount} تنبيه` : undefined} onClick={() => onNavigate('products')}>
              <div className="space-y-3">
                {lowStockProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Package className="w-10 h-10 mb-3 text-emerald-400/50" />
                    <span className="text-sm font-bold">المخزون متوفر بالكامل</span>
                  </div>
                ) : (
                  lowStockProducts.map((p: any, idx: number) => (
                    <div key={idx} className="bg-white/40 p-4 rounded-3xl border border-white/60 flex items-center justify-between hover:bg-white/70 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                          <ProductAsset name={p.name} size={24} />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-800 block mb-0.5">{p.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">SKU: {p.sku}</span>
                        </div>
                      </div>
                      <div className="text-left shrink-0 bg-amber-50/60 p-2.5 rounded-2xl border border-amber-100/50">
                        <span className="text-sm font-black text-amber-700 block text-center mb-1">{p.quantity}</span>
                        <span className="text-[9px] font-bold text-amber-600/80 bg-amber-100/80 px-2 py-0.5 rounded-lg block text-center">الحد: {p.minStockAlert}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </WidgetCard>
          )}

          {/* Maintenance & Faults */}
          {(permissions?.maintenance?.viewWidget || permissions?.faults?.viewWidget) && (
            <WidgetCard title="الصيانة والأعطال" subtitle="الطلبات المفتوحة والبلاغات" icon={Wrench} onClick={() => onNavigate('maintenance')}>
              <div className="space-y-4">
                <div className="flex items-center gap-5 bg-white/40 p-5 rounded-[2rem] border border-white/60 hover:bg-white/70 transition-all">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-500 text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl shrink-0 liquid-icon-wrapper shadow-md">
                    {maintenance.length}
                  </div>
                  <div className="flex-1">
                    <span className="text-base font-black text-slate-800 block mb-1">طلبات صيانة</span>
                    <p className="text-[11px] text-slate-500 font-medium">فحص وقائي وزيارات دورية</p>
                  </div>
                  <span className={`text-[10px] font-bold px-4 py-2 rounded-xl border ${maintenance.length > 0 ? 'bg-violet-50/80 text-violet-700 border-violet-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                    {maintenance.length > 0 ? 'قيد المعالجة' : 'مستقرة'}
                  </span>
                </div>
                
                <div className="flex items-center gap-5 bg-white/40 p-5 rounded-[2rem] border border-white/60 hover:bg-white/70 transition-all">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-red-500 text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl shrink-0 liquid-icon-wrapper-fast shadow-md">
                    {faults.length}
                  </div>
                  <div className="flex-1">
                    <span className="text-base font-black text-slate-800 block mb-1">بلاغات أعطال</span>
                    <p className="text-[11px] text-slate-500 font-medium">أعطال بطاريات وألواح</p>
                  </div>
                  <span className={`text-[10px] font-bold px-4 py-2 rounded-xl border ${faults.length > 0 ? 'bg-rose-50/80 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                    {faults.length > 0 ? 'طوارئ فنية' : 'مستقرة'}
                  </span>
                </div>
              </div>
            </WidgetCard>
          )}
          
          {/* Latest Invoices */}
          {permissions?.invoices?.viewWidget && (
            <WidgetCard title="آخر الفواتير" subtitle="أحدث 5 فواتير صادرة في النظام" icon={Receipt} onClick={() => onNavigate('invoices')} className="lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-white">
                      <th className="pb-4 font-bold pr-4">#</th>
                      <th className="pb-4 font-bold">العميل</th>
                      <th className="pb-4 font-bold">النوع</th>
                      <th className="pb-4 font-bold">المبلغ</th>
                      <th className="pb-4 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/50">
                    {invoices.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center font-bold text-slate-400">لا توجد فواتير حديثة</td></tr>
                    ) : (
                      invoices.map((inv: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/40 transition-colors group">
                          <td className="py-4 pr-4 font-mono font-black text-slate-600 text-xs">{inv.invoiceNumber}</td>
                          <td className="py-4 font-black text-slate-800 text-xs">{inv.customerName}</td>
                          <td className="py-4">{getTypeBadge(inv.invoiceType)}</td>
                          <td className="py-4 font-black text-slate-900 font-mono text-sm">{formatIQD(inv.finalAmount)}</td>
                          <td className="py-4">
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border ${
                              inv.status === 'active' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/50' : 'bg-rose-50/80 text-rose-700 border-rose-200/50'
                            }`}>
                              {inv.status === 'active' ? 'مكتمل' : 'ملغاة'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </WidgetCard>
          )}

          {/* Upcoming Bookings */}
          {permissions?.installationBookings?.viewWidget && (
            <WidgetCard title="مواعيد التركيب" subtitle="الحجوزات المجدولة قريباً" icon={CalendarDays} onClick={() => onNavigate('installations')} className="lg:col-span-1">
              <div className="space-y-4">
                {bookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <CalendarDays className="w-10 h-10 mb-3 text-emerald-400/50" />
                    <span className="text-sm font-bold">لا توجد حجوزات مجدولة</span>
                  </div>
                ) : (
                  bookings.map((book: any, idx: number) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-3xl bg-white/40 hover:bg-white/60 border border-white/60 transition-all group">
                      <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl text-white flex flex-col items-center justify-center liquid-icon-wrapper shadow-md shrink-0">
                        <span className="text-xl font-black leading-none">{book.appointmentDate.split('-')[2]}</span>
                        <span className="text-[10px] mt-1.5 font-bold opacity-90 font-mono">{book.appointmentDate.split('-')[1]}</span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-black text-sm text-slate-800 truncate mb-2">{book.customerName}</h4>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                          <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50/80 px-2 py-1 rounded-lg"><Users className="w-3.5 h-3.5"/> {book.assignedTeamName}</span>
                          <span className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1 rounded-lg"><Clock className="w-3.5 h-3.5"/> {book.appointmentTime}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </WidgetCard>
          )}
        </div>

        {/* ================= AUDIT LOGS ================= */}
        {permissions?.auditLogs?.viewWidget && (
          <div className="glass-card rounded-[3rem] p-6 sm:p-10 transition-all duration-500 flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-white border border-slate-200 shadow-sm text-slate-600 flex items-center justify-center liquid-icon-wrapper-fast">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">سجل العمليات الأخير</h3>
                  <p className="text-xs font-medium text-slate-400 mt-1">آخر حركات مسجلة في النظام</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {audits.map((a: any, index: number) => (
                <div key={index} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white/40 border border-white/60 hover:bg-white/70 transition-all text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-amber-700 font-black bg-amber-100/60 px-4 py-1.5 rounded-xl border border-amber-200/50">{a.user}</span>
                    <span className="text-slate-800 font-black">{a.action}</span>
                    <span className="text-slate-600 font-mono font-bold bg-slate-100/60 px-4 py-1.5 rounded-xl border border-slate-200/50">{a.affectedRecord}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-mono font-bold text-[10px] bg-white/50 px-3 py-1.5 rounded-xl">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{a.date} &bull; {a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
