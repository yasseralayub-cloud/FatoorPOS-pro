import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  FileText,
  ArrowUpLeft,
  Clock,
  AlertTriangle,
  ChevronLeft
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
  Bar
} from "recharts";
import moment from "moment";

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [dateRange, setDateRange] = useState("today");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list(),
  });

  // Calculate stats
  const getFilteredInvoices = () => {
    const now = moment();
    return invoices.filter(inv => {
      const invDate = moment(inv.created_date);
      if (dateRange === "today") return invDate.isSame(now, "day");
      if (dateRange === "week") return invDate.isSame(now, "week");
      if (dateRange === "month") return invDate.isSame(now, "month");
      return true;
    });
  };

  const filteredInvoices = getFilteredInvoices();
  
  const totalSales = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalInvoices = filteredInvoices.length;
  const avgTicket = totalInvoices > 0 ? totalSales / totalInvoices : 0;
  
  const completedInvoices = filteredInvoices.filter(inv => inv.status === "completed");
  const refundedInvoices = filteredInvoices.filter(inv => inv.status === "refunded");
  
  // Low stock products
  const lowStockProducts = products.filter(p => 
    p.stock_quantity !== undefined && 
    p.min_stock !== undefined && 
    p.stock_quantity <= p.min_stock
  );

  // Sales by category
  const salesByCategory = () => {
    const categoryTotals = {};
    filteredInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const category = categories.find(c => c.id === product?.category_id);
        const catName = category?.name || "غير مصنف";
        categoryTotals[catName] = (categoryTotals[catName] || 0) + item.total;
      });
    });
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  };

  // Daily sales chart
  const dailySalesData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, "days");
      const dayInvoices = invoices.filter(inv => 
        moment(inv.created_date).isSame(date, "day")
      );
      days.push({
        date: date.format("ddd"),
        sales: dayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        count: dayInvoices.length
      });
    }
    return days;
  };

  // Payment methods distribution
  const paymentMethodsData = () => {
    const methods = { cash: 0, card: 0, transfer: 0 };
    filteredInvoices.forEach(inv => {
      if (methods[inv.payment_method] !== undefined) {
        methods[inv.payment_method] += inv.total || 0;
      }
    });
    return [
      { name: "نقداً", value: methods.cash },
      { name: "بطاقة", value: methods.card },
      { name: "تحويل", value: methods.transfer },
    ].filter(m => m.value > 0);
  };

  // Recent invoices
  const recentInvoices = invoices.slice(0, 5);

  // Top products
  const topProducts = () => {
    const productSales = {};
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        productSales[item.product_name] = (productSales[item.product_name] || 0) + item.quantity;
      });
    });
    return Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));
  };

  const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }) => (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      <div className={`absolute top-0 left-0 w-32 h-32 transform -translate-x-16 -translate-y-16 rounded-full opacity-10 ${color}`} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
            {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
            <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-4 text-sm ${trend > 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(trend)}% عن الفترة السابقة</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            مرحباً {user?.full_name || "بك"} 👋
          </h1>
          <p className="text-slate-500">إليك ملخص أداء متجرك اليوم</p>
        </div>
        <div className="flex gap-2">
          {["today", "week", "month"].map(range => (
            <Button
              key={range}
              variant={dateRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(range)}
              className={dateRange === range ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {range === "today" ? "اليوم" : range === "week" ? "الأسبوع" : "الشهر"}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المبيعات"
          value={`${totalSales.toFixed(2)} ر.س`}
          icon={DollarSign}
          color="bg-emerald-500"
          trend={12}
        />
        <StatCard
          title="عدد الفواتير"
          value={totalInvoices}
          icon={FileText}
          color="bg-blue-500"
          trend={8}
        />
        <StatCard
          title="متوسط الفاتورة"
          value={`${avgTicket.toFixed(2)} ر.س`}
          icon={ShoppingCart}
          color="bg-purple-500"
        />
        <StatCard
          title="العملاء"
          value={customers.length}
          icon={Users}
          color="bg-amber-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>المبيعات اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySalesData()}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "none", 
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#10B981"
                    strokeWidth={3}
                    fill="url(#salesGradient)"
                    name="المبيعات"
                  />
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
                  <Pie
                    data={paymentMethodsData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodsData().map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {paymentMethodsData().map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-sm text-slate-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>آخر الفواتير</CardTitle>
            <Link to={createPageUrl("Invoices")}>
              <Button variant="ghost" size="sm">
                عرض الكل
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{inv.invoice_number}</p>
                      <p className="text-sm text-slate-500">
                        {moment(inv.created_date).format("YYYY/MM/DD HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-emerald-600">{inv.total?.toFixed(2)} ر.س</p>
                    <p className="text-sm text-slate-500">{inv.customer_name || "زائر"}</p>
                  </div>
                </div>
              ))}
              {recentInvoices.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  لا توجد فواتير حتى الآن
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Top Products */}
        <div className="space-y-6">
          {/* Low Stock Alert */}
          {lowStockProducts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  تنبيه المخزون
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockProducts.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-amber-800">{p.name}</span>
                      <span className="text-red-600 font-bold">{p.stock_quantity} متبقي</span>
                    </div>
                  ))}
                </div>
                <Link to={createPageUrl("Products")}>
                  <Button variant="outline" size="sm" className="w-full mt-3 border-amber-300 text-amber-700">
                    عرض المخزون
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>الأكثر مبيعاً</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topProducts().map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-yellow-100 text-yellow-700" :
                        i === 1 ? "bg-slate-200 text-slate-700" :
                        i === 2 ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-slate-700">{p.name}</span>
                    </div>
                    <span className="text-sm text-slate-500">{p.qty} قطعة</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
