import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import { Plus, Search, CheckSquare, X, Receipt, Check, Briefcase, Edit2, Trash2 } from 'lucide-react';

export default function PreliminaryBookingsSegment({ permissions, customers, invoices, onLinkInvoice }: any) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    phoneNumber: '',
    totalAmount: '',
    systemSize: '',
    panelDetails: '',
    batteryDetails: '',
    inverterDetails: '',
    hasAdvancePayment: false,
    advanceAmount: '',
    paymentMethod: 'cash',
    advanceStatus: 'received'
  });

  const toggleStatus = async (b: any) => {
    try {
      setActionLoading(true);
      const newStatus = b.status === 'linked' ? 'pending' : 'linked';
      await api.updatePreliminaryBookingStatus(b.id, newStatus);
      setBookings(bookings.map(item => item.id === b.id ? { ...item, status: newStatus } : item));
      toast.success('تم تحديث الحالة بنجاح');
    } catch (err) {
      toast.error('فشل في تحديث الحالة');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleAdvanceStatus = async (b: any) => {
    try {
      setActionLoading(true);
      const newStatus = b.advance_status === 'received' ? 'not_received' : 'received';
      await api.updatePreliminaryBookingAdvanceStatus(b.id, newStatus);
      setBookings(bookings.map(item => item.id === b.id ? { ...item, advance_status: newStatus } : item));
      toast.success('تم تحديث حالة المقدمة بنجاح');
    } catch (err) {
      toast.error('فشل في تحديث حالة المقدمة');
    } finally {
      setActionLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getPreliminaryBookings();
      setBookings(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.error('فشل في تحميل الحجوزات المبدئية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.phoneNumber) {
      toast.error('اسم العميل ورقم الموبايل مطلوبان');
      return;
    }
    try {
      setActionLoading(true);
      
      let finalCustomerName = form.customerName;
      if (isNewCustomer) {
        const newCust = await api.createCustomer({
          name: form.customerName,
          phone: form.phoneNumber,
          address: 'غير محدد (مضاف من الحجوزات المبدئية)',
          balance: 0,
          notes: 'أضيف تلقائياً من الحجوزات المبدئية'
        });
        if (newCust && newCust.name) {
          finalCustomerName = newCust.name;
        }
      }

      if (editingId) {
        const updated = await api.updatePreliminaryBooking(editingId, {
          ...form,
          customerName: finalCustomerName
        });
        setBookings(bookings.map(b => b.id === editingId ? updated : b));
        toast.success('تم تعديل الحجز المبدئي بنجاح');
      } else {
        const created = await api.createPreliminaryBooking({
          ...form,
          customerName: finalCustomerName
        });
        setBookings([created, ...bookings]);
        toast.success('تمت إضافة الحجز المبدئي بنجاح');
      }

      setIsModalOpen(false);
      setIsNewCustomer(false);
      setEditingId(null);
      setForm({ customerName: '', phoneNumber: '', totalAmount: '', systemSize: '', panelDetails: '', batteryDetails: '', inverterDetails: '', hasAdvancePayment: false, advanceAmount: '', paymentMethod: 'cash', advanceStatus: 'received' });
    } catch (err) {
      toast.error('فشل في حفظ الحجز');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      setActionLoading(true);
      await api.deletePreliminaryBooking(id);
      setBookings(bookings.filter(b => b.id !== id));
      toast.success('تم الحذف بنجاح');
    } catch (err) {
      toast.error('فشل في الحذف');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (b: any) => {
    setEditingId(b.id);
    setForm({
      customerName: b.customer_name || '',
      phoneNumber: b.phone_number || '',
      totalAmount: b.total_amount || '',
      systemSize: b.system_size || '',
      panelDetails: b.panel_details || '',
      batteryDetails: b.battery_details || '',
      inverterDetails: b.inverter_details || '',
      hasAdvancePayment: b.has_advance_payment || false,
      advanceAmount: b.advance_amount || '',
      paymentMethod: b.payment_method || 'cash',
      advanceStatus: b.advance_status || 'received'
    });
    setIsNewCustomer(false);
    setIsModalOpen(true);
  };



  const filtered = bookings.filter(b => 
    b.customer_name?.includes(searchQuery) || 
    b.phone_number?.includes(searchQuery) ||
    b.system_size?.includes(searchQuery)
  ).filter(b => {
    if (paymentFilter === 'all') return true;
    if (paymentFilter === 'none') return !b.has_advance_payment;
    if (paymentFilter === 'has_advance') return b.has_advance_payment;
    return b.payment_method === paymentFilter;
  });

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 rounded-[2rem] shadow-lg flex items-center justify-between border border-white/80">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-emerald-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-emerald-500/50 rounded-2xl py-3 pr-12 pl-4 text-sm font-semibold shadow-sm text-slate-800"
            placeholder="بحث بالاسم أو رقم الموبايل..."
          />
        </div>
        {permissions.installationBookings?.create && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4"/>
            إضافة حجز مبدئي
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto custom-scrollbar mb-2 mt-4">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'none', label: 'بدون مقدمة' },
          { id: 'has_advance', label: 'بمقدمة' },
          { id: 'cash', label: 'نقدي' },
          { id: 'mastercard', label: 'بطاقة' },
          { id: 'partial', label: 'ذمم' },
          { id: 'installment', label: 'أقساط' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setPaymentFilter(tab.id)}
            className={`py-2 px-4 text-xs font-black rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              paymentFilter === tab.id
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                : 'bg-white/60 text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-[2.5rem] p-6 border border-white/80 shadow-lg">
        {loading ? (
          <div className="text-center py-10 text-slate-500">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 text-slate-600 font-black border-b border-white">
                <tr>
                  <th className="py-5 px-4 rounded-tr-xl">الاسم</th>
                  <th className="py-5 px-4">رقم الموبايل</th>
                  <th className="py-5 px-4">التاريخ</th>
                  <th className="py-5 px-4">المبلغ الكلي</th>
                  <th className="py-5 px-4">المتبقي</th>
                  <th className="py-5 px-4">حجم المنظومة</th>
                  <th className="py-5 px-4">اللوح والحجم</th>
                  <th className="py-5 px-4">البطارية والحجم</th>
                  <th className="py-5 px-4">الانفيرتر والحجم</th>
                  <th className="py-5 px-4 text-center">المقدمة</th>
                  <th className="py-5 px-4 text-center">طريقة الدفع</th>
                  <th className="py-5 px-4 text-center">الحالة</th>
                  <th className="py-5 px-4 rounded-tl-xl text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/50">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-white/40 transition-colors">
                    <td className="py-5 px-4 font-black text-slate-800">{b.customer_name}</td>
                    <td className="py-5 px-4 font-mono text-slate-600" dir="ltr">{b.phone_number}</td>
                    <td className="py-5 px-4 font-mono text-slate-500 text-xs" dir="ltr">
                      {b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : '—'}
                    </td>
                    <td className="py-5 px-4 font-mono font-bold text-emerald-600">{formatIQD(b.total_amount)}</td>
                    <td className="py-5 px-4 font-mono font-bold text-rose-500">
                      {b.has_advance_payment && b.advance_status === 'received'
                        ? formatIQD(Math.max(0, (parseInt(b.total_amount?.toString().replace(/,/g, '')) || 0) - (parseInt(b.advance_amount?.toString().replace(/,/g, '')) || 0)))
                        : formatIQD(b.total_amount)}
                    </td>
                    <td className="py-5 px-4 text-slate-700">{b.system_size}</td>
                    <td className="py-5 px-4 text-slate-700 text-xs">{b.panel_details}</td>
                    <td className="py-5 px-4 text-slate-700 text-xs">{b.battery_details}</td>
                    <td className="py-5 px-4 text-slate-700 text-xs">{b.inverter_details}</td>
                    <td className="py-5 px-4 text-center">
                      {b.has_advance_payment ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-bold text-amber-600 text-xs">{formatIQD(b.advance_amount)}</span>
                          <button 
                            onClick={() => toggleAdvanceStatus(b)}
                            disabled={actionLoading}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer border ${b.advance_status === 'received' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200'}`}
                          >
                            {b.advance_status === 'received' ? 'واصلة' : 'غير واصلة'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">لا يوجد</span>
                      )}
                    </td>
                    <td className="py-5 px-4 text-center">
                      <span className="text-slate-600 font-bold text-xs">
                        {b.payment_method === 'cash' ? 'نقدي' : b.payment_method === 'mastercard' ? 'بطاقة' : b.payment_method === 'installment' ? 'أقساط' : b.payment_method === 'partial' ? 'ذمم' : (b.payment_method || '—')}
                      </span>
                    </td>
                    <td className="py-5 px-4 text-center">
                      <button
                        onClick={() => toggleStatus(b)}
                        disabled={actionLoading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all shadow-sm ${
                          b.status === 'linked'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
                        }`}
                      >
                        {b.status === 'linked' ? 'تمت' : 'غير متمم'}
                      </button>
                    </td>
                    <td className="py-5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {permissions?.installationBookings?.edit !== false && (
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"
                            title="تعديل الحجز"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {permissions?.installationBookings?.delete !== false && (
                          <button
                            onClick={() => handleDelete(b.id)}
                            disabled={actionLoading}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            title="حذف الحجز المبدئي"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-slate-500 font-bold">لا توجد حجوزات مبدئية مسجلة.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-full max-w-2xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900/95 text-white px-6 py-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <h4 className="font-black text-sm">{editingId ? 'تعديل الحجز المبدئي' : 'إضافة حجز مبدئي جديد'}</h4>
              <button onClick={() => {
                setIsModalOpen(false);
                setEditingId(null);
                setForm({ customerName: '', phoneNumber: '', totalAmount: '', systemSize: '', panelDetails: '', batteryDetails: '', inverterDetails: '', hasAdvancePayment: false, advanceAmount: '', paymentMethod: 'cash', advanceStatus: 'received' });
              }} className="text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar bg-white/60">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-black text-slate-800 mb-2">اسم العميل *</label>
                  {!isNewCustomer ? (
                    <select 
                      required 
                      value={form.customerName} 
                      onChange={e => {
                        if (e.target.value === 'NEW') {
                          setIsNewCustomer(true);
                          setForm({ ...form, customerName: '', phoneNumber: '' });
                          return;
                        }
                        const selected = customers?.find((c: any) => c.name === e.target.value);
                        setForm({
                          ...form, 
                          customerName: e.target.value,
                          phoneNumber: selected ? selected.phone : form.phoneNumber
                        });
                      }} 
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 shadow-sm font-bold text-slate-700"
                    >
                      <option value="">-- اختر العميل من القائمة --</option>
                      <option value="NEW" className="font-black text-emerald-600 bg-emerald-50">➕ إضافة عميل جديد...</option>
                      {customers?.map((c: any) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative">
                      <input 
                        type="text" 
                        required 
                        value={form.customerName} 
                        onChange={e => setForm({...form, customerName: e.target.value})} 
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-amber-500 shadow-sm" 
                        placeholder="اكتب اسم العميل الجديد..."
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsNewCustomer(false);
                          setForm({ ...form, customerName: '', phoneNumber: '' });
                        }}
                        className="absolute inset-y-0 right-3 flex items-center text-rose-500 hover:text-rose-700 font-bold text-xs"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-2">رقم الموبايل *</label>
                  <input type="text" required value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 shadow-sm font-mono text-right" dir="ltr" />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-2">المبلغ الكلي</label>
                  <input type="text" inputMode="numeric" value={form.totalAmount ? Number(String(form.totalAmount).replace(/,/g, '')).toLocaleString('en-US') : ''} onChange={e => { const val = e.target.value.replace(/,/g, ''); if (!isNaN(Number(val)) || val === '') setForm({...form, totalAmount: val}); }} className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 shadow-sm font-mono font-bold" dir="ltr" placeholder="مثال: 3,000,000" />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-2">حجم المنظومة</label>
                  <input type="text" value={form.systemSize} onChange={e => setForm({...form, systemSize: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 shadow-sm" placeholder="مثال: 5KW" />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-black text-slate-800 mb-2">نوع اللوح والحجم</label>
                  <input type="text" value={form.panelDetails} onChange={e => setForm({...form, panelDetails: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 shadow-sm" placeholder="مثال: Longi 555W - عدد 8" />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-2">نوع البطارية والحجم</label>
                  <input type="text" value={form.batteryDetails} onChange={e => setForm({...form, batteryDetails: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 shadow-sm" placeholder="مثال: 100Ah Lithium" />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-2">نوع الانفيرتر والحجم</label>
                  <input type="text" value={form.inverterDetails} onChange={e => setForm({...form, inverterDetails: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 shadow-sm" placeholder="مثال: Must 5KW Hybrid" />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-2">طريقة الدفع</label>
                  <select 
                    value={form.paymentMethod} 
                    onChange={e => setForm({...form, paymentMethod: e.target.value})} 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 shadow-sm font-bold text-slate-700"
                  >
                    <option value="cash">نقدي</option>
                    <option value="mastercard">بطاقة ماستر كارد</option>
                    <option value="partial">ذمم (جزئي)</option>
                    <option value="installment">أقساط</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={form.hasAdvancePayment}
                    onChange={e => setForm({...form, hasAdvancePayment: e.target.checked})}
                    className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-black text-slate-800">هل توجد مقدمة مالية؟</span>
                </label>

                {form.hasAdvancePayment && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                    <div>
                      <label className="block font-black text-slate-800 mb-2">مبلغ المقدمة</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={form.advanceAmount ? Number(String(form.advanceAmount).replace(/,/g, '')).toLocaleString('en-US') : ''} 
                        onChange={e => { const val = e.target.value.replace(/,/g, ''); if (!isNaN(Number(val)) || val === '') setForm({...form, advanceAmount: val}); }} 
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 shadow-sm font-mono font-bold" 
                        dir="ltr"
                        placeholder="مثال: 500,000" 
                      />
                    </div>
                    <div>
                      <label className="block font-black text-slate-800 mb-2">حالة استلام المقدمة</label>
                      <select 
                        value={form.advanceStatus} 
                        onChange={e => setForm({...form, advanceStatus: e.target.value})} 
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 shadow-sm font-bold text-slate-700"
                      >
                        <option value="received">واصلة (تم الاستلام)</option>
                        <option value="not_received">غير واصلة</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-slate-200/60 mt-4">
                {editingId && permissions?.installationBookings?.delete !== false ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      handleDelete(editingId);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-sm transition-colors border border-rose-200 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> حذف الحجز
                  </button>
                ) : <div />}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                    setForm({ customerName: '', phoneNumber: '', totalAmount: '', systemSize: '', panelDetails: '', batteryDetails: '', inverterDetails: '', hasAdvancePayment: false, advanceAmount: '', paymentMethod: 'cash', advanceStatus: 'received' });
                  }} className="px-5 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm">إلغاء</button>
                  <button type="submit" disabled={actionLoading} className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-md text-sm">{editingId ? 'حفظ التعديلات' : 'حفظ الحجز المبدئي'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}



    </div>
  );
}
