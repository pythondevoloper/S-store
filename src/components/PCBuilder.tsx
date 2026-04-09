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

const PC_PARTS: PCPart[] = [
  // CPUs
  { id: "cpu1", name: "Intel Core i9-14900K", category: "CPU", price: 589, image: "https://picsum.photos/seed/cpu1/400/400", specs: { "Cores": "24", "Threads": "32", "Base Clock": "3.2 GHz" } },
  { id: "cpu2", name: "AMD Ryzen 9 7950X", category: "CPU", price: 549, image: "https://picsum.photos/seed/cpu2/400/400", specs: { "Cores": "16", "Threads": "32", "Base Clock": "4.5 GHz" } },
  { id: "cpu3", name: "Intel Core i7-14700K", category: "CPU", price: 409, image: "https://picsum.photos/seed/cpu3/400/400", specs: { "Cores": "20", "Threads": "28", "Base Clock": "3.4 GHz" } },
  
  // GPUs
  { id: "gpu1", name: "NVIDIA RTX 4090", category: "GPU", price: 1599, image: "https://picsum.photos/seed/gpu1/400/400", specs: { "VRAM": "24GB GDDR6X", "TDP": "450W" } },
  { id: "gpu2", name: "NVIDIA RTX 4080 Super", category: "GPU", price: 999, image: "https://picsum.photos/seed/gpu2/400/400", specs: { "VRAM": "16GB GDDR6X", "TDP": "320W" } },
  { id: "gpu3", name: "AMD Radeon RX 7900 XTX", category: "GPU", price: 949, image: "https://picsum.photos/seed/gpu3/400/400", specs: { "VRAM": "24GB GDDR6", "TDP": "355W" } },

  // Motherboards
  { id: "mb1", name: "ASUS ROG Maximus Z790 Hero", category: "Motherboard", price: 629, image: "https://picsum.photos/seed/mb1/400/400", specs: { "Socket": "LGA1700", "Chipset": "Z790" } },
  { id: "mb2", name: "MSI MPG X670E Carbon WiFi", category: "Motherboard", price: 459, image: "https://picsum.photos/seed/mb2/400/400", specs: { "Socket": "AM5", "Chipset": "X670E" } },

  // RAM
  { id: "ram1", name: "Corsair Vengeance RGB 32GB (2x16GB) DDR5-6000", category: "RAM", price: 129, image: "https://picsum.photos/seed/ram1/400/400", specs: { "Capacity": "32GB", "Speed": "6000MHz" } },
  { id: "ram2", name: "G.Skill Trident Z5 RGB 64GB (2x32GB) DDR5-6400", category: "RAM", price: 219, image: "https://picsum.photos/seed/ram2/400/400", specs: { "Capacity": "64GB", "Speed": "6400MHz" } },

  // Storage
  { id: "st1", name: "Samsung 990 Pro 2TB NVMe SSD", category: "Storage", price: 179, image: "https://picsum.photos/seed/st1/400/400", specs: { "Capacity": "2TB", "Read Speed": "7450MB/s" } },
  { id: "st2", name: "Crucial P5 Plus 1TB NVMe SSD", category: "Storage", price: 89, image: "https://picsum.photos/seed/st2/400/400", specs: { "Capacity": "1TB", "Read Speed": "6600MB/s" } },

  // PSU
  { id: "psu1", name: "Corsair RM1000x 1000W 80+ Gold", category: "PSU", price: 189, image: "https://picsum.photos/seed/psu1/400/400", specs: { "Wattage": "1000W", "Efficiency": "80+ Gold" } },
  { id: "psu2", name: "EVGA SuperNOVA 850G6 850W", category: "PSU", price: 149, image: "https://picsum.photos/seed/psu2/400/400", specs: { "Wattage": "850W", "Efficiency": "80+ Gold" } },

  // Cases
  { id: "case1", name: "Lian Li PC-O11 Dynamic", category: "Case", price: 149, image: "https://picsum.photos/seed/case1/400/400", specs: { "Type": "Mid Tower", "Material": "Tempered Glass" } },
  { id: "case2", name: "NZXT H9 Flow", category: "Case", price: 159, image: "https://picsum.photos/seed/case2/400/400", specs: { "Type": "Mid Tower", "Color": "Black/White" } },

  // Coolers
  { id: "cool1", name: "NZXT Kraken Elite 360 RGB", category: "Cooler", price: 279, image: "https://picsum.photos/seed/cool1/400/400", specs: { "Type": "AIO Liquid", "Size": "360mm" } },
  { id: "cool2", name: "Noctua NH-D15 chromax.black", category: "Cooler", price: 119, image: "https://picsum.photos/seed/cool2/400/400", specs: { "Type": "Air Cooler", "Fans": "2x 140mm" } },
];

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

  // Merge with default parts if needed, or just use products
  // For now, let's just use products to follow the "admin add product" requirement
  const allParts = pcPartsFromProducts.length > 0 ? pcPartsFromProducts : PC_PARTS;

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
