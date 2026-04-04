import React, { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { TrendingUp, ShoppingBag, DollarSign, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "motion/react";

interface DashboardStats {
  dailyRevenue: { date: string; amount: number }[];
  orderStats: { successful: number; cancelled: number; pending: number };
}

export default function Dashboard({ adminRole }: { adminRole: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats", {
        headers: { "x-admin-role": adminRole }
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 font-bold text-gray-500 uppercase tracking-widest animate-pulse">Loading Dashboard...</div>;
  if (!stats) return <div className="text-center py-12 text-red-500 font-bold uppercase tracking-widest">Failed to load stats.</div>;

  const barData = [
    { name: "Muvaffaqiyatli", value: stats.orderStats.successful, color: "#22c55e" },
    { name: "Bekor qilingan", value: stats.orderStats.cancelled, color: "#ef4444" },
    { name: "Kutilmoqda", value: stats.orderStats.pending, color: "#eab308" }
  ];

  return (
    <div className="space-y-12">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 rounded-[32px] border border-white/5 space-y-4"
        >
          <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Umumiy Daromad</p>
            <h4 className="text-3xl font-black tracking-tighter">
              {stats.dailyRevenue.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} UZS
            </h4>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-8 rounded-[32px] border border-white/5 space-y-4"
        >
          <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-brand-accent" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Muvaffaqiyatli Buyurtmalar</p>
            <h4 className="text-3xl font-black tracking-tighter">{stats.orderStats.successful}</h4>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-8 rounded-[32px] border border-white/5 space-y-4"
        >
          <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Kutilayotgan Buyurtmalar</p>
            <h4 className="text-3xl font-black tracking-tighter">{stats.orderStats.pending}</h4>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Revenue Chart */}
        <div className="glass p-8 rounded-[40px] border border-white/5 space-y-8">
          <h3 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tighter">
            <TrendingUp className="w-5 h-5 text-brand-accent" /> Kunlik Daromad (7 Kun)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666" 
                  fontSize={10} 
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#00d4ff', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#00d4ff" 
                  strokeWidth={3} 
                  dot={{ fill: '#00d4ff', r: 4 }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Chart */}
        <div className="glass p-8 rounded-[40px] border border-white/5 space-y-8">
          <h3 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tighter">
            <CheckCircle2 className="w-5 h-5 text-green-500" /> Buyurtma Holatlari
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
