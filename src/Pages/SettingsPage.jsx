import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Store,
  Receipt,
  Percent,
  Star,
  Upload,
  Save,
  Printer,
  Globe,
  Bell,
  Shield,
  Check
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("store");
  const [settings, setSettings] = useState({
    store_name: "",
    store_name_en: "",
    logo_url: "",
    address: "",
    phone: "",
    email: "",
    tax_number: "",
    tax_rate: 15,
    currency: "SAR",
    currency_symbol: "ر.س",
    receipt_header: "",
    receipt_footer: "شكراً لزيارتكم",
    print_logo: true,
    print_tax_details: true,
    loyalty_enabled: true,
    points_per_currency: 1
  });
  const [saved, setSaved] = useState(false);

  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const list = await base44.entities.Settings.list();
      return list[0] || null;
    }
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings(prev => ({ ...prev, ...existingSettings }));
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingSettings) {
        return base44.entities.Settings.update(existingSettings.id, data);
      } else {
        return base44.entities.Settings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("تم حفظ الإعدادات بنجاح");
    }
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSettings(prev => ({ ...prev, logo_url: file_url }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(settings);
  };

  const testPrint = () => {
    const printWindow = window.open('', '_blank', 'width=300,height=400');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>اختبار الطباعة</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; width: 80mm; padding: 5mm; font-size: 12px; }
          .header { text-align: center; margin-bottom: 15px; }
          .logo { max-width: 60px; margin-bottom: 10px; }
          .store-name { font-size: 18px; font-weight: bold; }
          .info { font-size: 10px; color: #666; margin-top: 5px; }
          .content { padding: 20px 0; text-align: center; border-top: 1px dashed #000; border-bottom: 1px dashed #000; margin: 10px 0; }
          .footer { text-align: center; font-size: 10px; color: #666; }
          @media print { body { width: 80mm; } @page { margin: 0; size: 80mm auto; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${settings.logo_url && settings.print_logo ? `<img src="${settings.logo_url}" class="logo">` : ''}
          <div class="store-name">${settings.store_name || 'Fatoor POS'}</div>
          <div class="info">${settings.address || ''}</div>
          <div class="info">هاتف: ${settings.phone || ''}</div>
          ${settings.tax_number ? `<div class="info">الرقم الضريبي: ${settings.tax_number}</div>` : ''}
        </div>
        <div class="content">
          <h2>اختبار طباعة ناجح ✓</h2>
          <p style="margin-top: 10px;">الطابعة جاهزة للعمل</p>
        </div>
        <div class="footer">
          ${settings.receipt_footer || ''}
        </div>
        <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            المتجر
          </TabsTrigger>
          <TabsTrigger value="receipt" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            الفاتورة
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            الضريبة
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            الولاء
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit}>
          <TabsContent value="store" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>معلومات المتجر</CardTitle>
                <CardDescription>المعلومات الأساسية التي تظهر في الفواتير والتقارير</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors overflow-hidden">
                        {settings.logo_url ? (
                          <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400 mb-1" />
                            <span className="text-xs text-slate-400">رفع شعار</span>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label>اسم المتجر</Label>
                      <Input
                        value={settings.store_name}
                        onChange={(e) => setSettings(prev => ({ ...prev, store_name: e.target.value }))}
                        placeholder="اسم متجرك"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>الاسم بالإنجليزية</Label>
                      <Input
                        value={settings.store_name_en}
                        onChange={(e) => setSettings(prev => ({ ...prev, store_name_en: e.target.value }))}
                        placeholder="Store Name"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>رقم الهاتف</Label>
                    <Input
                      value={settings.phone}
                      onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+966 5xxxxxxxx"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="info@store.com"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>العنوان</Label>
                  <Textarea
                    value={settings.address}
                    onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="عنوان المتجر الكامل"
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>العملة</Label>
                    <Input
                      value={settings.currency}
                      onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                      placeholder="SAR"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>رمز العملة</Label>
                    <Input
                      value={settings.currency_symbol}
                      onChange={(e) => setSettings(prev => ({ ...prev, currency_symbol: e.target.value }))}
                      placeholder="ر.س"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipt" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات الفاتورة</CardTitle>
                <CardDescription>تخصيص شكل ومحتوى الفاتورة المطبوعة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>رأس الفاتورة</Label>
                  <Textarea
                    value={settings.receipt_header}
                    onChange={(e) => setSettings(prev => ({ ...prev, receipt_header: e.target.value }))}
                    placeholder="نص يظهر في أعلى الفاتورة"
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>تذييل الفاتورة</Label>
                  <Textarea
                    value={settings.receipt_footer}
                    onChange={(e) => setSettings(prev => ({ ...prev, receipt_footer: e.target.value }))}
                    placeholder="شكراً لزيارتكم"
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <p className="font-medium">طباعة الشعار</p>
                    <p className="text-sm text-slate-500">إظهار شعار المتجر في الفاتورة</p>
                  </div>
                  <Switch
                    checked={settings.print_logo}
                    onCheckedChange={(val) => setSettings(prev => ({ ...prev, print_logo: val }))}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <p className="font-medium">تفاصيل الضريبة</p>
                    <p className="text-sm text-slate-500">عرض تفاصيل الضريبة في الفاتورة</p>
                  </div>
                  <Switch
                    checked={settings.print_tax_details}
                    onCheckedChange={(val) => setSettings(prev => ({ ...prev, print_tax_details: val }))}
                  />
                </div>

                <Button type="button" variant="outline" onClick={testPrint} className="w-full">
                  <Printer className="w-4 h-4 ml-2" />
                  اختبار الطباعة
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات الضريبة</CardTitle>
                <CardDescription>تكوين ضريبة القيمة المضافة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>الرقم الضريبي</Label>
                  <Input
                    value={settings.tax_number}
                    onChange={(e) => setSettings(prev => ({ ...prev, tax_number: e.target.value }))}
                    placeholder="300000000000003"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>نسبة ضريبة القيمة المضافة (%)</Label>
                  <Input
                    type="number"
                    value={settings.tax_rate}
                    onChange={(e) => setSettings(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                    placeholder="15"
                    className="mt-1"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700">
                    💡 نسبة ضريبة القيمة المضافة في المملكة العربية السعودية هي 15%
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>برنامج الولاء</CardTitle>
                <CardDescription>إعدادات نقاط الولاء للعملاء</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">تفعيل برنامج الولاء</p>
                    <p className="text-sm text-slate-500">تجميع نقاط للعملاء عند كل عملية شراء</p>
                  </div>
                  <Switch
                    checked={settings.loyalty_enabled}
                    onCheckedChange={(val) => setSettings(prev => ({ ...prev, loyalty_enabled: val }))}
                  />
                </div>

                {settings.loyalty_enabled && (
                  <div>
                    <Label>نقاط لكل ريال</Label>
                    <Input
                      type="number"
                      value={settings.points_per_currency}
                      onChange={(e) => setSettings(prev => ({ ...prev, points_per_currency: parseFloat(e.target.value) || 0 }))}
                      placeholder="1"
                      className="mt-1"
                    />
                    <p className="text-sm text-slate-500 mt-2">
                      مثال: عند الشراء بـ 100 ر.س = {100 * (settings.points_per_currency || 0)} نقطة
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
            <Button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-700 min-w-40"
              disabled={saveMutation.isPending}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 ml-2" />
                  تم الحفظ
                </>
              ) : saveMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2" />
                  جاري الحفظ
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ الإعدادات
                </>
              )}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}
