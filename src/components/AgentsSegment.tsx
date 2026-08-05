import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import { Briefcase, UserPlus, Phone, Edit2, Trash2, CreditCard, X, Receipt, Check, Users, Link, Unlink, History } from 'lucide-react';

export default function AgentsSegment({ permissions, onAddCustomer }: any) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  const [paymentAgent, setPaymentAgent] = useState<any>(null);
  const [payments, setPayments] = useState<{customerId: number, amount: string}[]>([]);

  const [manageCustomersAgentId, setManageCustomersAgentId] = useState<number | null>(null);
  const currentManageAgent = agents.find(a => a.id === manageCustomersAgentId);

  const [historyModalAgent, setHistoryModalAgent] = useState<any>(null);
  const [historyPayments, setHistoryPayments] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistoryModal = async (agent: any) => {
    setHistoryModalAgent(agent);
    setHistoryLoading(true);
    try {
      const res = await api.getAgentPayments(agent.id);
      setHistoryPayments(res || []);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء جلب سجل التسديدات');
    } finally {
      setHistoryLoading(false);
    }
  };

  const [linkModalAgent, setLinkModalAgent] = useState<any>(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState<any[]>([]);
  const [linkSearchLoading, setLinkSearchLoading] = useState(false);

  useEffect(() => {
    if (!linkModalAgent) return;
    const timer = setTimeout(async () => {
      setLinkSearchLoading(true);
      try {
        const res = await api.getCustomers(1, 15, linkSearchQuery);
        const allCusts = Array.isArray(res) ? res : (res.data || []);
        setLinkSearchResults(allCusts.filter((c: any) => c.agent_id !== linkModalAgent.id));
      } catch (e) {
        console.error(e);
      } finally {
        setLinkSearchLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [linkSearchQuery, linkModalAgent]);

  const handleLinkCustomer = async (customer: any) => {
    try {
      setActionLoading(true);
      await api.updateCustomer(customer.id, { agentId: linkModalAgent.id });
      toast.success('تم ربط العميل بالوكيل بنجاح');
      setLinkSearchResults(prev => prev.filter(c => c.id !== customer.id));
      await loadAgents();
    } catch (e: any) {
      toast.error(e.message || 'فشل ربط العميل');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkCustomer = async (customer: any) => {
    toast(`هل أنت متأكد من فك ارتباط العميل "${customer.name}"؟`, {
      action: {
        label: 'فك الارتباط',
        onClick: async () => {
          try {
            setActionLoading(true);
            await api.updateCustomer(customer.id, { agentId: null });
            toast.success('تم فك ارتباط العميل بنجاح');
            await loadAgents();
          } catch (e: any) {
            toast.error(e.message || 'فشل فك الارتباط');
          } finally {
            setActionLoading(false);
          }
        }
      },
      cancel: { label: 'إلغاء', onClick: () => {} }
    });
  };

  const loadAgents = async () => {
    try {
      setLoading(true);
      const res = await api.getAgents();
      setAgents(res || []);
    } catch (err: any) {
      toast.error(err.message || 'فشل تحميل الوكلاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleOpenForm = (agent: any = null) => {
    if (agent) {
      setEditingId(agent.id);
      setFormData({ name: agent.name, phone: agent.phone || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', phone: '' });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('الاسم مطلوب');
    
    try {
      setActionLoading(true);
      if (editingId) {
        await api.updateAgent(editingId, formData);
      } else {
        await api.createAgent(formData);
      }
      toast.success('تم الحفظ بنجاح');
      setIsFormOpen(false);
      loadAgents();
    } catch (err: any) {
      toast.error(err.message || 'فشل الحفظ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    toast(`هل أنت متأكد من حذف الوكيل "${name}"؟`, {
      action: {
        label: 'حذف',
        onClick: async () => {
          try {
            await api.deleteAgent(id);
            toast.success('تم الحذف');
            loadAgents();
          } catch (err: any) {
            toast.error(err.message || 'فشل الحذف');
          }
        }
      },
      cancel: { label: 'إلغاء', onClick: () => {} }
    });
  };

  const openPaymentModal = (agent: any) => {
    setPaymentAgent(agent);
    setPayments(agent.customers.map((c: any) => ({ customerId: c.id, amount: '' })));
  };

  const submitPayment = async () => {
    const validPayments = payments.map(p => ({ ...p, amount: parseFloat(p.amount) || 0 })).filter(p => p.amount > 0);
    if (validPayments.length === 0) return toast.error('لم تقم بإدخال أي مبالغ للسداد');

    try {
      setActionLoading(true);
      await api.payAgent(paymentAgent.id, validPayments);
      toast.success('تم تسجيل الدفعة بنجاح');
      setPaymentAgent(null);
      loadAgents();
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل الدفعة');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-card p-6 rounded-[2.5rem] shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">إدارة الوكلاء</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">أضف وكلاء وأدر عملائهم والدفعات المجمعة.</p>
          </div>
        </div>
        {permissions.customers.create && (
          <button 
            onClick={() => handleOpenForm()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            إضافة وكيل
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-[2rem] text-slate-400 font-bold">لا يوجد وكلاء.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(agent => (
            <div key={agent.id} className="glass-card rounded-[2rem] p-6 shadow-lg flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-xl text-slate-800">{agent.name}</h3>
                  <div className="flex gap-2">
                    {permissions.customers.edit && (
                      <button onClick={() => handleOpenForm(agent)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                    )}
                    {permissions.customers.delete && (
                      <button onClick={() => handleDelete(agent.id, agent.name)} className="p-2 bg-rose-50 text-rose-500 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                    )}
                  </div>
                </div>
                {agent.phone && (
                  <div className="flex items-center gap-2 mt-2 text-slate-600 text-sm font-bold">
                    <Phone className="w-4 h-4" />
                    <span>{agent.phone}</span>
                  </div>
                )}
                <div className="mt-4 p-4 bg-rose-50/50 rounded-xl border border-rose-100/50">
                  <div className="text-xs text-rose-600 font-bold mb-1">إجمالي الديون التراكمية على العملاء</div>
                  <div className="text-2xl font-black font-mono text-rose-700">{formatIQD(agent.totalUnpaid)}</div>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={() => setManageCustomersAgentId(agent.id)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
                >
                  <Users className="w-5 h-5" />
                  عرض وإدارة تفاصيل الوكيل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-scale-up shadow-2xl">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="font-black">{editingId ? 'تعديل وكيل' : 'إضافة وكيل'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="hover:text-rose-400"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الاسم</label>
                <input required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">رقم الهاتف</label>
                <input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-right font-mono" />
              </div>
              <button disabled={actionLoading} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl mt-4">
                {actionLoading ? 'جاري الحفظ...' : 'حفظ البيانات'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentAgent && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-50 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="bg-emerald-600 text-white p-5 flex justify-between items-center">
              <h3 className="font-black flex items-center gap-2"><CreditCard /> تسديد دفعة لوكيل ({paymentAgent.name})</h3>
              <button onClick={() => setPaymentAgent(null)} className="hover:text-rose-200"><X /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {paymentAgent.customers.length === 0 ? (
                <div className="text-center text-slate-500 font-bold py-10">لا يوجد عملاء لهذا الوكيل</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-slate-500 mb-4">أدخل المبالغ التي قام الوكيل بتسديدها لكل عميل:</div>
                  {paymentAgent.customers.map((c: any, idx: number) => {
                    const currentAmount = parseFloat(payments[idx]?.amount) || 0;
                    const remaining = (c.totalUnpaid || 0) - currentAmount;
                    return (
                      <div key={c.id} className="flex flex-col gap-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1.5 rounded-md border border-rose-100">
                              الدين: {formatIQD(c.totalUnpaid || 0)}
                            </div>
                            <input 
                              type="text"
                              inputMode="numeric"
                              placeholder="المبلغ (د.ع)"
                              value={payments[idx]?.amount ? Number(payments[idx]?.amount).toLocaleString('en-US') : ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/,/g, '');
                                if (!isNaN(Number(val)) || val === '') {
                                  const newP = [...payments];
                                  newP[idx].amount = val;
                                  setPayments(newP);
                                }
                              }}
                              className="w-32 border border-slate-300 p-2 rounded-lg font-mono text-center focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold"
                            />
                          </div>
                        </div>
                        {currentAmount > 0 && (
                          <div className="flex justify-end text-xs font-bold mt-1">
                            <span className={remaining < 0 ? "text-rose-500" : "text-emerald-600"}>
                              المتبقي بعد السداد: {formatIQD(remaining)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-5 bg-white border-t flex justify-end gap-3">
              <button onClick={() => setPaymentAgent(null)} className="px-6 py-2.5 bg-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-300">إلغاء</button>
              <button disabled={actionLoading} onClick={submitPayment} className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2">
                <Check className="w-5 h-5" />
                {actionLoading ? 'جاري السداد...' : 'تأكيد التسديد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Customer Modal */}
      {linkModalAgent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-scale-up shadow-2xl flex flex-col max-h-[80vh]">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <h3 className="font-black">ربط عميل موجود بالوكيل ({linkModalAgent.name})</h3>
              <button onClick={() => setLinkModalAgent(null)} className="hover:text-rose-400"><X /></button>
            </div>
            <div className="p-4 shrink-0 border-b border-slate-100">
              <input 
                type="text"
                placeholder="ابحث عن عميل (الاسم، الهاتف)..."
                value={linkSearchQuery}
                onChange={e => setLinkSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 rounded-xl p-3 text-sm font-semibold text-slate-800 outline-none transition-all text-right"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 custom-scrollbar">
              {linkSearchLoading ? (
                <div className="text-center py-8"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
              ) : linkSearchResults.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-bold text-sm">لم يتم العثور على عملاء.</div>
              ) : (
                <div className="space-y-2">
                  {linkSearchResults.map(c => (
                    <div key={c.id} className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between hover:border-indigo-300 transition-all">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                        <div className="text-xs text-slate-500 mt-1 font-mono font-bold">{c.phone}</div>
                      </div>
                      <button 
                        onClick={() => handleLinkCustomer(c)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg font-bold text-xs transition-all disabled:opacity-50"
                      >
                        ربط بالوكيل
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage Customers Modal */}
      {currentManageAgent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden animate-scale-up shadow-2xl flex flex-col max-h-[85vh]">
            <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-300" />
                  إدارة عملاء الوكيل: {currentManageAgent.name}
                </h3>
                <p className="text-indigo-200 text-sm mt-1">عرض وإدارة العملاء المسجلين تحت وصاية هذا الوكيل.</p>
              </div>
              <button onClick={() => setManageCustomersAgentId(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X /></button>
            </div>
            
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
              <button 
                onClick={() => { onAddCustomer(currentManageAgent.id); }}
                className="flex-1 bg-white border border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <UserPlus className="w-5 h-5" />
                إنشاء عميل جديد
              </button>
              <button 
                onClick={() => { setLinkModalAgent(currentManageAgent); setLinkSearchQuery(''); }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
              >
                <Link className="w-5 h-5" />
                ربط عميل موجود
              </button>
              <button 
                onClick={() => { setManageCustomersAgentId(null); openPaymentModal(currentManageAgent); }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-200"
              >
                <CreditCard className="w-5 h-5" />
                تسديد دفعة مجمعة
              </button>
              <button 
                onClick={() => { setManageCustomersAgentId(null); openHistoryModal(currentManageAgent); }}
                className="bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-200"
              >
                <History className="w-5 h-5" />
                سجل التسديدات
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
              {currentManageAgent.customers?.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <div className="text-slate-500 font-bold text-lg">لا يوجد عملاء مرتبطين بهذا الوكيل</div>
                  <div className="text-slate-400 text-sm mt-1">قم بإضافة عميل جديد أو ربط عميل مسجل مسبقاً.</div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-right">
                    <thead className="bg-slate-100/80 text-slate-600 text-xs uppercase font-black">
                      <tr>
                        <th className="px-6 py-4">اسم العميل</th>
                        <th className="px-6 py-4">رقم الهاتف</th>
                        <th className="px-6 py-4 text-center">إجمالي الديون</th>
                        <th className="px-6 py-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentManageAgent.customers.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                          <td className="px-6 py-4 text-slate-600 font-mono text-sm">{c.phone || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block px-3 py-1 bg-rose-50 text-rose-600 font-bold font-mono rounded-lg border border-rose-100 text-sm">
                              {formatIQD(c.totalUnpaid || 0)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => handleUnlinkCustomer(c)}
                              disabled={actionLoading}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50 inline-flex items-center gap-1 text-xs font-bold"
                            >
                              <Unlink className="w-4 h-4" />
                              فك الربط
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
          {historyModalAgent && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-50 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[85vh]">
            <div className="bg-teal-700 text-white p-5 flex justify-between items-center shrink-0">
              <h3 className="font-black flex items-center gap-2">
                <History /> سجل التسديدات: {historyModalAgent.name}
              </h3>
              <button onClick={() => setHistoryModalAgent(null)} className="hover:text-teal-200"><X /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {historyLoading ? (
                <div className="text-center py-12"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
              ) : historyPayments.length === 0 ? (
                <div className="text-center text-slate-500 font-bold py-10">لا توجد تسديدات مسجلة لهذا الوكيل.</div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">التاريخ</th>
                        <th className="px-6 py-4">المبلغ</th>
                        <th className="px-6 py-4">العميل (رقم الفاتورة)</th>
                        <th className="px-6 py-4">المستلم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyPayments.map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-slate-600">{p.date || '-'}</td>
                          <td className="px-6 py-4 font-black font-mono text-emerald-600">{formatIQD(p.amount)}</td>
                          <td className="px-6 py-4 text-slate-700">
                            {p.invoices?.customer_name || '-'} 
                            <span className="text-slate-400 font-mono text-xs block mt-1">{p.invoices?.invoice_number || ''}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">{p.user || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
