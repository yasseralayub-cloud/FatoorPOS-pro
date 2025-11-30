import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// صفحات المشروع
import Dashboard from "./Pages/Dashboard.jsx";
import POS from "./Pages/POS.jsx";
import Products from "./Pages/Products.jsx";
import Categories from "./Pages/Categories.jsx";
import Customers from "./Pages/Customers.jsx";
import Invoices from "./Pages/Invoices.jsx";
import Reports from "./Pages/Reports.jsx";
import Shifts from "./Pages/Shifts.jsx";
import SettingsPage from "./Pages/SettingsPage.jsx";

// دالة مساعدة لإنشاء روابط الصفحات
import createPageUrl from "./utils/createPageUrl.js";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* الصفحة الرئيسية = Dashboard */}
        <Route path={createPageUrl("dashboard")} element={<Dashboard />} />

        {/* نقطة البيع */}
        <Route path={createPageUrl("pos")} element={<POS />} />

        {/* المنتجات */}
        <Route path={createPageUrl("products")} element={<Products />} />

        {/* التصنيفات */}
        <Route path={createPageUrl("categories")} element={<Categories />} />

        {/* العملاء */}
        <Route path={createPageUrl("customers")} element={<Customers />} />

        {/* الفواتير */}
        <Route path={createPageUrl("invoices")} element={<Invoices />} />

        {/* التقارير */}
        <Route path={createPageUrl("reports")} element={<Reports />} />

        {/* الشفتات */}
        <Route path={createPageUrl("shifts")} element={<Shifts />} />

        {/* الإعدادات */}
        <Route path={createPageUrl("settings")} element={<SettingsPage />} />

        {/* أي مسار غير موجود → Dashboard */}
        <Route path="*" element={<Navigate to={createPageUrl("dashboard")} />} />
      </Routes>
    </BrowserRouter>
  );
}
