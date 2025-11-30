import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  FileText,
  Download,
  Calendar,
  BarChart2,
  PieChart as PieChartIcon
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from "recharts";
import moment from "moment";

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function Reports() {
  const [dateRange, setDateRange] = useState("month");
  const [dateFrom, setDateFrom] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [activeTab, setActiveTab] = useState("overview");

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 1000),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  // Filter invoices by date
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = moment(inv.created_date);
      return invDate.isSameOrAfter(dateFrom, "day") && invDate.isSameOrBefore(dateTo, "day");
    });
  }, [invoices, dateFrom, dateTo]);

  // Quick date range selection
  const setQuickRange = (range) => {
    setDateRange(range);
    switch (range) {
      case "today":
        setDateFrom(moment().format("YYYY-MM-DD"));
        setDateTo(moment().format("YYYY-MM-DD"));
        break;
      case "week":
        setDateFrom(moment().startOf("week").format("YYYY-MM-DD"));
        setDateTo(moment().format("YYYY-MM-DD"));
        break;
      case "month":
        setDateFrom(moment().startOf("month").format("YYYY-MM-DD"));
        setDateTo(moment().format("YYYY-MM-DD"));
        break;
      case "year":
        setDateFrom(moment().startOf("year").format("YYYY-MM-DD"));
        setDateTo(moment().format("YYYY-MM-DD"));
        break;
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const completedInvoices = filteredInvoices.filter(inv => inv.status === "completed");
    const totalSales = completedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalTax = completedInvoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0);
    const totalDiscount = completedInvoices.reduce((sum, inv) => sum + (inv.discount_amount || 0), 0);
    const avgTicket = completedInvoices.length > 0 ? totalSales / completedInvoices.length : 0;

    // Calculate cost and profit
    let totalCost = 0;
    completedInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        totalCost += (product?.cost_price || 0) * item.quantity;
      });
    });
    const grossProfit = totalSales - totalTax - totalCost;
    const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    return {
      totalSales,
      invoicesCount: completedInvoices.length,
      avgTicket,
      totalTax,
      totalDiscount,
      totalCost,
      grossProfit,
      profitMargin,
      refundedCount: filteredInvoices.filter(inv => inv.status === "refunded").length
    };
  }, [filteredInvoices, products]);

  // Daily sales chart
  const dailySalesData = useMemo(() => {
    const days = {};
    filteredInvoices.forEach(inv => {
      if (inv.status === "completed") {
        const day = moment(inv.created_date).format("MM/DD");
        days[day] = (days[day] || 0) + (inv.total || 0);
      }
    });
    return Object.entries(days).map(([date, sales]) => ({ date, sales }));
  }, [filteredInvoices]);

  // Sales by payment method
  const paymentMethodsData = useMemo(() => {
    const methods = { cash: 0, card: 0, transfer: 0 };
    filteredInvoices.forEach(inv => {
      if (inv.status === "completed" && methods[inv.payment_method] !== undefined) {
        methods[inv.payment_method] += inv.total || 0;
      }
    });
    return [
      { name: "نقداً", value: methods.cash },
      { name: "بطاقة", value: methods.card },
      { name: "تحويل", value: methods.transfer },
    ].filter(m => m.value > 0);
  }, [filteredInvoices]);

  // Sales by category
  const categoryData = useMemo(() => {
    const categoryTotals = {};
    filteredInvoices.forEach(inv => {
      if (inv.status === "completed") {
        inv.items?.forEach(item => {
          const product = products.find(p => p.id === item.product_id);
          const category = categories.find(c => c.id === product?.category_id);
          const catName = category?.name || "غير مصنف";
          categoryTotals[catName] = (categoryTotals[catName] || 0) + item.total;
        });
      }
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredInvoices, products, categories]);

  // Top products
  const topProducts = useMemo(() => {
    const productSales = {};
    filteredInvoices.forEach(inv => {
      if (inv.status === "completed") {
        inv.items?.forEach(item => {
          if (!productSales[item.product_name]) {
            productSales[item.product_name] = { qty: 0, revenue: 0 };
          }
          productSales[item.product_name].qty += item.quantity;
          productSales[item.product_name].revenue += item.total;
        });
      }
    });
    return Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredInvoices]);

  // Hourly sales
  const hourlySales = useMemo(() => {
    const hours = {};
    for (let i = 0; i < 24; i++) {
      hours[i] = 0;
    }
    filteredInvoices.forEach(inv => {
      if (inv.status === "completed") {
        const hour = moment(inv.created_date).hour();
        hours[hour] += inv.total || 0;
      }
    });
    return Object.entries(hours).map(([hour, sales]) => ({
      hour: `${hour}:00`,
      sales
    }));
  }, [filteredInvoices]);

  // Top customers
  const topCustomers = useMemo(() => {
    const customerSales = {};
    filteredInvoices.forEach(inv => {
      if (inv.status === "completed" && inv.customer_id) {
        const customer = customers.find(c => c.id === inv.customer_id);
        const name = customer?.name || inv.customer_name || "زائر";
        customerSales[name] = (customerSales[name] || 0) + (inv.total || 0);
      }
    });
    return Object.entries(customerSales)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredInvoices, customers]);

  const exportReport = () => {
    const data = {
      period: `${dateFrom} to ${dateTo}`,
      ...stats,
      topProducts: topProducts.slice(0, 5),
      categoryBreakdown: categoryData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${dateFrom}_${dateTo}.json`;
    link.click();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              {["today", "week", "month", "year"].map(range => (
                <Button
                  key={range}
                  variant={dateRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickRange(range)}
                  className={dateRange === range ? "bg-emerald-600" : ""}
                >
                  {range === "today" ? "اليوم" : range === "week" ? "الأسبوع" : range === "month" ? "الشهر" : "السنة"}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setDateRange("custom"); }}
                className="w-40"
              />
              <span className="text-slate-400">إلى</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setDateRange("custom"); }}
                className="w-40"
              />
              <Button variant="outline" onClick={exportReport}>
                <Download className="w-4 h-4 ml-2" />
                تصدير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">إجمالي المبيعات</p>
                <p className="text-2xl font-bold">{stats.totalSales.toFixed(2)} <span className="text-sm">ر.س</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">عدد الفواتير</p>
                <p className="text-2xl font-bold">{stats.invoicesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">صافي الربح</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.grossProfit.toFixed(2)} <span className="text-sm">ر.س</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <BarChart2 className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">هامش الربح</p>
                <p className="text-2xl font-bold">{stats.profitMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="products">المنتجات</TabsTrigger>
          <TabsTrigger value="customers">العملاء</TabsTrigger>
          <TabsTrigger value="time">التوقيت</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>مؤشر المبيعات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySalesData}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="date" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" />
                      <Tooltip />
                      <Area type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={3} fill="url(#salesGradient)" name="المبيعات" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>طرق الدفع</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentMethodsData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                        {paymentMethodsData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  {paymentMethodsData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>المبيعات حسب التصنيف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} name="المبيعات" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>المنتجات الأكثر مبيعاً</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">الكمية المباعة</TableHead>
                    <TableHead className="text-right">الإيرادات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-bold">{i + 1}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.qty}</TableCell>
                      <TableCell className="font-bold text-emerald-600">{product.revenue.toFixed(2)} ر.س</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>أفضل العملاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} name="المشتريات" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>المبيعات حسب الساعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sales" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: "#8B5CF6" }} name="المبيعات" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">متوسط الفاتورة</p>
            <p className="text-xl font-bold">{stats.avgTicket.toFixed(2)} ر.س</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">إجمالي الضريبة</p>
            <p className="text-xl font-bold">{stats.totalTax.toFixed(2)} ر.س</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">إجمالي الخصومات</p>
            <p className="text-xl font-bold text-red-500">{stats.totalDiscount.toFixed(2)} ر.س</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">تكلفة البضاعة</p>
            <p className="text-xl font-bold">{stats.totalCost.toFixed(2)} ر.س</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">المرتجعات</p>
            <p className="text-xl font-bold text-amber-500">{stats.refundedCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
