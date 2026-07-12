/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, formatIQD, compressImage } from '../api';
import { toast } from 'sonner';
import {
  FileText, Search, Printer, Share2, ClipboardX, X,
  Upload, CheckSquare, RefreshCcw, Landmark, Clock, MessageSquareShare, Edit, Trash2
} from 'lucide-react';
import InvoiceEditModal from './InvoiceEditModal';

interface InvoicesScreenProps {
  permissions: any;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-4 h-4"}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

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

export default function InvoicesScreen({ permissions }: InvoicesScreenProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'partial' | 'installment' | 'mastercard'>('all');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Active viewing invoice
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedInvoicePayments, setSelectedInvoicePayments] = useState<any[]>([]);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const handleViewInvoice = async (inv: any) => {
    setSelectedInvoice(inv);
    if (inv.invoiceType === 'partial') {
      try {
        const res = await api.getPartialPayments(inv.id);
        setSelectedInvoicePayments(res);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSelectedInvoicePayments([]);
    }
  };

  // Partial Payments Modal State
  const [isPartialModalOpen, setIsPartialModalOpen] = useState(false);
  const [partialInvoice, setPartialInvoice] = useState<any>(null);
  const [partialPayments, setPartialPayments] = useState<any[]>([]);
  const [newPartialAmount, setNewPartialAmount] = useState('');
  const [newPartialNotes, setNewPartialNotes] = useState('');
  const [partialLoading, setPartialLoading] = useState(false);

  // Image Upload proof delivery
  const [proofImage, setProofImage] = useState<string>('');

  // Edit Invoice
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  const handleDeleteInvoice = async (inv: any) => {
    toast(`هل أنت متأكد من حذف الفاتورة ${inv.invoiceNumber} نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`, {
      action: {
        label: 'تأكيد الحذف',
        onClick: async () => {
          try {
            setActionLoading(true);
            await api.deleteInvoice(inv.id);
            setInvoices(prev => prev.filter(i => i.id !== inv.id));
            toast.success('تم حذف الفاتورة بنجاح');
            window.dispatchEvent(new CustomEvent('refresh_erp_notifications'));
          } catch (err: any) {
            toast.error(err.message || 'فشل الحذف');
          } finally {
            setActionLoading(false);
          }
        },
      },
      cancel: {
        label: 'إلغاء',
        onClick: () => { },
      },
    });
  };

  const loadInvoices = async (currentPage = page, currentSearch = searchQuery) => {
    try {
      setLoading(true);
      const res = await api.getInvoices(currentPage, limit, currentSearch).catch(() => ({ data: [], total: 0 }));
      const settingsRes = await api.getSettings().catch(() => null);
      if (res.data) {
        setInvoices(res.data);
        setTotalCount(res.total);
      } else {
        setInvoices(res);
      }
      setSettings(settingsRes);
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تحميل الفواتير والإعدادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadInvoices(1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);



  const openPartialModal = async (inv: any) => {
    setPartialInvoice(inv);
    setPartialPayments([]);
    setNewPartialAmount('');
    setNewPartialNotes('');
    setIsPartialModalOpen(true);
    try {
      setPartialLoading(true);
      const res = await api.getPartialPayments(inv.id);
      setPartialPayments(res);
    } catch (err: any) {
      toast.error('فشل تحميل سجل الدفعات');
    } finally {
      setPartialLoading(false);
    }
  };

  const handleAddPartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partialInvoice || !newPartialAmount) return;

    try {
      setPartialLoading(true);
      const res = await api.addPartialPayment(partialInvoice.id, parseFloat(newPartialAmount), newPartialNotes);
      toast.success('تمت إضافة الدفعة وتحديث الرصيد بنجاح');

      // Update local remaining amount
      setPartialInvoice({ ...partialInvoice, remainingAmount: res.newRemaining });
      // Update in the main invoices list
      setInvoices(prev => prev.map(inv => inv.id === partialInvoice.id ? { ...inv, remainingAmount: res.newRemaining } : inv));

      // Reload partial payments
      const history = await api.getPartialPayments(partialInvoice.id);
      setPartialPayments(history);
      setNewPartialAmount('');
      setNewPartialNotes('');
    } catch (err: any) {
      toast.error(err.message || 'فشل في إضافة الدفعة');
    } finally {
      setPartialLoading(false);
    }
  };

  const handleCancelInvoiceClick = (id: number) => {
    setCancellingId(id);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingId || !cancelReason.trim()) {
      toast.error('يرجى تحديد سبب الإلغاء');
      return;
    }

    try {
      setActionLoading(true);
      await api.cancelInvoice(cancellingId, cancelReason);
      toast.success('تم إلغاء الفاتورة بنجاح');
      window.dispatchEvent(new CustomEvent('refresh_erp_notifications'));

      setInvoices(prev => prev.map(inv =>
        inv.id === cancellingId ? { ...inv, status: 'cancelled', notes: (inv.notes ? inv.notes + ' | ' : '') + 'ملغاة: ' + cancelReason } : inv
      ));

      setIsCancelModalOpen(false);
      setCancellingId(null);
      setSelectedInvoice(null);
    } catch (err: any) {
      toast.error(err.message || 'أخفق إلغاء العملية');
    } finally {
      setActionLoading(false);
    }
  };

  // Proof image upload to Supabase Storage
  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>, invId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setActionLoading(true);
      toast.info('جاري معالجة ورفع الصورة للسحابة...');
      const compressedBase64 = await compressImage(file, 800, 0.7);
      const { url } = await api.uploadImage(compressedBase64);

      await api.updateInvoiceProof(invId, url);
      setInvoices(prev => prev.map(inv => inv.id === invId ? { ...inv, deliveryProofImage: url } : inv));
      if (selectedInvoice && selectedInvoice.id === invId) {
        setSelectedInvoice({ ...selectedInvoice, deliveryProofImage: url });
      }
      toast.success('تم رفع وتحميل صورة إثبات التسليم بنجاح!');
    } catch (err: any) {
      toast.error(err.message || 'فشل في رفع الصورة');
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp auto messaging link trigger
  const triggerWhatsAppShare = (inv: any) => {
    if (!settings) {
      toast.error('جاري تهيئة قوالب الإعدادات الفنية للرسائل');
      return;
    }

    const itemsText = parseJsonArray(inv.items).map((item: any) => `- ${item.name} | الكمية: ${item.quantity} | السعر: ${formatIQD(item.sellingPrice * item.quantity)}`).join('\n');

    let msg = settings.invoiceTemplate || `مرحباً {customer_name}،
تفاصيل فاتورتكم:

رقم الفاتورة: {invoice_number}
التاريخ: {invoice_date}

المواد:
{items_details}
-------------------
المجموع الكلي: {invoice_amount}
المبلغ المتبقي: {remaining_amount}`;

    // Replace terms
    msg = msg.replace(/{customer_name}/g, inv.customerName)
      .replace(/{invoice_number}/g, inv.invoiceNumber)
      .replace(/{invoice_amount}/g, formatIQD(inv.finalAmount))
      .replace(/{remaining_amount}/g, formatIQD(inv.remainingAmount))
      .replace(/{due_date}/g, inv.date) // Standard date backwards compat
      .replace(/{invoice_date}/g, inv.date)
      .replace(/{items_details}/g, itemsText);

    const urlEncodedText = encodeURIComponent(msg);
    // Sanitize phone number (some start with 07, convert to Iraqi code 964 if valid)
    let pNum = inv.customerPhone;
    if (pNum.startsWith('0')) {
      pNum = '964' + pNum.substring(1);
    }

    const waLink = `https://api.whatsapp.com/send?phone=${pNum}&text=${urlEncodedText}`;
    window.open(waLink, '_blank');
  };

  // Native Printable view trigger
  const triggerPrintReceipt = () => {
    window.print();
  };

  const filteredInvoices = invoices.filter(i => {
    if (activeTab === 'all') return true;
    return i.invoiceType === activeTab;
  });

  return (
    <div className="space-y-8 animate-fade-in relative z-10 pb-12 max-w-7xl mx-auto">

      {/* Title */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex items-center gap-6">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-200/50 liquid-icon-wrapper shrink-0">
          <FileText className="text-white w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">أرشيف المبيعات وفواتير العملاء</h1>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">تتبع مستندي شامل لجميع فواتير النقد، الأقساط، والماستركارد. الحذف محظور ومؤرشف فدرالياً.</p>
        </div>
      </div>

      {/* SEARCH AND TABS */}
      <div className="glass-card p-5 rounded-[2rem] shadow-lg flex flex-col lg:flex-row gap-5 items-stretch lg:items-center">
        
        <div className="relative flex-1">
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-amber-500 pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none shadow-inner transition-all text-slate-800 placeholder-slate-400"
            placeholder="بحث برقم الفاتورة، اسم المشترك، أو الهاتف الأساسي..."
          />
        </div>

        <div className="flex flex-wrap gap-2 p-2 bg-white/40 border border-white/60 rounded-[1.5rem] shrink-0 custom-scrollbar overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'all'
              ? 'bg-slate-900 text-amber-400 shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
          >
            <span>الكل</span>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] ${activeTab === 'all' ? 'bg-slate-800 text-amber-400 font-black' : 'bg-slate-200/50 text-slate-500'}`}>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('cash')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'cash'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
              : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === 'cash' ? 'bg-white' : 'bg-emerald-500'}`}></span>
            <span>فواتير نقدية</span>
          </button>
          <button
            onClick={() => setActiveTab('partial')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'partial'
              ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
              : 'text-slate-600 hover:text-blue-700 hover:bg-white/60'
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === 'partial' ? 'bg-white' : 'bg-blue-500'}`}></span>
            <span>ذمم جزئية</span>
          </button>
          <button
            onClick={() => setActiveTab('installment')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'installment'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
              : 'text-slate-600 hover:text-amber-700 hover:bg-white/60'
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === 'installment' ? 'bg-white' : 'bg-amber-500'}`}></span>
            <span>أقساط سنوية</span>
          </button>
          <button
            onClick={() => setActiveTab('mastercard')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'mastercard'
              ? 'bg-purple-500 text-white shadow-md shadow-purple-200'
              : 'text-slate-600 hover:text-purple-700 hover:bg-white/60'
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === 'mastercard' ? 'bg-white' : 'bg-purple-500'}`}></span>
            <span>ماستركارد</span>
          </button>
          
          <button onClick={() => loadInvoices(page, searchQuery)} className="px-4 py-2.5 bg-slate-100/50 hover:bg-white text-slate-600 font-bold rounded-xl transition-all border border-transparent hover:border-slate-200 mr-auto" title="تحديث السجلات">
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm font-bold flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري سحب الفواتير من الخادم السحابي...</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="glass-card text-center py-16 rounded-[2.5rem] shadow-sm text-slate-400 font-bold text-lg border border-white/50">
          لا يوجد فواتير مطابقة لبحثك في الأرشيف المالي.
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] border border-white/80 shadow-xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-white/50 text-slate-600 border-b border-white">
                  <th className="p-5 font-black uppercase tracking-wider">كود الفاتورة</th>
                  <th className="p-5 font-black uppercase tracking-wider">اسم العميل</th>
                  <th className="p-5 font-black uppercase tracking-wider">تاريخ البيع</th>
                  <th className="p-5 font-black uppercase tracking-wider">النوع</th>
                  <th className="p-5 font-black uppercase tracking-wider">صافي القيمة</th>
                  <th className="p-5 font-black uppercase tracking-wider">المتبقي</th>
                  <th className="p-5 font-black uppercase tracking-wider">الحالة</th>
                  <th className="p-5 font-black uppercase tracking-wider text-left">أدوات الإدارة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/60 transition-colors duration-200 group">
                    <td className="p-5 font-mono font-black text-slate-900">{inv.invoiceNumber}</td>
                    <td className="p-5 font-bold text-slate-800">{inv.customerName}</td>
                    <td className="p-5 font-mono text-slate-500 font-semibold">{inv.date}</td>
                    <td className="p-5">
                      {inv.invoiceType === 'cash' && <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl font-bold text-xs shadow-sm whitespace-nowrap">نقدي</span>}
                      {inv.invoiceType === 'partial' && <span className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-xl font-bold text-xs shadow-sm whitespace-nowrap">ذمم مفتوحة</span>}
                      {inv.invoiceType === 'installment' && <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl font-bold text-xs shadow-sm whitespace-nowrap">أقساط سنوية</span>}
                      {inv.invoiceType === 'mastercard' && <span className="bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1 rounded-xl font-bold text-xs shadow-sm whitespace-nowrap">ماستركارد</span>}
                    </td>
                    <td className="p-5 font-black font-mono text-slate-900 tracking-tighter">{formatIQD(inv.finalAmount)}</td>
                    <td className="p-5 font-mono font-black">
                      {inv.remainingAmount > 0 ? (
                        <span className="inline-block whitespace-nowrap text-rose-600 bg-rose-50 px-3 py-1 rounded-xl border border-rose-100 shadow-sm">{formatIQD(inv.remainingAmount)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-sm border ${inv.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {inv.status === 'active' ? 'سليم' : 'ملغى وتالف'}
                      </span>
                    </td>
                    <td className="p-5 text-left flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      {inv.invoiceType === 'partial' && inv.remainingAmount > 0 && inv.status === 'active' && (
                        <button
                          onClick={() => openPartialModal(inv)}
                          className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl text-xs font-black shadow-sm transition-all"
                        >
                          تسديد دفعة
                        </button>
                      )}
                      <button
                        onClick={() => handleViewInvoice(inv)}
                        className="px-3 py-2 bg-slate-100 hover:bg-white text-slate-700 rounded-xl text-xs font-black shadow-sm border border-transparent hover:border-slate-200 transition-all"
                      >
                        معاينة الفاتورة
                      </button>
                      <button
                        onClick={() => triggerWhatsAppShare(inv)}
                        title="إرسال عبر واتساب"
                        className="p-2 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all rounded-xl shadow-sm border border-emerald-100"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                      </button>
                      {permissions?.invoices?.edit && inv.status === 'active' && (
                        <button
                          onClick={() => { setEditingInvoice(inv); setIsEditModalOpen(true); }}
                          title="تعديل الفاتورة"
                          className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl shadow-sm border border-amber-100 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {(permissions?.invoices?.delete || permissions?.sales?.delete) && (
                        <button
                          onClick={() => handleDeleteInvoice(inv)}
                          title="حذف الفاتورة نهائياً"
                          className="p-2 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white rounded-xl shadow-sm border border-rose-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalCount > limit && (
        <div className="flex items-center justify-between p-4 border-t border-white/40 glass-card rounded-[2rem] shadow-sm mt-4">
          <span className="text-xs text-slate-500 font-bold px-4">
            عرض {(page - 1) * limit + 1} إلى {Math.min(page * limit, totalCount)} من {totalCount} فاتورة
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => { setPage(p => p - 1); loadInvoices(page - 1, searchQuery); }} 
              disabled={page === 1}
              className="px-4 py-2 bg-white/50 text-slate-700 font-bold text-xs rounded-xl hover:bg-white disabled:opacity-50 transition-colors border border-white"
            >
              السابق
            </button>
            <button 
              onClick={() => { setPage(p => p + 1); loadInvoices(page + 1, searchQuery); }} 
              disabled={page * limit >= totalCount}
              className="px-4 py-2 bg-white/50 text-slate-700 font-bold text-xs rounded-xl hover:bg-white disabled:opacity-50 transition-colors border border-white"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* FULL DETAILED INVOICE MODAL & PRINT RECEIPT DRAWER */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="w-[95%] max-w-3xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-white/80 flex flex-col justify-between max-h-[90vh]">

            {/* Header controls */}
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-8 py-5 flex items-center justify-between shrink-0 print:hidden border-b border-white/10">
              <h3 className="font-black text-lg">تفاصيل الفاتورة الرسمية ومعاينة الطباعة</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={triggerPrintReceipt}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Printer className="w-4 h-4" /> طباعة المستند
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-rose-500 rounded-full transition-all bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Printable Content area */}
            <div id="invoice-printable-canvas" className="flex-1 overflow-y-auto custom-scrollbar p-8 sm:p-10 bg-white print:p-8 print:bg-white text-slate-900 flex flex-col min-h-full relative print:block">

              {/* Print watermark (optional) */}
              <div className="hidden print:flex absolute inset-0 items-center justify-center opacity-[0.03] pointer-events-none grayscale">
                <img src="/images/anwar-logo.png" alt="Watermark" className="w-[80%] object-contain" />
              </div>

              {/* Receipt Header Banner - Professional Design */}
              <div className="flex justify-between items-start border-b-[4px] border-slate-900 pb-6 mb-8 gap-6 relative z-10">
                <div className="flex flex-col">
                  <h1 className="text-4xl font-black text-slate-900 uppercase tracking-widest mb-1">فاتورة مبيعات</h1>
                  <span className="text-slate-500 font-bold tracking-[0.2em] uppercase text-sm">Official Invoice</span>
                  
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-slate-500 font-bold text-sm bg-slate-100 p-1 rounded text-center">رقم الفاتورة</span>
                      <span className="font-mono font-black text-xl text-slate-900">{selectedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-slate-500 font-bold text-sm bg-slate-100 p-1 rounded text-center">تاريخ الإصدار</span>
                      <span className="font-mono font-bold text-base text-slate-800">{selectedInvoice.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-left flex flex-col items-end">
                  <img src="/images/anwar-logo.png" alt="Logo" className="w-28 h-28 object-contain mb-2 print:exact-colors drop-shadow-sm" />
                  <h2 className="text-2xl font-black text-slate-900">{settings?.companyName || "أنوار الإبداع للطاقة المتجددة"}</h2>
                  <p className="text-slate-500 text-sm mt-1 font-bold">تجهيز، تركيب، وصيانة الألواح والبطاريات الهجينة.</p>
                  <p className="text-slate-800 text-base mt-2 font-mono font-bold">{settings?.companyPhone || "07712345678"}</p>
                  <p className="text-slate-600 text-sm font-semibold">{settings?.companyAddress || "بغداد، العراق"}</p>
                </div>
              </div>

              {/* Customer Profile brief */}
              <div className="mb-8 grid grid-cols-2 gap-8 relative z-10">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">بيانات العميل (Billed To)</h4>
                  <p className="font-black text-2xl text-slate-900">{selectedInvoice.customerName}</p>
                  <p className="font-mono font-bold text-slate-700 text-lg">{selectedInvoice.customerPhone}</p>
                  <p className="text-slate-600 font-medium">{selectedInvoice.customerAddress || 'العنوان غير محدد'}</p>
                </div>
                <div className="space-y-2 border-r-2 border-slate-100 pr-8 text-right">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">شروط الدفع والتفاصيل (Terms)</h4>
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg mb-2 border border-slate-100">
                    <span className="text-slate-600 font-bold text-sm">طريقة الدفع:</span>
                    <span className="font-black text-lg text-slate-800">
                      {selectedInvoice.invoiceType === 'cash' ? 'نقدي (Cash)' : 
                       selectedInvoice.invoiceType === 'partial' ? 'ذمم مفتوحة' :
                       selectedInvoice.invoiceType === 'installment' ? 'أقساط مجدولة' : 'ماستركارد'}
                    </span>
                  </div>
                  {selectedInvoice.notes && (
                    <div className="mt-2 p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 text-sm font-bold">
                      <span className="block text-xs text-amber-700 mb-1">ملاحظات الفاتورة:</span>
                      {selectedInvoice.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table - Clean and Professional */}
              <div className="mb-8 relative z-10 min-h-[250px]">
                <table className="w-full text-right text-sm border-collapse rounded-lg overflow-hidden border border-slate-200">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-3 px-4 font-black border border-slate-800 w-12 text-center">#</th>
                      <th className="py-3 px-4 font-black border border-slate-800">البيان / تفاصيل المادة</th>
                      <th className="py-3 px-4 font-black text-center border border-slate-800 w-24">الكمية</th>
                      <th className="py-3 px-4 font-black text-left border border-slate-800 w-40">السعر المفرد</th>
                      <th className="py-3 px-4 font-black text-left border border-slate-800 w-40">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800 font-semibold bg-white">
                    {parseJsonArray(selectedInvoice.items).map((item: any, i: number) => (
                      <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-4 px-4 border-x border-slate-200 text-center text-slate-400 font-mono">{i + 1}</td>
                        <td className="py-4 px-4 border-x border-slate-200 font-bold text-slate-900 text-base">{item.name}</td>
                        <td className="py-4 px-4 border-x border-slate-200 text-center font-mono font-bold text-lg">{item.quantity}</td>
                        <td className="py-4 px-4 border-x border-slate-200 text-left font-mono">{formatIQD(item.sellingPrice)}</td>
                        <td className="py-4 px-4 border-x border-slate-200 text-left font-mono font-black text-slate-900">{formatIQD(item.sellingPrice * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Partial Payments History */}
              {selectedInvoice.invoiceType === 'partial' && selectedInvoicePayments.length > 0 && (
                <div className="mb-8 relative z-10">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">سجل الدفعات والتسديدات</h4>
                  <table className="w-full text-right text-sm border-collapse rounded-lg overflow-hidden border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="py-2 px-4 font-black border border-slate-200 w-12 text-center">#</th>
                        <th className="py-2 px-4 font-black border border-slate-200 text-left">المبلغ المسدد</th>
                        <th className="py-2 px-4 font-black border border-slate-200 text-left w-40">التاريخ</th>
                        <th className="py-2 px-4 font-black border border-slate-200 text-left w-40">المستلم</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {selectedInvoicePayments.map((p, i) => (
                        <tr key={i} className="border-b border-slate-200">
                          <td className="py-2 px-4 border-x border-slate-200 text-center text-slate-500 font-mono">{i + 1}</td>
                          <td className="py-2 px-4 border-x border-slate-200 text-left font-mono font-black text-emerald-700">{formatIQD(p.amount)}</td>
                          <td className="py-2 px-4 border-x border-slate-200 text-left font-bold text-slate-700">{p.date}</td>
                          <td className="py-2 px-4 border-x border-slate-200 text-left font-bold text-slate-700">{p.user}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals Section */}
              <div className="flex justify-between items-start mb-12 relative z-10 mt-auto pt-8">
                
                {/* Signatures Area */}
                <div className="w-1/2 flex gap-12 pt-4 opacity-70 print:opacity-100">
                  <div className="flex-1 flex flex-col items-center">
                    <span className="font-bold text-slate-600 text-sm mb-12">توقيع الموظف المستلم / ختم الشركة</span>
                    <div className="w-full border-t-2 border-dashed border-slate-400"></div>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <span className="font-bold text-slate-600 text-sm mb-12">توقيع العميل بالاستلام والموافقة</span>
                    <div className="w-full border-t-2 border-dashed border-slate-400"></div>
                  </div>
                </div>

                {/* Calculations */}
                <div className="w-96 bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-slate-50">
                        <td className="py-3 px-4 text-slate-600 font-bold">المجموع الفرعي:</td>
                        <td className="py-3 px-4 text-left font-mono font-bold text-slate-700">{formatIQD(selectedInvoice.totalAmount)}</td>
                      </tr>
                      {selectedInvoice.discount > 0 && (
                        <tr className="bg-rose-50/50">
                          <td className="py-3 px-4 text-rose-600 font-bold">الخصم الممنوح:</td>
                          <td className="py-3 px-4 text-left font-mono font-bold text-rose-600">-{formatIQD(selectedInvoice.discount)}</td>
                        </tr>
                      )}
                      <tr className="bg-slate-900 text-white">
                        <td className="py-4 px-4 font-black text-lg">الصافي الكلي:</td>
                        <td className="py-4 px-4 text-left font-mono font-black text-xl tracking-wider">{formatIQD(selectedInvoice.finalAmount)}</td>
                      </tr>
                      {(selectedInvoice.invoiceType === 'partial' || selectedInvoice.invoiceType === 'installment' || selectedInvoice.invoiceType === 'mastercard') && (
                        <>
                          <tr className="bg-emerald-50">
                            <td className="py-3 px-4 text-emerald-800 font-bold border-b border-emerald-100">المبلغ المدفوع (مقدمة):</td>
                            <td className="py-3 px-4 text-left font-mono font-black text-emerald-800 border-b border-emerald-100">{formatIQD(selectedInvoice.finalAmount - selectedInvoice.remainingAmount)}</td>
                          </tr>
                          <tr className="bg-rose-100 border-t-2 border-rose-200">
                            <td className="py-4 px-4 text-rose-900 font-black text-lg">المتبقي للشركة:</td>
                            <td className="py-4 px-4 text-left font-mono font-black text-rose-900 text-xl">{formatIQD(selectedInvoice.remainingAmount)}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer text */}
              <div className="pt-4 border-t-2 border-slate-900 text-center opacity-60 print:opacity-100 relative z-10">
                <p className="text-sm font-black text-slate-800">تعتبر هذه الفاتورة سنداً مالياً يثبت استلام وتسليم البضائع وفق الشروط والأحكام المعتمدة.</p>
                <p className="text-xs font-bold text-slate-500 mt-1">تم إصدار هذا السند بواسطة الموظف: <span className="text-slate-800">{selectedInvoice.createdBy}</span> | {selectedInvoice.date}</p>
              </div>

              {/* If invoice was cancelled */}
              {selectedInvoice.status === 'cancelled' && (
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-rose-800 text-sm shadow-sm relative overflow-hidden">
                  <div className="absolute -left-6 -top-6 rotate-[-45deg] bg-rose-600 text-white font-black py-1 px-10 text-[10px] shadow-sm uppercase tracking-widest opacity-80">Cancelled</div>
                  <h5 className="font-black mb-2 text-rose-900 text-base flex items-center gap-2"><ClipboardX className="w-5 h-5"/> فاتورة ملغاة وتالفة</h5>
                  <p className="font-bold">سبب الإلغاء: {selectedInvoice.cancellationReason}</p>
                  <p className="mt-3 text-xs text-rose-600 font-semibold bg-white/50 p-2 rounded-lg inline-block border border-rose-100/50">تم الإلغاء بمعرفة الموظّف المسؤول: {selectedInvoice.cancelledBy}</p>
                </div>
              )}

              {/* Delivery image proof display and option */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-8 text-sm font-medium print:hidden">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="block text-slate-800 font-black mb-3 flex items-center gap-2"><Upload className="w-4 h-4 text-amber-500"/> صورة إثبات التوصيل والتشغيل الميداني:</span>
                  {selectedInvoice.deliveryProofImage ? (
                    <img
                      src={selectedInvoice.deliveryProofImage}
                      className="w-full h-48 object-cover rounded-xl border border-slate-200 shadow-inner"
                      alt="اثبات التوصيل الفعلي"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-48 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3 hover:bg-slate-50 transition-colors">
                      <span className="font-bold">لم يرفع إثبات فوتوغرافي في الملف.</span>
                      <label className="text-xs bg-amber-500 text-white px-4 py-2 rounded-lg font-black hover:bg-amber-600 cursor-pointer shadow-sm transition-all">
                        انقر لتحميل وإرفاق إثبات
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadProof(e, selectedInvoice.id)}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-end gap-3 text-xs text-slate-500 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <p className="font-bold flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> الموظف المدخل للفاتورة: <span className="text-slate-800">{selectedInvoice.createdBy}</span></p>
                  <p className="font-bold flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> تتبع إدارات الصيانة والتشغيل يرتبط بهذا المرجع تلقائياً.</p>
                </div>
              </div>

            </div>

            {/* Footer buttons controls */}
            <div className="p-5 bg-white/80 border-t border-slate-200 shrink-0 flex gap-4 justify-between items-center print:hidden backdrop-blur-md">
              <div>
                {selectedInvoice.status === 'active' && (permissions.sales.delete || permissions.invoices.delete) && (
                  <button
                    onClick={() => handleCancelInvoiceClick(selectedInvoice.id)}
                    className="px-5 py-2.5 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white rounded-xl text-sm font-black transition-all shadow-sm border border-rose-100 hover:border-rose-500"
                  >
                    إلغاء وتلف الفاتورة
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-8 py-2.5 bg-slate-900/90 hover:bg-slate-950 text-white rounded-xl text-sm font-black shadow-md transition-all active:scale-95"
              >
                إغلاق المعاينة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-[95%] max-w-lg glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 flex flex-col">
            <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between shadow-sm">
              <h4 className="font-black text-base flex items-center gap-2"><ClipboardX className="w-5 h-5"/> إلغاء الفواتير واسترداد المخزون تلقائياً</h4>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-rose-200 hover:text-white bg-rose-700/50 hover:bg-rose-700 p-1.5 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 text-sm space-y-6 bg-white/60">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 shadow-inner">
                <p className="font-black mb-2 text-rose-800 uppercase tracking-wide">تحذير: عملية الإلغاء حاسمة ولا يمكن التراجع عنها!</p>
                <p className="leading-relaxed font-medium">بعد تأكيد الإلغاء، سيقوم النظام تلقائياً باسترداد وإدراج كميات البضائع ومحولات ومكثفات المنظومة إلى المخازن الرئيسية، وإلغاء قيود الأقساط التاريخية.</p>
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-2">اكتب سبب إلغاء وتلف هذا السند المالي <span className="text-rose-500">*</span></label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 resize-none h-32 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm font-medium"
                  placeholder="مثال: تلف عاكس موست في موقع الزبون أثناء الفحص واستبدالها بوحدة جديدة وفاتورة جديدة..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-white text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 transition-all"
                >
                  تراجع
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                      <span>جاري الإلغاء وتعديل المخزون...</span>
                    </>
                  ) : (
                    <span>تأكيد إلغاء وتلف السند</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PARTIAL PAYMENTS MODAL */}
      {isPartialModalOpen && partialInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="w-[95%] max-w-xl glass-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/80 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900/95 backdrop-blur-xl text-slate-100 px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
              <h4 className="font-black text-base flex items-center gap-3">
                <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg"><Landmark className="w-5 h-5" /></div>
                تسديد دفعة مالية - فاتورة ذمم جزئية
              </h4>
              <button onClick={() => setIsPartialModalOpen(false)} className="text-slate-400 hover:text-white rounded-full p-2 bg-white/5 hover:bg-rose-500 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 md:p-8 text-sm space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white/60">
              {/* Invoice brief */}
              <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">رقم الفاتورة: <span className="font-black font-mono text-slate-950 text-base ml-2">{partialInvoice.invoiceNumber}</span></div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">العميل: <span className="font-black text-slate-950 text-base ml-2">{partialInvoice.customerName}</span></div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">القيمة الكلية: <span className="font-black text-slate-950 text-base font-mono ml-2">{formatIQD(partialInvoice.finalAmount)}</span></div>
                <div className="text-rose-700 font-black bg-rose-50 px-3 py-2.5 rounded-xl border border-rose-100 flex items-center justify-between">المتبقي: <span className="font-mono text-lg">{formatIQD(partialInvoice.remainingAmount)}</span></div>
              </div>

              {/* Payment History */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <h5 className="font-black text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg"><Clock className="w-4 h-4" /></div>
                  سجل الدفعات المسددة سابقاً
                </h5>
                {partialLoading && partialPayments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 font-bold flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري تحميل السجل...</span>
                  </div>
                ) : partialPayments.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-500 font-bold">لم يتم تسديد أي دفعات سابقة على هذا السند المالي.</div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto custom-scrollbar divide-y divide-slate-100 font-medium bg-slate-50/30">
                    {partialPayments.map((p, idx) => (
                      <div key={p.id || idx} className="p-4 flex justify-between items-center hover:bg-white transition-colors">
                        <div>
                          <div className="font-black font-mono text-slate-900 text-base">{formatIQD(p.amount)}</div>
                          {p.notes && <div className="text-slate-500 mt-1 text-xs italic">{p.notes}</div>}
                        </div>
                        <div className="text-left font-mono text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                          <div className="font-bold text-xs">{p.date}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-sans">{p.user}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Payment Form */}
              {partialInvoice.remainingAmount > 0 ? (
                <form onSubmit={handleAddPartialPayment} className="space-y-5 pt-5 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block font-black text-slate-800 mb-2">مبلغ الدفعة الجديدة (د.ع) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        value={newPartialAmount}
                        max={partialInvoice.remainingAmount}
                        onChange={(e) => setNewPartialAmount(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-blue-900"
                        placeholder="أدخل المبلغ المسدد..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-black text-slate-800 mb-2">ملاحظات / رقم الإيصال</label>
                      <input
                        type="text"
                        value={newPartialNotes}
                        onChange={(e) => setNewPartialNotes(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        placeholder="رقم الوصل، ملاحظة..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsPartialModalOpen(false)}
                      className="px-6 py-3 bg-slate-100 hover:bg-white text-slate-700 rounded-xl font-bold border border-slate-200 transition-all shadow-sm"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={partialLoading || !newPartialAmount}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95"
                    >
                      {partialLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                          <span>جاري الحفظ...</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-5 h-5" />
                          تأكيد وقيد الدفعة الحالية
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-black text-center text-lg shadow-sm flex items-center justify-center gap-3">
                  <CheckSquare className="w-6 h-6"/>
                  تم تسديد هذه الفاتورة بالكامل! الرصيد المتبقي صفر.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingInvoice && (
        <InvoiceEditModal
          invoice={editingInvoice}
          onClose={() => { setIsEditModalOpen(false); setEditingInvoice(null); }}
          onSuccess={() => { setIsEditModalOpen(false); setEditingInvoice(null); loadInvoices(); }}
        />
      )}

      {/* SEPARATE PRINT LAYOUT PORTAL */}
      {selectedInvoice && createPortal(
        <div className="hidden print:block print-portal-container text-black bg-white" dir="rtl" style={{ padding: '1cm', boxSizing: 'border-box' }}>

          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
            <div className="flex flex-col gap-1">
              <img src="/images/anwar-logo.png" alt="Logo" className="w-20 h-20 object-contain mb-1" />
              <h1 className="text-xl font-black text-slate-900">{settings?.companyName || "أنوار الإبداع للطاقة المتجددة"}</h1>
              <p className="text-slate-600 text-xs">{settings?.companyAddress || "بغداد، العراق"}</p>
              <p className="text-slate-600 text-xs font-mono">{settings?.companyPhone || "07712345678"}</p>
            </div>
            <div className="text-left flex flex-col items-end">
              <h2 className="text-3xl font-black text-slate-200 uppercase mb-2">INVOICE</h2>
              <div className="text-xs space-y-1 text-right w-48">
                <div className="flex gap-2 justify-between border-b pb-1">
                  <span className="text-slate-500">رقم الفاتورة:</span>
                  <span className="font-bold font-mono">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex gap-2 justify-between border-b pb-1">
                  <span className="text-slate-500">تاريخ الإصدار:</span>
                  <span className="font-bold font-mono">{selectedInvoice.date}</span>
                </div>
                <div className="flex gap-2 justify-between border-b pb-1">
                  <span className="text-slate-500">تمت الطباعة:</span>
                  <span className="font-bold font-mono" dir="ltr">{new Date().toLocaleString('en-IQ', { hour12: true, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2 text-sm border-b pb-1">بيانات العميل</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">الاسم الكريم:</span>
                <span className="font-bold text-sm">{selectedInvoice.customerName}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">رقم الهاتف:</span>
                <span className="font-bold font-mono text-sm">{selectedInvoice.customerPhone}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block mb-0.5">العنوان:</span>
                <span className="font-bold text-sm">{selectedInvoice.customerAddress || 'غير محدد'}</span>
              </div>
              {selectedInvoice.notes && (
               <div className="col-span-2">
                  <span className="text-slate-500 block mb-0.5">الملاحظات:</span>
                  <span className="font-semibold">{selectedInvoice.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-right mb-6 border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-xs">
                <th className="p-2 border border-slate-800 w-1/2">البيان / تفاصيل المادة</th>
                <th className="p-2 border border-slate-800 text-center">الكمية</th>
                <th className="p-2 border border-slate-800 text-left">السعر المفرد</th>
                <th className="p-2 border border-slate-800 text-left">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-800">
              {parseJsonArray(selectedInvoice.items).map((item: any, i: number) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="p-2 border-x border-slate-200 font-bold">{item.name}</td>
                  <td className="p-2 border-x border-slate-200 text-center font-mono">{item.quantity}</td>
                  <td className="p-2 border-x border-slate-200 text-left font-mono">{formatIQD(item.sellingPrice)}</td>
                  <td className="p-2 border-x border-slate-200 text-left font-mono font-bold">{formatIQD(item.sellingPrice * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-1/2">
              <table className="w-full text-xs text-slate-800">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-1.5 text-slate-500 font-bold">المجموع الفرعي:</td>
                    <td className="p-1.5 text-left font-mono font-bold">{formatIQD(selectedInvoice.totalAmount)}</td>
                  </tr>
                  {selectedInvoice.discount > 0 && (
                    <tr className="border-b border-slate-200 text-rose-600">
                      <td className="p-1.5 font-bold">الخصم الممنوح:</td>
                      <td className="p-1.5 text-left font-mono font-bold">-{formatIQD(selectedInvoice.discount)}</td>
                    </tr>
                  )}
                  {(selectedInvoice.mastercardFee > 0 || selectedInvoice.mastercard_fee > 0) && (
                    <tr className="border-b border-slate-200 text-amber-700">
                      <td className="p-1.5 font-bold">رسوم الماستركارد المضافة:</td>
                      <td className="p-1.5 text-left font-mono font-bold">{formatIQD(selectedInvoice.mastercardFee || selectedInvoice.mastercard_fee)}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-100 border-b-2 border-slate-800 text-base">
                    <td className="p-2 font-black text-slate-900">الصافي المقبوض كلياً:</td>
                    <td className="p-2 text-left font-mono font-black text-slate-900">{formatIQD(selectedInvoice.finalAmount)}</td>
                  </tr>
                  {selectedInvoice.remainingAmount > 0 && (
                    <tr className="bg-rose-50 text-rose-800 text-sm">
                      <td className="p-2 font-bold">المتبقي للشركة (ذمم/أقساط):</td>
                      <td className="p-2 text-left font-mono font-bold">{formatIQD(selectedInvoice.remainingAmount)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-700 mt-10">
            <div>
              <p className="mb-8">توقيع الموظف المستلم / ختم الشركة</p>
              <div className="border-b-2 border-dashed border-slate-400 w-3/4 mx-auto"></div>
            </div>
            <div>
              <p className="mb-8">توقيع العميل بالاستلام والموافقة</p>
              <div className="border-b-2 border-dashed border-slate-400 w-3/4 mx-auto"></div>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2">
            <p>تعتبر هذه الفاتورة سنداً مالياً يثبت استلام وتسليم البضائع وفق الشروط والأحكام المعتمدة.</p>
            <p>تم إدراج هذا السند بواسطة الموظف: {selectedInvoice.createdBy}</p>
          </div>

        </div>,
        document.body
      )}

    </div>
  );
}
