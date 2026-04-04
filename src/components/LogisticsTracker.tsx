import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Truck, Home, Package, MapPin, ChevronRight } from "lucide-react";

interface LogisticsTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

const LogisticsTracker: React.FC<LogisticsTrackerProps> = ({ isOpen, onClose, order }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Tayyorlanmoqda");

  useEffect(() => {
    if (isOpen && order) {
      const orderTime = new Date(order.createdAt).getTime();
      const now = Date.now();
      const diffMinutes = (now - orderTime) / (1000 * 60);

      // Simulation logic:
      // 0-2 mins: Tayyorlanmoqda (0-20%)
      // 2-10 mins: Yo'lda (20-80%)
      // 10+ mins: Eshigingiz tagida (80-100%)
      
      let currentProgress = 0;
      let currentStatus = "Tayyorlanmoqda";

      if (diffMinutes < 2) {
        currentProgress = (diffMinutes / 2) * 20;
        currentStatus = "Tayyorlanmoqda";
      } else if (diffMinutes < 10) {
        currentProgress = 20 + ((diffMinutes - 2) / 8) * 60;
        currentStatus = "Yo'lda";
      } else {
        currentProgress = Math.min(80 + ((diffMinutes - 10) / 5) * 20, 100);
        currentStatus = "Eshigingiz tagida";
      }

      setProgress(currentProgress);
      setStatus(currentStatus);
    }
  }, [isOpen, order]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg glass rounded-[40px] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-brand-accent/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-accent rounded-2xl flex items-center justify-center shadow-[0_0_15px_#00d4ff]">
                  <Truck className="w-6 h-6 text-brand-bg" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase">Smart Tracking</h2>
                  <p className="text-[10px] text-brand-accent font-bold uppercase tracking-widest">Order #{order?.id?.slice(-6)}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-12">
              {/* Map Simulation */}
              <div className="relative h-48 bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
                {/* Simple SVG Map Background */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 200">
                  <path d="M0,100 Q100,50 200,100 T400,100" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
                  <circle cx="50" cy="100" r="4" fill="white" />
                  <circle cx="350" cy="100" r="4" fill="white" />
                </svg>

                {/* Delivery Path */}
                <div className="absolute top-1/2 left-12 right-12 -translate-y-1/2 h-1 bg-white/10 rounded-full">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-brand-accent shadow-[0_0_10px_#00d4ff]" 
                  />
                </div>

                {/* Icons */}
                <div className="absolute top-1/2 left-12 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                    <Package className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-[8px] font-bold uppercase text-gray-500">Ombor</span>
                </div>

                <motion.div 
                  className="absolute top-1/2 -translate-y-1/2 z-10"
                  animate={{ left: `calc(3rem + ${progress * 0.75}%)` }}
                  style={{ x: "-50%" }}
                >
                  <div className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center shadow-[0_0_20px_#00d4ff] border-2 border-brand-bg">
                    <Truck className="w-5 h-5 text-brand-bg" />
                  </div>
                </motion.div>

                <div className="absolute top-1/2 right-12 -translate-y-1/2 translate-x-1/2 flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-brand-accent/20 rounded-full flex items-center justify-center border border-brand-accent/30">
                    <Home className="w-4 h-4 text-brand-accent" />
                  </div>
                  <span className="text-[8px] font-bold uppercase text-brand-accent">Siz</span>
                </div>
              </div>

              {/* Status Updates */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${progress >= 0 ? "bg-brand-accent shadow-[0_0_10px_#00d4ff]" : "bg-white/10"}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-black uppercase tracking-tighter ${progress >= 0 ? "text-white" : "text-gray-600"}`}>Tayyorlanmoqda</p>
                    <p className="text-[10px] text-gray-500">Buyurtmangiz qadoqlanmoqda</p>
                  </div>
                  {progress >= 20 && <ChevronRight className="w-4 h-4 text-brand-accent" />}
                </div>

                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${progress >= 20 ? "bg-brand-accent shadow-[0_0_10px_#00d4ff]" : "bg-white/10"}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-black uppercase tracking-tighter ${progress >= 20 ? "text-white" : "text-gray-600"}`}>Yo'lda</p>
                    <p className="text-[10px] text-gray-500">Kuryer manzilingizga qarab ketmoqda</p>
                  </div>
                  {progress >= 80 && <ChevronRight className="w-4 h-4 text-brand-accent" />}
                </div>

                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${progress >= 80 ? "bg-brand-accent shadow-[0_0_10px_#00d4ff]" : "bg-white/10"}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-black uppercase tracking-tighter ${progress >= 80 ? "text-white" : "text-gray-600"}`}>Eshigingiz tagida</p>
                    <p className="text-[10px] text-gray-500">Kuryer yetib keldi!</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-brand-accent/5 rounded-3xl border border-brand-accent/10 flex items-center gap-4">
                <MapPin className="w-5 h-5 text-brand-accent" />
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Yetkazib berish manzili:</p>
                  <p className="text-xs font-bold text-white">{order?.address || "Toshkent, O'zbekiston"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LogisticsTracker;
