import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Cpu, 
  ShoppingCart, 
  Sparkles, 
  Terminal, 
  Bot, 
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Zap
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Product, CartItem } from '../types';

interface SAIConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'uz' | 'en';
  products: Product[];
  onAddToCart: (product: Product) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Product[];
}

const SAIConfigurator: React.FC<SAIConfiguratorProps> = ({ isOpen, onClose, language, products, onAddToCart }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: language === 'uz' 
        ? "Salom! Men S-AI Configurator-man. Sizga qanday kompyuter kerak? Masalan: 'Menga 10 million so'mga Minecraft RTX bilan o'ynash uchun kompyuter yig'ib ber' deb yozishingiz mumkin."
        : "Hello! I'm S-AI Configurator. What kind of PC do you need? For example: 'Assemble me a computer for 10 million soums to play Minecraft with RTX'."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Prepare product data for AI
      const productSummary = products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        specs: p.specs
      }));

      const prompt = `
        You are "S-AI Configurator", a smart PC builder assistant.
        The user wants to assemble a PC based on their requirements.
        
        Available Products: ${JSON.stringify(productSummary)}
        
        User Request: "${input}"
        
        Your task:
        1. Select the BEST compatible parts from the list that fit the user's budget and requirements.
        2. Ensure technical compatibility (e.g., Motherboard socket matches CPU, RAM type matches Motherboard).
        3. If the budget is too low for the request, explain why and suggest the closest possible build.
        4. Return a friendly explanation and a list of product IDs that make up the build.
        
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
              explanation: { type: Type.STRING },
              recommendedProductIds: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              }
            },
            required: ["explanation", "recommendedProductIds"]
          }
        }
      });

      const result = JSON.parse(response.text);
      const recommendedProducts = products.filter(p => result.recommendedProductIds.includes(p.id));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.explanation,
        recommendations: recommendedProducts
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Configurator error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: language === 'uz' 
          ? "Kechirasiz, tahlil qilishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring."
          : "Sorry, an error occurred during analysis. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const addAllToCart = (recs: Product[]) => {
    recs.forEach(p => onAddToCart(p));
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
          <div className="w-full max-w-4xl h-[85vh] bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center relative">
                  <Bot className="w-6 h-6 text-brand-accent" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0a] animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic">
                    S-AI <span className="text-brand-accent">Configurator</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Smart Assembler v2.0</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,255,0.03),transparent)]"
            >
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-white/10' : 'bg-brand-accent/20'
                    }`}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-brand-accent" />}
                    </div>
                    <div className="space-y-4">
                      <div className={`p-5 rounded-3xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-brand-accent text-black font-bold' 
                          : 'bg-white/5 border border-white/10 text-gray-300'
                      }`}>
                        {msg.content}
                      </div>

                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-brand-accent">
                              <Zap className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Tavsiya etilgan build</span>
                            </div>
                            <button 
                              onClick={() => addAllToCart(msg.recommendations!)}
                              className="text-[10px] font-black uppercase tracking-widest text-white hover:text-brand-accent transition-colors flex items-center gap-2"
                            >
                              Hammasini savatga qo'shish <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {msg.recommendations.map(product => (
                              <div 
                                key={product.id}
                                className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-4 group hover:border-brand-accent/50 transition-all"
                              >
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-black shrink-0">
                                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[11px] font-bold text-white truncate">{product.name}</h4>
                                  <p className="text-[10px] font-black text-brand-accent">${product.price}</p>
                                </div>
                                <button 
                                  onClick={() => onAddToCart(product)}
                                  className="w-8 h-8 bg-white/5 hover:bg-brand-accent hover:text-black rounded-lg flex items-center justify-center transition-all"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-brand-accent animate-spin" />
                    </div>
                    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center gap-3">
                      <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white/5 border-t border-white/10">
              <div className="relative flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={language === 'uz' ? "Talablaringizni yozing..." : "Type your requirements..."}
                    className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-sm text-white focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-accent animate-pulse" />
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-14 h-14 bg-brand-accent text-black rounded-2xl flex items-center justify-center hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
              <p className="mt-4 text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] text-center">
                AI can make mistakes. Verify technical compatibility before purchase.
              </p>
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
              background: rgba(0, 212, 255, 0.5);
              border-radius: 10px;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SAIConfigurator;
