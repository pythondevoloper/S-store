import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Bot as BotIcon, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Bot {
  token: string;
  username: string;
  status: "active" | "inactive";
}

interface BotManagerProps {
  bots: Bot[];
  onUpdateBots: (bots: Bot[]) => void;
  adminRole: string;
}

export default function BotManager({ bots, onUpdateBots, adminRole }: BotManagerProps) {
  const [newBot, setNewBot] = useState({ token: "", username: "" });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAddBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBot.token || !newBot.username) return;

    // Basic token validation
    if (!/^\d+:[\w-]{35,}$/.test(newBot.token)) {
      setMessage({ type: "error", text: "Noto'g'ri Bot Token formati." });
      return;
    }

    const updatedBots: Bot[] = [...bots, { ...newBot, status: "inactive" }];
    onUpdateBots(updatedBots);
    setNewBot({ token: "", username: "" });
    setMessage({ type: "success", text: "Bot muvaffaqiyatli qo'shildi!" });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggleStatus = (index: number) => {
    const updatedBots = bots.map((bot, i) => ({
      ...bot,
      status: i === index ? "active" : "inactive"
    })) as Bot[];
    onUpdateBots(updatedBots);
  };

  const handleDeleteBot = (index: number) => {
    if (bots[index].status === "active" && bots.length > 1) {
      alert("Faol botni o'chirib bo'lmaydi. Avval boshqa botni faollashtiring.");
      return;
    }
    const updatedBots = bots.filter((_, i) => i !== index);
    onUpdateBots(updatedBots);
  };

  const handleRestartBot = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/update-bot", {
        method: "POST",
        headers: { "x-admin-role": adminRole }
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Bot muvaffaqiyatli qayta ishga tushirildi!" });
      } else {
        setMessage({ type: "error", text: "Botni yangilashda xatolik yuz berdi." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Server bilan aloqa uzildi." });
    } finally {
      setIsUpdating(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-1">
        <form onSubmit={handleAddBot} className="glass p-8 rounded-3xl space-y-6 sticky top-24">
          <h3 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tighter">
            <Plus className="w-5 h-5 text-brand-accent" /> Yangi Bot Qo'shish
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Bot Token</label>
              <input
                required
                type="password"
                placeholder="123456789:ABC..."
                value={newBot.token}
                onChange={e => setNewBot({ ...newBot, token: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors font-mono text-xs"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Bot Username</label>
              <input
                required
                type="text"
                placeholder="@S_Store_Bot"
                value={newBot.username}
                onChange={e => setNewBot({ ...newBot, username: e.target.value.startsWith('@') ? e.target.value : '@' + e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors"
              />
            </div>
          </div>

          {message && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={`p-4 rounded-xl flex items-center gap-3 text-sm ${message.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
            >
              {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </motion.div>
          )}

          <button type="submit" className="btn-primary w-full py-4 uppercase tracking-widest text-xs font-black">
            Botni Ro'yxatga Olish
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tighter">
            <BotIcon className="w-5 h-5 text-brand-accent" /> Botlar Ro'yxati
          </h3>
          <button 
            onClick={handleRestartBot}
            disabled={isUpdating}
            className="flex items-center gap-2 px-4 py-2 bg-brand-accent/10 text-brand-accent rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-brand-accent hover:text-brand-bg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} /> Botni Yangilash
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {bots.map((bot, index) => (
              <motion.div
                key={bot.token}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`glass p-6 rounded-3xl border transition-all flex items-center justify-between group ${bot.status === "active" ? "border-brand-accent/50 bg-brand-accent/5" : "border-white/5"}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bot.status === "active" ? "bg-brand-accent/20" : "bg-white/5"}`}>
                    <BotIcon className={`w-6 h-6 ${bot.status === "active" ? "text-brand-accent" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg tracking-tighter">{bot.username}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${bot.status === "active" ? "bg-green-500 animate-pulse" : "bg-gray-700"}`} />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{bot.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {bot.status !== "active" && (
                    <button
                      onClick={() => handleToggleStatus(index)}
                      className="px-4 py-2 bg-white/5 hover:bg-brand-accent hover:text-brand-bg rounded-xl text-[10px] font-black tracking-widest uppercase transition-all"
                    >
                      Faollashtirish
                    </button>
                  )}
                  {bot.status === "active" && (
                    <div className="flex items-center gap-1 text-brand-accent bg-brand-accent/10 px-3 py-1.5 rounded-xl">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Faol</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteBot(index)}
                    className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
