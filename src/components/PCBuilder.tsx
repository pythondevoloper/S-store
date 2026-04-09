import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Cpu, Monitor, Zap, Plus, Trash2, CheckCircle2, ShoppingBag, Info, ChevronRight, ChevronLeft } from "lucide-react";
import { formatCurrency } from "../utils/currency";
import { Language, translations } from "../translations";
import { Product } from "../types";

interface PCPart {
  id: string;
  name: string;
  category: "CPU" | "GPU" | "RAM" | "Motherboard" | "Storage" | "PSU" | "Case" | "Cooler";
  price: number;
  image: string;
  specs: Record<string, string>;
}

const CATEGORIES: PCPart["category"][] = ["CPU", "GPU", "Motherboard", "RAM", "Storage", "PSU", "Case", "Cooler"];

interface PCBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  language: Language;
  isUzsMode: boolean;
  exchangeRate: number;
  products: Product[];
}

export default function PCBuilder({ isOpen, onClose, onAddToCart, language, isUzsMode, exchangeRate, products }: PCBuilderProps) {
  const [selectedParts, setSelectedParts] = useState<Partial<Record<PCPart["category"], PCPart>>>({});
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const t = translations[language];

  // Filter products that belong to PC Builder categories
  const pcPartsFromProducts: PCPart[] = useMemo(() => {
    return products
      .filter(p => CATEGORIES.includes(p.category as any))
      .map(p => ({
        id: p.id,
        name: p.name,
        category: p.category as PCPart["category"],
        price: p.price,
        image: p.image,
        specs: p.specs
      }));
  }, [products]);

  const allParts = pcPartsFromProducts;

  const currentCategory = CATEGORIES[activeCategoryIndex];
  const categoryParts = allParts.filter(p => p.category === currentCategory);

  const totalPrice = useMemo(() => {
    return (Object.values(selectedParts) as (PCPart | undefined)[]).reduce((sum, part) => sum + (part?.price || 0), 0);
  }, [selectedParts]);

  const isComplete = CATEGORIES.every(cat => !!selectedParts[cat]);

  const handleSelectPart = (part: PCPart) => {
    setSelectedParts(prev => ({ ...prev, [part.category]: part }));
    if (activeCategoryIndex < CATEGORIES.length - 1) {
      setActiveCategoryIndex(prev => prev + 1);
    }
  };

  const handleRemovePart = (category: PCPart["category"]) => {
    setSelectedParts(prev => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const handleAddBuiltPCToCart = () => {
    if (!isComplete) return;

    const builtPC: Product = {
      id: `built-pc-${Date.now()}`,
      name: "Custom Built PC",
      category: "Custom PC",
      price: totalPrice,
      image: selectedParts.Case?.image || "https://picsum.photos/seed/pc/400/400",
      description: "A custom built PC with high-performance components.",
      specs: (Object.entries(selectedParts) as [string, PCPart | undefined][]).reduce((acc, [cat, part]) => {
        acc[cat] = part?.name || "";
        return acc;
      }, {} as Record<string, string>),
      stockQuantity: 1
    };

    onAddToCart(builtPC);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-6xl glass rounded-[40px] overflow-hidden flex flex-col md:flex-row h-[90vh] border border-white/10 shadow-2xl"
          >
            {/* Left Sidebar: Progress & Summary */}
            <div className="w-full md:w-80 bg-white/5 border-r border-white/10 p-8 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-brand-accent" />
                </div>
                <h2 className="text-xl font-black tracking-tighter uppercase">PC BUILDER</h2>
              </div>

              <div className="space-y-4 flex-1">
                {CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategoryIndex(idx)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${
                      activeCategoryIndex === idx 
                        ? "bg-brand-accent/10 border-brand-accent text-brand-accent" 
                        : selectedParts[cat] 
                          ? "bg-green-500/5 border-green-500/20 text-green-500" 
                          : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                        activeCategoryIndex === idx ? "bg-brand-accent text-brand-bg" : "bg-white/10 text-gray-400"
                      }`}>
                        {idx + 1}
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">{cat}</span>
                    </div>
                    {selectedParts[cat] && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              <div className="pt-8 mt-8 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Price</span>
                  <span className="text-2xl font-black text-brand-accent">
                    {formatCurrency(totalPrice, isUzsMode, exchangeRate)}
                  </span>
                </div>
                <button
                  disabled={!isComplete}
                  onClick={handleAddBuiltPCToCart}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-all ${
                    isComplete 
                      ? "bg-brand-accent text-brand-bg hover:shadow-[0_0_20px_#00d4ff]" 
                      : "bg-white/5 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" /> Add to Cart
                </button>
              </div>
            </div>

            {/* Main Content: Selection Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-8 flex justify-between items-center border-b border-white/10">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Select {currentCategory}</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Choose the best performance for your build</p>
                </div>
                <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {categoryParts.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {categoryParts.map((part) => (
                      <motion.div
                        key={part.id}
                        layoutId={part.id}
                        onClick={() => handleSelectPart(part)}
                        className={`group relative glass rounded-3xl p-6 border transition-all cursor-pointer ${
                          selectedParts[currentCategory]?.id === part.id 
                            ? "border-brand-accent bg-brand-accent/5" 
                            : "border-white/5 hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex gap-6">
                          <div className="w-32 h-32 rounded-2xl overflow-hidden bg-black/20 shrink-0">
                            <img src={part.image} alt={part.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-lg leading-tight">{part.name}</h4>
                              <span className="text-brand-accent font-black">{formatCurrency(part.price, isUzsMode, exchangeRate)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(part.specs).map(([key, val]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="text-[8px] text-gray-500 uppercase font-black">{key}</span>
                                  <span className="text-[10px] font-bold">{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {selectedParts[currentCategory]?.id === part.id && (
                          <div className="absolute top-4 right-4">
                            <CheckCircle2 className="w-6 h-6 text-brand-accent" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center border border-white/10">
                      <Zap className="w-12 h-12 text-gray-600" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold uppercase tracking-tighter">Komponentlar topilmadi</h4>
                      <p className="text-sm text-gray-500 max-w-xs mx-auto">
                        Hozircha ushbu kategoriya uchun mahsulotlar mavjud emas. Admin panel orqali yangi komponentlar qo'shishingiz mumkin.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigation */}
              <div className="p-8 border-t border-white/10 flex justify-between items-center bg-white/5">
                <button
                  disabled={activeCategoryIndex === 0}
                  onClick={() => setActiveCategoryIndex(prev => prev - 1)}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <div className="flex gap-2">
                  {CATEGORIES.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-2 h-2 rounded-full transition-all ${
                        activeCategoryIndex === idx ? "bg-brand-accent w-6" : "bg-white/20"
                      }`} 
                    />
                  ))}
                </div>
                <button
                  disabled={activeCategoryIndex === CATEGORIES.length - 1}
                  onClick={() => setActiveCategoryIndex(prev => prev + 1)}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
