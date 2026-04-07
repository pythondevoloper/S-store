import React, { useState } from "react";
import { motion } from "motion/react";
import { Settings, RefreshCw, CheckCircle2, CreditCard, Bot, ShieldCheck } from "lucide-react";

interface AdminSettingsProps {
  settings: { 
    logoBase64: string; 
    cardNumber: string; 
    cardName: string; 
    paymentType: "card" | "wallet";
    walletNumber: string;
    walletName: string;
  };
  onUpdateSettings: (settings: { 
    logoBase64?: string; 
    cardNumber?: string; 
    cardName?: string; 
    paymentType?: "card" | "wallet";
    walletNumber?: string;
    walletName?: string;
  }) => void;
  adminRole: string;
}

export default function AdminSettings({ settings, onUpdateSettings, adminRole }: AdminSettingsProps) {
  const isSuperAdmin = adminRole === "SuperAdmin";
  const [paymentType, setPaymentType] = useState<"card" | "wallet">(settings.paymentType || "card");

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold uppercase tracking-tighter">Kirish taqiqlangan</h3>
        <p className="text-gray-500 max-w-xs">Ushbu bo'limga faqat SuperAdmin kirishi mumkin.</p>
      </div>
    );
  }

  const handleSave = () => {
    const cardNumber = (document.getElementById("newCardNumber") as HTMLInputElement)?.value;
    const cardName = (document.getElementById("newCardName") as HTMLInputElement)?.value;
    const walletNumber = (document.getElementById("newWalletNumber") as HTMLInputElement)?.value;
    const walletName = (document.getElementById("newWalletName") as HTMLInputElement)?.value;
    
    onUpdateSettings({ 
      paymentType,
      cardNumber, 
      cardName,
      walletNumber,
      walletName
    });
    alert("Sozlamalar saqlandi va Telegram orqali tasdiqlandi.");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      {/* Payment Type Toggle */}
      <div className="glass p-8 rounded-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-brand-accent" />
            <h3 className="text-2xl font-black tracking-tighter uppercase">To'lov Turi</h3>
          </div>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setPaymentType("card")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${paymentType === "card" ? "bg-brand-accent text-black" : "text-gray-500 hover:text-white"}`}
            >
              PLASTIK KARTA
            </button>
            <button
              onClick={() => setPaymentType("wallet") ?? null}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${paymentType === "wallet" ? "bg-brand-accent text-black" : "text-gray-500 hover:text-white"}`}
            >
              CLICK HAMYON
            </button>
          </div>
        </div>
      </div>

      {/* Card Settings */}
      {paymentType === "card" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-3xl space-y-8"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-brand-accent" />
            <h3 className="text-2xl font-black tracking-tighter uppercase">Karta Ma'lumotlari</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Karta Raqami</label>
              <input
                type="text"
                placeholder="8600 0000 0000 0000"
                defaultValue={settings.cardNumber}
                id="newCardNumber"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-brand-accent transition-colors font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Karta Egasining Ismi</label>
              <input
                type="text"
                placeholder="Shohidbek M."
                defaultValue={settings.cardName}
                id="newCardName"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-brand-accent transition-colors"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Wallet Settings */}
      {paymentType === "wallet" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-3xl space-y-8"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-brand-accent" />
            <h3 className="text-2xl font-black tracking-tighter uppercase">Hamyon Ma'lumotlari</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Hamyon Raqami (Tel)</label>
              <input
                type="text"
                placeholder="+998 90 123 45 67"
                defaultValue={settings.walletNumber}
                id="newWalletNumber"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-brand-accent transition-colors font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Hamyon Egasining Ismi</label>
              <input
                type="text"
                placeholder="Shohidbek M."
                defaultValue={settings.walletName}
                id="newWalletName"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-brand-accent transition-colors"
              />
            </div>
          </div>
        </motion.div>
      )}

      <button
        onClick={handleSave}
        className="btn-primary w-full py-5 flex items-center justify-center gap-2 text-lg"
      >
        <CheckCircle2 className="w-6 h-6" /> Sozlamalarni Saqlash
      </button>
    </motion.div>
  );
}
