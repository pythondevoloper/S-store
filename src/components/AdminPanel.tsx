import React, { useState, useEffect } from "react";
import { Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, LogOut, Package, Image as ImageIcon, Tag, Hash, FileText, Settings, Ticket, AlertCircle, CheckCircle2, Star, BarChart3, TrendingUp, ShoppingBag, DollarSign as DollarIcon, Users, ExternalLink, User, Zap, Copy, Activity, Database, Clock as ClockIcon, CreditCard, RefreshCw, Bot as BotIcon, LayoutDashboard } from "lucide-react";
import AdminSettings from "./AdminSettings";
import Dashboard from "./Dashboard";
import BotManager from "./BotManager";

interface AdminPanelProps {
  products: Product[];
  settings: { 
    logoBase64: string; 
    cardNumber: string; 
    cardName: string; 
    paymentType: "card" | "wallet";
    walletNumber: string;
    walletName: string;
    bots: { token: string; username: string; status: "active" | "inactive" }[] 
  };
  adminUser: { username: string; role: string } | null;
  userData: any;
  onAddProduct: (product: Omit<Product, "id">) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateSettings: (settings: any) => void;
  onLogout: () => void;
  exchangeRate: number;
  onUpdateExchangeRate: (rate: number, manual: boolean) => void;
}

interface AnalyticsData {
  totalSales: number;
  totalOrders: number;
  topProducts: { name: string; quantity: number }[];
  salesChart: { date: string; total: number }[];
  affiliateStats?: { username: string; token: string; balance: number }[];
}

interface PromoCode {
  id: string;
  code: string;
  discountPercentage: number;
  expiryDate: string;
  isActive: boolean;
}

export default function AdminPanel({ products, settings, adminUser, userData, onAddProduct, onDeleteProduct, onUpdateSettings, onLogout, exchangeRate, onUpdateExchangeRate }: AdminPanelProps) {
  const isSuperAdmin = adminUser?.role === "SuperAdmin" || userData?.role === "SuperAdmin";
  const [activeTab, setActiveTab] = useState<"inventory" | "settings" | "promos" | "reviews" | "profile" | "diagnostics" | "paymentSettings" | "dashboard" | "botManager" | "orders" | "userManagement">("inventory");
  
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "Manager" });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
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

  // Promo Code State
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [newPromo, setNewPromo] = useState({ code: "", discountPercentage: 0, expiryDate: "", isActive: true });
  const [promoMessage, setPromoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [manualRate, setManualRate] = useState(exchangeRate);
  const [isManual, setIsManual] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [diagnostics, setDiagnostics] = useState<{ uptime: number; logs: any[]; dbSize: string } | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdminPromos();
      fetchAnalytics();
      fetchDiagnostics();
      fetchOrders();
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "x-admin-role": adminUser?.role || "" }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-role": adminUser?.role || ""
        },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setNewUser({ username: "", password: "", role: "Manager" });
        fetchUsers();
        alert("Foydalanuvchi muvaffaqiyatli qo'shildi!");
      } else {
        const err = await res.json();
        alert(`Xatolik: ${err.message}`);
      }
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-role": adminUser?.role || ""
        },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
        alert("Foydalanuvchi ma'lumotlari yangilandi!");
      } else {
        const err = await res.json();
        alert(`Xatolik: ${err.message}`);
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Haqiqatan ham ushbu foydalanuvchini o'chirib tashlamoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { "x-admin-role": adminUser?.role || "" }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(`Xatolik: ${err.message}`);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const fetchOrders = async () => {
    setIsOrdersLoading(true);
    try {
      const res = await fetch("/api/admin/orders", {
        headers: { "x-admin-role": adminUser?.role || "" }
      });
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-role": adminUser?.role || ""
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        // Update local state instantly
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        // Also update analytics if needed
        fetchAnalytics();
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch("/api/admin/diagnostics", {
        headers: { "x-admin-role": adminUser?.role || "" }
      });
      const data = await res.json();
      setDiagnostics(data);
    } catch (error) {
      console.error("Error fetching diagnostics:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics", {
        headers: { "x-admin-role": adminUser?.role || "" }
      });
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const fetchAdminPromos = async () => {
    try {
      const res = await fetch("/api/admin/promocodes", {
        headers: { "x-admin-role": adminUser?.role || "" }
      });
      const data = await res.json();
      setPromoCodes(data);
    } catch (error) {
      console.error("Error fetching admin promos:", error);
    }
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/promocodes", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-role": adminUser?.role || ""
        },
        body: JSON.stringify(newPromo)
      });
      if (res.ok) {
        setPromoMessage({ type: "success", text: "Promo code created successfully!" });
        setNewPromo({ code: "", discountPercentage: 0, expiryDate: "", isActive: true });
        fetchAdminPromos();
      } else {
        setPromoMessage({ type: "error", text: "Failed to create promo code." });
      }
    } catch (error) {
      setPromoMessage({ type: "error", text: "Error connecting to server." });
    }
    setTimeout(() => setPromoMessage(null), 3000);
  };

  const handleDeletePromo = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/promocodes/${id}`, { 
        method: "DELETE",
        headers: { "x-admin-role": adminUser?.role || "" }
      });
      if (res.ok) {
        setPromoMessage({ type: "success", text: "Promo code deleted." });
        fetchAdminPromos();
      }
    } catch (error) {
      setPromoMessage({ type: "error", text: "Failed to delete promo code." });
    }
    setTimeout(() => setPromoMessage(null), 3000);
  };

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
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Logged in as:</span>
            <span className="text-xs font-bold text-brand-accent uppercase tracking-widest bg-brand-accent/10 px-2 py-0.5 rounded">{adminUser?.username} ({adminUser?.role})</span>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors font-bold">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar no-scrollbar">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "inventory" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
        >
          Inventory
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "dashboard" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
          >
            Dashboard
          </button>
        )}
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "profile" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
        >
          Profile
        </button>
        {isSuperAdmin && (
          <>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "orders" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
            >
              Buyurtmalar
            </button>
            <button
              onClick={() => setActiveTab("userManagement")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "userManagement" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
            >
              Foydalanuvchilar
            </button>
            <button
              onClick={() => setActiveTab("botManager")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "botManager" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
            >
              Bot Manager
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "analytics" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
            >
              Analitika
            </button>
            <button
              onClick={() => setActiveTab("promos")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "promos" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
            >
              Promo Codes
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "reviews" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
            >
              Reviews
            </button>
            <button
              onClick={() => setActiveTab("paymentSettings")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "paymentSettings" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
            >
              To'lov Sozlamalari
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "settings" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab("diagnostics")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "diagnostics" ? "bg-brand-accent text-brand-bg" : "text-gray-500 hover:text-white"}`}
            >
              Diagnostika
            </button>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "dashboard" && isSuperAdmin && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Dashboard adminRole={adminUser?.role || ""} />
          </motion.div>
        )}

        {activeTab === "orders" && isSuperAdmin && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-accent" /> Buyurtmalar Boshqaruvi
              </h3>
              <button 
                onClick={fetchOrders}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              >
                <RefreshCw className={`w-5 h-5 ${isOrdersLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="glass p-8 rounded-[40px] border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">ID</th>
                      <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Mijoz</th>
                      <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Summa</th>
                      <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Holat</th>
                      <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.filter(o => o.status === "Awaiting Approval" || o.status === "Pending Payment" || o.status === "Awaiting Payment").map((order) => (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-4 font-mono text-xs text-brand-accent">{order.id}</td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold">{order.customerName || "Noma'lum"}</span>
                            <span className="text-[10px] text-gray-500">{order.phone || order.email}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-black">${order.total?.toLocaleString()}</span>
                            {order.ocr_amount && (
                              <span className={`text-[8px] font-bold ${order.ai_match?.includes("✅") ? "text-green-500" : "text-red-500"}`}>
                                AI: ${order.ocr_amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id, "Paid")}
                            className="px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-green-500 hover:text-white transition-all"
                          >
                            Tasdiqlash
                          </button>
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id, "Rejected")}
                            className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all"
                          >
                            Rad etish
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.filter(o => o.status === "Awaiting Approval" || o.status === "Pending Payment" || o.status === "Awaiting Payment").length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500 font-bold uppercase tracking-widest">
                          Kutilayotgan buyurtmalar yo'q
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* History Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-4">Yaqinda yakunlanganlar</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.filter(o => o.status === "Paid" || o.status === "Rejected").slice(0, 6).map((order) => (
                  <div key={order.id} className="glass p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-mono text-brand-accent">{order.id}</p>
                      <p className="font-bold">{order.customerName}</p>
                      <p className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg">${order.total}</p>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${order.status === "Paid" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "userManagement" && isSuperAdmin && (
          <motion.div
            key="userManagement"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-1">
                <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="glass p-8 rounded-3xl space-y-6 sticky top-24">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <User className="w-5 h-5 text-brand-accent" /> {editingUser ? "Foydalanuvchini Tahrirlash" : "Yangi Foydalanuvchi"}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                      <input
                        required
                        type="text"
                        placeholder="admin_name"
                        value={editingUser ? editingUser.username : newUser.username}
                        onChange={e => editingUser ? setEditingUser({...editingUser, username: e.target.value}) : setNewUser({ ...newUser, username: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                      <input
                        required
                        type="text"
                        placeholder="password123"
                        value={editingUser ? editingUser.password : newUser.password}
                        onChange={e => editingUser ? setEditingUser({...editingUser, password: e.target.value}) : setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Role</label>
                      <select
                        value={editingUser ? editingUser.role : newUser.role}
                        onChange={e => editingUser ? setEditingUser({...editingUser, role: e.target.value}) : setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors appearance-none"
                      >
                        <option value="SuperAdmin">SuperAdmin</option>
                        <option value="Manager">Manager</option>
                        <option value="User">User</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary flex-1 py-4">
                      {editingUser ? "Yangilash" : "Qo'shish"}
                    </button>
                    {editingUser && (
                      <button 
                        type="button" 
                        onClick={() => setEditingUser(null)}
                        className="px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                      >
                        Bekor qilish
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-accent" /> Admin Foydalanuvchilar
                  </h3>
                  <button 
                    onClick={fetchUsers}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                  >
                    <RefreshCw className={`w-5 h-5 ${isUsersLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {users.map(user => (
                    <div key={user.id} className="glass p-6 rounded-2xl flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-accent/20 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-brand-accent" />
                        </div>
                        <div>
                          <h4 className="font-bold">{user.username}</h4>
                          <div className="flex gap-2 items-center">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${user.role === "SuperAdmin" ? "bg-red-500/10 text-red-500" : "bg-brand-accent/10 text-brand-accent"}`}>
                              {user.role}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">PW: {user.password}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 text-gray-500 hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-all"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "botManager" && isSuperAdmin && (
          <motion.div
            key="botManager"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <BotManager 
              bots={settings.bots || []} 
              onUpdateBots={(bots) => onUpdateSettings({ bots })}
              adminRole={adminUser?.role || ""}
            />
          </motion.div>
        )}

        {activeTab === "profile" && (adminUser || userData) && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl space-y-8"
          >
            <div className="glass p-8 rounded-[40px] border border-white/5 space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-brand-accent/20 rounded-3xl flex items-center justify-center overflow-hidden border border-brand-accent/30">
                  {userData?.photoURL ? (
                    <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-10 h-10 text-brand-accent" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase">{userData?.displayName || adminUser?.username}</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{userData?.role || adminUser?.role}</p>
                  {userData?.email && <p className="text-[10px] text-gray-600 font-bold">{userData.email}</p>}
                </div>
              </div>

              <div className="pt-8 border-t border-white/10 space-y-6">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-brand-accent" />
                  <h4 className="text-lg font-bold uppercase tracking-tighter">Hamkorlik Dasturi (Affiliate)</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sizning Hamkorlik Havolangiz</p>
                    <div className="flex gap-2">
                      <input 
                        readOnly
                        value={`${window.location.origin}?ref=${userData?.affiliateToken || (adminUser as any)?.affiliateToken || "TOKEN_NOT_FOUND"}`}
                        className="flex-1 bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-xs font-mono text-brand-accent"
                      />
                      <button 
                        onClick={() => {
                          const token = userData?.affiliateToken || (adminUser as any)?.affiliateToken;
                          navigator.clipboard.writeText(`${window.location.origin}?ref=${token}`);
                          alert("Havola nusxalandi!");
                        }}
                        className="p-3 bg-brand-accent text-brand-bg rounded-xl hover:shadow-[0_0_15px_#00d4ff] transition-all"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-600 font-bold">Ushbu havola orqali kelgan har bir xariddan 5% komissiya olasiz.</p>
                  </div>

                  <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-3xl flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Hamkorlik Balansi</p>
                      <h4 className="text-3xl font-black text-green-500">${(userData?.affiliateBalance || (adminUser as any)?.affiliateBalance || 0).toFixed(2)}</h4>
                    </div>
                    <button className="px-6 py-3 bg-green-500 text-white rounded-xl font-black text-xs tracking-widest uppercase hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all">
                      Yechib olish
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "analytics" && isSuperAdmin && analytics && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass p-8 rounded-[32px] border border-white/5 space-y-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                  <DollarIcon className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Sales</p>
                  <h4 className="text-3xl font-black tracking-tighter">${analytics.totalSales.toLocaleString()}</h4>
                </div>
              </div>

              <div className="glass p-8 rounded-[32px] border border-white/5 space-y-4">
                <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-brand-accent" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Orders</p>
                  <h4 className="text-3xl font-black tracking-tighter">{analytics.totalOrders}</h4>
                </div>
              </div>

              <div className="glass p-8 rounded-[32px] border border-white/5 space-y-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Growth</p>
                  <h4 className="text-3xl font-black tracking-tighter">+12.5%</h4>
                </div>
              </div>
            </div>

            {/* Affiliate Program Stats */}
            {analytics.affiliateStats && analytics.affiliateStats.length > 0 && (
              <div className="glass p-8 rounded-[40px] border border-white/5 space-y-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-accent" /> Affiliate Program (Hamkorlik Dasturi)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Username</th>
                        <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Token</th>
                        <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Balance</th>
                        <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.affiliateStats.map((aff) => (
                        <tr key={aff.token} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="py-4 px-4 font-bold">{aff.username}</td>
                          <td className="py-4 px-4 font-mono text-xs text-brand-accent">{aff.token}</td>
                          <td className="py-4 px-4 font-black text-green-500">${aff.balance.toFixed(2)}</td>
                          <td className="py-4 px-4 text-right">
                            <button className="px-4 py-2 bg-brand-accent/10 text-brand-accent rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-brand-accent hover:text-brand-bg transition-all">
                              Payout
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Sales Chart */}
              <div className="glass p-8 rounded-[40px] border border-white/5 space-y-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-accent" /> Sales Growth (Last 7 Days)
                </h3>
                <div className="h-64 flex items-end gap-4 px-4">
                  {analytics.salesChart.map((day, i) => {
                    const maxVal = Math.max(...analytics.salesChart.map(d => d.total)) || 1;
                    const height = (day.total / maxVal) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-4 group">
                        <div className="relative w-full">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            className="w-full bg-brand-accent/20 border-t-2 border-brand-accent rounded-t-lg group-hover:bg-brand-accent/40 transition-all"
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-brand-accent text-brand-bg px-2 py-1 rounded">
                            ${day.total}
                          </div>
                        </div>
                        <span className="text-[8px] font-bold text-gray-600 uppercase rotate-45 origin-left">
                          {day.date.split("-").slice(1).join("/") || i}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Products */}
              <div className="glass p-8 rounded-[40px] border border-white/5 space-y-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" /> Top Selling Products
                </h3>
                <div className="space-y-4">
                  {analytics.topProducts.map((product, i) => (
                    <div key={product.name} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="w-8 h-8 bg-brand-accent/10 rounded-lg flex items-center justify-center text-brand-accent font-black text-xs">
                        #{i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{product.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{product.quantity} Sold</p>
                      </div>
                      <div className="h-2 w-24 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(product.quantity / analytics.topProducts[0].quantity) * 100}%` }}
                          className="h-full bg-brand-accent shadow-[0_0_10px_#00d4ff]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "diagnostics" && isSuperAdmin && diagnostics && (
          <motion.div
            key="diagnostics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass p-8 rounded-[32px] border border-white/5 flex items-center gap-6">
                <div className="w-16 h-16 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
                  <ClockIcon className="w-8 h-8 text-brand-accent" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Server Uptime</p>
                  <h4 className="text-2xl font-black tracking-tighter">
                    {Math.floor(diagnostics.uptime / 3600)}h {Math.floor((diagnostics.uptime % 3600) / 60)}m {diagnostics.uptime % 60}s
                  </h4>
                </div>
              </div>

              <div className="glass p-8 rounded-[32px] border border-white/5 flex items-center gap-6">
                <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                  <Database className="w-8 h-8 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Database Size</p>
                  <h4 className="text-2xl font-black tracking-tighter">{diagnostics.dbSize}</h4>
                </div>
              </div>
            </div>

            <div className="glass p-8 rounded-[40px] border border-white/5 space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-accent" /> Server Logs (Recent 100)
              </h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {diagnostics.logs.map((log: any) => (
                  <div key={log.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex gap-4 items-start">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${log.type === "ERROR" ? "bg-red-500/20 text-red-500" : "bg-brand-accent/20 text-brand-accent"}`}>
                      {log.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-gray-300 break-words">{log.message}</p>
                      <p className="text-[8px] text-gray-600 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {diagnostics.logs.length === 0 && (
                  <div className="text-center py-12 text-gray-500 font-bold uppercase tracking-widest">
                    No logs found.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "inventory" && (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-12"
          >
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
                      <option value="Smartfonlar">Smartfonlar</option>
                      <option value="Aksessuarlar">Aksessuarlar</option>
                      <option value="Noutbuklar">Noutbuklar</option>
                      <option value="Quloqchinlar">Quloqchinlar</option>
                      <option value="Komponentlar">Komponentlar</option>
                      <option value="CPU">CPU (Protsessor)</option>
                      <option value="GPU">GPU (Videokarta)</option>
                      <option value="Motherboard">Motherboard (Ona plata)</option>
                      <option value="RAM">RAM (Operativ xotira)</option>
                      <option value="Storage">Storage (Xotira)</option>
                      <option value="PSU">PSU (Blok pitaniya)</option>
                      <option value="Case">Case (Korpus)</option>
                      <option value="Cooler">Cooler (Sovutish tizimi)</option>
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
                      <p className="text-xs text-gray-500">
                        {product.category}
                        {["CPU", "GPU", "Motherboard", "RAM", "Storage", "PSU", "Case", "Cooler"].includes(product.category) && (
                          <span className="ml-2 px-1.5 py-0.5 bg-brand-accent/20 text-brand-accent text-[8px] font-black uppercase rounded">PC Part</span>
                        )}
                      </p>
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
          </motion.div>
        )}

        {activeTab === "promos" && isSuperAdmin && (
          <motion.div
            key="promos"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-12"
          >
            <div className="lg:col-span-1">
              <form onSubmit={handleAddPromo} className="glass p-8 rounded-3xl space-y-6 sticky top-24">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-brand-accent" /> Create Promo Code
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Code Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. FUTURE20"
                      value={newPromo.code}
                      onChange={e => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors uppercase"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Discount (%)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="100"
                      placeholder="20"
                      value={newPromo.discountPercentage || ""}
                      onChange={e => setNewPromo({ ...newPromo, discountPercentage: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Expiry Date</label>
                    <input
                      type="date"
                      value={newPromo.expiryDate}
                      onChange={e => setNewPromo({ ...newPromo, expiryDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={newPromo.isActive}
                      onChange={e => setNewPromo({ ...newPromo, isActive: e.target.checked })}
                      className="w-4 h-4 accent-brand-accent"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-400">Active immediately</label>
                  </div>
                </div>

                {promoMessage && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${promoMessage.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                    {promoMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {promoMessage.text}
                  </div>
                )}

                <button type="submit" className="btn-primary w-full py-4">
                  Generate Code
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Ticket className="w-5 h-5 text-brand-accent" /> Active Promo Codes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {promoCodes.map(promo => (
                  <div key={promo.id} className="glass p-6 rounded-2xl flex justify-between items-center group relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${promo.isActive ? "bg-brand-accent" : "bg-gray-700"}`} />
                    <div>
                      <h4 className="font-black text-lg tracking-widest text-brand-accent">{promo.code}</h4>
                      <p className="text-2xl font-bold">{promo.discountPercentage}% OFF</p>
                      <div className="flex gap-4 mt-2 text-[10px] text-gray-500 uppercase font-bold">
                        <span>Expires: {promo.expiryDate || "Never"}</span>
                        <span className={promo.isActive ? "text-green-500" : "text-red-500"}>{promo.isActive ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePromo(promo.id)}
                      className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "reviews" && isSuperAdmin && (
          <motion.div
            key="reviews"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-accent" /> Customer Reviews
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {products.filter(p => p.reviews && p.reviews.length > 0).map(product => (
                <div key={product.id} className="glass p-6 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                    <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <h4 className="font-bold">{product.name}</h4>
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{product.reviews?.length} Reviews</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.reviews?.map(review => (
                      <div key={review.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-start group">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-brand-accent">{review.userName}</span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`w-2 h-2 ${s <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-800"}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 italic">"{review.comment}"</p>
                          {review.reviewImage && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 mt-2">
                              <img src={review.reviewImage} alt="Review" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="text-[8px] text-gray-600 uppercase font-bold">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm("Haqiqatan ham ushbu sharhni o'chirib tashlamoqchimisiz?")) {
                              try {
                                const res = await fetch(`/api/admin/products/${product.id}/reviews/${review.id}`, {
                                  method: "DELETE",
                                  headers: { "x-admin-role": adminUser?.role || "" }
                                });
                                if (res.ok) {
                                  // Refresh products list (handled by parent component)
                                  window.location.reload();
                                }
                              } catch (error) {
                                console.error("Error deleting review:", error);
                              }
                            }
                          }}
                          className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {products.every(p => !p.reviews || p.reviews.length === 0) && (
                <div className="text-center py-20 glass rounded-3xl">
                  <p className="text-gray-500 font-bold uppercase tracking-widest">Hozircha sharhlar mavjud emas</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "paymentSettings" && (
          <AdminSettings 
            settings={settings} 
            onUpdateSettings={onUpdateSettings} 
            adminRole={adminUser?.role || ""} 
          />
        )}

        {activeTab === "settings" && isSuperAdmin && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl"
          >
            <div className="glass p-8 rounded-3xl space-y-6">
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

                {/* Exchange Rate Override */}
                <div className="pt-6 border-t border-white/10 space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Exchange Rate (USD to UZS)</h4>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={manualRate}
                      onChange={(e) => setManualRate(Number(e.target.value))}
                      className="w-32 bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="manualOverride"
                        checked={isManual}
                        onChange={(e) => setIsManual(e.target.checked)}
                        className="w-4 h-4 accent-brand-accent"
                      />
                      <label htmlFor="manualOverride" className="text-xs text-gray-500 uppercase font-bold">Manual Override</label>
                    </div>
                    <button
                      onClick={() => onUpdateExchangeRate(manualRate, isManual)}
                      className="px-6 py-3 bg-brand-accent text-brand-bg rounded-xl font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all"
                    >
                      Save Rate
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-600 font-bold uppercase">Current API Rate: {exchangeRate.toLocaleString()} UZS</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
