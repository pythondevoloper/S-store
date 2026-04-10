import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  X, 
  Cpu, 
  HardDrive, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  Search,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Info,
  RefreshCw
} from 'lucide-react';
import { Product } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface HardwareHealthProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'uz' | 'en';
  products: Product[];
  onAddToCart: (product: Product) => void;
}

interface DiagnosticResult {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  specs: {
    cpuCores: number;
    memory: string;
    platform: string;
    userAgent: string;
  };
  analysis: string;
  recommendations: {
    productId: string;
    reason: string;
    performanceBoost: string;
  }[];
}

const HardwareHealth: React.FC<HardwareHealthProps> = ({ isOpen, onClose, language, products, onAddToCart }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [scanStep, setScanStep] = useState(0);

  const scanSteps = language === 'uz' 
    ? ['Protsessor yadrolarini tekshirish...', 'Xotira hajmini aniqlash...', 'Tizim arxitekturasini tahlil qilish...', 'AI tavsiyalarini tayyorlash...']
    : ['Checking CPU cores...', 'Detecting memory capacity...', 'Analyzing system architecture...', 'Preparing AI recommendations...'];

  const runDiagnostics = async () => {
    setIsScanning(true);
    setResult(null);
    
    // Simulate scanning steps
    for (let i = 0; i < scanSteps.length; i++) {
      setScanStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      // Browser-detectable specs
      const specs = {
        cpuCores: navigator.hardwareConcurrency || 0,
        memory: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory}GB` : 'Unknown',
        platform: navigator.platform,
        userAgent: navigator.userAgent
      };

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const productSummary = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        specs: p.specs
      }));

      const prompt = `
        You are "Digital Hardware Health" expert. 
        Analyze these detected PC specs and suggest upgrades from the available products.
        
        Detected Specs: ${JSON.stringify(specs)}
        Available Products: ${JSON.stringify(productSummary)}
        
        Your task:
        1. Give an overall health score (0-100).
        2. Categorize status: excellent, good, fair, poor.
        3. Write a brief analysis of the current system.
        4. Select up to 3 products from the store that would significantly improve performance.
        5. For each recommendation, provide a specific reason and an estimated performance boost percentage (e.g., "40% increase").
        
        Respond in ${language === 'uz' ? 'Uzbek' : 'English'}.
        Return the response in JSON format.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              status: { type: Type.STRING, enum: ['excellent', 'good', 'fair', 'poor'] },
              analysis: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    productId: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    performanceBoost: { type: Type.STRING }
                  },
                  required: ["productId", "reason", "performanceBoost"]
                }
              }
            },
            required: ["score", "status", "analysis", "recommendations"]
          }
        }
      });

      const diagnosticData = JSON.parse(response.text);

      setResult({
        ...diagnosticData,
        specs
      });
    } catch (error) {
      console.error("Diagnostics error:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-emerald-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
        >
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic">
                    Hardware <span className="text-blue-400">Health</span>
                  </h2>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Diagnostics & Optimization</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {!isScanning && !result && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full animate-pulse" />
                    <Activity className="w-24 h-24 text-blue-400 relative z-10" />
                  </div>
                  <div className="max-w-md space-y-4">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">
                      {language === 'uz' ? "Tizimni tekshirishga tayyormisiz?" : "Ready for a System Scan?"}
                    </h3>
                    <p className="text-gray-400 font-bold text-sm leading-relaxed">
                      {language === 'uz' 
                        ? "Bizning AI tizimingiz xususiyatlarini tahlil qiladi va unumdorlikni oshirish uchun eng yaxshi yangilanishlarni tavsiya qiladi."
                        : "Our AI will analyze your system specs and recommend the best upgrades to boost your performance."}
                    </p>
                  </div>
                  <button
                    onClick={runDiagnostics}
                    className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all flex items-center gap-3"
                  >
                    <Search className="w-5 h-5" />
                    {language === 'uz' ? "Skanerlashni boshlash" : "Start Deep Scan"}
                  </button>
                </div>
              )}

              {isScanning && (
                <div className="flex flex-col items-center justify-center py-20 space-y-12">
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-32 h-32 border-4 border-blue-600/20 border-t-blue-600 rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                    </div>
                  </div>
                  <div className="text-center space-y-4">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-blue-400 animate-pulse">
                      {scanSteps[scanStep]}
                    </h3>
                    <div className="flex gap-2 justify-center">
                      {scanSteps.map((_, i) => (
                        <div 
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all duration-500 ${
                            i <= scanStep ? 'bg-blue-600 w-8' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-12">
                  {/* Score & Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-white/5"
                          />
                          <motion.circle
                            initial={{ strokeDashoffset: 364 }}
                            animate={{ strokeDashoffset: 364 - (364 * result.score) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray="364"
                            className={getStatusColor(result.status)}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black tracking-tighter">{result.score}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Score</span>
                        </div>
                      </div>
                      <h4 className={`text-xl font-black uppercase tracking-tighter ${getStatusColor(result.status)}`}>
                        Status: {result.status}
                      </h4>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                        <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                          <Info className="w-4 h-4" /> AI Analysis
                        </h4>
                        <p className="text-gray-300 text-sm leading-relaxed font-medium">
                          {result.analysis}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { icon: Cpu, label: 'CPU Cores', value: result.specs.cpuCores },
                          { icon: HardDrive, label: 'Memory', value: result.specs.memory },
                          { icon: ShieldCheck, label: 'Platform', value: result.specs.platform },
                          { icon: Zap, label: 'Status', value: result.status }
                        ].map((item, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-2">
                            <item.icon className="w-5 h-5 text-blue-400 mx-auto" />
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</p>
                            <p className="text-xs font-bold text-white truncate">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                        {language === 'uz' ? "Tavsiya etilgan yangilanishlar" : "Recommended Upgrades"}
                      </h3>
                      <div className="px-4 py-1.5 bg-emerald-600/20 rounded-full border border-emerald-600/30">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Performance Boost</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {result.recommendations.map((rec, i) => {
                        const product = products.find(p => p.id === rec.productId);
                        if (!product) return null;

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden group hover:border-emerald-600/50 transition-all"
                          >
                            <div className="aspect-video relative overflow-hidden">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg">
                                +{rec.performanceBoost}
                              </div>
                            </div>
                            <div className="p-6 space-y-4">
                              <div>
                                <h4 className="font-black text-white uppercase tracking-tight truncate">{product.name}</h4>
                                <p className="text-emerald-400 font-black text-sm">${product.price}</p>
                              </div>
                              <p className="text-gray-400 text-[11px] font-bold leading-relaxed line-clamp-3">
                                {rec.reason}
                              </p>
                              <button
                                onClick={() => onAddToCart(product)}
                                className="w-full py-3 bg-white/10 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                              >
                                <Plus className="w-4 h-4" /> Savatga qo'shish
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-center pt-8">
                    <button
                      onClick={() => {
                        setResult(null);
                        runDiagnostics();
                      }}
                      className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-3 h-3" /> Qayta tekshirish
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Helper icons needed for the component
const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
  </svg>
);

export default HardwareHealth;
