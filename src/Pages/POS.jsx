import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Home,
  Search,
  User,
  Percent,
  Trash2,
  X,
  Check,
  Printer,
  RotateCcw,
  Clock,
  Menu,
  ChevronRight
} from "lucide-react";
import ProductGrid from "@/components/pos/ProductGrid";
import Cart from "@/components/pos/Cart";
import PaymentModal from "@/components/pos/PaymentModal";
import Receipt from "@/components/pos/Receipt";

export default function POS() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [activeShift, setActiveShift] = useState(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch data
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.filter({ is_active: true }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.filter({ is_active: true }),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const list = await base44.entities.Settings.list();
      return list[0] || {};
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts", user?.email],
    queryFn: () => base44.entities.Shift.filter({ 
      cashier_email: user?.email,
      status: "open"
    }),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (shifts.length > 0) {
      setActiveShift(shifts[0]);
    }
  }, [shifts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [products, searchTerm]);

  // Calculations
  const taxRate = settings?.tax_rate || 15;
  const currencySymbol = settings?.currency_symbol || "ر.س";

  const subtotal = useMemo(() => 
    cart.reduce((sum, item) => sum + item.total, 0),
    [cart]
  );

  const taxAmount = useMemo(() => 
    (subtotal - discount) * (taxRate / 100),
    [subtotal, discount, taxRate]
  );

  const total = useMemo(() => 
    subtotal + taxAmount - discount,
    [subtotal, taxAmount, discount]
  );

  // Cart operations
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product_id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unit_price;
        return updated;
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.discount_price || product.price,
        discount: 0,
        tax: 0,
        total: product.discount_price || product.price
      }];
    });
  }, []);

  const updateQuantity = useCallback((index, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter((_, i) => i !== index));
    } else {
      setCart(prev => {
        const updated = [...prev];
        updated[index].quantity = newQty;
        updated[index].total = newQty * updated[index].unit_price;
        return updated;
      });
    }
  }, []);

  const removeItem = useCallback((index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscount(0);
    setCustomer(null);
  }, []);

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const date = new Date();
    const prefix = "INV";
    const timestamp = date.getFullYear().toString().slice(-2) +
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${prefix}-${timestamp}-${random}`;
  };

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (paymentData) => {
      const invoiceData = {
        invoice_number: generateInvoiceNumber(),
        customer_id: customer?.id,
        customer_name: customer?.name,
        items: cart,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discount,
        total,
        payment_method: paymentData.payment_method,
        cash_received: paymentData.cash_received,
        change_amount: paymentData.change_amount,
        status: "completed",
        cashier_email: user?.email,
        cashier_name: user?.full_name,
        shift_id: activeShift?.id
      };

      const invoice = await base44.entities.Invoice.create(invoiceData);

      // Update stock
      for (const item of cart) {
        const product = products.find(p => p.id === item.product_id);
        if (product && product.stock_quantity !== undefined) {
          await base44.entities.Product.update(product.id, {
            stock_quantity: Math.max(0, (product.stock_quantity || 0) - item.quantity)
          });
        }
      }

      // Update shift totals
      if (activeShift) {
        const updateData = {
          total_sales: (activeShift.total_sales || 0) + total,
          invoices_count: (activeShift.invoices_count || 0) + 1
        };
        if (paymentData.payment_method === "cash") {
          updateData.total_cash = (activeShift.total_cash || 0) + total;
        } else if (paymentData.payment_method === "card") {
          updateData.total_card = (activeShift.total_card || 0) + total;
        }
        await base44.entities.Shift.update(activeShift.id, updateData);
      }

      // Update customer loyalty
      if (customer) {
        const pointsEarned = Math.floor(total * (settings?.points_per_currency || 1));
        await base44.entities.Customer.update(customer.id, {
          loyalty_points: (customer.loyalty_points || 0) + pointsEarned,
          total_purchases: (customer.total_purchases || 0) + total
        });
      }

      return invoice;
    },
    onSuccess: (invoice) => {
      setCurrentInvoice(invoice);
      setShowPayment(false);
      setShowReceipt(true);
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["shifts"]);
    }
  });

  const handlePaymentComplete = (paymentData) => {
    createInvoiceMutation.mutate(paymentData);
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setCurrentInvoice(null);
    clearCart();
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const applyDiscount = () => {
    const value = parseFloat(discountInput) || 0;
    setDiscount(Math.min(value, subtotal));
    setShowDiscount(false);
    setDiscountInput("");
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col lg:flex-row overflow-hidden" dir="rtl">
      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white px-4 lg:px-6 py-4 flex items-center gap-4 shadow-sm">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Home className="w-5 h-5" />
            </Button>
          </Link>

          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="ابحث بالاسم أو الباركود..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 h-12 bg-slate-50 border-0"
            />
          </div>

          {activeShift ? (
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">وردية نشطة</span>
            </div>
          ) : (
            <Link to={createPageUrl("Shifts")}>
              <Button variant="outline" className="hidden md:flex">
                <Clock className="w-4 h-4 ml-2" />
                بدء وردية
              </Button>
            </Link>
          )}

          {/* Mobile Cart Toggle */}
          <Button
            className="lg:hidden relative"
            onClick={() => setShowMobileCart(true)}
          >
            <Menu className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </Button>
        </header>

        {/* Products */}
        <div className="flex-1 p-4 lg:p-6 overflow-hidden">
          <ProductGrid
            products={filteredProducts}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onAddToCart={addToCart}
          />
        </div>
      </div>

      {/* Cart Sidebar - Desktop */}
      <aside className="hidden lg:flex w-96 bg-white border-r border-slate-200 flex-col">
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <Cart
            items={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onClearCart={clearCart}
            subtotal={subtotal}
            taxAmount={taxAmount}
            discountAmount={discount}
            total={total}
            currencySymbol={currencySymbol}
            taxRate={taxRate}
          />
        </div>

        {/* Cart Actions */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCustomerSearch(true)}
            >
              <User className="w-4 h-4 ml-2" />
              {customer ? customer.name : "عميل"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDiscount(true)}
            >
              <Percent className="w-4 h-4 ml-2" />
              {discount > 0 ? `${discount} ${currencySymbol}` : "خصم"}
            </Button>
          </div>
          <Button
            className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30"
            disabled={cart.length === 0}
            onClick={() => setShowPayment(true)}
          >
            دفع {total.toFixed(2)} {currencySymbol}
          </Button>
        </div>
      </aside>

      {/* Mobile Cart Drawer */}
      <Dialog open={showMobileCart} onOpenChange={setShowMobileCart}>
        <DialogContent className="h-[90vh] flex flex-col p-0" dir="rtl">
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            <Cart
              items={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              subtotal={subtotal}
              taxAmount={taxAmount}
              discountAmount={discount}
              total={total}
              currencySymbol={currencySymbol}
              taxRate={taxRate}
            />
          </div>
          <div className="p-4 border-t space-y-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowMobileCart(false); setShowCustomerSearch(true); }}
              >
                <User className="w-4 h-4 ml-2" />
                {customer ? customer.name : "عميل"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowMobileCart(false); setShowDiscount(true); }}
              >
                <Percent className="w-4 h-4 ml-2" />
                خصم
              </Button>
            </div>
            <Button
              className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600"
              disabled={cart.length === 0}
              onClick={() => { setShowMobileCart(false); setShowPayment(true); }}
            >
              دفع {total.toFixed(2)} {currencySymbol}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Search Dialog */}
      <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>اختر عميل</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="ابحث بالاسم أو الهاتف..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="mb-4"
          />
          <div className="max-h-64 overflow-y-auto space-y-2">
            <button
              onClick={() => { setCustomer(null); setShowCustomerSearch(false); }}
              className="w-full p-3 text-right rounded-lg hover:bg-slate-50 transition-colors"
            >
              <span className="text-slate-500">بدون عميل</span>
            </button>
            {filteredCustomers.map(c => (
              <button
                key={c.id}
                onClick={() => { setCustomer(c); setShowCustomerSearch(false); }}
                className="w-full p-3 text-right rounded-lg hover:bg-slate-50 transition-colors border"
              >
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-slate-500">{c.phone}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscount} onOpenChange={setShowDiscount}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة خصم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="مبلغ الخصم"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              className="text-center text-lg h-14"
            />
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 20, 50].map(val => (
                <Button
                  key={val}
                  variant="outline"
                  onClick={() => setDiscountInput(val.toString())}
                >
                  {val}
                </Button>
              ))}
            </div>
            <Button onClick={applyDiscount} className="w-full">
              تطبيق الخصم
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        total={total}
        onComplete={handlePaymentComplete}
        currencySymbol={currencySymbol}
        isProcessing={createInvoiceMutation.isPending}
      />

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={handleReceiptClose}>
        <DialogContent className="max-w-md p-0" dir="rtl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={handleReceiptClose}>
                <X className="w-5 h-5" />
              </Button>
              <h3 className="font-bold text-lg">تمت العملية بنجاح</h3>
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            {currentInvoice && (
              <Receipt invoice={currentInvoice} settings={settings} onPrint={() => {}} />
            )}
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={handleReceiptClose}>
                <RotateCcw className="w-4 h-4 ml-2" />
                عملية جديدة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
