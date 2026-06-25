const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const uploadRoutes = `
// ==================== UPLOAD & PROOFS ====================

app.post('/api/upload', authenticate, async (req: any, res) => {
  const { base64Image } = req.body;
  if (!base64Image) return res.status(400).json({ error: 'صورة مفقودة' });

  try {
    const matches = base64Image.match(/^data:image\\/([A-Za-z-+\\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'تنسيق الصورة غير صحيح' });
    }

    const type = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = \`proof_\${Date.now()}_\${Math.random().toString(36).substring(7)}.\${type === 'jpeg' ? 'jpg' : type}\`;

    const { data, error } = await supabase.storage
      .from('proofs')
      .upload(fileName, buffer, {
        contentType: \`image/\${type}\`,
        upsert: false
      });

    if (error) {
      console.error('Supabase Storage error:', error);
      return res.status(500).json({ error: 'فشل في رفع الصورة إلى التخزين السحابي' });
    }

    const { data: publicUrlData } = supabase.storage.from('proofs').getPublicUrl(fileName);
    
    res.json({ url: publicUrlData.publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/invoices/:id/proof', authenticate, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const { deliveryProofImage } = req.body;

  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

  const { error } = await supabase.from('invoices').update({ delivery_proof_image: deliveryProofImage }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'رفع إثبات تسليم', \`\${invoice.invoice_number}\`, getClientIp(req));
  res.json({ success: true });
});
`;

code = code.replace('// ==================== INSTALLMENTS ====================', uploadRoutes + '\n// ==================== INSTALLMENTS ====================');

const deleteInvoiceOriginal = `app.delete('/api/invoices/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.invoices.delete && !req.user.permissions.sales.delete) {
    return res.status(403).json({ error: 'لا تملك صلاحية حذف الفواتير' });
  }

  const id = parseInt(req.params.id);
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  if (invoice.status !== 'cancelled') {
    return res.status(400).json({ error: 'يمكن حذف الفواتير الملغاة فقط. قم بإلغاء الفاتورة أولاً قبل حذفها.' });
  }

  await supabase.from('installment_records').delete().eq('invoice_id', id);
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف فاتورة ملغاة', \`\${invoice.invoice_number}\`, getClientIp(req));
  res.json({ success: true });
});`;

const updatedInvoiceLogic = `async function revertInvoiceInventory(invoice: any, userName: string) {
  const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
  const { date: invoiceDate } = getNowDateTimeString();

  for (const item of items) {
    const { data: prod } = await supabase.from('products').select('*').eq('id', item.productId).single();
    if (!prod) continue;

    const isBundle = prod.notes && prod.notes.startsWith('BUNDLE:');
    if (isBundle) {
      try {
        const bundleData = JSON.parse(prod.notes.substring(7));
        const bundleItems = bundleData.items || [];
        for (const comp of bundleItems) {
          const { data: compProd } = await supabase.from('products').select('*').eq('id', comp.productId).single();
          if (compProd) {
            const restoredQty = compProd.quantity + (comp.quantity * item.quantity);
            await supabase.from('products').update({ quantity: restoredQty }).eq('id', compProd.id);
            await supabase.from('inventory_movements').insert({
              product_id: compProd.id, product_name: compProd.name, type: 'in',
              quantity: (comp.quantity * item.quantity), prev_quantity: compProd.quantity, new_quantity: restoredQty,
              reason: \`إرجاع بضاعة (منظومة) للإلغاء أو التعديل (فاتورة \${invoice.invoice_number})\`, user: userName, date: invoiceDate
            });
          }
        }
      } catch (err) {}
    } else {
      const restoredQty = prod.quantity + item.quantity;
      await supabase.from('products').update({ quantity: restoredQty }).eq('id', prod.id);
      await supabase.from('inventory_movements').insert({
        product_id: prod.id, product_name: prod.name, type: 'in',
        quantity: item.quantity, prev_quantity: prod.quantity, new_quantity: restoredQty,
        reason: \`إرجاع بضاعة للإلغاء أو التعديل (فاتورة \${invoice.invoice_number})\`, user: userName, date: invoiceDate
      });
    }
  }
}

app.delete('/api/invoices/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.invoices.delete && !req.user.permissions.sales.delete) {
    return res.status(403).json({ error: 'لا تملك صلاحية حذف الفواتير' });
  }

  const id = parseInt(req.params.id);
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

  // If active, revert inventory first!
  if (invoice.status === 'active') {
    await revertInvoiceInventory(invoice, req.user.name);
  }

  await supabase.from('installment_records').delete().eq('invoice_id', id);
  await supabase.from('partial_payments').delete().eq('invoice_id', id);
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req.user.name, 'حذف فاتورة نهائياً', \`\${invoice.invoice_number}\`, getClientIp(req));
  res.json({ success: true });
});

app.put('/api/invoices/:id', authenticate, async (req: any, res) => {
  if (!req.user.permissions.sales.edit && !req.user.permissions.invoices.edit) return res.status(403).json({ error: 'لا تملك صلاحية تعديل فواتير' });

  const id = parseInt(req.params.id);
  const { data: oldInvoice } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (!oldInvoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  if (oldInvoice.status === 'cancelled') return res.status(400).json({ error: 'الفاتورة ملغاة ولا يمكن تعديلها' });

  const { customerId, invoiceType, items, discount, note, mastercardFee } = req.body;
  if (!customerId || !invoiceType || !items || items.length === 0) return res.status(400).json({ error: 'بيانات الفاتورة منقوصة' });

  const { data: customer } = await supabase.from('customers').select('*').eq('id', parseInt(customerId)).single();
  if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });

  await revertInvoiceInventory(oldInvoice, req.user.name);

  const finalItems: any[] = [];
  let calculatedTotal = 0;
  const { date: invoiceDate } = getNowDateTimeString();

  for (const item of items) {
    const { data: prod } = await supabase.from('products').select('*').eq('id', parseInt(item.productId)).eq('is_deleted', false).single();
    if (!prod) return res.status(400).json({ error: \`المنتج \${item.productId} غير موجود\` });

    const rqQty = parseFloat(item.quantity);
    const isBundle = prod.notes && prod.notes.startsWith('BUNDLE:');

    if (isBundle) {
      try {
        const bundleData = JSON.parse(prod.notes.substring(7));
        const bundleItems = bundleData.items || [];
        for (const comp of bundleItems) {
          const compId = parseInt(comp.productId);
          const compQtyNeeded = comp.quantity * rqQty;
          const { data: compProd } = await supabase.from('products').select('*').eq('id', compId).eq('is_deleted', false).single();
          if (!compProd || compProd.quantity < compQtyNeeded) return res.status(400).json({ error: \`المخزون غير كافٍ للمكون \${compProd?.name}\` });
        }
        for (const comp of bundleItems) {
          const compId = parseInt(comp.productId);
          const compQtyNeeded = comp.quantity * rqQty;
          const { data: compProd } = await supabase.from('products').select('*').eq('id', compId).single();
          if (compProd) {
            const newQty = compProd.quantity - compQtyNeeded;
            await supabase.from('products').update({ quantity: newQty }).eq('id', compId);
            await supabase.from('inventory_movements').insert({
              product_id: compProd.id, product_name: compProd.name, type: 'out',
              quantity: compQtyNeeded, prev_quantity: compProd.quantity, new_quantity: newQty,
              reason: \`صرف لتعديل مكونات الفاتورة \${oldInvoice.invoice_number}\`, user: req.user.name, date: invoiceDate
            });
          }
        }
      } catch (err) {}
    } else {
      if (prod.quantity < rqQty) return res.status(400).json({ error: \`المخزون غير كافٍ\` });
      const newQty = prod.quantity - rqQty;
      await supabase.from('products').update({ quantity: newQty }).eq('id', prod.id);
      await supabase.from('inventory_movements').insert({
        product_id: prod.id, product_name: prod.name, type: 'out',
        quantity: rqQty, prev_quantity: prod.quantity, new_quantity: newQty,
        reason: \`تعديل مبيعات \${oldInvoice.invoice_number}\`, user: req.user.name, date: invoiceDate
      });
    }
    calculatedTotal += prod.selling_price * rqQty;
    finalItems.push({ productId: prod.id, name: prod.name, quantity: rqQty, purchasePrice: prod.purchase_price, sellingPrice: prod.selling_price });
  }

  const discVal = parseFloat(discount || 0);
  let finalAmount = calculatedTotal - discVal;
  
  const mFee = parseFloat(mastercardFee || 0);
  if (invoiceType === 'mastercard') finalAmount += mFee;

  let finalRemaining = oldInvoice.remaining_amount;
  if (invoiceType === 'partial') {
    // Keep old down payment, recalculate remaining
    const downPayment = oldInvoice.total_amount - oldInvoice.remaining_amount - oldInvoice.discount;
    finalRemaining = Math.max(0, finalAmount - downPayment);
  } else if (invoiceType === 'installment') {
    // Keep old down payment
    const downPayment = oldInvoice.total_amount - oldInvoice.remaining_amount - oldInvoice.discount;
    finalRemaining = Math.max(0, finalAmount - downPayment);
  } else {
    finalRemaining = 0;
  }

  const { data: updated, error } = await supabase.from('invoices').update({
    customer_id: parseInt(customerId),
    customer_name: customer.name,
    customer_phone: customer.phone,
    invoice_type: invoiceType,
    items: JSON.stringify(finalItems),
    total_amount: calculatedTotal,
    discount: discVal,
    mastercard_fee: invoiceType === 'mastercard' ? mFee : 0,
    final_amount: finalAmount,
    remaining_amount: finalRemaining,
    notes: note || ''
  }).eq('id', id).select().single();

  if (error) {
    await revertInvoiceInventory(updated || oldInvoice, 'SYSTEM_REVERT');
    return res.status(500).json({ error: error.message });
  }

  await logAudit(req.user.name, 'تعديل فاتورة', \`\${oldInvoice.invoice_number}\`, getClientIp(req));
  res.json(mapInvoice(updated));
});
`;

code = code.replace(deleteInvoiceOriginal, updatedInvoiceLogic);
if (!code.includes(updatedInvoiceLogic)) {
  console.log("Failed to replace deleteInvoiceOriginal");
} else {
  console.log("Successfully replaced deleteInvoiceOriginal");
}

fs.writeFileSync('server.ts', code, 'utf8');
