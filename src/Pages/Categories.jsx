import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Tags, GripVertical } from "lucide-react";
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

const colorOptions = [
  "#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
];

export default function Categories() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteCategory, setDeleteCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    color: "#10B981",
    icon: "",
    sort_order: 0,
    is_active: true
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list("sort_order"),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      setDeleteCategory(null);
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      name_en: "",
      color: "#10B981",
      icon: "",
      sort_order: 0,
      is_active: true
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || "",
      name_en: category.name_en || "",
      color: category.color || "#10B981",
      icon: category.icon || "",
      sort_order: category.sort_order || 0,
      is_active: category.is_active !== false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      sort_order: parseInt(formData.sort_order) || 0
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getProductCount = (categoryId) => {
    return products.filter(p => p.category_id === categoryId).length;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">التصنيفات</h2>
          <p className="text-slate-500">إدارة تصنيفات المنتجات</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 ml-2" />
          إضافة تصنيف
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((category, index) => (
          <Card key={category.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
            <div 
              className="absolute top-0 left-0 right-0 h-2"
              style={{ backgroundColor: category.color || "#10B981" }}
            />
            <CardContent className="pt-6 pb-4 px-4">
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${category.color || "#10B981"}20` }}
                >
                  <Tags className="w-6 h-6" style={{ color: category.color || "#10B981" }} />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteCategory(category)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">{category.name}</h3>
              {category.name_en && (
                <p className="text-sm text-slate-400 mb-2">{category.name_en}</p>
              )}
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-slate-500">
                  {getProductCount(category.id)} منتج
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  category.is_active !== false 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {category.is_active !== false ? "نشط" : "معطل"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add New Card */}
        <button 
          onClick={() => setShowForm(true)}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
            <Plus className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500">إضافة تصنيف جديد</p>
        </button>
      </div>

      {/* Category Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>اسم التصنيف *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>الاسم بالإنجليزية</Label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
              />
            </div>
            <div>
              <Label>اللون</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      formData.color === color ? "scale-125 ring-2 ring-offset-2 ring-slate-400" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>ترتيب العرض</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(val) => setFormData(prev => ({ ...prev, is_active: val }))}
              />
              <Label>تصنيف نشط</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
                إلغاء
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCategory ? "تحديث" : "إضافة"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف التصنيف "{deleteCategory?.name}" نهائياً. 
              {getProductCount(deleteCategory?.id) > 0 && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ يوجد {getProductCount(deleteCategory?.id)} منتج مرتبط بهذا التصنيف
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteCategory.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
