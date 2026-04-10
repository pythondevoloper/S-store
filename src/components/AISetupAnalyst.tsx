import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Star, 
  AlertCircle, 
  CheckCircle2, 
  ShoppingBag, 
  X,
  RefreshCw,
  Trophy,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from '../types';

interface AISetupAnalystProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'uz' | 'en';
  products: Product[];
}

interface AnalysisResult {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: {
    category: string;
    reason: string;
  }[];
}

const AISetupAnalyst: React.FC<AISetupAnalystProps> = ({ isOpen, onClose, language, products }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeSetup = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Check for API key and prompt if missing
      if (!process.env.GEMINI_API_KEY) {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey?.();
        if (!hasKey) {
          await (window as any).aistudio?.openSelectKey?.();
        }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];

      const prompt = `
        Analyze this computer setup/room. 
        Provide a score from 1 to 10 based on aesthetics, cable management, ergonomics, and equipment quality.
        Identify specific strengths and weaknesses.
        Provide overall feedback.
        Recommend product categories from our store that would improve this setup.
        
        Available product categories in our store: ${Array.from(new Set(products.map(p => p.category))).join(', ')}.
        
        Respond in ${language === 'uz' ? 'Uzbek' : 'English'}.
        Return the response in JSON format.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["category", "reason"]
                }
              }
            },
            required: ["score", "feedback", "strengths", "weaknesses", "recommendations"]
          }
        }
      });

      const analysis = JSON.parse(response.text);
      setResult(analysis);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      
      // If API key is invalid or requested entity not found, prompt for key selection
      const errorMsg = err?.message || "";
      if (errorMsg.includes("API key not valid") || errorMsg.includes("Requested entity was not found")) {
        await (window as any).aistudio?.openSelectKey?.();
        setError(language === 'uz' ? "Iltimos, API kalitini tanlang va qayta urinib ko'ring." : "Please select an API key and try again.");
      } else {
        setError(language === 'uz' ? "Tahlil qilishda xatolik yuz berdi." : "An error occurred during analysis.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRecommendedProducts = (category: string) => {
    return products.filter(p => p.category.toLowerCase() === category.toLowerCase()).slice(0, 2);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl overflow-y-auto custom-scrollbar p-4 md:p-8"
        >
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
                  <Camera className="w-6 h-6 text-brand-accent" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic">
                    AI Setup <span className="text-brand-accent">Analyst</span>
                  </h1>
                  <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
                    {language === 'uz' ? "Xonangizni baholang va yaxshilang" : "Rate and improve your workspace"}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left: Upload & Preview */}
              <div className="space-y-8">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative aspect-video rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center p-8 ${
                    selectedImage ? "border-brand-accent/50 bg-brand-accent/5" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {selectedImage ? (
                    <img src={selectedImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                        <Upload className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-xl font-bold uppercase tracking-tighter mb-2">
                        {language === 'uz' ? "Rasm yuklang" : "Upload Image"}
                      </p>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest text-center max-w-xs">
                        {language === 'uz' ? "Setupingiz rasmini shu yerga tashlang yoki bosing" : "Drag and drop or click to upload your setup"}
                      </p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                {selectedImage && !result && (
                  <button
                    onClick={analyzeSetup}
                    disabled={isAnalyzing}
                    className="w-full py-6 bg-brand-accent text-black rounded-[2rem] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-4 hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        {language === 'uz' ? "TAHLIL QILINMOQDA..." : "ANALYZING..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        {language === 'uz' ? "SETUPNI BAHOLASH" : "RATE MY SETUP"}
                      </>
                    )}
                  </button>
                )}

                {error && (
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-4 text-red-500">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                  </div>
                )}
              </div>

              {/* Right: Results */}
              <div className="space-y-8">
                {isAnalyzing ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-6 py-20">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-brand-accent animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold uppercase tracking-tighter">
                        {language === 'uz' ? "AI Setupingizni o'rganmoqda" : "AI is studying your setup"}
                      </h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest animate-pulse">
                        {language === 'uz' ? "Kabel boshqaruvi va estetikani tekshirish..." : "Checking cable management and aesthetics..."}
                      </p>
                    </div>
                  </div>
                ) : result ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    {/* Score Card */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 blur-3xl rounded-full -mr-16 -mt-16" />
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-6 h-6 text-brand-accent" />
                          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Setup Score</h3>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(10)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < result.score ? "text-brand-accent fill-brand-accent" : "text-gray-700"}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-4">
                        <span className="text-8xl font-black tracking-tighter text-brand-accent">{result.score}</span>
                        <span className="text-2xl font-bold text-gray-500">/ 10</span>
                      </div>
                      <p className="mt-6 text-gray-400 leading-relaxed italic">"{result.feedback}"</p>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-500/5 border border-green-500/10 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-3 text-green-500">
                          <CheckCircle2 className="w-5 h-5" />
                          <h4 className="text-xs font-bold uppercase tracking-widest">Strengths</h4>
                        </div>
                        <ul className="space-y-2">
                          {result.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                              <span className="w-1 h-1 bg-green-500 rounded-full mt-1.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-3 text-red-500">
                          <AlertCircle className="w-5 h-5" />
                          <h4 className="text-xs font-bold uppercase tracking-widest">Weaknesses</h4>
                        </div>
                        <ul className="space-y-2">
                          {result.weaknesses.map((w, i) => (
                            <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                              <span className="w-1 h-1 bg-red-500 rounded-full mt-1.5 shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <Lightbulb className="w-5 h-5 text-brand-accent" />
                        <h3 className="text-xs font-bold uppercase tracking-widest">AI Recommendations</h3>
                      </div>
                      <div className="space-y-4">
                        {result.recommendations.map((rec, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <h4 className="font-bold text-brand-accent uppercase tracking-tighter">{rec.category}</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">{rec.reason}</p>
                              </div>
                              <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-5 h-5 text-brand-accent" />
                              </div>
                            </div>
                            
                            {/* Suggested Products from Store */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                              {getRecommendedProducts(rec.category).map(product => (
                                <div key={product.id} className="group relative bg-black/40 rounded-2xl p-3 border border-white/5 hover:border-brand-accent transition-all">
                                  <div className="aspect-square rounded-xl overflow-hidden mb-3">
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                  </div>
                                  <h5 className="text-[10px] font-bold truncate mb-1">{product.name}</h5>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-brand-accent">${product.price}</span>
                                    <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-brand-accent transition-colors" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20 opacity-30">
                    <div className="w-24 h-24 bg-white/5 rounded-[3rem] flex items-center justify-center border border-white/10">
                      <Sparkles className="w-12 h-12 text-gray-600" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold uppercase tracking-tighter">Ready to Analyze</h4>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto font-bold uppercase tracking-widest">
                        Upload a photo of your setup to see your score and get AI-powered improvement tips.
                      </p>
                    </div>
                  </div>
                )}
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
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AISetupAnalyst;
