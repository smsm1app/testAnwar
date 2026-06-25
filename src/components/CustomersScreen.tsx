/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { IRAQ_GEOGRAPHY } from '../iraqGeography';
import { toast } from 'sonner';
import {
  Users, UserPlus, Search, Phone, MapPin, Eye, Edit2, Trash2,
  X, Receipt, Calendar, Wrench, ShieldAlert, Heart, ClipboardCheck, CreditCard
} from 'lucide-react';

interface CustomersScreenProps {
  permissions: any;
}

const parseJsonArray = (val: any): any[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error("Failed to parse JSON array:", e);
    }
  }
  return [];
};

function CustomersScreen({ permissions }: CustomersScreenProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Form states (Save/Edit Customer)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    secondaryPhone: '',
    address: '',
    mapsLink: '',
    gpsCoords: '',
    notes: ''
  });

  const [addrGov, setAddrGov] = useState('بغداد');
  const [addrDistrict, setAddrDistrict] = useState('الكرخ');
  const [addrRegion, setAddrRegion] = useState('');

  // Profile View state
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'info' | 'invoices' | 'installments' | 'maintenance' | 'installations' | 'debt'>('info');
  const [profileLoading, setProfileLoading] = useState(false);

  const loadCustomers = async (currentPage = page, currentSearch = searchQuery) => {
    try {
      setLoading(true);
      const res = await api.getCustomers(currentPage, limit, currentSearch).catch(() => ({ data: [], total: 0 }));
      if (res.data) {
        setCustomers(res.data);
        setTotalCount(res.total);
      } else {
        setCustomers(res);
      }
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل قائمة العملاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadCustomers(1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const autoOpenId = sessionStorage.getItem('auto_open_customers');
    if (autoOpenId) {
      handleViewProfile(parseInt(autoOpenId));
      sessionStorage.removeItem('auto_open_customers');
    }
  }, []);

  const handleOpenForm = (customer: any = null) => {
    if (customer) {
      setEditingId(customer.id);
      
      // Parse address
      const addressStr = customer.address || '';
      const parts = addressStr.split(' - ');
      let gov = '';
      let dist = '';
      let region = addressStr;

      if (parts.length >= 3) {
        const gTest = parts[0].trim();
        const dTest = parts[1].trim();
        if (IRAQ_GEOGRAPHY[gTest]) {
          gov = gTest;
          dist = dTest;
          region = parts.slice(2).join(' - ').trim();
        }
      } else {
        // Fallback fuzzy match
        for (const g of Object.keys(IRAQ_GEOGRAPHY)) {
          if (addressStr.startsWith(g)) {
            gov = g;
            const remaining = addressStr.substring(g.length).replace(/^[-\s,،]+/, '').trim();
            for (const d of IRAQ_GEOGRAPHY[g]) {
              if (remaining.startsWith(d)) {
                dist = d;
                region = remaining.substring(d.length).replace(/^[-\s,،]+/, '').trim();
                break;
              }
            }
            break;
          }
        }
      }

      setAddrGov(gov || 'بغداد');
      setAddrDistrict(dist || (IRAQ_GEOGRAPHY[gov || 'بغداد']?.[0] || 'الكرخ'));
      setAddrRegion(region);

      setFormData({
        name: customer.name,
        phone: customer.phone,
        secondaryPhone: customer.secondaryPhone || '',
        address: customer.address,
        mapsLink: customer.mapsLink || '',
        gpsCoords: customer.gpsCoords || '',
        notes: customer.notes || ''
      });
    } else {
      setEditingId(null);
      setAddrGov('بغداد');
      setAddrDistrict('الكرخ');
      setAddrRegion('');
      setFormData({
        name: '',
        phone: '',
        secondaryPhone: '',
        address: '',
        mapsLink: '',
        gpsCoords: '',
        notes: ''
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !addrRegion.trim()) {
      toast.error('يرجى ملء الحقول الرئيسية: الاسم، رقم الهاتف، والمنطقة بالتفصيل');
      return;
    }

    const combinedAddress = `${addrGov} - ${addrDistrict} - ${addrRegion.trim()}`;
    const payload = {
      ...formData,
      address: combinedAddress
    };

    try {
      setActionLoading(true);
      if (editingId) {
        if (!permissions.customers.edit) {
          toast.error('عذراً، لا تملك صلاحية تعديل بيانات العملاء');
          setActionLoading(false);
          return;
        }
        const updatedCustomer = await api.updateCustomer(editingId, payload);
        setCustomers(prev => prev.map(c => c.id === editingId ? updatedCustomer : c));
      } else {
        if (!permissions.customers.create) {
          toast.error('عذراً، لا تملك صلاحية إضافة عملاء جدد');
          setActionLoading(false);
          return;
        }
        const newCustomer = await api.createCustomer(payload);
        setCustomers(prev => [...prev, newCustomer]);
      }
      handleCloseForm();
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ بيانات العميل');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!permissions.customers.delete) {
      toast.error('عذراً، لا تملك صلاحية حذف العملاء');
      return;
    }
    toast(`هل أنت متأكد من حذف العميل "${name}" ناعماً من النظام؟ ستبقى الفواتير والمستندات باسمه في السجلات التاريخية.`, {
      action: {
        label: 'تأكيد',
        onClick: async () => {
          try {
            await api.deleteCustomer(id);
            setCustomers(prev => prev.filter(c => c.id !== id));
            if (selectedProfileId === id) setSelectedProfileId(null);
            toast.success('تم الحذف بنجاح');
          } catch (err: any) {
            toast.error(err.message || 'أخفق تنفيذ الحذف');
          }
        },
      },
      cancel: {
        label: 'إلغاء',
        onClick: () => {},
      },
    });
  };

  const handleViewProfile = async (id: number) => {
    try {
      setProfileLoading(true);
      setSelectedProfileId(id);
      const res = await api.getCustomerProfile(id);
      setProfileData(res);
      setActiveProfileTab('info');
    } catch (err: any) {
      toast.error(err.message || 'أخفق استرجاع الملف التاريخي للعميل');
      setSelectedProfileId(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const filteredCustomers = customers; // filtering handled server-side

  return (
    <div className="space-y-8 animate-fade-in relative z-10 pb-12 max-w-7xl mx-auto">
      
      {/* Title block with Customer count and Quick Add */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-3xl flex items-center justify-center shadow-lg shadow-teal-200/50 liquid-icon-wrapper shrink-0">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">إدارة العملاء والمشتركين</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium">سجلات العملاء، الذمم المالية، طلبات الصيانة والفواتير المرتبطة بكل عميل.</p>
          </div>
        </div>
        {permissions.customers.create && (
          <button 
            onClick={() => handleOpenForm()} 
            className="w-full lg:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-200 hover:shadow-xl hover:-translate-y-1"
          >
            <UserPlus className="w-5 h-5" />
            <span>إضافة عميل جديد</span>
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="glass-card p-4 rounded-[2rem] shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-amber-500 pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none shadow-inner transition-all text-slate-800 placeholder-slate-400"
            placeholder="ابحث عن عميل (الاسم، الهاتف، العنوان)..."
          />
        </div>
        <button onClick={loadCustomers} className="px-6 py-3.5 bg-slate-100/80 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all border border-slate-200 whitespace-nowrap">
          تحديث القائمة
        </button>
      </div>

      {/* CUSTOMERS GRID & LIST */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm font-bold flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري تحميل قائمة العملاء...</span>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="glass-card text-center py-16 rounded-[2.5rem] shadow-sm text-slate-400 font-bold text-lg">
          لا يوجد أي عملاء يطابقون خيارات البحث الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="glass-card rounded-[2rem] shadow-lg p-6 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group overflow-hidden relative">
              
              <div className="absolute -left-10 -top-10 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl group-hover:bg-teal-400/20 transition-all pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-500 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-md shrink-0">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 leading-tight">{customer.name}</h3>
                      <span className="text-[10px] bg-slate-100/80 text-slate-600 px-2.5 py-1 rounded-lg mt-1 inline-block font-mono font-bold">ID: {customer.id}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleViewProfile(customer.id)} 
                      title="عرض الملف الكامل" 
                      className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 rounded-xl transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {permissions.customers.edit && (
                      <button 
                        onClick={() => handleOpenForm(customer)} 
                        title="تعديل البيانات" 
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-xl transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {permissions.customers.delete && (
                      <button 
                        onClick={() => handleDelete(customer.id, customer.name)} 
                        title="حذف" 
                        className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mt-6 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-3 bg-white/40 p-2.5 rounded-xl border border-white">
                    <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-mono text-slate-800 font-bold text-sm tracking-wide">{customer.phone}</span>
                    {customer.secondaryPhone && (
                      <span className="text-slate-400 font-mono"> / {customer.secondaryPhone}</span>
                    )}
                  </div>
                  <div className="flex items-start gap-3 bg-white/40 p-2.5 rounded-xl border border-white">
                    <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed text-slate-700">{customer.address}</span>
                  </div>
                </div>
              </div>

              {customer.notes && (
                <div className="mt-4 pt-4 border-t border-slate-100/50 relative z-10">
                  <p className="text-[11px] text-slate-400 line-clamp-1 italic font-medium">
                    * ملاحظات: {customer.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalCount > limit && (
        <div className="flex items-center justify-between p-4 border-t border-white/40 glass-card rounded-[2rem] shadow-sm">
          <span className="text-xs text-slate-500 font-bold px-4">
            عرض {(page - 1) * limit + 1} إلى {Math.min(page * limit, totalCount)} من {totalCount} عميل
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => { setPage(p => p - 1); loadCustomers(page - 1, searchQuery); }} 
              disabled={page === 1}
              className="px-4 py-2 bg-white/50 text-slate-700 font-bold text-xs rounded-xl hover:bg-white disabled:opacity-50 transition-colors border border-white"
            >
              السابق
            </button>
            <button 
              onClick={() => { setPage(p => p + 1); loadCustomers(page + 1, searchQuery); }} 
              disabled={page * limit >= totalCount}
              className="px-4 py-2 bg-white/50 text-slate-700 font-bold text-xs rounded-xl hover:bg-white disabled:opacity-50 transition-colors border border-white"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* ADD/EDIT CLIENT DRAWER MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-[95%] max-w-2xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900/90 text-slate-100 px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h3 className="font-black text-lg flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5 text-amber-500"/> : <UserPlus className="w-5 h-5 text-amber-500"/>}
                {editingId ? 'تعديل سجل المشترك' : 'إضافة مشترك جديد'}
              </h3>
              <button onClick={handleCloseForm} className="p-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar bg-white/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل للمشترك <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/80 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none transition-all"
                    placeholder="مثال: م. علي صالح الشمري"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">رقم الموبايل الأساسي <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white/80 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 text-sm font-mono font-bold text-slate-800 shadow-sm focus:outline-none transition-all text-right"
                    placeholder="077XXXXXXXX"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">رقم موبايل بديل</label>
                  <input
                    type="text"
                    value={formData.secondaryPhone}
                    onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                    className="w-full bg-white/80 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 text-sm font-mono font-bold text-slate-800 shadow-sm focus:outline-none transition-all text-right"
                    placeholder="رقم الزوجة أو الأخ الفحص"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">المحافظة <span className="text-rose-500">*</span></label>
                  <select
                    value={addrGov}
                    onChange={(e) => {
                      const newGov = e.target.value;
                      setAddrGov(newGov);
                      setAddrDistrict(IRAQ_GEOGRAPHY[newGov]?.[0] || '');
                    }}
                    className="w-full bg-white/80 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none transition-all"
                    required
                  >
                    {Object.keys(IRAQ_GEOGRAPHY).map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">القضاء <span className="text-rose-500">*</span></label>
                  <select
                    value={addrDistrict}
                    onChange={(e) => setAddrDistrict(e.target.value)}
                    className="w-full bg-white/80 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none transition-all"
                    required
                  >
                    {(IRAQ_GEOGRAPHY[addrGov] || []).map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">المنطقة والحي بالتفصيل <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={addrRegion}
                    onChange={(e) => setAddrRegion(e.target.value)}
                    className="w-full bg-white/80 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none transition-all"
                    placeholder="مثال: حي تونس، زقاق 21، قرب جامع الغفور"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">موقع خرائط غوغل (Maps)</label>
                  <input
                    type="url"
                    value={formData.mapsLink}
                    onChange={(e) => setFormData({ ...formData, mapsLink: e.target.value })}
                    className="w-full bg-white/80 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 text-sm font-mono text-slate-800 shadow-sm focus:outline-none transition-all"
                    placeholder="https://maps.google.com/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">إحداثيات GPS</label>
                  <input
                    type="text"
                    value={formData.gpsCoords}
                    onChange={(e) => setFormData({ ...formData, gpsCoords: e.target.value })}
                    className="w-full bg-white/80 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 text-sm font-mono text-slate-800 shadow-sm focus:outline-none transition-all"
                    placeholder="33.3154, 44.4251"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات وحيز التوصيل</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-white/80 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl p-3.5 text-sm font-medium text-slate-800 shadow-sm focus:outline-none transition-all h-28 resize-none"
                    placeholder="تثبيت أي معلومات تهم السداد والموقع..."
                  />
                </div>
              </div>
              
              <div className="flex gap-4 justify-end pt-6 border-t border-white/50">
                <button type="button" onClick={handleCloseForm} disabled={actionLoading} className="px-6 py-3.5 bg-slate-100/80 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl font-bold transition-all disabled:opacity-50">إلغاء الأمر</button>
                <button type="submit" disabled={actionLoading} className="px-8 py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-200 transition-all disabled:opacity-50 flex items-center gap-2">
                  {actionLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ بيانات المشترك</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL CUSTOMER PROFILE MODAL DRAWER */}
      {selectedProfileId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full md:w-[700px] lg:w-[900px] xl:w-[1000px] bg-slate-900/95 backdrop-blur-xl h-[90vh] md:h-[85vh] rounded-3xl shadow-2xl flex flex-col justify-between relative overflow-hidden border border-white/10">
            
            {/* Header profile */}
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 p-6 flex items-center justify-between shrink-0 border-b border-slate-800">
              {profileLoading || !profileData ? (
                <div className="text-slate-400 text-sm font-bold flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري بناء الملف الموحد...</span>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg md:text-xl font-black flex items-center gap-3">
                    <Heart className="w-6 h-6 text-rose-500 animate-pulse fill-rose-500" />
                    الملف الشامل: <span className="text-amber-400">{profileData.customer?.name || 'غير معروف'}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">سجل المشتريات والديون والخدمات الفنية.</p>
                </div>
              )}
              <button 
                onClick={() => {
                  setSelectedProfileId(null);
                  setProfileData(null);
                }} 
                className="p-2.5 bg-slate-800/80 hover:bg-rose-500 text-slate-400 hover:text-white rounded-full transition-all duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content Router with Tabs */}
            {profileLoading || !profileData ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50/50">
                <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-slate-500 font-bold">جاري تحميل البيانات الفنية والمالية...</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden bg-white/40">
                
                {/* Navigation Tabs */}
                <div className="flex border-b border-white/60 bg-white/50 p-2 overflow-x-auto gap-2 shrink-0 custom-scrollbar">
                  <button 
                    onClick={() => setActiveProfileTab('info')}
                    className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
                      activeProfileTab === 'info' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <Users className="w-4 h-4" /> بيانات الاتصال
                  </button>
                  <button 
                    onClick={() => setActiveProfileTab('debt')}
                    className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
                      activeProfileTab === 'debt' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> كشف الذمم والديون
                  </button>
                  <button 
                    onClick={() => setActiveProfileTab('invoices')}
                    className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
                      activeProfileTab === 'invoices' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <Receipt className="w-4 h-4" /> الفواتير ({profileData.invoices?.length || 0})
                  </button>
                  <button 
                    onClick={() => setActiveProfileTab('installments')}
                    className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
                      activeProfileTab === 'installments' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <Calendar className="w-4 h-4" /> الأقساط ({profileData.installments?.length || 0})
                  </button>
                  <button 
                    onClick={() => setActiveProfileTab('maintenance')}
                    className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
                      activeProfileTab === 'maintenance' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <Wrench className="w-4 h-4" /> الأعطال ({(profileData.maintenance?.length || 0) + (profileData.faults?.length || 0)})
                  </button>
                  <button 
                    onClick={() => setActiveProfileTab('installations')}
                    className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all duration-300 whitespace-nowrap ${
                      activeProfileTab === 'installations' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4" /> مواعيد التركيب ({profileData.installations?.length || 0})
                  </button>
                </div>

                {/* Tab content screens */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                  
                  {activeProfileTab === 'debt' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="border-b border-white/50 pb-4">
                        <h4 className="font-black text-slate-800 text-base">كشف حسابات الذمم المالية</h4>
                        <p className="text-xs text-slate-500 mt-1 font-medium">ملخص المبالغ والديون المتبقية والمستددة للفواتير الجزئية.</p>
                      </div>
                      {(() => {
                        const partialInvoices = (profileData.invoices || []).filter((i: any) => i && i.invoiceType === 'partial');
                        const totalDebt = partialInvoices.reduce((sum: number, i: any) => sum + (i?.finalAmount || 0), 0);
                        const totalRemaining = partialInvoices.reduce((sum: number, i: any) => sum + (i?.remainingAmount || 0), 0);
                        const totalPaid = totalDebt - totalRemaining;

                        return (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-center">
                              <div className="bg-white/60 p-5 rounded-3xl border border-white shadow-sm transition-all hover:bg-white/80">
                                <div className="text-slate-500 text-[11px] mb-2 font-black uppercase">إجمالي الذمم التراكمية</div>
                                <div className="text-xl md:text-2xl font-black font-mono text-slate-900">{formatIQD(totalDebt)}</div>
                              </div>
                              <div className="bg-emerald-50/60 p-5 rounded-3xl border border-emerald-100 shadow-sm transition-all hover:bg-emerald-50/80">
                                <div className="text-emerald-700 text-[11px] mb-2 font-black uppercase">المبالغ المسددة</div>
                                <div className="text-xl md:text-2xl font-black font-mono text-emerald-800">{formatIQD(totalPaid)}</div>
                              </div>
                              <div className="bg-rose-50/60 p-5 rounded-3xl border border-rose-100 shadow-sm transition-all hover:bg-rose-50/80">
                                <div className="text-rose-700 text-[11px] mb-2 font-black uppercase">صافي المتبقي للذمة</div>
                                <div className="text-xl md:text-2xl font-black font-mono text-rose-800">{formatIQD(totalRemaining)}</div>
                              </div>
                            </div>

                            {partialInvoices.length === 0 ? (
                              <div className="text-center py-12 text-slate-400 text-sm font-bold bg-white/40 rounded-[2rem] border border-white shadow-sm">
                                لا توجد فواتير ذمم مسجلة لهذا المشترك.
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {partialInvoices.map((inv: any) => {
                                  if (!inv) return null;
                                  return (
                                    <div key={inv.id} className="bg-white/60 border border-white p-5 rounded-3xl shadow-sm flex items-center justify-between hover:bg-white/90 transition-all duration-300">
                                      <div>
                                        <div className="font-black font-mono text-slate-900 text-sm">فاتورة رقم: {inv.invoiceNumber}</div>
                                        <div className="text-xs text-slate-500 mt-2 font-medium">تاريخ الإصدار: {inv.date} &bull; <span className={inv.status === 'active' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{inv.status === 'active' ? 'نشطة' : 'ملغية'}</span></div>
                                      </div>
                                      <div className="text-left bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] text-slate-500 mb-1 font-bold">المتبقي المطلوب</div>
                                        <div className={`font-mono font-black text-base ${(inv.remainingAmount || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                          {formatIQD(inv.remainingAmount || 0)}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {activeProfileTab === 'info' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="border-b border-white/50 pb-4">
                        <h4 className="font-black text-slate-800 text-base">بيانات المشترك الشخصية</h4>
                        <p className="text-xs text-slate-500 mt-1 font-medium">تفاصيل الاتصال والعنوان المثبت ميدانياً للوصول السريع.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="bg-white/60 p-5 rounded-3xl border border-white shadow-sm">
                          <span className="text-slate-400 text-[11px] block font-black uppercase tracking-wider">الاسم الكامل</span>
                          <span className="font-black text-slate-900 text-base mt-2 block">{profileData.customer?.name || 'غير متوفر'}</span>
                        </div>
                        
                        <div className="bg-white/60 p-5 rounded-3xl border border-white shadow-sm">
                          <span className="text-slate-400 text-[11px] block font-black uppercase tracking-wider">أرقام التواصل المقيدة</span>
                          <span className="font-mono font-black text-emerald-700 text-base mt-2 block tracking-wide">
                            {profileData.customer?.phone || 'غير متوفر'}
                            {profileData.customer?.secondaryPhone && ` / ${profileData.customer.secondaryPhone}`}
                          </span>
                        </div>

                        <div className="sm:col-span-2 bg-white/60 p-5 rounded-3xl border border-white shadow-sm">
                          <span className="text-slate-400 text-[11px] block font-black uppercase tracking-wider">العنوان الجغرافي المسجل بالتفصيل</span>
                          <span className="font-bold text-slate-800 text-sm mt-2 block leading-relaxed">{profileData.customer?.address || 'غير متوفر'}</span>
                        </div>

                        {profileData.customer?.mapsLink && (
                          <div className="sm:col-span-2 bg-white/60 p-5 rounded-3xl border border-white shadow-sm flex items-center justify-between">
                            <div>
                              <span className="text-slate-400 text-[11px] block font-black uppercase tracking-wider">موقع خرائط غوغل (Maps)</span>
                              <a href={profileData.customer.mapsLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono text-xs mt-2 block truncate max-w-[350px] font-bold">
                                {profileData.customer.mapsLink}
                              </a>
                            </div>
                            <a 
                              href={profileData.customer.mapsLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-4 py-2.5 bg-blue-50/80 border border-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-xl text-xs font-black transition-all shrink-0 shadow-sm"
                            >
                              فتح الخريطة
                            </a>
                          </div>
                        )}

                        {profileData.customer?.gpsCoords && (
                          <div className="bg-white/60 p-5 rounded-3xl border border-white shadow-sm">
                            <span className="text-slate-400 text-[11px] block font-black uppercase tracking-wider">إحداثيات GPS ميدانية</span>
                            <span className="font-mono font-black text-teal-700 text-sm mt-2 block">{profileData.customer.gpsCoords}</span>
                          </div>
                        )}

                        {profileData.customer?.notes && (
                          <div className="sm:col-span-2 bg-amber-50/40 p-5 rounded-3xl border border-amber-200/60 shadow-sm">
                            <span className="text-amber-700/80 text-[11px] block font-black uppercase tracking-wider">ملاحظات وشروحات التوصيل</span>
                            <span className="text-slate-800 text-sm mt-2 block italic leading-relaxed font-semibold">"{profileData.customer.notes}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeProfileTab === 'invoices' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="border-b border-white/50 pb-4">
                        <h4 className="font-black text-slate-800 text-base">سجل الفواتير والمشتريات</h4>
                        <p className="text-xs text-slate-500 mt-1 font-medium">كافة المنظومات والأجهزة المباعة للمشترك عبر النظام.</p>
                      </div>
                      
                      {(profileData.invoices || []).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm font-bold bg-white/40 rounded-[2rem] border border-white shadow-sm">
                          لم يشترِ العميل أي كتل أو منظومات حتى الآن.
                        </div>
                      ) : (
                        (profileData.invoices || []).map((inv: any, idx: number) => {
                          if (!inv) return null;
                          return (
                            <div key={idx} className="bg-white/60 border border-white p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-5">
                              <div className="flex items-center justify-between border-b border-white/60 pb-4">
                                <div>
                                  <span className="font-black text-slate-900 font-mono text-sm tracking-wide">فاتورة: {inv.invoiceNumber}</span>
                                  <span className={`mr-3 px-3 py-1 rounded-xl text-[10px] font-black shadow-sm whitespace-nowrap ${
                                    inv.invoiceType === 'installment' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                    inv.invoiceType === 'partial' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                    inv.invoiceType === 'mastercard' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  } border`}>
                                    {inv.invoiceType === 'installment' ? 'أقساط' :
                                     inv.invoiceType === 'partial' ? 'ذمم' :
                                     inv.invoiceType === 'mastercard' ? 'ماستركارد' : 'نقدي'}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-500 font-mono font-bold bg-white/80 px-3 py-1.5 rounded-lg border border-slate-100">{inv.date}</span>
                              </div>
                              
                              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                                {parseJsonArray(inv.items).map((it: any, k: number) => {
                                  if (!it) return null;
                                  return (
                                    <div key={k} className="flex justify-between text-sm">
                                      <span className="text-slate-700 font-bold">{it.name} <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100 mx-1">العدد: {it.quantity || 1}</span></span>
                                      <span className="text-slate-900 font-black font-mono tracking-tighter">{formatIQD((it.sellingPrice || 0) * (it.quantity || 1))}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between border-t border-white/60 pt-4 text-sm">
                                <div>
                                  <span className="text-slate-500 font-bold">القيمة الكلية: </span>
                                  <span className="font-black text-slate-900 font-mono text-base">{formatIQD(inv.finalAmount || 0)}</span>
                                </div>
                                {(inv.remainingAmount || 0) > 0 ? (
                                  <div className="bg-rose-50 border border-rose-100 px-4 py-2 rounded-xl mt-3 sm:mt-0">
                                    <span className="text-xs text-rose-700 font-black font-mono">
                                      الباقي بذمته: {formatIQD(inv.remainingAmount || 0)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-black mt-3 sm:mt-0">مسددة بالكامل (خالصة الذمة)</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {activeProfileTab === 'installments' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="border-b border-white/50 pb-4">
                        <h4 className="font-black text-slate-800 text-base">سجل الأقساط الشهرية</h4>
                        <p className="text-xs text-slate-500 mt-1 font-medium">تفاصيل استحقاقات الدفع المجدولة والمسددة وتاريخها.</p>
                      </div>
                      
                      {(profileData.installments || []).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm font-bold bg-white/40 rounded-[2rem] border border-white shadow-sm">
                          المشترك لا يخضع لنظام تقسيط الديون أو الأقساط حالياً.
                        </div>
                      ) : (
                        (profileData.installments || []).map((inst: any, idx: number) => {
                          if (!inst) return null;
                          return (
                            <div key={idx} className="bg-white/60 p-6 rounded-[2rem] border border-white shadow-sm space-y-5">
                              <div className="flex items-center justify-between border-b border-white/60 pb-4">
                                <span className="font-black text-sm text-slate-700">ترتبط بفاتورة: <span className="font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">{inst.invoiceNumber}</span></span>
                                <div className="text-left bg-slate-50/80 px-4 py-2 rounded-2xl border border-slate-100">
                                  <span className="text-slate-500 text-[11px] font-bold block mb-0.5">الرصيد المتبقي الكلي</span>
                                  <span className="font-black text-slate-900 font-mono text-base">{formatIQD(inst.remainingAmount || 0)}</span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {parseJsonArray(inst.installments).map((sub: any, sIdx: number) => {
                                  if (!sub) return null;
                                  return (
                                    <div key={sIdx} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-amber-200 transition-all duration-300 shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-500 font-mono text-sm border border-slate-100">
                                          {sub.id}
                                        </div>
                                        <div>
                                          <span className="font-black text-slate-800 block text-sm">دفعة استحقاق</span>
                                          <span className="text-slate-400 font-mono text-[10px] font-bold">{sub.dueDate}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="font-black font-mono text-slate-900 text-sm tracking-tighter">{formatIQD(sub.amount || 0)}</span>
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border ${
                                          sub.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}>
                                          {sub.status === 'paid' ? 'تم السداد' : 'قيد الانتظار'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {activeProfileTab === 'maintenance' && (
                    <div className="space-y-8 animate-fade-in">
                      <div className="border-b border-white/50 pb-4">
                        <h4 className="font-black text-slate-800 text-base">التاريخ الفني والصيانة</h4>
                        <p className="text-xs text-slate-500 mt-1 font-medium">سجل الزيارات الدورية واستجابات الطوارئ للمشترك.</p>
                      </div>
                      
                      {/* Maintenance requests */}
                      <div className="glass-card p-6 rounded-[2rem] shadow-sm">
                        <h5 className="font-black text-sm text-slate-800 mb-5 flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center"><Wrench className="w-4 h-4"/></div>
                          زيارات الصيانة الدورية ({(profileData.maintenance || []).length})
                        </h5>
                        {(profileData.maintenance || []).length === 0 ? (
                          <p className="text-sm text-slate-500 font-bold bg-white/40 p-5 rounded-2xl text-center border border-white">لا توجد زيارات صيانة دورية مجدولة.</p>
                        ) : (
                          <div className="space-y-4">
                            {(profileData.maintenance || []).map((m: any, idx: number) => {
                              if (!m) return null;
                              return (
                                <div key={idx} className="bg-white/80 border border-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
                                    <span className="font-mono font-black text-indigo-700 text-sm">طلب: {m.requestNumber}</span>
                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border ${
                                      m.status === 'closed' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    }`}>
                                      {m.status === 'closed' ? 'مكتملة ومغلقة' : 'قيد المعالجة الميدانية'}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed font-bold text-sm">{m.notes}</p>
                                  <div className="flex items-center gap-4 mt-4 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/50">
                                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><Users className="w-3 h-3"/> {m.assignedEmployee}</span>
                                    <span className="text-[10px] text-slate-500 font-bold font-mono flex items-center gap-1"><Calendar className="w-3 h-3"/> {m.createdDate}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Defects faults */}
                      <div className="glass-card p-6 rounded-[2rem] shadow-sm border-rose-100/30">
                        <h5 className="font-black text-sm text-slate-800 mb-5 flex items-center gap-3">
                          <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center"><ShieldAlert className="w-4 h-4"/></div>
                          بلاغات الأعطال والطوارئ ({(profileData.faults || []).length})
                        </h5>
                        {(profileData.faults || []).length === 0 ? (
                          <p className="text-sm text-slate-500 font-bold bg-white/40 p-5 rounded-2xl text-center border border-white">النظام مستقر تماماً ولم يتم قيد أي بلاغ عطل فني.</p>
                        ) : (
                          <div className="space-y-4">
                            {(profileData.faults || []).map((f: any, idx: number) => {
                              if (!f) return null;
                              return (
                                <div key={idx} className="bg-rose-50/50 border border-rose-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                  <div className="flex justify-between items-center border-b border-rose-200/50 pb-3 mb-3">
                                    <span className="font-black text-rose-800 text-sm">التصنيف: {f.faultType}</span>
                                    <span className="font-bold text-slate-500 font-mono text-[11px] bg-white/60 px-2 py-1 rounded-lg">{f.createdDate}</span>
                                  </div>
                                  <p className="text-slate-800 font-bold leading-relaxed text-sm">{f.description}</p>
                                  {f.notes && <p className="text-xs text-slate-600 bg-white/60 p-3 rounded-xl border border-rose-100/40 italic font-medium mt-3">تعقيب فني: {f.notes}</p>}
                                  <div className="mt-4 flex items-center justify-between">
                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black border shadow-sm ${
                                      f.status === 'closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-400 text-amber-950 border-amber-500 animate-pulse'
                                    }`}>
                                      {f.status === 'closed' ? 'تمت صيانة العطل' : 'تحت المتابعة الفورية العاجلة'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeProfileTab === 'installations' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="border-b border-white/50 pb-4">
                        <h4 className="font-black text-slate-800 text-base">مواعيد التثبيت والتركيب</h4>
                        <p className="text-xs text-slate-500 mt-1 font-medium">تفاصيل الحجوزات والفرق الفنية الهندسية المخصصة للمنظومات المشتراة.</p>
                      </div>
                      
                      {(profileData.installations || []).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm font-bold bg-white/40 rounded-[2rem] border border-white shadow-sm">
                          لا يوجد مواعيد أو حجوزات تركيب مجدولة حالياً.
                        </div>
                      ) : (
                        (profileData.installations || []).map((b: any, idx: number) => {
                          if (!b) return null;
                          return (
                            <div key={idx} className="bg-white/60 border border-white p-5 rounded-[2rem] shadow-sm hover:shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300">
                              <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-blue-500 text-white rounded-2xl flex items-center justify-center shadow-md liquid-icon-wrapper-fast shrink-0">
                                  <ClipboardCheck className="w-6 h-6" />
                                </div>
                                <div>
                                  <h5 className="font-black text-slate-800 text-sm">موعد التركيب الميداني</h5>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 text-xs">{b.appointmentDate}</span>
                                    <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 text-xs">{b.appointmentTime}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-bold mt-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> فريق العمل: <span className="text-slate-800">{b.assignedTeamName}</span></p>
                                  {b.notes && <p className="text-[11px] text-slate-400 italic font-medium mt-2 p-2 bg-white/50 rounded-lg border border-slate-100">ملاحظات: {b.notes}</p>}
                                </div>
                              </div>
                              <div className="w-full sm:w-auto text-left">
                                <span className={`inline-block px-4 py-2.5 rounded-xl text-[10px] font-black border shadow-sm ${
                                  b.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-500 text-white border-blue-600'
                                }`}>
                                  {b.status === 'completed' ? 'اكتمل التثبيت بنجاح' : 'مجدولة للتنفيذ القريب'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* Footer profiles */}
            <div className="p-5 bg-white/60 border-t border-white/60 shrink-0 flex items-center justify-start backdrop-blur-md">
              <button 
                onClick={() => {
                  setSelectedProfileId(null);
                  setProfileData(null);
                }}
                className="px-8 py-3.5 bg-slate-900/90 hover:bg-slate-950 text-white rounded-2xl text-sm font-bold transition-all shadow-md active:scale-95 duration-200"
              >
                إغلاق الواجهة
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default React.memo(CustomersScreen);
