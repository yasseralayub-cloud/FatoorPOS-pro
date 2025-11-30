import React from "react";
import moment from "moment";

export default function Receipt({ invoice, settings, onPrint }) {
  const printReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${invoice.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Arial', sans-serif; 
            width: 80mm; 
            padding: 5mm;
            font-size: 12px;
          }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .logo { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .info { font-size: 10px; color: #666; }
          .invoice-info { margin: 10px 0; font-size: 11px; }
          .items { width: 100%; margin: 10px 0; }
          .items th, .items td { padding: 5px 2px; text-align: right; }
          .items th { border-bottom: 1px solid #000; font-size: 10px; }
          .items td { font-size: 11px; border-bottom: 1px dashed #ddd; }
          .totals { margin: 10px 0; padding-top: 10px; border-top: 1px dashed #000; }
          .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
          .grand-total { font-size: 16px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; border-top: 1px dashed #000; padding-top: 10px; }
          .qr-placeholder { width: 60px; height: 60px; margin: 10px auto; border: 1px solid #ddd; }
          @media print {
            body { width: 80mm; }
            @page { margin: 0; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${settings?.logo_url ? `<img src="${settings.logo_url}" style="max-width: 60px; margin-bottom: 5px;">` : ''}
          <div class="logo">${settings?.store_name || 'Fatoor POS'}</div>
          <div class="info">${settings?.address || ''}</div>
          <div class="info">هاتف: ${settings?.phone || ''}</div>
          ${settings?.tax_number ? `<div class="info">الرقم الضريبي: ${settings.tax_number}</div>` : ''}
        </div>
        
        <div class="invoice-info">
          <div><strong>رقم الفاتورة:</strong> ${invoice.invoice_number}</div>
          <div><strong>التاريخ:</strong> ${moment(invoice.created_date).format('YYYY/MM/DD HH:mm')}</div>
          <div><strong>الكاشير:</strong> ${invoice.cashier_name || '-'}</div>
          ${invoice.customer_name ? `<div><strong>العميل:</strong> ${invoice.customer_name}</div>` : ''}
        </div>
        
        <table class="items">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items?.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>${item.unit_price}</td>
                <td>${item.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="total-row">
            <span>${invoice.subtotal?.toFixed(2)} ${settings?.currency_symbol || 'ر.س'}</span>
            <span>المجموع الفرعي</span>
          </div>
          <div class="total-row">
            <span>${invoice.tax_amount?.toFixed(2)} ${settings?.currency_symbol || 'ر.س'}</span>
            <span>الضريبة (${settings?.tax_rate || 15}%)</span>
          </div>
          ${invoice.discount_amount > 0 ? `
            <div class="total-row" style="color: red;">
              <span>-${invoice.discount_amount?.toFixed(2)} ${settings?.currency_symbol || 'ر.س'}</span>
              <span>الخصم</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>${invoice.total?.toFixed(2)} ${settings?.currency_symbol || 'ر.س'}</span>
            <span>الإجمالي</span>
          </div>
        </div>
        
        <div style="margin: 10px 0; padding: 5px; background: #f5f5f5; font-size: 11px;">
          <div><strong>طريقة الدفع:</strong> ${
            invoice.payment_method === 'cash' ? 'نقداً' :
            invoice.payment_method === 'card' ? 'بطاقة' : 'تحويل'
          }</div>
          ${invoice.payment_method === 'cash' ? `
            <div><strong>المبلغ المستلم:</strong> ${invoice.cash_received?.toFixed(2)} ${settings?.currency_symbol || 'ر.س'}</div>
 
