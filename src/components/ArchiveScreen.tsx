/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import { Archive, Plus, Search, Edit2, Trash2, X, Calendar, User, Phone, Save, Battery, Zap, Sun, MapPin, Printer, Coins } from 'lucide-react';
import type { ArchiveRecord } from '../types';

interface ArchiveScreenProps {
  permissions: any;
}

export default function ArchiveScreen({ permissions }: ArchiveScreenProps) {
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [printSingleRecord, setPrintSingleRecord] = useState<ArchiveRecord | null>(null);
  
  const [formData, setFormData] = useState<Partial<ArchiveRecord>>({
    customerName: '',
    installationDate: '',
    systemSize: '',
    customerPhone: '',
    inverterSize: '',
    batteriesCount: '',
    panelsCount: '',
    installationLocation: '',
    notes: '',
    price: undefined
  });

  const loadRecords = async () => {
    try {
      setLoading(true);
      const [archivesRes, customersRes, settingsRes] = await Promise.all([
        api.getArchives(),
        api.getCustomers(1, 2000, '').catch(() => ({ data: [], total: 0 })),
        api.getSettings().catch(() => null)
      ]);
      setRecords(archivesRes || []);
      setCustomers(customersRes.data || customersRes || []);
      setSettings(settingsRes);
    } catch (err: any) {
      toast.error('فشل في تحميل بيانات الأرشيف: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleOpenModal = (record?: ArchiveRecord) => {
    if (record) {
      setFormData({ ...record });
      setIsEditing(true);
    } else {
      setFormData({
        customerName: '',
        installationDate: new Date().toISOString().split('T')[0],
        systemSize: '',
        customerPhone: '',
        inverterSize: '',
        batteriesCount: '',
        panelsCount: '',
        installationLocation: '',
        notes: '',
        price: undefined
      });
      setIsEditing(false);
      setIsNewCustomer(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName) {
      toast.error('اسم الزبون مطلوب');
      return;
    }

    try {
      if (isEditing && formData.id) {
        const updated = await api.updateArchive(formData.id, formData);
        setRecords(records.map(r => r.id === updated.id ? updated : r));
        toast.success('تم تحديث السجل بنجاح');
      } else {
        const created = await api.createArchive(formData);
        setRecords([created, ...records]);
        toast.success('تمت الإضافة إلى الأرشيف بنجاح');
      }
      handleCloseModal();
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    }
  };

  const handleDelete = (id: number, name: string) => {
    toast(`هل أنت متأكد من حذف السجل الخاص بـ ${name}؟`, {
      action: {
        label: 'حذف',
        onClick: async () => {
          try {
            await api.deleteArchive(id);
            setRecords(records.filter(r => r.id !== id));
            toast.success('تم حذف السجل بنجاح');
          } catch (err: any) {
            toast.error('فشل الحذف: ' + err.message);
          }
        }
      },
      cancel: { label: 'إلغاء', onClick: () => {} }
    });
  };

  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printCustomDate, setPrintCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [printCustomTitle, setPrintCustomTitle] = useState<string>('');
  const [printCustomNotes, setPrintCustomNotes] = useState<string>('');

  const handleOpenPrintPreview = (record: ArchiveRecord | null) => {
    setPrintSingleRecord(record);
    setPrintCustomDate(new Date().toISOString().split('T')[0]);
    setPrintCustomTitle(record ? 'سجل أرشيف عميل (وثيقة رسمية)' : 'جدول أرشيف المنظومات القديمة');
    setPrintCustomNotes('');
    setIsPrintPreviewOpen(true);
  };

  const handleTriggerPrint = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const filteredRecords = records.filter(r => 
    r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.customerPhone && r.customerPhone.includes(searchQuery)) ||
    (r.installationLocation && r.installationLocation.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderPrintPortal = () => {
    const isSingle = printSingleRecord !== null;
    const recordsToPrint = isSingle ? [printSingleRecord] : filteredRecords;
    const totalPriceSum = recordsToPrint.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
    const companyName = settings?.companyName || 'أنوار الإبداع للطاقة الشمسية';
    const companyPhone = settings?.companyPhone || '';
    const companyAddress = settings?.companyAddress || '';

    return createPortal(
      <div className="hidden print:block print-portal-container text-slate-900 bg-white" dir="rtl" style={{ margin: 0, padding: '20px 25px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
        {/* Header with Logo Image */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img
              src="/images/anwar-logo-dark.png"
              alt="Logo"
              className="h-16 w-auto object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{companyName}</h1>
              <p className="text-xs text-slate-600 mt-1 font-semibold">
                {companyAddress && <span>{companyAddress}</span>}
                {companyPhone && <span className="mr-3">هاتف: {companyPhone}</span>}
              </p>
            </div>
          </div>
          <div className="text-left">
            <h2 className="text-base font-bold text-slate-900 bg-slate-100 border border-slate-300 px-3 py-1 rounded inline-block">
              {printCustomTitle || (isSingle ? 'سجل أرشيف عميل (وثيقة رسمية)' : 'جدول أرشيف المنظومات القديمة')}
            </h2>
            <p className="text-[11px] text-slate-600 font-mono font-bold mt-1">
              تاريخ الطباعة: {printCustomDate || new Date().toLocaleDateString('ar-IQ')}
            </p>
          </div>
        </div>

        {/* Summary Info Bar */}
        <div className="bg-slate-50 border border-slate-400 rounded p-3 mb-5 flex justify-between items-center text-xs font-bold">
          <div>
            <span className="text-slate-700">عدد السجلات: </span>
            <span className="font-mono text-slate-900">{recordsToPrint.length}</span>
          </div>
          {searchQuery && !isSingle && (
            <div>
              <span className="text-slate-700">تصفية البحث: </span>
              <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">{searchQuery}</span>
            </div>
          )}
          <div>
            <span className="text-slate-700">إجمالي المبالغ المسجلة: </span>
            <span className="font-black text-slate-900 font-mono">{formatIQD(totalPriceSum)}</span>
          </div>
        </div>

        {/* Single Record Detailed Classic View OR Full Table View */}
        {isSingle ? (
          <div className="border-2 border-slate-800 rounded-lg p-6 space-y-6 my-4 bg-slate-50/40">
            <div className="border-b border-slate-300 pb-3 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">العميل: {printSingleRecord.customerName}</h3>
              {printSingleRecord.customerPhone && (
                <span className="text-sm font-mono dir-ltr font-bold text-slate-800 border border-slate-300 px-3 py-1 rounded bg-white">
                  {printSingleRecord.customerPhone}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-300 p-3 rounded bg-white">
                <span className="text-slate-500 block mb-1 font-bold">تاريخ التنصيب</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{printSingleRecord.installationDate || 'غير محدد'}</span>
              </div>
              <div className="border border-slate-300 p-3 rounded bg-white">
                <span className="text-slate-500 block mb-1 font-bold">السعر / الكلفة (الأرشيف)</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  {printSingleRecord.price ? formatIQD(printSingleRecord.price) : 'غير مدخل'}
                </span>
              </div>
              <div className="border border-slate-300 p-3 rounded bg-white">
                <span className="text-slate-500 block mb-1 font-bold">حجم المنظومة</span>
                <span className="font-bold text-slate-900 text-sm">{printSingleRecord.systemSize || 'غير مدخل'}</span>
              </div>
              <div className="border border-slate-300 p-3 rounded bg-white">
                <span className="text-slate-500 block mb-1 font-bold">حجم الانفيرتر</span>
                <span className="font-bold text-slate-900 text-sm">{printSingleRecord.inverterSize || 'غير مدخل'}</span>
              </div>
              <div className="border border-slate-300 p-3 rounded bg-white">
                <span className="text-slate-500 block mb-1 font-bold">عدد وتفاصيل البطاريات</span>
                <span className="font-bold text-slate-900 text-sm">{printSingleRecord.batteriesCount || 'غير مدخل'}</span>
              </div>
              <div className="border border-slate-300 p-3 rounded bg-white">
                <span className="text-slate-500 block mb-1 font-bold">عدد وتفاصيل الألواح</span>
                <span className="font-bold text-slate-900 text-sm">{printSingleRecord.panelsCount || 'غير مدخل'}</span>
              </div>
              <div className="col-span-2 border border-slate-300 p-3 rounded bg-white">
                <span className="text-slate-500 block mb-1 font-bold">موقع التنصيب / العنوان</span>
                <span className="font-bold text-slate-900 text-sm">{printSingleRecord.installationLocation || 'غير مدخل'}</span>
              </div>
              {printSingleRecord.notes && (
                <div className="col-span-2 border border-slate-300 p-3 rounded bg-white">
                  <span className="text-slate-500 block mb-1 font-bold">الملاحظات</span>
                  <span className="text-slate-800 text-xs italic">{printSingleRecord.notes}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden border-2 border-slate-800 rounded">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-bold border-b-2 border-slate-800">
                  <th className="p-2 border-r border-slate-400 text-center w-8">#</th>
                  <th className="p-2 border-r border-slate-400">اسم الزبون</th>
                  <th className="p-2 border-r border-slate-400">الهاتف</th>
                  <th className="p-2 border-r border-slate-400">التاريخ</th>
                  <th className="p-2 border-r border-slate-400">المنظومة / الانفيرتر</th>
                  <th className="p-2 border-r border-slate-400">البطاريات والألواح</th>
                  <th className="p-2 border-r border-slate-400">الموقع</th>
                  <th className="p-2 border-r border-slate-400 text-left">السعر (د.ع)</th>
                  <th className="p-2">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {recordsToPrint.map((rec, idx) => (
                  <tr key={rec.id} className={`border-b border-slate-300 ${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
                    <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{rec.customerName}</td>
                    <td className="p-2 border-r border-slate-300 font-mono text-slate-800" dir="ltr">{rec.customerPhone || '-'}</td>
                    <td className="p-2 border-r border-slate-300 font-mono">{rec.installationDate || '-'}</td>
                    <td className="p-2 border-r border-slate-300">
                      <div>{rec.systemSize || '-'}</div>
                      {rec.inverterSize && <div className="text-[10px] text-slate-600">انفيرتر: {rec.inverterSize}</div>}
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <div>بطاريات: {rec.batteriesCount || '-'}</div>
                      <div>ألواح: {rec.panelsCount || '-'}</div>
                    </td>
                    <td className="p-2 border-r border-slate-300">{rec.installationLocation || '-'}</td>
                    <td className="p-2 border-r border-slate-300 font-mono font-bold text-left text-slate-900">
                      {rec.price ? formatIQD(rec.price) : '-'}
                    </td>
                    <td className="p-2 text-slate-600 italic max-w-[120px] truncate">{rec.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-200 font-bold text-slate-900 border-t-2 border-slate-800">
                  <td colSpan={7} className="p-2 border-r border-slate-400 text-left">المجموع الكلي:</td>
                  <td className="p-2 border-r border-slate-400 font-mono text-left">{formatIQD(totalPriceSum)}</td>
                  <td className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {printCustomNotes && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 font-semibold">
            ملاحظة طباعة: {printCustomNotes}
          </div>
        )}

        {/* Classic Footer / Signatures Area */}
        <div className="mt-12 pt-6 border-t border-slate-400 flex justify-between items-center text-xs text-slate-800 font-bold">
          <div className="text-center w-48">
            <p className="mb-8">توقيع مسؤول الأرشيف</p>
            <p className="text-slate-400 font-mono">......................................</p>
          </div>
          <div className="text-center text-[10px] text-slate-500 italic">
          </div>
          <div className="text-center w-48">
            <p className="font-bold mb-8">توقيع المحاسب / الإدارة</p>
            <div className="border-b border-dashed border-slate-400 w-full"></div>
          </div>
        </div>

        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            .print-portal-container {
              width: 100% !important;
              background: white !important;
              color: black !important;
            }
            .print-portal-container * {
              box-sizing: border-box !important;
            }
          }
        `}</style>
      </div>,
      document.body
    );
  };

  return (
    <div className="space-y-8 animate-fade-in relative z-10 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-200/50">
            <Archive className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">الأرشيف الورقي القديم</h1>
            <p className="text-slate-500 text-sm mt-1.5 font-medium">إدارة وتوثيق منظومات العملاء القدامى غير المسجلين كفواتير في النظام.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleOpenPrintPreview(null)}
            className="px-5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl flex items-center gap-2 border border-amber-200/80 shadow-sm transition-all active:scale-95 text-sm cursor-pointer"
            title="طباعة سجلات الأرشيف كلاسيكياً"
          >
            <Printer className="w-4.5 h-4.5 text-amber-600" />
            طباعة الأرشيف
          </button>

          {permissions?.archive?.create && (
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95 text-sm"
            >
              <Plus className="w-4.5 h-4.5" />
              إضافة سجل جديد
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card p-5 rounded-[2rem] shadow-lg flex flex-col gap-5 border border-white/80">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 border border-white focus:ring-2 focus:ring-amber-500/50 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none shadow-sm transition-all text-slate-800 placeholder-slate-400"
              placeholder="بحث عن اسم الزبون، رقم الهاتف، أو موقع التنصيب..."
            />
          </div>
        </div>
      </div>

      {/* Records List */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          جاري تحميل الأرشيف...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-card text-center py-16 rounded-[2.5rem] shadow-sm text-slate-400 font-bold text-lg border border-white/50">
          لا توجد سجلات أرشيف متطابقة.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map(record => (
            <div key={record.id} className="glass-card rounded-[2rem] p-6 shadow-sm border border-white/60 flex flex-col justify-between group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden bg-white/50">
              {/* Card top border decoration */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500 opacity-70"></div>
              
              <div className="space-y-4 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-lg text-slate-800 group-hover:text-amber-600 transition-colors flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      {record.customerName}
                    </h3>
                    {record.customerPhone && (
                      <p className="text-slate-500 text-sm font-mono mt-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {record.customerPhone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-2 text-sm">
                  {record.price !== undefined && record.price > 0 && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                      <span className="text-slate-600 flex items-center gap-1.5 font-bold"><Coins className="w-3.5 h-3.5 text-amber-600"/> السعر / الكلفة</span>
                      <span className="font-black text-amber-700 font-mono">{formatIQD(record.price)}</span>
                    </div>
                  )}
                  {record.installationDate && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                      <span className="text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> تاريخ التنصيب</span>
                      <span className="font-bold text-slate-800 font-mono">{record.installationDate}</span>
                    </div>
                  )}
                  {record.systemSize && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                      <span className="text-slate-500 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5"/> حجم المنظومة</span>
                      <span className="font-bold text-slate-800 text-left max-w-[130px] truncate" title={record.systemSize}>{record.systemSize}</span>
                    </div>
                  )}
                  {record.inverterSize && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                      <span className="text-slate-500">حجم الانفيرتر</span>
                      <span className="font-bold text-slate-800">{record.inverterSize}</span>
                    </div>
                  )}
                  {record.batteriesCount && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                      <span className="text-slate-500 flex items-center gap-1.5"><Battery className="w-3.5 h-3.5"/> عدد البطاريات</span>
                      <span className="font-bold text-slate-800 text-left max-w-[130px] truncate" title={record.batteriesCount}>{record.batteriesCount}</span>
                    </div>
                  )}
                  {record.panelsCount && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                      <span className="text-slate-500 flex items-center gap-1.5"><Sun className="w-3.5 h-3.5"/> عدد الألواح</span>
                      <span className="font-bold text-slate-800 truncate max-w-[130px]">{record.panelsCount}</span>
                    </div>
                  )}
                  {record.installationLocation && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> الموقع</span>
                      <span className="font-bold text-slate-800 truncate max-w-[130px]">{record.installationLocation}</span>
                    </div>
                  )}
                </div>

                {record.notes && (
                  <div className="text-xs text-slate-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 italic line-clamp-2">
                    ملاحظات: {record.notes}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => handleOpenPrintPreview(record)}
                  className="p-2 bg-slate-50 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1 transition-colors border border-slate-200 text-sm shrink-0 cursor-pointer"
                  title="معاينة وطباعة هذا السجل"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                </button>
                {permissions?.archive?.edit && (
                  <button
                    onClick={() => handleOpenModal(record)}
                    className="flex-1 p-2 bg-slate-50 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200 text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    تعديل
                  </button>
                )}
                {permissions?.archive?.delete && (
                  <button
                    onClick={() => handleDelete(record.id, record.customerName)}
                    className="p-2 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-rose-200 shrink-0"
                    title="حذف السجل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-400" />
                {isEditing ? 'تعديل سجل الأرشيف' : 'إضافة سجل أرشيف ورقي'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white p-1.5 bg-white/5 hover:bg-rose-500 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {!isNewCustomer ? (
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-black text-slate-800">اختيار زبون مسجل *</label>
                      <button type="button" onClick={() => { setIsNewCustomer(true); setFormData({...formData, customerName: '', customerPhone: ''}); }} className="text-xs text-amber-600 hover:text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-lg">
                        + إضافة عميل جديد
                      </button>
                    </div>
                    <select
                      value={customers.find(c => c.name === formData.customerName)?.id || ''}
                      onChange={e => {
                        const selectedId = e.target.value;
                        if (selectedId) {
                          const customer = customers.find(c => c.id === parseInt(selectedId));
                          if (customer) {
                            setFormData({ ...formData, customerName: customer.name, customerPhone: customer.phone, installationLocation: customer.address });
                          }
                        } else {
                          setFormData({ ...formData, customerName: '', customerPhone: '', installationLocation: '' });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-bold"
                      required={!isNewCustomer}
                    >
                      <option value="">-- اختر عميلاً مسجلاً --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-black text-slate-800">اسم الزبون الجديد *</label>
                        <button type="button" onClick={() => setIsNewCustomer(false)} className="text-xs text-slate-500 hover:text-slate-700 font-bold bg-slate-100 px-3 py-1 rounded-lg">
                          عودة لاختيار عميل مسجل
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-bold"
                        placeholder="مثال: عمر محمود جاسم"
                        required={isNewCustomer}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-2">رقم هاتف الزبون</label>
                      <input
                        type="text"
                        value={formData.customerPhone}
                        onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-mono text-left"
                        placeholder="07710071135"
                        dir="ltr"
                        required={isNewCustomer}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">تاريخ التنصيب</label>
                  <input
                    type="date"
                    value={formData.installationDate || ''}
                    onChange={e => setFormData({ ...formData, installationDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2 flex items-center justify-between">
                    <span>السعر / الكلفة (د.ع)</span>
                    <span className="text-[11px] text-amber-600 font-medium">(خاص بالأرشيف فقط)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.price !== undefined && formData.price !== '' ? Number(formData.price).toLocaleString('en-US') : ''}
                    onChange={e => { const val = e.target.value.replace(/,/g, ''); setFormData({ ...formData, price: val !== '' && !isNaN(Number(val)) ? parseFloat(val) : undefined }); }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-mono font-bold"
                    placeholder="مثال: 1,500,000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">حجم المنظومة</label>
                  <input
                    type="text"
                    value={formData.systemSize}
                    onChange={e => setFormData({ ...formData, systemSize: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-medium"
                    placeholder="مثال: منظومة 16 امبير نهاري 16 امبير ليلي"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">حجم الانفيرتر</label>
                  <input
                    type="text"
                    value={formData.inverterSize}
                    onChange={e => setFormData({ ...formData, inverterSize: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-medium"
                    placeholder="مثال: 8000 Kw عدد 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">عدد البطاريات وتفاصيلها</label>
                  <input
                    type="text"
                    value={formData.batteriesCount}
                    onChange={e => setFormData({ ...formData, batteriesCount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-medium"
                    placeholder="مثال: 1 بطارية ليثيوم 300 امبير 51 فولت"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">عدد الألواح ونوعها</label>
                  <input
                    type="text"
                    value={formData.panelsCount}
                    onChange={e => setFormData({ ...formData, panelsCount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-medium"
                    placeholder="مثال: 8 لوح 610 واط بايفشل"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-black text-slate-800 mb-2">موقع التنصيب</label>
                  <input
                    type="text"
                    value={formData.installationLocation}
                    onChange={e => setFormData({ ...formData, installationLocation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-medium"
                    placeholder="مثال: ديالى / الخالص / دلي عباس"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-black text-slate-800 mb-2">ملاحظات إضافية (اختياري)</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all font-medium resize-none h-24"
                    placeholder="اكتب أي ملاحظات إضافية هنا..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex justify-center items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {isEditing ? 'حفظ التعديلات' : 'إضافة للأرشيف'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL — rendered via Portal to document.body for full interactivity */}
      {isPrintPreviewOpen && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)' }}
          dir="rtl"
        >
          {/* Controls Bar */}
          <div style={{ background: '#0f172a', color: 'white', padding: '16px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 40, height: 40, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>
                <Printer size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#f1f5f9' }}>معاينة وإعدادات طباعة الأرشيف الرسمية</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>يمكنك تعديل التاريخ والعنوان والملاحظات فورياً قبل تنفيذ الطباعة</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              {/* Date control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', padding: '8px 12px', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 900 }}>تاريخ الطباعة:</span>
                <input
                  type="text"
                  value={printCustomDate}
                  onChange={(e) => setPrintCustomDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  style={{ background: '#020617', color: 'white', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #475569', outline: 'none', width: 140, textAlign: 'center' }}
                />
                <input
                  type="date"
                  value={printCustomDate}
                  onChange={(e) => setPrintCustomDate(e.target.value)}
                  style={{ background: '#020617', color: '#f59e0b', fontWeight: 700, fontSize: 12, padding: '6px', borderRadius: 8, border: '1px solid #475569', cursor: 'pointer', width: 36 }}
                  title="اختر تاريخ من الرزنامة"
                />
                <button
                  type="button"
                  onClick={() => setPrintCustomDate(new Date().toISOString().split('T')[0])}
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d', fontWeight: 700, fontSize: 11, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer' }}
                >
                  اليوم
                </button>
              </div>

              {/* Title control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', padding: '8px 12px', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 900 }}>عنوان الوثيقة:</span>
                <input
                  type="text"
                  value={printCustomTitle}
                  onChange={(e) => setPrintCustomTitle(e.target.value)}
                  style={{ background: '#020617', color: 'white', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #475569', outline: 'none', width: 220 }}
                />
              </div>

              {/* Notes control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', padding: '8px 12px', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 900 }}>ملاحظات:</span>
                <input
                  type="text"
                  value={printCustomNotes}
                  onChange={(e) => setPrintCustomNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                  style={{ background: '#020617', color: 'white', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #475569', outline: 'none', width: 176 }}
                />
              </div>

              {/* Print button */}
              <button
                type="button"
                onClick={handleTriggerPrint}
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#f59e0b,#ea580c)', color: 'white', fontWeight: 900, borderRadius: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: '1px solid rgba(245,158,11,0.4)', boxShadow: '0 4px 12px rgba(245,158,11,0.25)' }}
              >
                <Printer size={16} />
                طباعة الآن
              </button>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsPrintPreviewOpen(false)}
                style={{ padding: 10, background: '#1e293b', color: '#94a3b8', borderRadius: 12, border: '1px solid #334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="إغلاق المعاينة"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Paper Preview Canvas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px', background: '#020617', display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'white', color: '#0f172a', width: '100%', maxWidth: '210mm', minHeight: '297mm', padding: '48px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', fontFamily: 'Arial, sans-serif', fontSize: 12, direction: 'rtl' }}>
              {/* Header */}
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img src="/images/anwar-logo-dark.png" alt="Logo" style={{ height: 64, width: 'auto', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{settings?.companyName || 'أنوار الإبداع للطاقة الشمسية'}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{settings?.companyAddress || 'العراق'}{settings?.companyPhone ? ` | هاتف: ${settings.companyPhone}` : ''}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 900, background: '#f1f5f9', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'inline-block', marginBottom: 4 }}>
                    {printCustomTitle || 'وثيقة أرشيف المنظومات'}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', fontWeight: 700 }}>التاريخ: {printCustomDate}</div>
                </div>
              </div>

              {/* Summary Bar */}
              <div style={{ background: '#f1f5f9', border: '1px solid #94a3b8', borderRadius: 8, padding: '10px 16px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1e293b' }}>
                <span>عدد السجلات: <span style={{ fontFamily: 'monospace', color: '#b45309' }}>{printSingleRecord ? 1 : filteredRecords.length}</span></span>
                <span>الإجمالي: <span style={{ fontFamily: 'monospace', color: '#065f46', fontWeight: 900 }}>{formatIQD((printSingleRecord ? [printSingleRecord] : filteredRecords).reduce((acc, curr) => acc + (Number(curr.price) || 0), 0))}</span></span>
              </div>

              {/* Content */}
              {printSingleRecord ? (
                <div style={{ border: '2px solid #0f172a', borderRadius: 12, padding: 24, background: '#f8fafc' }}>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>العميل: {printSingleRecord.customerName}</div>
                    {printSingleRecord.customerPhone && <div style={{ fontSize: 12, fontFamily: 'monospace', background: 'white', padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>{printSingleRecord.customerPhone}</div>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      ['تاريخ التنصيب', printSingleRecord.installationDate],
                      ['السعر (الأرشيف)', printSingleRecord.price ? formatIQD(printSingleRecord.price) : 'غير مدخل'],
                      ['حجم المنظومة', printSingleRecord.systemSize],
                      ['حجم الانفيرتر', printSingleRecord.inverterSize],
                      ['البطاريات', printSingleRecord.batteriesCount],
                      ['الألواح', printSingleRecord.panelsCount],
                    ].map(([label, val]) => (
                      <div key={label} style={{ border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: 8, background: 'white' }}>
                        <div style={{ color: '#64748b', marginBottom: 4, fontWeight: 700, fontSize: 11 }}>{label}</div>
                        <div style={{ fontWeight: 900, color: '#0f172a' }}>{val || 'غير مدخل'}</div>
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: 8, background: 'white' }}>
                      <div style={{ color: '#64748b', marginBottom: 4, fontWeight: 700, fontSize: 11 }}>الموقع</div>
                      <div style={{ fontWeight: 700 }}>{printSingleRecord.installationLocation || 'غير مدخل'}</div>
                    </div>
                    {printSingleRecord.notes && (
                      <div style={{ gridColumn: '1 / -1', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: 8, background: 'white' }}>
                        <div style={{ color: '#64748b', marginBottom: 4, fontWeight: 700, fontSize: 11 }}>الملاحظات</div>
                        <div style={{ fontStyle: 'italic', color: '#334155' }}>{printSingleRecord.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ border: '2px solid #0f172a', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#e2e8f0', fontWeight: 900, borderBottom: '2px solid #0f172a' }}>
                        {['#','اسم الزبون','الهاتف','التاريخ','المنظومة/الانفيرتر','البطاريات/الألواح','الموقع','السعر'].map(h => (
                          <th key={h} style={{ padding: '10px', borderRight: '1px solid #94a3b8' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((rec, idx) => (
                        <tr key={rec.id} style={{ background: idx % 2 === 1 ? '#f8fafc' : 'white', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0', fontWeight: 900 }}>{rec.customerName}</td>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0', fontFamily: 'monospace' }} dir="ltr">{rec.customerPhone || '-'}</td>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0', fontFamily: 'monospace' }}>{rec.installationDate || '-'}</td>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>{rec.systemSize || '-'}{rec.inverterSize ? ` / ${rec.inverterSize}` : ''}</td>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>{rec.batteriesCount || '-'} / {rec.panelsCount || '-'}</td>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>{rec.installationLocation || '-'}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 900 }}>{rec.price ? formatIQD(rec.price) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {printCustomNotes && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                  ملاحظة: {printCustomNotes}
                </div>
              )}

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, paddingTop: 24, borderTop: '2px solid #0f172a', textAlign: 'center', fontSize: 12, fontWeight: 900, marginTop: 48 }}>
                {['توقيع مسؤول الأرشيف', 'توقيع وتصديق الإدارة', 'التدقيق المالي'].map(label => (
                  <div key={label}>
                    <div style={{ marginBottom: 40, color: '#1e293b' }}>{label}</div>
                    <div style={{ color: '#94a3b8' }}>......................................</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Render Classic Print Portal */}
      {renderPrintPortal()}
    </div>
  );
}
