import React, { useState } from "react";
import { Product } from "../types";
import { motion } from "motion/react";
import { Plus, Trash2, LogOut, Package, Image as ImageIcon, Tag, Hash, FileText, Settings } from "lucide-react";

interface AdminPanelProps {
  products: Product[];
  settings: { logoBase64: string };
  onAddProduct: (product: Omit<Product, "id">) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateSettings: (settings: { logoBase64: string }) => void;
  onLogout: () => void;
}

export default function AdminPanel({ products, settings, onAddProduct, onDeleteProduct, onUpdateSettings, onLogout }: AdminPanelProps) {
  const [newProduct, setNewProduct] = useState<Omit<Product, "id">>({
    name: "",
    price: 0,
    category: "Electronics",
    image: "",
    description: "",
    specs: {}
  });
  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");

  const handleAddSpec = () => {
    if (specKey && specValue) {
      setNewProduct(prev => ({
        ...prev,
        specs: { ...prev.specs, [specKey]: specValue }
      }));
      setSpecKey("");
      setSpecValue("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddProduct(newProduct);
    setNewProduct({
      name: "",
      price: 0,
      category: "Electronics",
      image: "",
      description: "",
      specs: {}
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">ADMIN <span className="text-brand-accent">DASHBOARD</span></h2>
          <p className="text-gray-500">Manage your futuristic inventory.</p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Add Product Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="glass p-8 rounded-3xl space-y-6 sticky top-24">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-accent" /> Add Product
            </h3>
            
            <div className="space-y-4">
              <div className="relative">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  required
                  type="text"
                  placeholder="Product Name"
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-accent transition-colors"
                />
              </div>
              
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  required
                  type="number"
                  placeholder="Price"
                  value={newProduct.price || ""}
                  onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-accent transition-colors"
                />
              </div>

              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={newProduct.category}
                  onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-accent transition-colors appearance-none"
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              <div className="relative">
                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <div className="flex gap-2 pl-12 pr-4">
                  <input
                    type="text"
                    placeholder="Image URL or Upload"
                    value={newProduct.image}
                    onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors text-sm"
                  />
                  <label className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewProduct({ ...newProduct, image: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="relative">
                <FileText className="absolute left-4 top-4 w-4 h-4 text-gray-500" />
                <textarea
                  required
                  placeholder="Description"
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-accent transition-colors min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Specifications</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key"
                    value={specKey}
                    onChange={e => setSpecKey(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-brand-accent transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={specValue}
                    onChange={e => setSpecValue(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-brand-accent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleAddSpec}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(newProduct.specs).map(([k, v]) => (
                    <span key={k} className="text-[10px] bg-brand-accent/20 text-brand-accent px-2 py-1 rounded-md border border-brand-accent/30">
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-4">
              Add to Catalog
            </button>
          </form>

          {/* Store Settings */}
          <div className="glass p-8 rounded-3xl space-y-6 mt-8">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-accent" /> Store Settings
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Store Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {settings.logoBase64 ? (
                      <img src={settings.logoBase64} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-gray-600">No Logo</span>
                    )}
                  </div>
                  <label className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-gray-400 hover:text-white cursor-pointer transition-colors text-center">
                    Upload New Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            onUpdateSettings({ logoBase64: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-accent" /> Current Inventory
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map(product => (
              <motion.div
                key={product.id}
                layout
                className="glass p-4 rounded-2xl flex gap-4 items-center group"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{product.name}</h4>
                  <p className="text-brand-accent font-bold text-sm">${product.price}</p>
                  <p className="text-xs text-gray-500">{product.category}</p>
                </div>
                <button
                  onClick={() => onDeleteProduct(product.id)}
                  className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
