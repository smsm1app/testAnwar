/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, formatIQD, compressImage } from '../api';
import { toast } from 'sonner';
import {
  Wrench, Search, Phone, MapPin, Eye, Edit2, Plus,
  X, Check, AlertTriangle, ShieldCheck, ClipboardX, LayoutGrid, Trash2
} from 'lucide-react';

interface MaintenanceScreenProps {
  permissions: any;
}

function MaintenanceScreen({ permissions }: MaintenanceScreenProps) {
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  const [activeSegment, setActiveSegment] = useState<'maintenance' | 'faults'>('maintenance');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Maintenance Request creation Modal States
  const [isMntModalOpen, setIsMntModalOpen] = useState(false);
  const [mntForm, setMntForm] = useState({
    customerId: '',
    notes: '',
    assignedEmployee: '',
    teamId: '',
    isManualTeam: false,
    manualLeader: '',
    manualMembers: [] as string[],
    photos: [] as string[]
  });

  // Fault Report creation Modal States
  const [isFaultModalOpen, setIsFaultModalOpen] = useState(false);
  const [faultForm, setFaultForm] = useState({
    customerId: '',
    faultType: '',
    description: '',
    notes: '',
    teamId: '',
    isManualTeam: false,
    manualLeader: '',
    manualMembers: [] as string[],
    photos: [] as string[]
  });
  const [customFaultCategory, setCustomFaultCategory] = useState('');
  const [selectedBookingForFault, setSelectedBookingForFault] = useState('');
  const [selectedBookingForMnt, setSelectedBookingForMnt] = useState('');

  // Selected customer details (used during creation)
  const [selectedCustomerIdForForm, setSelectedCustomerIdForForm] = useState<number | null>(null);
  const [selectedCustomerPurchasedItems, setSelectedCustomerPurchasedItems] = useState<any[]>([]);
  const [selectedCustomerInvoicesList, setSelectedCustomerInvoicesList] = useState<any[]>([]);

  // Editing statuses
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<'maintenance' | 'faults' | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);

  const [workers, setWorkers] = useState<any[]>([]);

  // View details modal
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [viewingType, setViewingType] = useState<'maintenance' | 'faults' | null>(null);

  const loadMaintenanceData = async () => {
    try {
      setLoading(true);
      // Fetch data safely so that lack of permissions for one doesn't crash the whole screen
      const [mntRes, faultRes, custRes, invRes, catRes, bookRes, teamRes, workersRes] = await Promise.all([
        api.getMaintenance().catch(() => []),
        api.getFaults().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getInvoices().catch(() => []),
        api.getCategories().catch(() => []),
        api.getBookings().catch(() => []),
        api.getTeams().catch(() => []),
        api.getWorkers().catch(() => [])
      ]);
      setMaintenance(mntRes);
      setFaults(faultRes);
      setCustomers(custRes);
      setInvoices(invRes);
      setCategories(catRes);
      setBookings(bookRes);
      setTeams(Array.isArray(teamRes) ? teamRes : []);
      setWorkers(Array.isArray(workersRes) ? workersRes : []);
    } catch (err: any) {
      toast.error(err.message || 'فشل في تحميل بيانات الصيانة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  // When customer is selected inside creation modal, automatically find their invoices and purchased products!
  const handleCustomerSelectionInForm = (cIdStr: string) => {
    if (!cIdStr) {
      setSelectedCustomerIdForForm(null);
      setSelectedCustomerPurchasedItems([]);
      setSelectedCustomerInvoicesList([]);
      setSelectedBookingForFault('');
      setSelectedBookingForMnt('');
      return;
    }

    const cId = parseInt(cIdStr);
    setSelectedCustomerIdForForm(cId);
    setSelectedBookingForFault('');
    setSelectedBookingForMnt('');

    // Find all active invoices for this customer
    const customerInvs = invoices.filter(i => i.customerId === cId);
    setSelectedCustomerInvoicesList(customerInvs);

    // Flat map purchased products
    const purchasedItems: any[] = [];
    for (const inv of customerInvs) {
      for (const item of inv.items) {
        if (!purchasedItems.some(p => p.productId === item.productId)) {
          purchasedItems.push(item);
        }
      }
    }
    setSelectedCustomerPurchasedItems(purchasedItems);
  };

  // Create Maintenance submit
  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mntForm.customerId || !mntForm.notes || !selectedBookingForMnt) {
      toast.error('يرجى اختيار العميل وتحديد المنظومة المثبتة وكتابة الشرح التقني للمهندسين');
      return;
    }

    // Customer must have an invoice to appear (Safety check!)
    const customerInvs = invoices.filter(i => i.customerId === parseInt(mntForm.customerId));
    if (customerInvs.length === 0) {
      toast.warning('تنبيه: لا يمكن فتح صيانة لعميل لا يمتلك أي فواتير مبيعات سابقة في النظام!');
      return;
    }

    try {
      setActionLoading(true);
      
      const finalTeamId: number | null = mntForm.teamId ? parseInt(mntForm.teamId) : null;

      const created = await api.createMaintenance(mntForm);
      
      if (finalTeamId && created && created.id) {
        await api.assignTaskToTeam(created.id, 'maintenance', finalTeamId);
      }
      
      toast.success('تم فتح كشف زيارة صيانة وقائية بنجاح، وربطه بالفريق تلقائياً!');
      setIsMntModalOpen(false);
      setMntForm({ customerId: '', notes: '', assignedEmployee: '', teamId: '', isManualTeam: false, manualLeader: '', manualMembers: [], photos: [] });
      setSelectedBookingForMnt('');
      setSelectedCustomerIdForForm(null);
      setSelectedCustomerPurchasedItems([]);
      setSelectedCustomerInvoicesList([]);
      setMaintenance(prev => [...prev, created]);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء رصد الصيانة');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Fault Submit
  const handleFaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faultForm.customerId || !faultForm.description || !faultForm.faultType || !selectedBookingForFault) {
      toast.error('يرجى إدخال اسم العميل واختيار الفاتورة المثبتة وشرح العطل وتحديد الفئة بدقة');
      return;
    }

    let finalFaultType = faultForm.faultType;
    if (finalFaultType === 'other') {
      if (!customFaultCategory.trim()) {
        toast.error('يرجى كتابة الفئة يدوياً');
        return;
      }
      finalFaultType = customFaultCategory.trim();
    }

    // Customer must have an invoice to appear (Safety check!)
    const customerInvs = invoices.filter(i => i.customerId === parseInt(faultForm.customerId));
    if (customerInvs.length === 0) {
      toast.warning('تنبيه: هذا العميل لا يملك فواتير ومعدات مسجلة! لا يمكن تسجيل بلاغ أعطال له في السجلات.');
      return;
    }

    try {
      setActionLoading(true);
      
      const finalTeamId: number | null = faultForm.teamId ? parseInt(faultForm.teamId) : null;

      const created = await api.createFault({ ...faultForm, faultType: finalFaultType });
      
      if (finalTeamId && created && created.id) {
        await api.assignTaskToTeam(created.id, 'fault', finalTeamId);
      }

      toast.success('تم تسجيل واستقبال بلاغ العطل الفني بنجاح!');
      setIsFaultModalOpen(false);
      setFaultForm({ customerId: '', faultType: '', description: '', notes: '', teamId: '', isManualTeam: false, manualLeader: '', manualMembers: [], photos: [] });
      setCustomFaultCategory('');
      setSelectedBookingForFault('');
      setSelectedCustomerIdForForm(null);
      setSelectedCustomerPurchasedItems([]);
      setSelectedCustomerInvoicesList([]);
      setFaults(prev => [...prev, created]);
    } catch (err: any) {
      toast.error(err.message || 'أخفق تسجيل بلاغ الأعطال');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit status submit
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingType) return;

    try {
      setActionLoading(true);
      if (editingType === 'maintenance') {
        const updated = await api.updateMaintenance(editingItem.id, {
          status: editStatus,
          notes: editAdminNotes,
          photos: editPhotos
        });
        setMaintenance(prev => prev.map(m => m.id === editingItem.id ? updated : m));
      } else {
        const updated = await api.updateFault(editingItem.id, {
          status: editStatus,
          notes: editAdminNotes,
          photos: editPhotos
        });
        setFaults(prev => prev.map(f => f.id === editingItem.id ? updated : f));
      }
      toast.success('تم تحديث حالة تذكرة الدعم وتقييد التقارير الميدانية بنجاح!');
      setEditingItem(null);
      setEditingType(null);
    } catch (err: any) {
      toast.error(err.message || 'أخفق التعديل');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenStatusEdit = (item: any, type: 'maintenance' | 'faults') => {
    setEditingItem(item);
    setEditingType(type);
    setEditStatus(item.status);
    setEditAdminNotes(item.notes || '');
    setEditPhotos(item.photos || []);
  };

  const handleViewDetails = (item: any, type: 'maintenance' | 'faults') => {
    setViewingItem(item);
    setViewingType(type);
  };

  const handleDeleteMaintenance = (item: any) => {
    toast(`تحذير: سيتم حذف طلب الصيانة ${item.requestNumber} لـ ${item.customerName} نهائياً. تأكيد؟`, {
      action: {
        label: 'حذف',
        onClick: async () => {
          try {
            setActionLoading(true);
            await api.deleteMaintenance(item.id);
            toast.success(`تم حذف طلب الصيانة ${item.requestNumber} بنجاح!`);
            setMaintenance(prev => prev.filter(m => m.id !== item.id));
            setViewingItem(null);
            setViewingType(null);
          } catch (err: any) {
            toast.error(err.message || 'فشل الحذف');
          } finally {
            setActionLoading(false);
          }
        },
      },
      cancel: { label: 'إلغاء', onClick: () => { } },
    });
  };

  const handleDeleteFault = (item: any) => {
    toast(`تحذير: سيتم حذف بلاغ العطل لـ ${item.customerName} نهائياً. تأكيد؟`, {
      action: {
        label: 'حذف',
        onClick: async () => {
          try {
            setActionLoading(true);
            await api.deleteFault(item.id);
            toast.success(`تم حذف بلاغ العطل بنجاح!`);
            setFaults(prev => prev.filter(f => f.id !== item.id));
            setViewingItem(null);
            setViewingType(null);
          } catch (err: any) {
            toast.error(err.message || 'فشل الحذف');
          } finally {
            setActionLoading(false);
          }
        },
      },
      cancel: { label: 'إلغاء', onClick: () => { } },
    });
  };

  // Real upload maintenance photo to Supabase
  const handleMntPhotoUploadLocal = async (e: React.ChangeEvent<HTMLInputElement>, isFault = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.info('جاري معالجة ورفع الصورة للسحابة...');
      const compressedBase64 = await compressImage(file, 800, 0.7);
      const { url } = await api.uploadImage(compressedBase64);
      
      if (isFault) {
        setFaultForm({ ...faultForm, photos: [...faultForm.photos, url] });
      } else {
        setMntForm({ ...mntForm, photos: [...mntForm.photos, url] });
      }
      toast.success('تم رفع الصورة وإضافتها بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل في رفع الصورة');
    }
  };

  const handleEditPhotoUploadLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.info('جاري معالجة ورفع الصورة للسحابة...');
      const compressedBase64 = await compressImage(file, 800, 0.7);
      const { url } = await api.uploadImage(compressedBase64);
      setEditPhotos(prev => [...prev, `RESOLUTION:${url}`]);
      toast.success('تم رفع الصورة وإضافتها بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل في رفع الصورة');
    }
  };

  const filteredMnt = maintenance.filter(m =>
    m.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.customerPhone.includes(searchQuery)
  );

  const filteredFaults = faults.filter(f =>
    f.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.faultType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.customerPhone.includes(searchQuery)
  );

  const customersWithInvoices = customers.filter(c => invoices.some(i => i.customerId === c.id));

  return (
    <div className="space-y-8 animate-fade-in relative z-10 max-w-7xl mx-auto pb-12">

      {/* Header bar */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200/50 liquid-icon-wrapper shrink-0">
            <Wrench className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">الصيانة والدعم الفني</h1>
            <p className="text-slate-500 text-sm mt-1.5 font-medium">تسجيل بلاغات الأعطال، كشوفات المهندسين، وتثبيت التحديثات.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 shrink-0">
          {permissions.maintenance.create && (
            <button
              onClick={() => { setIsMntModalOpen(true); setSelectedCustomerIdForForm(null); }}
              className="px-5 py-2.5 bg-white/60 hover:bg-white text-slate-700 hover:text-slate-900 text-sm font-bold rounded-xl flex items-center gap-2 border border-white shadow-sm transition-all active:scale-95"
            >
              <LayoutGrid className="w-4 h-4 text-indigo-500" />
              صيانة وقائية
            </button>
          )}
          {permissions.faults.create && (
            <button
              onClick={() => { setIsFaultModalOpen(true); setSelectedCustomerIdForForm(null); }}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-200/50 transition-all active:scale-95"
            >
              <AlertTriangle className="w-4 h-4 text-white" />
              بلاغ طارئ
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="glass-card p-5 rounded-[2rem] shadow-lg flex flex-col gap-5 border border-white/80">
        
        {/* Segment Tabs */}
        <div className="flex bg-white/40 p-1.5 rounded-2xl border border-white shadow-inner overflow-hidden">
          <button
            onClick={() => { setActiveSegment('maintenance'); setSearchQuery(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeSegment === 'maintenance' 
                ? 'bg-slate-900 text-amber-500 shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            الصيانة الدورية ({maintenance.length})
          </button>
          <button
            onClick={() => { setActiveSegment('faults'); setSearchQuery(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeSegment === 'faults' 
                ? 'bg-rose-500 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            بلاغات الأعطال ({faults.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-indigo-500/50 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none shadow-sm transition-all text-slate-800 placeholder-slate-400"
              placeholder="بحث باسم المشترك، رمز الصيانة، أو التذكرة..."
            />
          </div>
          <button onClick={loadMaintenanceData} className="px-6 py-3.5 bg-white/60 hover:bg-white text-slate-700 font-bold rounded-xl border border-white shadow-sm transition-all active:scale-95 text-sm">تحديث</button>
        </div>
      </div>

      {/* LIST REFUGEES */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm font-bold flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري سحب طلبات الدعم...</span>
        </div>
      ) : activeSegment === 'maintenance' ? (
        // SEGMENT 1: MAINTENANCE RECORDS
        filteredMnt.length === 0 ? (
          <div className="glass-card text-center py-16 rounded-[2.5rem] shadow-sm text-slate-400 font-bold text-lg border border-white/50">
            لا توجد زيارات صيانة وقائية مسجلة.
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start snap-x">
            {[
              { id: 'new', label: 'بلاغ جديد', headerClass: 'bg-amber-100/80 border-amber-200 text-amber-800', countClass: 'bg-amber-200/80 text-amber-900' },
              { id: 'inprogress', label: 'تحت الإجراء', headerClass: 'bg-blue-100/80 border-blue-200 text-blue-800', countClass: 'bg-blue-200/80 text-blue-900' },
              { id: 'repaired', label: 'تم الإصلاح', headerClass: 'bg-emerald-100/80 border-emerald-200 text-emerald-800', countClass: 'bg-emerald-200/80 text-emerald-900' },
              { id: 'closed', label: 'مغلق ومؤرشف', headerClass: 'bg-slate-200/80 border-slate-300 text-slate-800', countClass: 'bg-slate-300/80 text-slate-900' }
            ].map(col => {
              const colItems = filteredMnt.filter(m => m.status === col.id);
              if (colItems.length === 0 && col.id === 'closed') return null; // Hide empty closed column to save space
              return (
                <div key={col.id} className="flex-1 min-w-[320px] max-w-[400px] bg-slate-50/50 p-4 rounded-[2.5rem] border border-white shadow-sm flex flex-col gap-4 snap-center shrink-0">
                  <div className={`border px-4 py-3 rounded-2xl font-black flex justify-between items-center shadow-sm ${col.headerClass}`}>
                    <span>{col.label}</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-mono shadow-inner ${col.countClass}`}>{colItems.length}</span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {colItems.map(m => (
                      <div key={m.id} className="glass-card rounded-[2rem] p-5 border border-white/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group bg-white/80">
                        <div>
                          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                            <div>
                              <span className="text-[10px] bg-indigo-50/80 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg font-mono font-black tracking-wider shadow-sm">{m.requestNumber}</span>
                              <h3 className="font-black text-sm text-slate-900 mt-3 group-hover:text-indigo-600 transition-colors">{m.customerName}</h3>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 mt-3 leading-relaxed font-semibold line-clamp-3">{m.notes}</p>

                          <div className="space-y-2 mt-4 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3"/> 
                              <span className="font-bold text-slate-800 font-mono">{m.customerPhone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3"/> 
                              <span className="font-bold text-slate-800 line-clamp-1">{m.customerAddress}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 mt-2 font-bold">
                              <span>التاريخ:</span>
                              <span className="font-mono text-slate-700">{m.createdDate}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 font-black bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm truncate max-w-[120px]">م: {m.assignedEmployee}</span>
                          <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleViewDetails(m, 'maintenance')}
                              className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 shadow-sm transition-colors"
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {permissions.maintenance.edit && (
                              <button
                                onClick={() => handleOpenStatusEdit(m, 'maintenance')}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200 shadow-sm transition-colors"
                                title="تحديث الحالة"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {permissions.maintenance.delete && (
                              <button
                                onClick={() => handleDeleteMaintenance(m)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-lg border border-rose-200 shadow-sm transition-colors"
                                title="حذف طلب الصيانة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {colItems.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-3xl">
                        لا توجد تذاكر في هذه المرحلة
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // SEGMENT 2: FAULT REPORT TICKETS
        filteredFaults.length === 0 ? (
          <div className="glass-card text-center py-16 rounded-[2.5rem] shadow-sm text-slate-400 font-bold text-lg border border-white/50">
            لا توجد بلاغات أعطال طارئة حالياً.
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start snap-x">
            {[
              { id: 'new', label: 'بلاغ جديد طارئ', headerClass: 'bg-red-100/80 border-red-200 text-red-800', countClass: 'bg-red-200/80 text-red-900' },
              { id: 'inprogress', label: 'قيد التجريب الفني', headerClass: 'bg-amber-100/80 border-amber-200 text-amber-800', countClass: 'bg-amber-200/80 text-amber-900' },
              { id: 'repaired', label: 'مصلح وناجح', headerClass: 'bg-emerald-100/80 border-emerald-200 text-emerald-800', countClass: 'bg-emerald-200/80 text-emerald-900' },
              { id: 'closed', label: 'مغلق ومؤرشف', headerClass: 'bg-slate-200/80 border-slate-300 text-slate-800', countClass: 'bg-slate-300/80 text-slate-900' }
            ].map(col => {
              const colItems = filteredFaults.filter(f => f.status === col.id);
              if (colItems.length === 0 && col.id === 'closed') return null;
              return (
                <div key={col.id} className="flex-1 min-w-[320px] max-w-[400px] bg-slate-50/50 p-4 rounded-[2.5rem] border border-white shadow-sm flex flex-col gap-4 snap-center shrink-0">
                  <div className={`border px-4 py-3 rounded-2xl font-black flex justify-between items-center shadow-sm ${col.headerClass}`}>
                    <span>{col.label}</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-mono shadow-inner ${col.countClass}`}>{colItems.length}</span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {colItems.map(f => (
                      <div key={f.id} className="glass-card rounded-[2rem] p-5 border border-white/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group bg-white/80">
                        <div>
                          <div className="flex justify-between items-start border-b border-slate-100 pb-3 bg-rose-50/30 p-3 -mx-2 -mt-2 rounded-2xl mb-3">
                            <div>
                              <span className="text-[9px] bg-rose-100 border border-rose-200 text-rose-700 px-2 py-1 rounded-md font-black shadow-sm">بلاغ طارئ</span>
                              <h4 className="font-black text-xs text-rose-900 mt-2">النوع: {f.faultType}</h4>
                            </div>
                          </div>

                          <div className="text-xs px-1">
                            <span className="text-slate-500 text-[10px] block font-bold">اسم العميل المشتكي:</span>
                            <span className="font-black text-slate-900 block mt-1 text-sm">{f.customerName}</span>
                          </div>

                          <p className="text-xs text-slate-700 mt-3 font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner leading-relaxed line-clamp-3">
                            {f.description}
                          </p>

                          {f.notes && (
                            <p className="text-[10px] text-teal-800 bg-teal-50/80 p-2.5 rounded-lg border border-teal-100 mt-3 font-bold flex gap-1.5 items-start">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span className="line-clamp-2">{f.notes}</span>
                            </p>
                          )}
                        </div>

                        <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-mono font-bold bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">{f.createdDate}</span>
                          <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleViewDetails(f, 'faults')}
                              className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 shadow-sm transition-colors"
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {permissions.faults.edit && (
                              <button
                                onClick={() => handleOpenStatusEdit(f, 'faults')}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 shadow-sm transition-colors"
                                title="تثبيت الإصلاح"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {permissions.faults.delete && (
                              <button
                                onClick={() => handleDeleteFault(f)}
                                className="p-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-lg border border-red-200 shadow-sm transition-colors"
                                title="حذف بلاغ العطل"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {colItems.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-3xl">
                        لا توجد تذاكر في هذه المرحلة
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* CREATE MAINTENANCE REQUEST MODAL */}
      {isMntModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-2xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h3 className="font-black text-sm flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-indigo-400"/> طلب صيانة وقائية لفاتورة</h3>
              <button onClick={() => setIsMntModalOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleMaintenanceSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white/60">

              <div>
                <label className="block text-sm font-black text-slate-800 mb-2">الزبون المستهدف (يمتلك منظومة) *</label>
                <select
                  value={mntForm.customerId}
                  onChange={(e) => {
                    setMntForm({ ...mntForm, customerId: e.target.value });
                    handleCustomerSelectionInForm(e.target.value);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition-all"
                  required
                >
                  <option value="">-- زبائن معتمدون لديهم أجهزة مجهّزة ومكتملة التنصيب --</option>
                  {customers.filter(c => bookings.some(b => b.customerId === c.id && b.status === 'completed')).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              {selectedCustomerIdForForm && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-black text-slate-800 mb-2">المنظومة / الفاتورة المثبتة *</label>
                  {(() => {
                    const completedBookings = bookings.filter(b => b.customerId === selectedCustomerIdForForm && b.status === 'completed');
                    if (completedBookings.length === 0) {
                      return (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs">
                          عذراً، هذا العميل لا يمتلك أي منظومات مكتملة التنصيب.
                        </div>
                      );
                    }
                    return (
                      <select
                        value={selectedBookingForMnt}
                        onChange={(e) => setSelectedBookingForMnt(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition-all"
                        required
                      >
                        <option value="">-- اختر المنظومة المكتملة --</option>
                        {completedBookings.map((b) => (
                          <option key={b.id} value={b.id}>فاتورة رقم: {b.invoiceNumber} - تاريخ التركيب: {b.appointmentDate}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              )}

              {selectedBookingForMnt && (
                (() => {
                  const b = bookings.find(x => x.id === parseInt(selectedBookingForMnt));
                  if (!b) return null;
                  const inv = invoices.find(i => i.id === b.invoiceId);
                  const itemsStr = inv?.items ? (typeof inv.items === 'string' ? inv.items : JSON.stringify(inv.items)) : '[]';
                  const parsedItems = JSON.parse(itemsStr);
                  const assignedTeam = teams.find(t => t.id === b.assignedTeamId);

                  return (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 bg-emerald-50/80 border border-emerald-100 rounded-xl shadow-sm text-sm">
                        <span className="font-black block text-emerald-900 mb-2 flex items-center gap-2">
                          <Check className="w-4 h-4"/> تم تثبيت وتركيب هذه المنظومة بواسطة:
                        </span>
                        {assignedTeam ? (
                          <div className="bg-white/60 p-3 rounded-lg border border-emerald-100 shadow-sm space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-emerald-800 text-xs">الطاقم: <span className="font-black text-emerald-900 text-sm">{assignedTeam.name}</span></span>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded">المسؤول: {assignedTeam.leader || 'غير محدد'}</span>
                            </div>
                            <div className="text-xs text-slate-600 font-semibold leading-relaxed">الأعضاء: {Array.isArray(assignedTeam.members) ? assignedTeam.members.join('، ') : assignedTeam.members}</div>
                            {assignedTeam.vehicle && <div className="text-[10px] text-slate-500 font-bold mt-1 border-t border-emerald-50 pt-1">الآلية: {assignedTeam.vehicle}</div>}
                          </div>
                        ) : (
                          <p className="font-bold text-emerald-800 bg-white/50 p-2 rounded-lg mt-2 inline-block shadow-sm border border-emerald-100">
                            الطاقم: {b.assignedTeamName}
                          </p>
                        )}
                      </div>

                      {parsedItems.length > 0 && (
                        <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-xl shadow-sm text-sm">
                          <span className="font-black block text-indigo-900 mb-2 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4"/> السلع والألواح المشتراة بفاتورته الموثّقة:
                          </span>
                          <ul className="list-disc list-inside space-y-1.5 text-indigo-800 font-semibold bg-white/50 p-3 rounded-lg border border-indigo-100/50">
                            {parsedItems.map((it: any, i: number) => (
                              <li key={i}>{it.name} <span className="font-mono text-indigo-600">(×{it.quantity})</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              <div>
                <label className="block text-sm font-black text-slate-800 mb-2">شرح وملاحظات زيارة الصيانة الوقائية *</label>
                <textarea
                  value={mntForm.notes}
                  onChange={(e) => setMntForm({ ...mntForm, notes: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none h-28 resize-none shadow-inner"
                  placeholder="وصف تفصيلي لما يجب فحصها (شحن الألواح، تثبيت القواطع)..."
                  required
                />
              </div>

              <div className="bg-white/50 p-4 rounded-xl border border-slate-200 shadow-inner">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-black text-slate-800">تعيين طاقم / مهندس للصيانة (اختياري)</label>
                    <p className="text-[10px] text-indigo-500 font-bold mt-1">💡 لكي تذهب التذكرة إلى (محاسبة العامل) بعد إغلاقها، يجب تعيين الطاقم هنا.</p>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setMntForm({ ...mntForm, isManualTeam: false })}
                      className={`px-3 py-1.5 rounded-lg transition-all ${!mntForm.isManualTeam ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                      طاقم جاهز
                    </button>
                    <button
                      type="button"
                      onClick={() => setMntForm({ ...mntForm, isManualTeam: true })}
                      className={`px-3 py-1.5 rounded-lg transition-all ${mntForm.isManualTeam ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                      تشكيل مخصص
                    </button>
                  </div>
                </div>

                {!mntForm.isManualTeam ? (
                  <select
                    value={mntForm.teamId}
                    onChange={(e) => setMntForm({ ...mntForm, teamId: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm font-bold text-sm transition-all"
                  >
                    <option value="">-- اختر طاقم الصيانة --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} (المسؤول: {t.leader})</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-white/60 p-4 rounded-xl border border-slate-200 space-y-4 shadow-sm text-sm animate-fade-in">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">أعضاء الطاقم المخصص *</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-100 max-h-32 overflow-y-auto custom-scrollbar">
                        {workers.map(w => (
                          <label key={w.id} className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg border border-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={mntForm.manualMembers.includes(w.name)}
                              onChange={(e) => {
                                const newMembers = e.target.checked 
                                  ? [...mntForm.manualMembers, w.name] 
                                  : mntForm.manualMembers.filter(m => m !== w.name);
                                setMntForm({ ...mntForm, manualMembers: newMembers });
                              }}
                              className="rounded text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700">{w.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">مسؤول الطاقم المخصص *</label>
                      <select
                        value={mntForm.manualLeader}
                        onChange={(e) => setMntForm({ ...mntForm, manualLeader: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                        required={mntForm.isManualTeam}
                      >
                        <option value="">-- اختر المسؤول --</option>
                        {mntForm.manualMembers.map((m, idx) => (
                          <option key={idx} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-black text-slate-800 mb-2">صورة توضيحية من الموقع</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMntPhotoUploadLocal(e, false)}
                  className="w-full text-sm font-semibold file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-sm p-1.5"
                />
                <div className="flex flex-wrap gap-3 mt-3">
                  {mntForm.photos.map((ph, idx) => (
                    <img key={idx} src={ph} className="w-16 h-16 object-cover border-2 border-white rounded-xl shadow-md" alt="mnt attachments" referrerPolicy="no-referrer" />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setIsMntModalOpen(false)}
                  className="px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-sm transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>جدولة كشف الصيانة</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* CREATE FAULT REPORT MODAL */}
      {isFaultModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-2xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className="bg-rose-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h3 className="font-black text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400"/> تسجيل بلاغ عطل فني طارئ</h3>
              <button onClick={() => setIsFaultModalOpen(false)} className="text-white/60 hover:text-white bg-white/10 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleFaultSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white/60">

              <div>
                <label className="block text-sm font-black text-slate-800 mb-2">اختر المشترك المشتكي *</label>
                <select
                  value={faultForm.customerId}
                  onChange={(e) => {
                    setFaultForm({ ...faultForm, customerId: e.target.value });
                    setSelectedBookingForFault('');
                    handleCustomerSelectionInForm(e.target.value);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-sm transition-all"
                  required
                >
                  <option value="">-- زبائن مسجلون لهم منظومات مكتملة ومثبتة --</option>
                  {customers.filter(c => bookings.some(b => b.customerId === c.id && b.status === 'completed')).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              {selectedCustomerIdForForm && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-black text-slate-800 mb-2">الفاتورة / المنظومة المثبتة المشتكى عليها *</label>
                  {(() => {
                    const completedBookings = bookings.filter(b => b.customerId === selectedCustomerIdForForm && b.status === 'completed');
                    if (completedBookings.length === 0) {
                      return (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs">
                          عذراً، هذا العميل لا يمتلك أي منظومات مثبتة وكاملة في سجلات التركيب. لا يمكن تقديم بلاغ عطل.
                        </div>
                      );
                    }
                    return (
                      <select
                        value={selectedBookingForFault}
                        onChange={(e) => setSelectedBookingForFault(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-sm transition-all"
                        required
                      >
                        <option value="">-- اختر المنظومة المثبتة --</option>
                        {completedBookings.map((b) => (
                          <option key={b.id} value={b.id}>فاتورة رقم: {b.invoiceNumber} - تاريخ التركيب: {b.appointmentDate}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              )}

              {selectedBookingForFault && (
                (() => {
                  const b = bookings.find(x => x.id === parseInt(selectedBookingForFault));
                  if (!b) return null;
                  
                  // Find the exact invoice to show its items
                  const inv = invoices.find(i => i.id === b.invoiceId);
                  const itemsStr = inv?.items ? (typeof inv.items === 'string' ? inv.items : JSON.stringify(inv.items)) : '[]';
                  const parsedItems = JSON.parse(itemsStr);
                  const assignedTeam = teams.find(t => t.id === b.assignedTeamId);

                  return (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 bg-emerald-50/80 border border-emerald-100 rounded-xl shadow-sm text-sm">
                        <span className="font-black block text-emerald-900 mb-2 flex items-center gap-2">
                          <Check className="w-4 h-4"/> تم تثبيت وتركيب هذه المنظومة بواسطة:
                        </span>
                        {assignedTeam ? (
                          <div className="bg-white/60 p-3 rounded-lg border border-emerald-100 shadow-sm space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-emerald-800 text-xs">الطاقم: <span className="font-black text-emerald-900 text-sm">{assignedTeam.name}</span></span>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded">المسؤول: {assignedTeam.leader || 'غير محدد'}</span>
                            </div>
                            <div className="text-xs text-slate-600 font-semibold leading-relaxed">الأعضاء: {Array.isArray(assignedTeam.members) ? assignedTeam.members.join('، ') : assignedTeam.members}</div>
                            {assignedTeam.vehicle && <div className="text-[10px] text-slate-500 font-bold mt-1 border-t border-emerald-50 pt-1">الآلية: {assignedTeam.vehicle}</div>}
                          </div>
                        ) : (
                          <p className="font-bold text-emerald-800 bg-white/50 p-2 rounded-lg mt-2 inline-block shadow-sm border border-emerald-100">
                            الطاقم: {b.assignedTeamName}
                          </p>
                        )}
                      </div>

                      {parsedItems.length > 0 && (
                        <div className="p-4 bg-rose-50/80 border border-rose-100 rounded-xl shadow-sm text-sm">
                          <span className="font-black block text-rose-900 mb-2 flex items-center gap-2">
                            <Wrench className="w-4 h-4"/> سلع ومكونات هذه الفاتورة المحددة:
                          </span>
                          <ul className="list-disc list-inside space-y-1.5 text-rose-800 font-semibold bg-white/50 p-3 rounded-lg border border-rose-100/50">
                            {parsedItems.map((it: any, i: number) => (
                              <li key={i}>{it.name} <span className="font-mono text-rose-600">(×{it.quantity})</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              <div>
                <label className="block text-sm font-black text-slate-800 mb-2">فئة وتصنيف الخلل الفني *</label>
                <select
                  value={faultForm.faultType}
                  onChange={(e) => setFaultForm({ ...faultForm, faultType: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-sm transition-all"
                  required
                >
                  <option value="">-- اختر الفئة --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="other">غير ذلك (كتابة يدوية)</option>
                </select>
              </div>

              {faultForm.faultType === 'other' && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-black text-slate-800 mb-2">اكتب الفئة يدوياً *</label>
                  <input
                    type="text"
                    value={customFaultCategory}
                    onChange={(e) => setCustomFaultCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-sm"
                    placeholder="مثال: خلل في التنصيب، خلل في الربط..."
                    required={faultForm.faultType === 'other'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-black text-slate-800 mb-2">وصف دقيق للمشكلة والطوارئ المترتبة *</label>
                <textarea
                  value={faultForm.description}
                  onChange={(e) => setFaultForm({ ...faultForm, description: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none h-28 resize-none shadow-inner"
                  placeholder="وصف بلاغ المشترك كما ورد (انطفاء العاكس بشكل كامل، فشل الخلايا في شحن الليثيوم)..."
                  required
                />
              </div>

              <div className="bg-white/50 p-4 rounded-xl border border-slate-200 shadow-inner mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-black text-slate-800">تعيين طاقم طوارئ ومعالجة (اختياري)</label>
                    <p className="text-[10px] text-rose-500 font-bold mt-1">💡 لكي تذهب التذكرة إلى (محاسبة العامل) بعد إغلاقها، يجب تعيين الطاقم هنا.</p>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFaultForm({ ...faultForm, isManualTeam: false })}
                      className={`px-3 py-1.5 rounded-lg transition-all ${!faultForm.isManualTeam ? 'bg-white text-rose-600 shadow-sm border border-rose-100' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                      طاقم جاهز
                    </button>
                    <button
                      type="button"
                      onClick={() => setFaultForm({ ...faultForm, isManualTeam: true })}
                      className={`px-3 py-1.5 rounded-lg transition-all ${faultForm.isManualTeam ? 'bg-white text-rose-600 shadow-sm border border-rose-100' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                      تشكيل مخصص
                    </button>
                  </div>
                </div>

                {!faultForm.isManualTeam ? (
                  <select
                    value={faultForm.teamId}
                    onChange={(e) => setFaultForm({ ...faultForm, teamId: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-sm font-bold text-sm transition-all"
                  >
                    <option value="">-- اختر طاقم الطوارئ --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} (المسؤول: {t.leader})</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-white/60 p-4 rounded-xl border border-slate-200 space-y-4 shadow-sm text-sm animate-fade-in">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">أعضاء الطاقم المخصص *</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-100 max-h-32 overflow-y-auto custom-scrollbar">
                        {workers.map(w => (
                          <label key={w.id} className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg border border-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={faultForm.manualMembers.includes(w.name)}
                              onChange={(e) => {
                                const newMembers = e.target.checked 
                                  ? [...faultForm.manualMembers, w.name] 
                                  : faultForm.manualMembers.filter(m => m !== w.name);
                                setFaultForm({ ...faultForm, manualMembers: newMembers });
                              }}
                              className="rounded text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700">{w.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">مسؤول الطاقم المخصص *</label>
                      <select
                        value={faultForm.manualLeader}
                        onChange={(e) => setFaultForm({ ...faultForm, manualLeader: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:ring-2 focus:ring-rose-500"
                        required={faultForm.isManualTeam}
                      >
                        <option value="">-- اختر المسؤول --</option>
                        {faultForm.manualMembers.map((m, idx) => (
                          <option key={idx} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-black text-slate-800 mb-2">صورة توضيحية من المشترك (إن وجد)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMntPhotoUploadLocal(e, true)}
                  className="w-full text-sm font-semibold file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-sm p-1.5"
                />
                <div className="flex flex-wrap gap-3 mt-3">
                  {faultForm.photos.map((ph, idx) => (
                    <img key={idx} src={ph} className="w-16 h-16 object-cover border-2 border-white rounded-xl shadow-md" alt="defect attachments" referrerPolicy="no-referrer" />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setIsFaultModalOpen(false)}
                  className="px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-sm transition-all"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span>حقن التذكرة للطوارئ</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[80] p-4 animate-fade-in">
          <div className="w-full max-w-sm glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80">
            <div className="bg-slate-900/95 text-slate-100 px-6 py-4 flex items-center justify-between border-b border-white/10">
              <h4 className="font-black text-sm">{editingType === 'maintenance' ? 'معالجة الكشف الوقائي' : 'تأكيد معالجة العطل'}</h4>
              <button onClick={() => { setEditingItem(null); setEditingType(null); }} className="text-slate-400 hover:text-white bg-white/5 hover:bg-rose-500 p-1.5 rounded-full transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateStatusSubmit} className="p-6 text-sm space-y-5 bg-white/60">

              <div>
                <label className="block font-black text-slate-800 mb-2">تحديث الحالة الحركية للتذكرة:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                >
                  <option value="new">تذكرة دعم جديدة</option>
                  <option value="inprogress">قيد التقييم والمتابعة</option>
                  <option value="repaired">تم الفحص والإصلاح (Repaired)</option>
                  <option value="closed">إغلاق نهائي مع الضمان المصدق (Closed)</option>
                </select>
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-2">تقرير الفريق وعملية المعالجة الميدانية:</label>
                <textarea
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 h-24 resize-none font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-inner"
                  placeholder="وثق ما تم إصلاحه والفواتير الإضافية إن وجدت..."
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-2">الصور المرفقة للإصلاح (اختياري):</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditPhotoUploadLocal}
                  className="w-full text-sm font-semibold file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-sm p-1.5"
                />
                {editPhotos.filter(p => p.startsWith('RESOLUTION:')).length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {editPhotos.filter(p => p.startsWith('RESOLUTION:')).map((ph, idx) => (
                      <img key={idx} src={ph.replace('RESOLUTION:', '')} className="w-16 h-16 object-cover border-2 border-white rounded-xl shadow-md" alt="attachment" referrerPolicy="no-referrer" />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => { setEditingItem(null); setEditingType(null); }}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-sm transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-black rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-4 h-4"/>
                  )}
                  <span>تحديث وحفظ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[75] p-4 animate-fade-in">
          <div className="w-full max-w-2xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 max-h-[90vh] flex flex-col">
            <div className={`${viewingType === 'maintenance' ? 'bg-indigo-600/95' : 'bg-rose-600/95'} backdrop-blur-xl text-white px-6 py-5 flex items-center justify-between shrink-0`}>
              <h3 className="font-black text-base flex items-center gap-2">
                {viewingType === 'maintenance' ? <><LayoutGrid className="w-5 h-5"/> تفاصيل طلب الصيانة الوقائية</> : <><AlertTriangle className="w-5 h-5"/> تفاصيل بلاغ العطل الفني</>}
              </h3>
              <button onClick={() => { setViewingItem(null); setViewingType(null); }} className="text-white/70 hover:text-white bg-white/10 p-1.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 md:p-8 space-y-6 text-sm overflow-y-auto custom-scrollbar flex-1 bg-white/60">
              
              {/* Customer Info */}
              <div className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm">
                <h4 className="font-black text-slate-900 mb-3 text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400"/> بيانات العميل</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                  <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-0.5">الاسم الكامل</span> <span className="font-black">{viewingItem.customerName}</span></div>
                  <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-0.5">رقم الهاتف</span> <span className="font-black font-mono">{viewingItem.customerPhone}</span></div>
                  <div className="col-span-1 sm:col-span-2 flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-0.5">العنوان والموقع</span> <span className="font-black">{viewingItem.customerAddress}</span></div>
                </div>
              </div>

              {/* Request Details */}
              <div className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm">
                <h4 className="font-black text-slate-900 mb-3 text-sm flex items-center gap-2"><ClipboardX className="w-4 h-4 text-slate-400"/> تفاصيل وحالة التذكرة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                  <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-0.5">المعرف التسلسلي</span> <span className="font-black font-mono">{viewingItem.requestNumber || viewingItem.id}</span></div>
                  <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-0.5">تاريخ الفتح</span> <span className="font-black font-mono">{viewingItem.createdDate}</span></div>
                  
                  <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-1">الحالة الحالية</span>
                    <div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-black shadow-sm border ${viewingItem.status === 'closed' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                          viewingItem.status === 'repaired' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            'bg-amber-50 text-amber-700 border-amber-200 animate-pulse-slow'
                        }`}>
                        {viewingItem.status === 'new' ? 'بلاغ جديد' :
                          viewingItem.status === 'inprogress' ? 'تحت الإجراء والمعالجة' :
                            viewingItem.status === 'repaired' ? 'تم الإصلاح الميداني' : 'مغلق ومؤرشف بالضمان'}
                      </span>
                    </div>
                  </div>
                  
                  {viewingType === 'maintenance' && (
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-0.5">المهندس المسؤول</span> <span className="font-black">{viewingItem.assignedEmployee || 'غير محدد'}</span></div>
                  )}
                  {viewingType === 'faults' && (
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 mb-0.5">تصنيف العطل المبدئي</span> <span className="font-black">{viewingItem.faultType}</span></div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm">
                <h4 className="font-black text-slate-900 mb-3 text-sm">وصف البلاغ والشكوى</h4>
                <p className="text-slate-700 leading-relaxed font-semibold bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                  {viewingType === 'maintenance' ? viewingItem.notes : viewingItem.description}
                </p>
                {viewingItem.notes && viewingType === 'faults' && (
                  <div className="mt-4">
                    <span className="font-black text-teal-800 text-xs flex items-center gap-1.5 mb-2"><ShieldCheck className="w-4 h-4"/> تقرير المعالجة الفني المرفق:</span>
                    <p className="text-teal-900 font-bold bg-teal-50/50 p-4 rounded-xl border border-teal-100/50">{viewingItem.notes}</p>
                  </div>
                )}
              </div>

              {/* Photos */}
              {viewingItem.photos && viewingItem.photos.length > 0 && (
                <div className="space-y-4">
                  {/* Fault Photos */}
                  {viewingItem.photos.filter((p: string) => !p.startsWith('RESOLUTION:')).length > 0 && (
                    <div className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm">
                      <h4 className="font-black text-slate-900 mb-3 text-sm">الصور والأدلة البصرية للمشكلة</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {viewingItem.photos.filter((p: string) => !p.startsWith('RESOLUTION:')).map((photo: string, idx: number) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden shadow-sm border border-slate-200 aspect-square bg-slate-50">
                            <img
                              src={photo}
                              alt={`صورة العطل ${idx + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500"
                              onClick={() => window.open(photo, '_blank')}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution Photos */}
                  {viewingItem.photos.filter((p: string) => p.startsWith('RESOLUTION:')).length > 0 && (
                    <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                      <h4 className="font-black text-emerald-900 mb-3 text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> صور المعالجة والإصلاح المرفقة
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {viewingItem.photos.filter((p: string) => p.startsWith('RESOLUTION:')).map((photo: string, idx: number) => {
                          const cleanUrl = photo.replace('RESOLUTION:', '');
                          return (
                            <div key={idx} className="relative group rounded-xl overflow-hidden shadow-sm border-2 border-emerald-200 aspect-square bg-emerald-100/30">
                              <img
                                src={cleanUrl}
                                alt={`إصلاح ${idx + 1}`}
                                className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500"
                                onClick={() => window.open(cleanUrl, '_blank')}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
            <div className="p-5 bg-white/80 border-t border-slate-200/50 shrink-0 flex flex-wrap gap-3 justify-end backdrop-blur-md">
              <button
                onClick={() => { setViewingItem(null); setViewingType(null); }}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors border border-slate-200 shadow-sm"
              >
                إغلاق النافذة
              </button>
              
              {permissions.maintenance.edit && viewingType === 'maintenance' && (
                <button
                  onClick={() => {
                    setViewingItem(null);
                    setViewingType(null);
                    handleOpenStatusEdit(viewingItem, 'maintenance');
                  }}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4"/> تحديث الحالة
                </button>
              )}
              {permissions.maintenance.delete && viewingType === 'maintenance' && (
                <button
                  onClick={() => handleDeleteMaintenance(viewingItem)}
                  className="px-6 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-sm font-black hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-200 active:scale-95 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> حذف الطلب
                </button>
              )}
              
              {permissions.faults.edit && viewingType === 'faults' && (
                <button
                  onClick={() => {
                    setViewingItem(null);
                    setViewingType(null);
                    handleOpenStatusEdit(viewingItem, 'faults');
                  }}
                  className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-black hover:bg-rose-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4"/> تثبيت الإصلاح
                </button>
              )}
              {permissions.faults.delete && viewingType === 'faults' && (
                <button
                  onClick={() => handleDeleteFault(viewingItem)}
                  className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-black hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-200 active:scale-95 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> حذف البلاغ
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default React.memo(MaintenanceScreen);
