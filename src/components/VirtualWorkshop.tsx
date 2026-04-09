import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Layout, 
  MemoryStick, 
  HardDrive, 
  Zap, 
  Monitor, 
  Box, 
  AlertTriangle, 
  Camera, 
  Share2, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  X,
  Info,
  ShoppingCart,
  Plus
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { Product } from '../types';

// Simple cn helper
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// Types
interface PCPart {
  id: string;
  name: string;
  type: 'CPU' | 'Motherboard' | 'RAM' | 'GPU' | 'PSU' | 'Storage' | 'Case';
  socket?: string;
  ramType?: string;
  image: string;
  price: number;
  specs: Record<string, string>;
}

interface BuildState {
  CPU: PCPart | null;
  Motherboard: PCPart | null;
  RAM: PCPart | null;
  GPU: PCPart | null;
  PSU: PCPart | null;
  Storage: PCPart | null;
  Case: PCPart | null;
}

interface VirtualWorkshopProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'uz' | 'en';
  products: Product[];
}

const VirtualWorkshop: React.FC<VirtualWorkshopProps> = ({ isOpen, onClose, language, products }) => {
  const [build, setBuild] = useState<BuildState>({
    CPU: null,
    Motherboard: null,
    RAM: null,
    GPU: null,
    PSU: null,
    Storage: null,
    Case: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<PCPart['type']>('Case');
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);
  const workshopRef = useRef<HTMLDivElement>(null);

  // Map store products to PCPart objects
  const workshopParts: PCPart[] = useMemo(() => {
    const validCategories = ['CPU', 'Motherboard', 'RAM', 'GPU', 'PSU', 'Storage', 'Case'];
    return products
      .filter(p => validCategories.includes(p.category))
      .map(p => ({
        id: p.id,
        name: p.name,
        type: p.category as PCPart['type'],
        image: p.image,
        price: p.price,
        specs: p.specs,
        socket: p.specs.socket || p.specs.Socket || p.specs.soket || p.specs.Soket,
        ramType: p.specs.ramType || p.specs.RAMType || p.specs.ram_turi
      }));
  }, [products]);

  const checkCompatibility = (part: PCPart): boolean => {
    if (part.type === 'CPU' && build.Motherboard) {
      if (part.socket !== build.Motherboard.socket) {
        const msg = language === 'uz' 
          ? `Soket mos kelmadi! ${part.name} uchun ${part.socket} kerak, lekin ${build.Motherboard.name}da ${build.Motherboard.socket} mavjud.`
          : `Socket Mismatch! ${part.name} requires ${part.socket}, but ${build.Motherboard.name} has ${build.Motherboard.socket}.`;
        setError(msg);
        return false;
      }
    }
    if (part.type === 'Motherboard' && build.CPU) {
      if (part.socket !== build.CPU.socket) {
        const msg = language === 'uz'
          ? `Soket mos kelmadi! ${part.name}da ${part.socket} mavjud, lekin ${build.CPU.name} uchun ${build.CPU.socket} kerak.`
          : `Socket Mismatch! ${part.name} has ${part.socket}, but ${build.CPU.name} requires ${build.CPU.socket}.`;
        setError(msg);
        return false;
      }
    }
    if (part.type === 'RAM' && build.Motherboard) {
      if (part.ramType !== build.Motherboard.ramType) {
        const msg = language === 'uz'
          ? `RAM mos kelmadi! ${part.name} turi ${part.ramType}, lekin ${build.Motherboard.name} ${build.Motherboard.ramType}ni qo'llab-quvvatlaydi.`
          : `RAM Mismatch! ${part.name} is ${part.ramType}, but ${build.Motherboard.name} supports ${build.Motherboard.ramType}.`;
        setError(msg);
        return false;
      }
    }
    if (part.type === 'Motherboard' && build.RAM) {
      if (part.ramType !== build.RAM.ramType) {
        const msg = language === 'uz'
          ? `RAM mos kelmadi! ${part.name} ${part.ramType}ni qo'llab-quvvatlaydi, lekin ${build.RAM.name} turi ${build.RAM.ramType}.`
          : `RAM Mismatch! ${part.name} supports ${part.ramType}, but ${build.RAM.name} is ${build.RAM.ramType}.`;
        setError(msg);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const addPart = (part: PCPart) => {
    if (checkCompatibility(part)) {
      setBuild(prev => ({ ...prev, [part.type]: part }));
      // Auto-switch to next logical category
      const categories: PCPart['type'][] = ['Case', 'Motherboard', 'CPU', 'RAM', 'GPU', 'Storage', 'PSU'];
      const currentIndex = categories.indexOf(part.type);
      if (currentIndex < categories.length - 1) {
        setActiveCategory(categories[currentIndex + 1]);
      }
    }
  };

  const resetBuild = () => {
    setBuild({
      CPU: null,
      Motherboard: null,
      RAM: null,
      GPU: null,
      PSU: null,
      Storage: null,
      Case: null,
    });
    setError(null);
    setActiveCategory('Case');
  };

  const takeScreenshot = async () => {
    if (!workshopRef.current) return;
    setIsTakingScreenshot(true);
    try {
      const canvas = await html2canvas(workshopRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `s-build-pc-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
    } finally {
      setIsTakingScreenshot(false);
    }
  };

  const totalPrice = Object.values(build).reduce((sum: number, part) => {
    if (part && typeof part === 'object' && 'price' in part) {
      return sum + (part.price as number);
    }
    return sum;
  }, 0);

  const categories: { type: PCPart['type']; icon: any }[] = [
    { type: 'Case', icon: Box },
    { type: 'Motherboard', icon: Layout },
    { type: 'CPU', icon: Cpu },
    { type: 'RAM', icon: MemoryStick },
    { type: 'GPU', icon: Monitor },
    { type: 'Storage', icon: HardDrive },
    { type: 'PSU', icon: Zap },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#0a0a0a] text-white p-4 md:p-8 font-mono overflow-y-auto custom-scrollbar"
        >
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-brand-accent rounded-full animate-pulse" />
                  <span className="text-xs font-bold tracking-[0.2em] text-brand-accent uppercase">System Online</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">
                  S-Build <span className="text-brand-accent">Workshop</span>
                </h1>
                <p className="text-gray-500 mt-2 max-w-md text-sm">
                  {language === 'uz' 
                    ? "Virtual Kompyuter Ustaxonasi v1.0. Orzuingizdagi kompyuterni real vaqtda tekshirish bilan yig'ing."
                    : "Virtual Computer Workshop v1.0. Build your dream machine with real-time compatibility checking."}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    {language === 'uz' ? "Umumiy Hisob" : "Total Estimate"}
                  </p>
                  <p className="text-3xl font-black text-brand-accent">${totalPrice.toLocaleString()}</p>
                </div>
                <button 
                  onClick={resetBuild}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                  title="Reset Build"
                >
                  <RotateCcw className="w-6 h-6 group-active:rotate-180 transition-transform duration-500" />
                </button>
                <button 
                  onClick={onClose}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-red-500"
                  title="Close Workshop"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Part Selection */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex flex-wrap gap-2">
              {categories.map(({ type, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setActiveCategory(type)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                    activeCategory === type 
                      ? "bg-brand-accent border-brand-accent text-black" 
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {workshopParts.filter(p => p.type === activeCategory).map(part => (
                <motion.div
                  layout
                  key={part.id}
                  className={cn(
                    "group relative p-4 rounded-2xl border transition-all cursor-pointer overflow-hidden",
                    build[part.type]?.id === part.id
                      ? "bg-brand-accent/10 border-brand-accent"
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  )}
                  onClick={() => addPart(part)}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-black border border-white/10">
                      <img src={part.image} alt={part.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm mb-1">{part.name}</h3>
                      <p className="text-brand-accent font-black text-lg">${part.price}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(part.specs).map(([key, val]) => (
                          <span key={key} className="text-[10px] bg-white/5 px-2 py-0.5 rounded uppercase font-bold text-gray-500">
                            {key}: {val}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {build[part.type]?.id === part.id && (
                    <div className="absolute top-4 right-4 text-brand-accent">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </motion.div>
              ))}

              {workshopParts.filter(p => p.type === activeCategory).length === 0 && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10">
                    <Plus className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">
                    {language === 'uz' ? "Ushbu bo'limda mahsulotlar yo'q" : "No products in this category"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Center: The Case Visualization */}
          <div className="lg:col-span-5 relative">
            <div 
              ref={workshopRef}
              className={cn(
                "aspect-[4/5] bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-[2rem] border-4 transition-all duration-500 relative overflow-hidden flex items-center justify-center p-8",
                error ? "border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]" : "border-white/10"
              )}
            >
              {/* Background Grid */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              
              {/* The Case Frame */}
              <div className="relative w-full h-full border-2 border-white/20 rounded-3xl flex flex-col p-6 bg-black/40 backdrop-blur-sm">
                <AnimatePresence mode="popLayout">
                  {/* Motherboard Slot */}
                  {build.Motherboard && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-12 bg-brand-accent/5 border border-brand-accent/20 rounded-2xl flex items-center justify-center"
                    >
                      <Layout className="w-24 h-24 text-brand-accent/20" />
                      
                      {/* CPU Slot on Motherboard */}
                      {build.CPU && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-1/4 w-20 h-20 bg-brand-accent/20 border-2 border-brand-accent rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(var(--brand-accent-rgb),0.3)]"
                        >
                          <Cpu className="w-10 h-10 text-brand-accent" />
                        </motion.div>
                      )}

                      {/* RAM Slots */}
                      {build.RAM && (
                        <div className="absolute right-8 top-1/4 flex gap-1">
                          {[1, 2, 3, 4].map(i => (
                            <motion.div
                              key={i}
                              initial={{ height: 0 }}
                              animate={{ height: 60 }}
                              className="w-1.5 bg-brand-accent rounded-full"
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* GPU Slot */}
                  {build.GPU && (
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute bottom-1/3 left-12 right-12 h-16 bg-brand-accent/30 border-2 border-brand-accent rounded-xl flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(var(--brand-accent-rgb),0.4)]"
                    >
                      <Monitor className="w-8 h-8 text-brand-accent" />
                      <div className="h-1 w-24 bg-brand-accent/50 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ x: [-100, 100] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-1/2 h-full bg-white"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* PSU Slot */}
                  {build.PSU && (
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-6 left-6 right-6 h-24 bg-white/5 border border-white/20 rounded-2xl flex items-center justify-center"
                    >
                      <Zap className="w-10 h-10 text-gray-500" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Empty State Indicators */}
                {!build.Motherboard && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mx-auto">
                        <Plus className="w-8 h-8 text-white/20" />
                      </div>
                      <p className="text-xs text-white/20 uppercase tracking-widest font-bold">Install Motherboard</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Overlay */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 bg-red-500/10 backdrop-blur-sm flex items-center justify-center p-8 z-50"
                  >
                    <div className="bg-red-500 text-white p-6 rounded-3xl shadow-2xl max-w-xs text-center space-y-4">
                      <AlertTriangle className="w-12 h-12 mx-auto" />
                      <p className="font-bold text-sm leading-relaxed">{error}</p>
                      <button 
                        onClick={() => setError(null)}
                        className="w-full py-2 bg-white text-red-500 rounded-xl font-bold text-xs uppercase tracking-widest"
                      >
                        {language === 'uz' ? "Tushunarli" : "Acknowledge"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Screenshot Overlay */}
              {isTakingScreenshot && (
                <div className="absolute inset-0 bg-white z-[100] animate-flash" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6">
              <button 
                onClick={takeScreenshot}
                disabled={isTakingScreenshot}
                className="flex-1 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-brand-accent transition-all active:scale-95"
              >
                <Camera className="w-5 h-5" />
                {language === 'uz' ? "Buildni Saqlash" : "Capture Build"}
              </button>
              <button className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                <Share2 className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Right: Build Summary & Stats */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                {language === 'uz' ? "Build Manifesti" : "Build Manifest"}
              </h2>
              
              <div className="space-y-4">
                {categories.map(({ type, icon: Icon }) => (
                  <div key={type} className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border",
                      build[type] ? "bg-brand-accent/20 border-brand-accent text-brand-accent" : "bg-white/5 border-white/10 text-gray-600"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">{type}</p>
                      <p className="text-xs font-bold truncate">
                        {build[type]?.name || (language === 'uz' ? 'O\'rnatilmagan' : 'Not Installed')}
                      </p>
                    </div>
                    {build[type] && (
                      <button 
                        onClick={() => setBuild(prev => ({ ...prev, [type]: null }))}
                        className="text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-500 uppercase">
                    {language === 'uz' ? "Quvvat Talabi" : "Power Requirements"}
                  </span>
                  <span className="text-xs font-bold">~650W</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    className="h-full bg-brand-accent"
                  />
                </div>
              </div>

              <button className="w-full py-4 bg-brand-accent text-black rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-95">
                <ShoppingCart className="w-5 h-5" />
                {language === 'uz' ? "Barcha qismlarni buyurtma qilish" : "Order All Parts"}
              </button>
            </div>

            <div className="bg-brand-accent/5 border border-brand-accent/10 rounded-[2rem] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Info className="w-5 h-5 text-brand-accent" />
                <h3 className="text-xs font-bold uppercase tracking-widest">
                  {language === 'uz' ? "Build Maslahati" : "Build Tip"}
                </h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed italic">
                {language === 'uz' 
                  ? "\"Osonroq yig'ish tajribasi uchun har doim protsessor va operativ xotirani korpusga o'rnatishdan oldin ona plataga o'rnating.\""
                  : "\"Always install the CPU and RAM onto the motherboard before mounting it into the case for an easier building experience.\""}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--brand-accent-rgb), 0.5);
          border-radius: 10px;
        }
        @keyframes flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flash {
          animation: flash 0.5s ease-out forwards;
        }
      `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VirtualWorkshop;
