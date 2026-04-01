import React, { useState, useEffect } from "react";
import { Product, CartItem, Order } from "./types";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import ProductDetails from "./components/ProductDetails";
import AdminPanel from "./components/AdminPanel";
import { motion, AnimatePresence } from "motion/react";
import { Lock, ArrowLeft } from "lucide-react";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<{ logoBase64: string }>({ logoBase64: "" });
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("s-store-cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [sortBy, setSortBy] = useState<"none" | "low" | "high">("none");
  const [isLoading, setIsLoading] = useState(true);
  
  // Admin State
  const [view, setView] = useState<"store" | "admin">("store");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  useEffect(() => {
    localStorage.setItem("s-store-cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = async (customerData: any) => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order: Order = {
      ...customerData,
      items: cart,
      total
    };

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });
      if (res.ok) {
        setCart([]);
        setIsCheckoutOpen(false);
      }
    } catch (error) {
      console.error("Error placing order:", error);
    }
  };

  const handleAddProduct = async (newProduct: Omit<Product, "id">) => {
    try {
      const res = await fetch("/api/admin/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  const handleUpdateSettings = async (newSettings: { logoBase64: string }) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        setSettings(newSettings);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/delete-product/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "shoh1dbek") {
      setIsAdminAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Invalid password. Access denied.");
    }
  };

  const filteredProducts = products
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPrice = p.price >= minPrice && p.price <= maxPrice;
      return matchesSearch && matchesPrice;
    })
    .sort((a, b) => {
      if (sortBy === "low") return a.price - b.price;
      if (sortBy === "high") return b.price - a.price;
      return 0;
    });

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {view === "store" ? (
          <motion.div
            key="store"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Navbar
              cartCount={cartCount}
              onCartClick={() => setIsCartOpen(true)}
              onSearch={setSearchQuery}
              logo={settings.logoBase64}
            />

            <main className="max-w-7xl mx-auto px-6 py-12">
              <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-black tracking-tighter mb-2"
                  >
                    FUTURE <span className="text-brand-accent">GEAR</span>
                  </motion.h2>
                  <p className="text-gray-500">Premium electronics for the modern era.</p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <div className="glass px-4 py-2 rounded-xl flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-500 uppercase">Price</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minPrice || ""}
                        onChange={(e) => setMinPrice(Number(e.target.value))}
                        className="w-20 bg-white/5 border border-white/10 rounded-lg py-1 px-2 text-xs focus:outline-none focus:border-brand-accent"
                      />
                      <span className="text-gray-600">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxPrice || ""}
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                        className="w-20 bg-white/5 border border-white/10 rounded-lg py-1 px-2 text-xs focus:outline-none focus:border-brand-accent"
                      />
                    </div>
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="glass px-4 py-2 rounded-xl text-xs font-bold focus:outline-none border-none appearance-none cursor-pointer"
                  >
                    <option value="none">Sort By</option>
                    <option value="low">Price: Low to High</option>
                    <option value="high">Price: High to Low</option>
                  </select>
                </div>
              </header>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="glass rounded-2xl aspect-[3/4] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                      onShowDetails={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              )}
            </main>
          </motion.div>
        ) : (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-brand-bg"
          >
            {!isAdminAuthenticated ? (
              <div className="min-h-screen flex items-center justify-center p-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="glass p-12 rounded-3xl w-full max-w-md space-y-8"
                >
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-brand-accent" />
                    </div>
                    <h2 className="text-2xl font-bold">Admin Access</h2>
                    <p className="text-gray-500 text-sm">Enter password to manage S STORE.</p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-6">
                    <div className="space-y-2">
                      <input
                        type="password"
                        placeholder="Password"
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors text-center tracking-widest"
                      />
                      {loginError && <p className="text-red-500 text-xs text-center">{loginError}</p>}
                    </div>
                    <button type="submit" className="btn-primary w-full py-4">
                      Unlock Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("store")}
                      className="w-full text-gray-500 text-sm hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Store
                    </button>
                  </form>
                </motion.div>
              </div>
            ) : (
              <AdminPanel
                products={products}
                settings={settings}
                onAddProduct={handleAddProduct}
                onDeleteProduct={handleDeleteProduct}
                onUpdateSettings={handleUpdateSettings}
                onLogout={() => {
                  setIsAdminAuthenticated(false);
                  setAdminPassword("");
                  setView("store");
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <Checkout
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onCheckout={handleCheckout}
      />

      <ProductDetails
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <footer className="border-t border-white/10 py-12 px-6 mt-24">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <h1 className="text-xl font-black tracking-tighter text-brand-accent">S STORE</h1>
          <div className="flex gap-8 text-sm text-gray-500">
            <button onClick={() => setView("admin")} className="hover:text-white transition-colors">Admin</button>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-xs text-gray-600">© 2026 S STORE. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
