import { ShoppingCart, Search, Menu, Heart, Moon, Sun, Package, Mic, Camera, ShieldCheck, Globe, ChevronDown, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";
import React, { useState, useRef, useEffect } from "react";
import { Language, translations } from "../translations";

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  favoritesCount: number;
  onFavoritesClick: () => void;
  onSearch: (query: string) => void;
  onImageSearch: (file: File) => void;
  onVoiceCommand: (command: string) => void;
  logo?: string;
  isUzsMode: boolean;
  onToggleUzs: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  searchResults?: Product[];
  onProductClick?: (product: Product) => void;
  onTrackClick: () => void;
  onWarrantyClick: () => void;
  onProfileClick: () => void;
}

export default function Navbar({ 
  cartCount, 
  onCartClick, 
  favoritesCount, 
  onFavoritesClick, 
  onSearch, 
  onImageSearch,
  onVoiceCommand,
  logo, 
  isUzsMode, 
  onToggleUzs,
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  searchResults = [],
  onProductClick,
  onTrackClick,
  onWarrantyClick,
  onProfileClick
}: NavbarProps) {
  const [isListening, setIsListening] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Kechirasiz, brauzeringiz ovozli qidiruvni qo'llab-quvvatlamaydi.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'uz' ? 'uz-UZ' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (searchInputRef.current) {
        searchInputRef.current.value = transcript;
        onSearch(transcript);
      }
      // Also pass to voice command handler
      onVoiceCommand(transcript.toLowerCase());
    };

    recognition.start();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSearch(file);
    }
  };

  return (
    <nav className={`sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-colors duration-500 ${
      theme === "dark" ? "glass" : "bg-white/80 backdrop-blur-xl border-b border-gray-100"
    }`}>
      <div className="flex items-center gap-8">
        {logo ? (
          <img 
            src={logo} 
            alt="S STORE" 
            className="h-10 w-auto drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <h1 className="text-2xl font-black tracking-tighter text-brand-accent drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]">
            S STORE
          </h1>
        )}
        
        {/* Language & Currency Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
          >
            <Globe className="w-4 h-4 text-brand-accent" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {language === "uz" ? "O'zbekcha (UZS)" : "English (USD)"}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isLangMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 w-48 glass rounded-2xl border border-white/10 overflow-hidden z-[60]"
              >
                <button
                  onClick={() => {
                    onLanguageChange("uz");
                    if (!isUzsMode) onToggleUzs();
                    setIsLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold transition-colors hover:bg-white/5 ${language === "uz" ? "text-brand-accent" : "text-gray-400"}`}
                >
                  O'zbekcha (UZS)
                  {language === "uz" && <div className="w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_#00d4ff]" />}
                </button>
                <button
                  onClick={() => {
                    onLanguageChange("en");
                    if (isUzsMode) onToggleUzs();
                    setIsLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold transition-colors hover:bg-white/5 ${language === "en" ? "text-brand-accent" : "text-gray-400"}`}
                >
                  English (USD)
                  {language === "en" && <div className="w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_#00d4ff]" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-8 relative hidden sm:block">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t.searchPlaceholder}
            onChange={(e) => onSearch(e.target.value)}
            className={`w-full rounded-full py-2 pl-10 pr-20 text-sm focus:outline-none focus:border-brand-accent transition-all ${
              theme === "dark" 
              ? "bg-white/5 border border-white/10 text-white" 
              : "bg-gray-100 border border-gray-200 text-black"
            }`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-full text-gray-500 hover:text-brand-accent transition-all"
              title="Rasm orqali qidirish"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={startVoiceSearch}
              className={`p-1.5 rounded-full transition-all ${
                isListening ? "bg-brand-accent text-brand-bg animate-pulse" : "text-gray-500 hover:text-brand-accent"
              }`}
              title="Ovozli qidiruv"
            >
              <Mic className="w-4 h-4" />
              {isListening && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-brand-accent rounded-full -z-10"
                />
              )}
            </button>
          </div>
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl overflow-hidden border ${
                theme === "dark" ? "glass border-white/10" : "bg-white border-gray-100"
              }`}
            >
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => onProductClick?.(product)}
                  className={`w-full flex items-center gap-4 p-3 transition-colors text-left ${
                    theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"
                  }`}
                >
                  <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{product.name}</p>
                    <p className="text-[10px] text-brand-accent font-bold">${product.price}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-4">
        {/* Order Tracking Button */}
        <button
          onClick={onTrackClick}
          className={`p-2 rounded-full transition-all ${
            theme === "dark" ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-100 text-gray-600"
          }`}
          title="Buyurtmani kuzatish"
        >
          <Package className="w-6 h-6" />
        </button>

        {/* Warranty Button */}
        <button
          onClick={onWarrantyClick}
          className={`p-2 rounded-full transition-all ${
            theme === "dark" ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-100 text-gray-600"
          }`}
          title={t.myWarranties}
        >
          <ShieldCheck className="w-6 h-6" />
        </button>

        {/* Profile Button */}
        <button
          onClick={onProfileClick}
          className={`p-2 rounded-full transition-all ${
            theme === "dark" ? "hover:bg-white/5 text-gray-400" : "hover:bg-gray-100 text-gray-600"
          }`}
          title="Mening profilim"
        >
          <User className="w-6 h-6" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className={`p-2 rounded-full transition-all ${
            theme === "dark" ? "hover:bg-white/5 text-brand-accent" : "hover:bg-gray-100 text-gray-600"
          }`}
        >
          {theme === "dark" ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>
        <button
          onClick={onFavoritesClick}
          className="relative p-2 hover:bg-white/5 rounded-full transition-colors group"
        >
          <Heart className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
          {favoritesCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full"
            >
              {favoritesCount}
            </motion.span>
          )}
        </button>
        <button
          onClick={onCartClick}
          className="relative p-2 hover:bg-white/5 rounded-full transition-colors group"
        >
          <ShoppingCart className="w-6 h-6 text-brand-accent group-hover:scale-110 transition-transform" />
          {cartCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-brand-accent text-brand-bg text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full"
            >
              {cartCount}
            </motion.span>
          )}
        </button>
        <button className="sm:hidden p-2 hover:bg-white/5 rounded-full">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
}
