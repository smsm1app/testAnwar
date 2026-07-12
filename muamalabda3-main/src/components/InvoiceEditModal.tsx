import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import { X, Save, Trash2 } from 'lucide-react';

interface InvoiceEditModalProps {
  invoice: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoiceEditModal({ invoice, onClose, onSuccess }: InvoiceEditModalProps) {
  const [items, setItems] = useState<any[]>(invoice.items ? [...invoice.items] : []);
  const [discount, setDiscount] = useState(invoice.discount || 0);
  const [notes, setNotes] = useState(invoice.notes || '');
  const [mastercardFee, setMastercardFee] = useState(invoice.mastercardFee || 0);
  const [loading, setLoading] = useState(false);

  const calculatedTotal = items.reduce((acc, val) => acc + (val.sellingPrice * val.quantity), 0);
  const finalAmount = calculatedTotal - discount + (invoice.invoiceType === 'mastercard' ? mastercardFee : 0);

  const updateQty = (idx: number, qty: number) => {
    if (qty <= 0) return;
    const newItems = [...items];
    newItems[idx].quantity = qty;
    setItems(newItems);
  };

  const removeItem = (idx: number) => {
    const newItems = items.filter((_, i) => i !== idx);
    setItems(newItems);
  };

  const handleSave = async () => {
    if (items.length === 0) return toast.error('لا يمكن ترك الفاتورة فارغة');
    
    try {
      setLoading(true);
      await api.updateInvoice(invoice.id, {
        customerId: invoice.customerId,
        invoiceType: invoice.invoiceType,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, sellingPrice: i.sellingPrice })),
        discount,
        note: notes,
        mastercardFee
      });
      toast.success('تم تحديث الفاتورة بنجاح');
      window.dispatchEvent(new CustomEvent('refresh_erp_notifications'));
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'فشل التعديل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border flex flex-col">
        <div className="bg-slate-900 text-slate-100 px-5 py-3 flex items-center justify-between">
          <h4 className="font-bold text-sm">تعديل الفاتورة {invoice.invoiceNumber}</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          <div>
            <h5 className="font-bold mb-2">البنود:</h5>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded border">
                  <span>{it.name}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatIQD(it.sellingPrice)}</span>
                    <input type="number" min="1" value={it.quantity} onChange={e => updateQty(idx, parseInt(e.target.value)||1)} className="w-16 border rounded text-center" />
                    <button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-bold">الخصم الممنوح:</label>
              <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value)||0)} className="w-full border rounded p-2" />
            </div>
            {invoice.invoiceType === 'mastercard' && (
              <div>
                <label className="block mb-1 font-bold">عمولة ماستركارد:</label>
                <input type="number" value={mastercardFee} onChange={e => setMastercardFee(parseFloat(e.target.value)||0)} className="w-full border rounded p-2" />
              </div>
            )}
          </div>
          
          <div>
            <label className="block mb-1 font-bold">الملاحظات:</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded p-2" />
          </div>

          <div className="bg-amber-50 p-3 rounded font-bold text-center">
            الإجمالي المعدل: {formatIQD(finalAmount)}
          </div>

        </div>
        <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded">إلغاء</button>
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-amber-500 font-bold rounded flex items-center gap-2">
            <Save className="w-4 h-4" /> حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
}
