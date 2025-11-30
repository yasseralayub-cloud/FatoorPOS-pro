import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  PlayCircle,
  StopCircle,
  DollarSign,
  FileText,
  CreditCard,
  Banknote,
  Eye,
  Printer
} from "lucide-react";
import moment from "moment";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Shifts() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showStartShift, setShowStartShift] = useState(false);
  const [showEndShift, setShowEndShift] = useState(false);
  const [viewShift, setViewShift] = useState(null);
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => base44.entities.Shift.list("-created_date", 100),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const activeShift = shifts.find(s => s.status === "open" && s.cashier_email === user?.email);

  const startShiftMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Shift.create({
        cashier_email: user.email,
        cashier_name: user.full_name,
        start_time: new Date().toISOString(),
        opening_balance: parseFloat(data.opening_balance) || 0,
        status: "open",
        total_sales: 0,
        total_cash: 0,
        total_card: 0,
        invoices_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["shifts"]);
      setShowStartShift(false);
      setOpeningBalance("");
    }
  });

  const endShiftMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Shift.update(activeShift.id, {
        end_time: new Date().toISOString(),
        closing_balance: parseFloat(data.closing_balance) || 0,
        status: "closed",
        notes: data.notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["shifts"]);
      setShowEndShift(false);
      setClosingBalance("");
      setClosingNotes("");
    }
  });

  const getShiftInvoices = (shiftId) => {
    return invoices.filter(inv => inv.shift_id === shiftId);
  };

  const calculateShiftStats = (shift) => {
    const shiftInvoices = getShiftInvoices(shift.id);
    const completed = shiftInvoices.filter(inv => inv.status === "completed");
    return {
      invoices: completed.length,
      totalSales: completed.reduce((sum, inv) => sum + (inv.total || 0), 0),
      cashSales: completed.filter(inv => inv.payment_method === "cash").reduce((sum, inv) => sum + (inv.total || 0), 0),
      cardSales: completed.filter(inv => inv.payment_method === "card").reduce((sum, inv) => sum + (inv.total || 0), 0),
      refunds: shiftInvoices.filter(inv => inv.status === "refunded").length
    };
  };

  const printShiftReport = (shift) => {
    const stats = calculateShiftStats(shift);
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير الوردية</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; width: 80mm; padding: 5mm; font-size: 12px; }
          .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #000; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; }
          .section { margin: 15px 0; padding: 10px; border: 1px solid #ddd; }
          .section-title { font-weight: bold; margin-bottom: 10px; }
          .total { font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          @media print { body { width: 80mm; } @page { margin: 0; size: 80mm auto; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">تقرير الوردية</div>
          <div>الكاشير: ${shift.cashier_name}</div>
        </div>
        
        <div class="section">
          <div class="section-title">معلومات الوردية</div>
          <div class="row"><span>${moment(shift.start_time).format('YYYY/MM/DD HH:mm')}</span><span>البداية</span></div>
          <div class="row"><span>${shift.end_time ? moment(shift.end_time).format('YYYY/MM/DD HH:mm') : 'جارية'}</span><span>النهاية</span></div>
          <div class="row"><span>${shift.opening_balance} ر.س</span><span>الرصيد الافتتاحي</span></div>
          ${shift.closing_balance ? `<div class="row"><span>${shift.closing_balance} ر.س</span><span>الرصيد الختامي</span></div>` : ''}
        </div>
        
        <div class="section">
          <div class="section-title">ملخص المبيعات</div>
          <div class="row"><span>${stats.invoices}</span><span>عدد الفواتير</span></div>
          <div class="row"><span>${stats.cashSales.toFixed(2)} ر.س</span><span>مبيعات نقدية</span></div>
          <div class="row"><span>${stats.cardSales.toFixed(2)} ر.س</span><span>مبيعات بطاقة</span></div>
          <div class="row"><span>${stats.refunds}</span><span>المرتجعات</span></div>
        </div>
        
        <div class="total">
          <div class="row"><span>${stats.totalSales.toFixed(2)} ر.س</span><span>إجمالي المبيعات</span></div>
          ${shift.closing_balance ? `
            <div class="row"><span>${(shift.opening_balance + stats.cashSales).toFixed(2)} ر.س</span><span>النقد المتوقع</span></div>
            <div class="row"><span>${(shift.closing_balance - (shift.opening_balance + stats.cashSales)).toFixed(2)} ر.س</span><span>الفرق</span></div>
          ` : ''}
        </div>
        
        ${shift.notes ? `<div style="margin-top: 15px; padding: 10px; background: #f5f5f5;"><strong>ملاحظات:</strong> ${shift.notes}</div>` : ''}
        
        <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const currentStats = activeShift ? calculateShiftStats(activeShift) : null;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Active Shift Banner */}
      {activeShift ? (
        <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">وردية نشطة</h2>
                  <p className="opacity-90">بدأت منذ {moment(activeShift.start_time).fromNow()}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{currentStats?.invoices || 0}</p>
                  <p className="text-sm opacity-90">فاتورة</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{currentStats?.totalSales?.toFixed(0) || 0}</p>
                  <p className="text-sm opacity-90">ر.س مبيعات</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{activeShift.opening_balance}</p>
                  <p className="text-sm opacity-90">ر.س افتتاحي</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => setShowEndShift(true)}
                className="bg-white text-emerald-600 hover:bg-white/90"
              >
                <StopCircle className="w-4 h-4 ml-2" />
                إنهاء الوردية
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">لا توجد وردية نشطة</h2>
            <p className="text-slate-500 mb-6">ابدأ وردية جديدة لتتمكن من إجراء عمليات البيع</p>
            <Button onClick={() => setShowStartShift(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <PlayCircle className="w-4 h-4 ml-2" />
              بدء وردية جديدة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Shifts History */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الورديات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الكاشير</TableHead>
                <TableHead className="text-right">البداية</TableHead>
                <TableHead className="text-right">النهاية</TableHead>
                <TableHead className="text-right">المبيعات</TableHead>
                <TableHead className="text-right">الفواتير</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map(shift => {
                const stats = calculateShiftStats(shift);
                return (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{shift.cashier_name}</p>
                        <p className="text-sm text-slate-400">{shift.cashier_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{moment(shift.start_time).format("YYYY/MM/DD")}</p>
                        <p className="text-sm text-slate-400">{moment(shift.start_time).format("HH:mm")}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {shift.end_time ? (
                        <div>
                          <p>{moment(shift.end_time).format("YYYY/MM/DD")}</p>
                          <p className="text-sm text-slate-400">{moment(shift.end_time).format("HH:mm")}</p>
                        </div>
                      ) : (
                        <span className="text-emerald-600">جارية</span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600">
                      {stats.totalSales.toFixed(2)} ر.س
                    </TableCell>
                    <TableCell>{stats.invoices}</TableCell>
                    <TableCell>
                      <Badge className={shift.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                        {shift.status === "open" ? "نشطة" : "منتهية"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewShift(shift)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => printShiftReport(shift)}>
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {shifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    لا توجد ورديات
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Start Shift Dialog */}
      <Dialog open={showStartShift} onOpenChange={setShowStartShift}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>بدء وردية جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-500 mb-1">الكاشير</p>
              <p className="font-semibold">{user?.full_name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
            </div>
            <div>
              <Label>الرصيد الافتتاحي (النقد في الصندوق)</Label>
              <Input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="text-lg mt-2"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowStartShift(false)}>
                إلغاء
              </Button>
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => startShiftMutation.mutate({ opening_balance: openingBalance })}
                disabled={startShiftMutation.isPending}
              >
                <PlayCircle className="w-4 h-4 ml-2" />
                بدء الوردية
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Shift Dialog */}
      <Dialog open={showEndShift} onOpenChange={setShowEndShift}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنهاء الوردية</DialogTitle>
          </DialogHeader>
          {activeShift && currentStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{currentStats.invoices}</p>
                  <p className="text-sm text-slate-500">فاتورة</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <DollarSign className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{currentStats.totalSales.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">ر.س مبيعات</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <Banknote className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{currentStats.cashSales.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">ر.س نقداً</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <CreditCard className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{currentStats.cardSales.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">ر.س بطاقة</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-700 mb-1">النقد المتوقع في الصندوق</p>
                <p className="text-2xl font-bold text-amber-800">
                  {(activeShift.opening_balance + currentStats.cashSales).toFixed(2)} ر.س
                </p>
              </div>

              <div>
                <Label>الرصيد الختامي (النقد الفعلي)</Label>
                <Input
                  type="number"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  placeholder="0.00"
                  className="text-lg mt-2"
                />
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="أي ملاحظات عن الوردية..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowEndShift(false)}>
                  إلغاء
                </Button>
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={() => endShiftMutation.mutate({ 
                    closing_balance: closingBalance,
                    notes: closingNotes 
                  })}
                  disabled={endShiftMutation.isPending}
                >
                  <StopCircle className="w-4 h-4 ml-2" />
                  إنهاء الوردية
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Shift Dialog */}
      <Dialog open={!!viewShift} onOpenChange={() => setViewShift(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الوردية</DialogTitle>
          </DialogHeader>
          {viewShift && (() => {
            const stats = calculateShiftStats(viewShift);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">الكاشير</p>
                    <p className="font-semibold">{viewShift.cashier_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">الحالة</p>
                    <Badge className={viewShift.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                      {viewShift.status === "open" ? "نشطة" : "منتهية"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">البداية</p>
                    <p>{moment(viewShift.start_time).format("YYYY/MM/DD HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">النهاية</p>
                    <p>{viewShift.end_time ? moment(viewShift.end_time).format("YYYY/MM/DD HH:mm") : "جارية"}</p>
                  </div>
                </div>

                <div className="border-t pt-4 grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{stats.invoices}</p>
                    <p className="text-sm text-slate-500">فاتورة</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{stats.totalSales.toFixed(2)}</p>
                    <p className="text-sm text-slate-500">ر.س مبيعات</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>{viewShift.opening_balance} ر.س</span>
                    <span className="text-slate-500">الرصيد الافتتاحي</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{stats.cashSales.toFixed(2)} ر.س</span>
                    <span className="text-slate-500">مبيعات نقدية</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{stats.cardSales.toFixed(2)} ر.س</span>
                    <span className="text-slate-500">مبيعات بطاقة</span>
                  </div>
                  {viewShift.closing_balance && (
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>{viewShift.closing_balance} ر.س</span>
                      <span>الرصيد الختامي</span>
                    </div>
                  )}
                </div>

                {viewShift.notes && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 mb-1">ملاحظات</p>
                    <p>{viewShift.notes}</p>
                  </div>
                )}

                <Button className="w-full" onClick={() => { printShiftReport(viewShift); setViewShift(null); }}>
                  <Printer className="w-4 h-4 ml-2" />
                  طباعة التقرير
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
