import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, CreditCard, ArrowLeftRight, Printer, Check, X } from "lucide-react";

const paymentMethods = [
  { id: "cash", name: "نقداً", icon: Banknote, color: "emerald" },
  { id: "card", name: "بطاقة", icon: CreditCard, color: "blue" },
  { id: "transfer", name: "تحويل", icon: ArrowLeftRight, color: "purple" },
];

export default function PaymentModal({ 
  open, 
  onClose, 
  total, 
  onComplete,
  currencySymbol = "ر.س",
  isProcessing
}) {
  const [method, setMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [change, setChange] = useState(0);

  useEffect(() => {
    if (method === "cash" && cashReceived) {
      const received = parseFloat(cashReceived) || 0;
      setChange(Math.max(0, received - total));
    } else {
      setChange(0);
    }
  }, [cashReceived, total, method]);

  const quickAmounts = [50, 100, 200, 500];

  const handleComplete = () => {
    onComplete({
      payment_method: method,
      cash_received: method === "cash" ? parseFloat(cashReceived) || total : total,
      change_amount: change
    });
  };

  const isValid = method !== "cash" || (parseFloat(cashReceived) || 0) >= total;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-right">إتمام الدفع</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Total */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white text-center">
            <p className="text-emerald-100 mb-1">المبلغ المطلوب</p>
            <p className="text-4xl font-bold">{total.toFixed(2)} <span className="text-xl">{currencySymbol}</span></p>
          </div>

          {/* Payment Methods */}
          <div>
            <Label className="text-right block mb-3">طريقة الدفع</Label>
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map((pm) => {
                const Icon = pm.icon;
                const isSelected = method === pm.id;
                return (
                  <button
                    key={pm.id}
                    onClick={() => setMethod(pm.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `border-${pm.color}-500 bg-${pm.color}-50`
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    style={isSelected ? {
                      borderColor: pm.color === "emerald" ? "#10B981" : pm.color === "blue" ? "#3B82F6" : "#8B5CF6",
                      backgroundColor: pm.color === "emerald" ? "#D1FAE5" : pm.color === "blue" ? "#DBEAFE" : "#EDE9FE"
                    } : {}}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? `text-${pm.color}-600` : "text-slate-400"}`}
                      style={isSelected ? {
                        color: pm.color === "emerald" ? "#059669" : pm.color === "blue" ? "#2563EB" : "#7C3AED"
                      } : {}}
                    />
                    <p className={`text-sm font-medium ${isSelected ? "text-slate-800" : "text-slate-500"}`}>
                      {pm.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Input */}
          {method === "cash" && (
            <div className="space-y-4">
              <div>
 
