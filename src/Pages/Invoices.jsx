import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Eye,
  Printer,
  FileText,
  Download,
  Filter,
  Calendar,
  RotateCcw,
  X
} from "lucide-react";
import moment from "moment";
import Receipt from "@/components/pos/Receipt";
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

const paymentMethods = {
  cash: { label: "نقداً", color: "bg-emerald-100 text-emerald-700" },
  card: { label: "بطاقة", color: "bg-blue-100 text-blue-700" },
  transfer: { label: "تحويل", color: "bg-purple-100 text-purple-700" },
  mixed: { label: "مختلط", color: "bg-slate-100 text-slate-700" }
};

const statusColors = {
  completed: { label: "مكتملة", color: "bg-emerald-100 text-emerald-700" },
  pending: { label: "معلقة", color: "bg-amber-100 text-amber-700" },
  refunded: { label: "مرتجعة", color: "bg-red-100 text-red-700" },
  cancelled: { label: "ملغاة", color: "bg-slate-100 text-slate-500" }
};

export default function Invoices() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewInvoice, setViewInvoice] = useState(null);
  const [refundInvoice, setRefundInvoice] = useState(null);
  const [showReceipt, setShowReceipt] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const list = await base44.entities.Settings.list();
      return list[0] || {};
    }
  });

  const refundMutation = useMutation({
    mutationFn: async (invoice) => {
      await base44.entities.Invoice.update(invoice.id, { status: "refunded" });
      // Restore stock
      for (const item of invoice.items || []) {
        const products = await base44.entities.Product.filter({ id: item.product_id });
        if (products[0]) {
          await base44.entities.Product.update(products[0].id, {
            stock_quantity: (products[0].stock_quantity || 0) + item.quantity
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["invoices"]);
      queryClient.invalidateQueries(["products"]);
      setRefundInvoice(null);
    }
  });

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !searchTerm ||
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || inv.status === filterStatus;
    const matchesPayment = filterPayment === "all" || inv.payment_method === filterPayment;
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && moment(inv.created_date).isSameOrAfter(dateFrom, "day");
    }
    if (dateTo) {
      matchesDate = matchesDate && moment(inv.created_date).isSameOrBefore(dateTo, "day");
    }
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const stats = {
    total: filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
    count: filteredInvoices.length,
    completed: filteredInvoices.filter(inv => inv.status === "completed").length,
    refunded: filteredInvoices.filter(inv => inv.status === "refunded").length
  };

  const exportCSV = () => {
    const headers = ["رقم الفاتورة", "التاريخ", "العميل", "المبلغ", "طريقة الدفع", "الحالة"];
    const rows = filteredInvoices.map(inv => [
      inv.invoice_number,
      moment(inv.created_date).format("YYYY-MM-DD HH:mm"),
      inv.customer_name || "زائر",
      inv.total,
      paymentMethods[inv.payment_method]?.label || inv.payment_method,
      statusColors[inv.status]?.label || inv.status
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(","))
      .join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices_${moment().format("YYYY-MM-DD")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">إجمالي المبيعات</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.total.toFixed(2)} ر.س</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">عدد الفواتير</p>
            <p className="text-2xl font-bold">{stats.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">فواتير مكتملة</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">فواتير مرتجعة</p>
            <p className="text-2xl font-bold text-red-500">{stats.refunded}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="pending">معلقة</SelectItem>
                <SelectItem value="refunded">مرتجعة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الطرق</SelectItem>
                <SelectItem value="cash">نقداً</SelectItem>
                <SelectItem value="card">بطاقة</SelectItem>
                <SelectItem value="transfer">تحويل</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                placeholder="من"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                placeholder="إلى"
              />
            </div>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 ml-2" />
              تصدير
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الفاتورة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">طريقة الدفع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map(invoice => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono font-semibold">{invoice.invoice_number}</TableCell>
                  <TableCell>
                    <div>
                      <p>{moment(invoice.created_date).format("YYYY/MM/DD")}</p>
                      <p className="text-sm text-slate-400">{moment(invoice.created_date).format("HH:mm")}</p>
                    </div>
                  </TableCell>
                  <TableCell>{invoice.customer_name || "زائر"}</TableCell>
                  <TableCell className="font-bold">{invoice.total?.toFixed(2)} ر.س</TableCell>
                  <TableCell>
                    <Badge className={paymentMethods[invoice.payment_method]?.color}>
                      {paymentMethods[invoice.payment_method]?.label || invoice.payment_method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[invoice.status]?.color}>
                      {statusColors[invoice.status]?.label || invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewInvoice(invoice)}>
                        <Eye className="w-4 h-4" />
 
