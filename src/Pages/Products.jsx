import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Upload,
  BarChart2,
  AlertTriangle,
  Filter
} from "lucide-react";
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

const units = [
  { value: "piece", label: "قطعة" },
  { value: "kg", label: "كيلو" },
  { value: "gram", label: "جرام" },
  { value: "liter", label: "لتر" },
  { value: "meter", label: "متر" },
  { value: "box", label: "صندوق" },
];

export default function Products() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    barcode: "",
    sku: "",
    category_id: "",
    price: "",
    cost_price: "",
    stock_quantity: "",
    min_stock: "",
    unit: "piece",
    image_url: "",
    is_active: true,
    tax_rate: 15,
    discount_price: "",
    notes: ""
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      setDeleteProduct(null);
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      name_en: "",
      barcode: "",
      sku: "",
      category_id: "",
      price: "",
      cost_price: "",
      stock_quantity: "",
      min_stock: "",
      unit: "piece",
      image_url: "",
      is_active: true,
      tax_rate: 15,
      discount_price: "",
      notes: ""
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      name_en: product.name_en || "",
      barcode: product.barcode || "",
      sku: product.sku || "",
      category_id: product.category_id || "",
      price: product.price || "",
      cost_price: product.cost_price || "",
      stock_quantity: product.stock_quantity || "",
      min_stock: product.min_stock || "",
      unit: product.unit || "piece",
      image_url: product.image_url || "",
      is_active: product.is_active !== false,
      tax_rate: product.tax_rate || 15,
      discount_price: product.discount_price || "",
      notes: product.notes || ""
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      cost_price: parseFloat(formData.cost_price) || 0,
      stock_quantity: parseFloat(formData.stock_quantity) || 0,
      min_stock: parseFloat(formData.min_stock) || 0,
      tax_rate: parseFloat(formData.tax_rate) || 15,
      discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category_id === filterCategory;
    const matchesStock = filterStock === "all" ||
      (filterStock === "low" && p.stock_quantity <= (p.min_stock || 0)) ||
      (filterStock === "out" && p.stock_quantity === 0);
    return matchesSearch && matchesCategory && matchesStock;
  });

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || "-";
  };

  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active !== false).length,
    lowStock: products.filter(p => p.stock_quantity <= (p.min_stock || 0)).length,
    outOfStock: products.filter(p => p.stock_quantity === 0).length
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-slate-500">إجمالي المنتجات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-slate-500">منتجات نشطة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.lowStock}</p>
              <p className="text-sm text-slate-500">مخزون منخفض</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.outOfStock}</p>
              <p className="text-sm text-slate-500">نفذ المخزون</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-1 gap-4 flex-wrap">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="ابحث بالاسم أو الباركود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التصنيفات</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStock} onValueChange={setFilterStock}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="المخزون" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المخزون</SelectItem>
                  <SelectItem value="low">مخزون منخفض</SelectItem>
                  <SelectItem value="out">نفذ المخزون</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 ml-2" />
              إضافة منتج
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-right">الباركود</TableHead>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-right">السعر</TableHead>
                <TableHead className="text-right">المخزون</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-slate-500">{product.sku || "-"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.barcode || "-"}</TableCell>
                  <TableCell>{getCategoryName(product.category_id)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold">{product.price} ر.س</p>
                      {product.discount_price && (
                        <p className="text-sm text-red-500">{product.discount_price} ر.س خصم</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={product.stock_quantity <= (product.min_stock || 0) ? "text-red-600 font-bold" : ""}>
                        {product.stock_quantity ?? "-"}
                      </span>
                      {product.stock_quantity <= (product.min_stock || 0) && (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={product.is_active !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                      {product.is_active !== false ? "نشط" : "معطل"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteProduct(product)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    لا توجد منتجات
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors overflow-hidden">
                  {formData.image_url ? (
                    <img src={formData.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-500">رفع صورة</span>
                    </>
                  )}
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>اسم المنتج *</Label>
                <Input
 
