import React from "react";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Cart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart,
  subtotal,
  taxAmount,
  discountAmount,
  total,
  currencySymbol = "ر.س",
  taxRate = 15
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">سلة المشتريات</h3>
            <p className="text-sm text-slate-400">{items.length} منتج</p>
          </div>
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 ml-1" />
            مسح
          </Button>
        )}
      </div>

      {/* Items */}
      <ScrollArea className="flex-1 py-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
            <ShoppingBag className="w-16 h-16 mb-4 opacity-50" />
            <p>السلة فارغة</p>
            <p className="text-sm">أضف منتجات للبدء</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="bg-slate-50 rounded-xl p-3 group hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <button
                    onClick={() => onRemoveItem(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                  <div className="flex-1 text-right mr-2">
                    <h4 className="font-semibold text-slate-800 text-sm">{item.product_name}</h4>
                    <p className="text-xs text-slate-400">
                      {item.unit_price} {currencySymbol} × {item.quantity}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-600">
                    {item.total.toFixed(2)} {currencySymbol}
                  </span>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-1">
                    <button
                      onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Summary */}
      <div className="border-t border-slate-100 pt-4 space-y-3">
        <div className="flex justify-between text-sm text-slate-500">
          <span>{subtotal.toFixed(2)} {currencySymbol}</span>
          <span>المجموع الفرعي</span>
 
