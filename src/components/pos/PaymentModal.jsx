import React from "react";
import { Package } from "lucide-react";

export default function ProductGrid({ products, categories, selectedCategory, onSelectCategory, onAddToCart }) {
  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter(p => p.category_id === selectedCategory);

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || "#6B7280";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        <button
          onClick={() => onSelectCategory("all")}
          className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-medium transition-all ${
            selectedCategory === "all"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          الكل
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-medium transition-all ${
              selectedCategory === category.id
                ? "text-white shadow-lg"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
            style={selectedCategory === category.id ? { 
              background: `linear-gradient(135deg, ${category.color || '#10B981'}, ${category.color || '#059669'})`,
              boxShadow: `0 10px 25px ${category.color || '#10B981'}40`
            } : {}}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              className="group bg-white rounded-2xl p-4 border border-slate-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 text-right"
            >
              <div className="aspect-square rounded-xl bg-slate-50 mb-3 overflow-hidden relative">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                {product.discount_price && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg">
                    خصم
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-slate-800 truncate mb-1">{product.name}</h3>
              <div className="flex items-center justify-between">
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getCategoryColor(product.category_id) }}
                />
                <div className="text-left">
                  {product.discount_price ? (
                    <>
                      <span className="text-sm text-slate-400 line-through ml-2">{product.price}</span>
                      <span className="font-bold text-emerald-600">{product.discount_price}</span>
                    </>
                  ) : (
                    <span className="font-bold text-emerald-600">{product.price}</span>
                  )}
                  <span className="text-xs text-slate-400 mr-1">ر.س</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Package className="w-16 h-16 mb-4" />
            <p className="text-lg">لا توجد منتجات</p>
          </div>
        )}
      </div>
    </div>
  );
}
