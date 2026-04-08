import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle2, CreditCard, User, Mail, MapPin, Phone, Cpu, Clock, AlertCircle, Gift, Map as MapIcon } from "lucide-react";
import { formatCurrency } from "../utils/currency";
import LocationPicker from "./LocationPicker";

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (data: { 
    customerName: string; 
    email: string;
    phone: string; 
    address: string; 
    paymentMethod: string; 
    promoCode: string; 
    total: number;
    cardType?: string;
    cardNumber?: string;
    testMode?: boolean;
    giftWrapping?: boolean;
    greetingCard?: string;
    groupId?: string;
  }) => Promise<any>;
  promoCodes: { code: string; discountPercentage: number }[];
  cartTotal: number;
  userLevel?: string;
  isUzsMode: boolean;
  exchangeRate: number;
  settings: { cardNumber: string; cardName: string };
}

export default function Checkout({ isOpen, onClose, onCheckout, promoCodes, cartTotal, userLevel, isUzsMode, exchangeRate, settings }: CheckoutProps) {
  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    phone: "",
    address: "",
    paymentMethod: "Telegram P2P",
    promoCode: "",
    giftWrapping: false,
    greetingCard: ""
  });
  const [showMap, setShowMap] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);
  const [isRobotVerified, setIsRobotVerified] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"Awaiting Payment" | "Paid" | "Cancelled">("Awaiting Payment");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");
  const [orderInfo, setOrderInfo] = useState<any | null>(null);
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWaitingForPayment && orderInfo?.id && paymentStatus === "Awaiting Payment") {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/order-status/${orderInfo.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "Paid") {
              setPaymentStatus("Paid");
              setIsSuccess(true);
              setIsWaitingForPayment(false);
              clearInterval(interval);
            } else if (data.status === "Cancelled") {
              setPaymentStatus("Cancelled");
              setIsWaitingForPayment(false);
              clearInterval(interval);
            }
          }
        } catch (error) {
          console.error("Error polling order status:", error);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isWaitingForPayment, orderInfo, paymentStatus]);

  const handleApplyPromo = async () => {
    setPromoError("");
    try {
      const res = await fetch("/api/promocodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: formData.promoCode })
      });
      
      if (res.ok) {
        const data = await res.json();
        setDiscount(data.discountPercentage);
        setAppliedCode(data.code);
      } else {
        const data = await res.json();
        setPromoError(data.message || "Invalid promo code");
        setDiscount(0);
        setAppliedCode("");
      }
    } catch (error) {
      setPromoError("Connection error");
    }
  };

  const levelDiscount = userLevel === "Cyber Legend" ? 5 : 0;
  const totalDiscount = discount + levelDiscount;
  const finalTotal = cartTotal * (1 - totalDiscount / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (honeypot) return; // Bot detected
    if (!isRobotVerified) {
      alert("Iltimos, robot emasligingizni tasdiqlang!");
      return;
    }

    setIsSubmitting(true);
    
    const finalTotalWithGift = finalTotal + (formData.giftWrapping ? 1 : 0);

    // High-tech processing simulation
    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const savedGroup = localStorage.getItem("active_group");
      const activeGroup = savedGroup ? JSON.parse(savedGroup) : null;

      const result = await onCheckout({
        customerName: formData.customerName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        paymentMethod: formData.paymentMethod,
        promoCode: appliedCode,
        total: finalTotalWithGift,
        testMode: false,
        giftWrapping: formData.giftWrapping,
        greetingCard: formData.greetingCard,
        groupId: activeGroup?.id
      });
      
      setOrderInfo(result);

      if (formData.paymentMethod === "Telegram P2P") {
        const totalUzs = Math.round(finalTotalWithGift * exchangeRate);
        const orderIdClean = result?.id?.replace("#S-", "") || "";
        const telegramUrl = `https://t.me/SSTOREPaymet_bot?start=ORDER_${orderIdClean}_PRICE_${totalUzs}`;
        
        // Wait a moment for the success animation then redirect
        setTimeout(() => {
          window.location.href = telegramUrl;
        }, 1500);
      }

      if (result.status === "Awaiting Payment" || result.status === "Pending Payment") {
        setIsWaitingForPayment(true);
      } else {
        setIsSuccess(true);
      }
    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* High-Tech Loading Overlay */}
          <AnimatePresence>
            {isSubmitting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] bg-brand-bg flex flex-col items-center justify-center space-y-8"
              >
                <div className="relative w-32 h-32">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-brand-accent/20 rounded-full"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-2 border-4 border-t-brand-accent rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Cpu className="w-10 h-10 text-brand-accent" />
                  </motion.div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold tracking-widest uppercase">Securing Transaction</h3>
                  <div className="flex gap-1 justify-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 bg-brand-accent rounded-full"
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-mono">ENCRYPTING_PAYLOAD_V3.0...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg glass rounded-3xl overflow-hidden"
          >
            {isSuccess ? (
              <div className="p-12 text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 className="w-12 h-12 text-brand-accent" />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Order Confirmed!</h2>
                  <p className="text-sm text-brand-accent font-mono">ID: {orderInfo?.orderId}</p>
                </div>
                <p className="text-gray-400">
                  Your futuristic gear is being prepared for hyper-speed delivery.
                </p>
                
                <div className="flex flex-col gap-3 pt-4">
                  <a
                    href="https://t.me/Sstoremijoz_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-xl bg-[#229ED9] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#1c86b9] transition-colors"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.45-.42-1.39-.89.03-.25.38-.51 1.07-.78 4.2-1.82 7-3.03 8.41-3.63 4.01-1.7 4.84-1.99 5.38-2 .12 0 .38.03.55.17.14.12.18.28.19.4z"/>
                    </svg>
                    Telegramda chekni ko'rish
                  </a>
                  <button
                    onClick={onClose}
                    className="w-full py-4 rounded-xl glass text-gray-400 font-bold hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : isWaitingForPayment ? (
              <div className="p-12 text-center space-y-8">
                <div className="relative w-24 h-24 mx-auto">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-brand-accent/30 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Clock className="w-10 h-10 text-brand-accent animate-pulse" />
                  </motion.div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl font-bold tracking-tighter uppercase">Waiting for Telegram Confirmation...</h2>
                  <p className="text-gray-400 text-sm">
                    Iltimos, Telegram botimizga o'ting va to'lovni tasdiqlang.
                  </p>
                  <div className="glass p-4 rounded-2xl border border-brand-accent/20 bg-brand-accent/5">
                    <p className="text-[10px] font-bold text-brand-accent uppercase tracking-widest mb-1">Buyurtma ID</p>
                    <p className="text-lg font-mono font-bold">{orderInfo?.orderId}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <a
                    href="https://t.me/Sstoremijoz_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-xl bg-[#229ED9] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#1c86b9] transition-all shadow-[0_0_20px_rgba(34,158,217,0.3)]"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.45-.42-1.39-.89.03-.25.38-.51 1.07-.78 4.2-1.82 7-3.03 8.41-3.63 4.01-1.7 4.84-1.99 5.38-2 .12 0 .38.03.55.17.14.12.18.28.19.4z"/>
                    </svg>
                    Telegramni ochish
                  </a>
                  <button
                    onClick={() => setIsWaitingForPayment(false)}
                    className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold">Finalize Order</h2>
                  <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      required
                      type="text"
                      placeholder="Full Name"
                      value={formData.customerName}
                      onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      required
                      type="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      required
                      type="tel"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-500 uppercase">Yetkazib berish manzili</label>
                      <button
                        type="button"
                        onClick={() => setShowMap(!showMap)}
                        className="text-[10px] font-black text-brand-accent uppercase tracking-widest flex items-center gap-1 hover:underline"
                      >
                        <MapIcon className="w-3 h-3" />
                        {showMap ? "Xaritani yopish" : "Xaritadan tanlash"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showMap && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <LocationPicker 
                            onLocationSelect={(lat, lng, addr) => {
                              setFormData(prev => ({ ...prev, address: addr }));
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        required
                        type="text"
                        placeholder="Shipping Address"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">To'lov usuli</label>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        className="py-4 rounded-2xl border bg-brand-accent/20 border-brand-accent text-brand-accent text-sm font-bold transition-all flex items-center justify-center gap-3"
                      >
                        <CreditCard className="w-5 h-5" />
                        Karta orqali to'lov (Telegram Bot)
                      </button>
                    </div>
                  </div>

                  {/* Payment Info Box */}
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Karta raqami:</span>
                      <span className="font-mono font-bold text-brand-accent">{settings.cardNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Ega:</span>
                      <span className="font-bold">{settings.cardName}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                      <span className="text-gray-500">To'lov miqdori:</span>
                      <span className="text-lg font-black text-brand-accent">
                        {formatCurrency(finalTotal + (formData.giftWrapping ? 1 : 0), isUzsMode, exchangeRate)}
                      </span>
                    </div>
                  </div>

                  {/* Gift Wrapping */}
                  <div className="p-6 bg-brand-accent/5 border border-brand-accent/20 rounded-3xl space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative w-6 h-6">
                        <input
                          type="checkbox"
                          checked={formData.giftWrapping}
                          onChange={e => setFormData({ ...formData, giftWrapping: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="w-6 h-6 border-2 border-brand-accent/30 rounded-lg peer-checked:bg-brand-accent peer-checked:border-brand-accent transition-all" />
                        <CheckCircle2 className="absolute inset-0 w-6 h-6 text-brand-bg opacity-0 peer-checked:opacity-100 transition-opacity p-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-brand-accent" />
                        <span className="text-sm font-bold uppercase tracking-tighter">Sovg'a sifatida o'rash (+ $1)</span>
                      </div>
                    </label>

                    <AnimatePresence>
                      {formData.giftWrapping && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2"
                        >
                          <textarea
                            placeholder="Tabrik matni (Greeting message)..."
                            value={formData.greetingCard}
                            onChange={e => setFormData({ ...formData, greetingCard: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-brand-accent transition-colors min-h-[80px] resize-none"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Promo Code */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Promo Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter code"
                        value={formData.promoCode}
                        onChange={e => setFormData({ ...formData, promoCode: e.target.value })}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent transition-colors uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-6 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                    {appliedCode && (
                      <p className="text-xs text-green-500 font-bold">Code {appliedCode} applied! {discount}% discount.</p>
                    )}
                    {promoError && (
                      <p className="text-xs text-red-500 font-bold">{promoError}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span className={discount > 0 ? "line-through opacity-50" : ""}>{formatCurrency(cartTotal, isUzsMode, exchangeRate)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-500">
                      <span>Discount ({discount}%)</span>
                      <span>-{formatCurrency(cartTotal * discount / 100, isUzsMode, exchangeRate)}</span>
                    </div>
                  )}
                  {levelDiscount > 0 && (
                    <div className="flex justify-between text-sm text-brand-accent font-bold italic">
                      <span>Cyber Legend Discount (5%)</span>
                      <span>-{formatCurrency(cartTotal * 0.05, isUzsMode, exchangeRate)}</span>
                    </div>
                  )}
                  {formData.giftWrapping && (
                    <div className="flex justify-between text-sm text-brand-accent">
                      <span>Gift Wrapping</span>
                      <span>{formatCurrency(1, isUzsMode, exchangeRate)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-brand-accent drop-shadow-[0_0_10px_rgba(0,212,255,0.5)]">{formatCurrency(finalTotal + (formData.giftWrapping ? 1 : 0), isUzsMode, exchangeRate)}</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <input
                      type="checkbox"
                      id="robot-check"
                      checked={isRobotVerified}
                      onChange={(e) => setIsRobotVerified(e.target.checked)}
                      className="w-5 h-5 accent-brand-accent cursor-pointer"
                    />
                    <label htmlFor="robot-check" className="text-sm font-bold cursor-pointer select-none">
                      Robot emasligimni tasdiqlayman
                    </label>
                  </div>
                  {/* Honeypot field */}
                  <input
                    type="text"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                  <p className="text-[10px] text-gray-500 text-center italic">
                    Tugmani bosganingizdan so'ng, botga o'tasiz va chekni yuborishingiz kerak bo'ladi.
                  </p>
                </div>

                <button
                  disabled={isSubmitting || !isRobotVerified}
                  type="submit"
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-brand-bg border-t-transparent rounded-full"
                      />
                      Processing...
                    </>
                  ) : "To'lovni tasdiqlash (Telegram)"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
