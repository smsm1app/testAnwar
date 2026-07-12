/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import { Archive, Plus, Search, Edit2, Trash2, X, Calendar, User, Phone, Save, Battery, Zap, Sun, MapPin } from 'lucide-react';
import type { ArchiveRecord } from '../types';

interface ArchiveScreenProps {
  permissions: any;
}

export default function ArchiveScreen({ permissions }: ArchiveScreenProps) {
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ArchiveRecord>>({
    customerName: '',
    installationDate: '',
    systemSize: '',
    customerPhone: '',
    inverterSize: '',
    batteriesCount: '',
    panelsCount: '',
    installationLocation: '',
    notes: ''
  });

  const loadRecords = async () => {
    try {
      setLoading(true);
      const [archivesRes, customersRes] = await Promise.all([
        api.getArchives(),
        api.getCustomers(1, 2000, '').catch(() => ({ data: [], total: 0 }))
      ]);
      setRecords(archivesRes || []);
      setCustomers(customersRes.data || customersRes || []);
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
        notes: ''
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

  const filteredRecords = records.filter(r => 
    r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.customerPhone && r.customerPhone.includes(searchQuery)) ||
    (r.installationLocation && r.installationLocation.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

        {permissions?.archive?.create && (
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95 text-sm shrink-0"
          >
            <Plus className="w-4.5 h-4.5" />
            إضافة سجل جديد
          </button>
        )}
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
                    className="p-2 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-rose-200"
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
    </div>
  );
}
