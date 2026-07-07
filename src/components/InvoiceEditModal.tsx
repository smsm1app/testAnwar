import React, { useState, useEffect } from 'react';
import { api, formatIQD } from '../api';
import { toast } from 'sonner';
import { X, Save, Trash2, Package, Tag, Hash, Calculator, FileText, CreditCard } from 'lucide-react';

const parseJsonArray = (val: any): any[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) { /* ignore */ }
  }
  return [];
};

interface InvoiceEditModalProps {
  invoice: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoiceEditModal({ invoice, onClose, onSuccess }: InvoiceEditModalProps) {
  const [items, setItems] = useState<any[]>(() => {
    return JSON.parse(JSON.stringify(parseJsonArray(invoice.items)));
  });
  const [discount, setDiscount] = useState<number>(invoice.discount || 0);
  const [notes, setNotes] = useState<string>(invoice.notes || '');
  const [mastercardFee, setMastercardFee] = useState<number>(invoice.mastercardFee || 0);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    // Prevent body scroll when modal open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const calculatedTotal = items.reduce((acc, val) => acc + (val.sellingPrice * val.quantity), 0);
  const finalAmount = calculatedTotal - discount + (invoice.invoiceType === 'mastercard' ? mastercardFee : 0);

  const updateQty = (idx: number, qty: number) => {
    if (qty <= 0) return;
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: qty } : it));
  };

  const updatePrice = (idx: number, price: number) => {
    if (price < 0) return;
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, sellingPrice: price } : it));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
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
        mastercardFee,
      });
      toast.success('تم تحديث الفاتورة بنجاح ✓');
      window.dispatchEvent(new CustomEvent('refresh_erp_notifications'));
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'فشل التعديل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: visible ? 'rgba(2,6,23,0.75)' : 'rgba(2,6,23,0)',
        backdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
        transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(251,191,36,0.15)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(24px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
          overflow: 'hidden',
          direction: 'rtl',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px',
          background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.06) 100%)',
          borderBottom: '1px solid rgba(251,191,36,0.18)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
            }}>
              <FileText size={18} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '2px' }}>
                تعديل فاتورة
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 700, fontFamily: 'monospace' }}>
                {invoice.invoiceNumber}
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '34px', height: '34px', borderRadius: '8px',
              border: '1px solid rgba(148,163,184,0.2)',
              background: 'rgba(148,163,184,0.08)',
              color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease', flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)';
              (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(148,163,184,0.08)';
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(148,163,184,0.2)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Scrollable Body ─── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 22px',
          display: 'flex', flexDirection: 'column', gap: '20px',
          minHeight: 0,
        }}>
          {/* Items Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Package size={15} color="#f59e0b" />
              <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                البنود ({items.length})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(30,41,59,0.8)',
                    border: '1px solid rgba(71,85,105,0.4)',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Item name row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: '#f59e0b', flexShrink: 0,
                      }} />
                      <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '13px' }}>{it.name}</span>
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '7px',
                        border: '1px solid rgba(239,68,68,0.25)',
                        background: 'rgba(239,68,68,0.08)',
                        color: '#f87171', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease', flexShrink: 0,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.5)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.25)';
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Price / Qty / Total */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Unit Price */}
                    <div style={{ flex: '1 1 140px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '11px', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.04em' }}>
                        <Tag size={11} />سعر القطعة (د.ع)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={it.sellingPrice}
                        onChange={e => updatePrice(idx, parseFloat(e.target.value) || 0)}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'rgba(15,23,42,0.8)',
                          border: '1px solid rgba(71,85,105,0.5)',
                          borderRadius: '9px', padding: '8px 12px',
                          color: '#fbbf24', fontWeight: 700, fontSize: '13px',
                          textAlign: 'center', outline: 'none',
                          direction: 'ltr', transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = 'rgba(251,191,36,0.6)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,191,36,0.1)';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = 'rgba(71,85,105,0.5)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Quantity */}
                    <div style={{ flex: '0 1 100px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '11px', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.04em' }}>
                        <Hash size={11} />الكمية
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={e => updateQty(idx, parseInt(e.target.value) || 1)}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'rgba(15,23,42,0.8)',
                          border: '1px solid rgba(71,85,105,0.5)',
                          borderRadius: '9px', padding: '8px 12px',
                          color: '#e2e8f0', fontWeight: 600, fontSize: '13px',
                          textAlign: 'center', outline: 'none',
                          direction: 'ltr', transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = 'rgba(71,85,105,0.5)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Row Total */}
                    <div style={{ flex: '0 1 130px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '11px', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.04em' }}>
                        <Calculator size={11} />الإجمالي
                      </label>
                      <div style={{
                        background: 'rgba(251,191,36,0.08)',
                        border: '1px solid rgba(251,191,36,0.2)',
                        borderRadius: '9px', padding: '8px 12px',
                        color: '#fbbf24', fontWeight: 700, fontSize: '13px',
                        textAlign: 'center', direction: 'ltr',
                        whiteSpace: 'nowrap',
                      }}>
                        {formatIQD(it.sellingPrice * it.quantity)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(71,85,105,0.3)', margin: '0 -4px' }} />

          {/* Discount & Mastercard */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.04em' }}>
                <Tag size={13} />الخصم الممنوح (د.ع)
              </label>
              <input
                type="number"
                value={discount}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(71,85,105,0.5)',
                  borderRadius: '10px', padding: '10px 14px',
                  color: '#34d399', fontWeight: 600, fontSize: '14px',
                  textAlign: 'center', outline: 'none',
                  direction: 'ltr', transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(52,211,153,0.08)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(71,85,105,0.5)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {invoice.invoiceType === 'mastercard' && (
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.04em' }}>
                  <CreditCard size={13} />عمولة ماستركارد (د.ع)
                </label>
                <input
                  type="number"
                  value={mastercardFee}
                  onChange={e => setMastercardFee(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(71,85,105,0.5)',
                    borderRadius: '10px', padding: '10px 14px',
                    color: '#a78bfa', fontWeight: 600, fontSize: '14px',
                    textAlign: 'center', outline: 'none',
                    direction: 'ltr', transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(167,139,250,0.08)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(71,85,105,0.5)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.04em' }}>
              <FileText size={13} />الملاحظات
            </label>
            <input
              type="text"
              value={notes}
              placeholder="أضف ملاحظة..."
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(71,85,105,0.5)',
                borderRadius: '10px', padding: '10px 14px',
                color: '#e2e8f0', fontSize: '13px',
                outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(148,163,184,0.5)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(148,163,184,0.06)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(71,85,105,0.5)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Grand Total */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))',
            border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: '14px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>الإجمالي المعدّل</span>
            <span style={{ color: '#fbbf24', fontSize: '20px', fontWeight: 800, fontFamily: 'monospace', direction: 'ltr' }}>
              {formatIQD(finalAmount)}
            </span>
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px',
          padding: '16px 22px',
          borderTop: '1px solid rgba(71,85,105,0.3)',
          background: 'rgba(15,23,42,0.5)',
          flexShrink: 0,
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '9px 20px', borderRadius: '10px',
              border: '1px solid rgba(71,85,105,0.5)',
              background: 'rgba(71,85,105,0.15)',
              color: '#94a3b8', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(71,85,105,0.3)';
              (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(71,85,105,0.15)';
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
            }}
          >
            إلغاء
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '9px 24px', borderRadius: '10px',
              border: 'none',
              background: loading ? 'rgba(245,158,11,0.5)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#0f172a', fontSize: '13px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(245,158,11,0.35)',
              transition: 'all 0.15s ease',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(245,158,11,0.5)';
            }}
            onMouseLeave={e => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(245,158,11,0.35)';
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: '14px', height: '14px', border: '2px solid rgba(15,23,42,0.4)',
                  borderTopColor: '#0f172a', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save size={14} />
                حفظ التعديلات
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
