import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Product, CartItem, Order, PriceAlert } from "./types";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import ProductDetails from "./components/ProductDetails";
import LogisticsTracker from "./components/LogisticsTracker";
import AdminPanel from "./components/AdminPanel";
import { motion, AnimatePresence } from "motion/react";
import { Lock, ArrowLeft, Monitor, Zap, Camera, ShieldCheck, LayoutGrid, Speaker, Calculator, DollarSign, RefreshCw, Heart, Search, Package, CheckCircle2, Truck, Clock, Moon, Sun, MessageSquare, Send, Box, X, Share2, Copy, Bell, Info, AlertTriangle, Globe, ChevronDown, User, ShoppingBag, TrendingUp, Award, BarChart3, Play } from "lucide-react";
import { formatCurrency } from "./utils/currency";
import { Language, translations } from "./translations";
import confetti from "canvas-confetti";
import { auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, updateDoc, arrayUnion, increment } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  public state: { hasError: boolean };
  public props: { children: React.ReactNode };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter uppercase">Xatolik yuz berdi</h2>
          <p className="text-gray-400 max-w-md">Iltimos, sahifani yangilang yoki birozdan so'ng qayta urinib ko'ring.</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary px-8"
          >
            Sahifani yangilash
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function CurrencyCalculator({ rate }: { rate: number }) {
  const [usd, setUsd] = useState<number>(1);
  const [uzs, setUzs] = useState<number>(rate);

  const handleUsdChange = (val: number) => {
    setUsd(val);
    setUzs(Math.round(val * rate));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass p-6 rounded-3xl w-64 space-y-4 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-4 h-4 text-brand-accent" />
        <h4 className="text-xs font-bold uppercase tracking-widest">Currency Converter</h4>
      </div>
      
      <div className="space-y-3">
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
          <input
            type="number"
            value={usd}
            onChange={(e) => handleUsdChange(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-brand-accent transition-colors"
          />
        </div>
        
        <div className="flex justify-center">
          <RefreshCw className="w-4 h-4 text-gray-700" />
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500">UZS</span>
          <div className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm font-mono">
            {uzs.toLocaleString()}
          </div>
        </div>
      </div>
      
      <p className="text-[10px] text-gray-600 text-center font-bold uppercase">
        1 USD = {rate.toLocaleString()} UZS
      </p>
    </motion.div>
  );
}

export default function App() {
  const [user, loadingAuth] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<{ 
    logoBase64: string; 
    cardNumber: string; 
    cardName: string; 
    paymentType: "card" | "wallet";
    walletNumber: string;
    walletName: string;
    bots: { token: string; username: string; status: "active" | "inactive" }[] 
  }>({ 
    logoBase64: "",
    cardNumber: "8600 0000 0000 0000",
    cardName: "Shohidbek M.",
    paymentType: "card",
    walletNumber: "+998 90 123 45 67",
    walletName: "Shohidbek M.",
    bots: []
  });
  const [promoCodes, setPromoCodes] = useState<{ code: string; discountPercentage: number }[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("s-store-cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [favorites, setFavorites] = useState<Product[]>(() => {
    const saved = localStorage.getItem("s-store-favorites");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isAboutOwnerOpen, setIsAboutOwnerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [sortBy, setSortBy] = useState<"none" | "low" | "high">("none");
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "midnight">(() => {
    const saved = localStorage.getItem("s-store-theme");
    return (saved as "light" | "dark" | "midnight") || "dark";
  });
  const [themePreference, setThemePreference] = useState<"auto" | "manual">("auto");
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<any>(null);

  // One-Click Checkout State
  const [isFastCheckoutOpen, setIsFastCheckoutOpen] = useState(false);
  const [fastCheckoutProduct, setFastCheckoutProduct] = useState<Product | null>(null);
  const [fastCheckoutName, setFastCheckoutName] = useState("");
  const [fastCheckoutPhone, setFastCheckoutPhone] = useState("");
  const [isFastCheckoutLoading, setIsFastCheckoutLoading] = useState(false);
  const [fastCheckoutSuccess, setFastCheckoutSuccess] = useState<string | null>(null);
  const [fastCheckoutGift, setFastCheckoutGift] = useState(false);

  // Flash Sale State
  const [flashSaleProduct, setFlashSaleProduct] = useState<Product | null>(null);
  const [flashSaleTimeLeft, setFlashSaleTimeLeft] = useState(7200); // 2 hours
  const [isFlashSaleActive, setIsFlashSaleActive] = useState(true);

  // Smart Bundle State
  const [isBundlePopupOpen, setIsBundlePopupOpen] = useState(false);
  const [bundleProduct, setBundleProduct] = useState<Product | null>(null);

  // Image Search State
  const [isImageSearchLoading, setIsImageSearchLoading] = useState(false);

  useEffect(() => {
    if (user) {
      syncUserProfile(user);
    } else {
      setUserData(null);
    }
  }, [user]);

  const syncUserProfile = async (firebaseUser: FirebaseUser) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const newUser = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        role: firebaseUser.email === "computeruz559@gmail.com" ? "SuperAdmin" : "user",
        affiliateToken: Math.random().toString(36).substring(7),
        affiliateBalance: 0,
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, newUser);
      setUserData(newUser);
    } else {
      setUserData(userSnap.data());
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError("Ushbu domen Firebase-da ruxsat etilmagan. Iltimos, Firebase Console-da 'Authorized domains' ro'yxatiga ushbu domenni qo'shing.");
      } else {
        setAuthError("Tizimga kirishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdminAuthenticated(false);
      setAdminUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const response = await fetch("/api/sales/recent");
      if (response.ok) {
        const data = await response.json();
        setRecentSales(data);
      }
    } catch (error) {
      console.error("Error fetching recent sales:", error);
    }
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { getDocFromServer } = await import("firebase/firestore");
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
    
    fetchProducts();
    fetchExchangeRate();
    fetchRecentSales();
    
    const interval = setInterval(fetchRecentSales, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  // Flash Sale Timer Logic
  useEffect(() => {
    if (!isFlashSaleActive) return;

    const timer = setInterval(() => {
      setFlashSaleTimeLeft((prev) => {
        if (prev <= 1) {
          setIsFlashSaleActive(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFlashSaleActive]);

  // Pick Flash Sale Product
  useEffect(() => {
    if (products.length > 0 && !flashSaleProduct) {
      // Favor high-value products like iPhone 15 Pro Max
      const targetProduct = products.find(p => p.name.includes("iPhone 15 Pro Max")) || 
                           products.filter(p => p.price > 1000).sort((a, b) => b.price - a.price)[0] ||
                           products[0];
      setFlashSaleProduct(targetProduct);
    }
  }, [products, flashSaleProduct]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Check for group ID in URL
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("group");
    if (groupId) {
      axios.get(`/api/groups/${groupId}`).then(res => {
        setActiveGroup(res.data);
        localStorage.setItem("active_group", JSON.stringify(res.data));
      }).catch(err => console.error("Invalid group link"));
    } else {
      const savedGroup = localStorage.getItem("active_group");
      if (savedGroup) setActiveGroup(JSON.parse(savedGroup));
    }
  }, []);
  const [warrantyEmail, setWarrantyEmail] = useState("");
  const [warranties, setWarranties] = useState<any[]>([]);
  const [isWarrantyLoading, setIsWarrantyLoading] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [trackingData, setTrackingData] = useState<any>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  
  // Exchange Rate State
  const [exchangeRate, setExchangeRate] = useState(12500);
  const [isUzsMode, setIsUzsMode] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("s-store-language");
    return (saved as Language) || "uz";
  });
  const t = translations[language];
  
  // Admin State
  const [view, setView] = useState<"store" | "admin">("store");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminUser, setAdminUser] = useState<any>(null);
  const [refToken, setRefToken] = useState<string | null>(null);

  // AI Chat State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // AR Modal State
  const [arModelUrl, setArModelUrl] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("s-store-language", language);
  }, [language]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings", {
        headers: {
          "x-admin-role": adminUser?.role || ""
        }
      });
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchPromoCodes = async () => {
    try {
      const res = await fetch("/api/promocodes");
      const data = await res.json();
      setPromoCodes(data);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch("/api/exchange-rate");
      const data = await res.json();
      setExchangeRate(data.rate);
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
    }
  };

  const fetchAnalytics = async () => {
    const email = user?.email || profileEmail;
    if (!email) return;
    setIsAnalyticsLoading(true);
    try {
      // Fetch from Firestore
      const userRef = doc(db, "users", user?.uid || "");
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        
        // Calculate rank and level based on total spent or coins
        // For now, we'll use the data from Firestore
        const analytics = {
          ...data,
          totalSpent: data.totalSpent || 0,
          rank: data.totalSpent > 5000 ? "Gold Member" : data.totalSpent > 1000 ? "Silver Member" : "Bronze Member",
          sCoins: data.sCoins || 0,
          userLevel: data.sCoins > 5000 ? "Cyber Legend" : data.sCoins > 1000 ? "Tech Enthusiast" : "Beginner",
          orderCount: data.orderCount || 0,
          orders: data.orders || [],
          categoryBreakdown: data.categoryBreakdown || []
        };

        // Confetti if rank changed
        if (userAnalytics && analytics.rank !== userAnalytics.rank) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: analytics.rank === "Gold Member" ? ["#FFD700", "#FFA500"] : ["#C0C0C0", "#E5E4E2"]
          });
        }
        
        setUserAnalytics(analytics);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const trackProductView = async (productId: string) => {
    try {
      await fetch(`/api/products/${productId}/view`, { method: "POST" });
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      trackProductView(selectedProduct.id);
    }
  }, [selectedProduct]);

  useEffect(() => {
    fetchSettings();
  }, [adminUser]);

  useEffect(() => {
    fetchProducts();
    fetchPromoCodes();
    fetchExchangeRate();

    // Referral Token Handling
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      setRefToken(ref);
      localStorage.setItem("s-store-ref", ref);
    } else {
      const savedRef = localStorage.getItem("s-store-ref");
      if (savedRef) setRefToken(savedRef);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("s-store-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("s-store-favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Theme Logic
  useEffect(() => {
    if (themePreference === "auto") {
      const hour = new Date().getHours();
      if (hour >= 19 || hour < 8) {
        setTheme("midnight");
      } else {
        // Default to dark for tech store vibe, or check system preference
        setTheme("dark");
      }
    }
  }, [themePreference]);

  useEffect(() => {
    localStorage.setItem("s-store-theme", theme);
    document.documentElement.classList.remove("light", "dark", "midnight");
    document.documentElement.classList.add(theme);
    
    // Apply midnight specific styles to body
    if (theme === "midnight") {
      document.body.style.backgroundColor = "#020617"; // Deep slate 950
    } else {
      document.body.style.backgroundColor = "";
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemePreference("manual");
    setTheme(prev => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "midnight";
      return "light";
    });
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId) return;
    
    setIsTrackingLoading(true);
    try {
      const res = await fetch(`/api/track-order/${trackingId}`);
      if (res.ok) {
        const data = await res.json();
        setTrackingData(data);
      } else {
        setTrackingData({ error: "Buyurtma topilmadi" });
      }
    } catch (error) {
      setTrackingData({ error: "Tizimda xatolik" });
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    // Smart Bundle Logic
    if (product.category === "Noutbuklar") {
      setBundleProduct(product);
      setIsBundlePopupOpen(true);
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      // Apply Flash Sale Price if applicable
      const price = (isFlashSaleActive && flashSaleProduct?.id === product.id) 
        ? Math.round(product.price * 0.95) 
        : product.price;
      
      return [...prev, { ...product, price, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const addBundleToCart = () => {
    const mouse = products.find(p => p.name.toLowerCase().includes("sichqoncha") || p.category === "Aksessuarlar");
    const bag = products.find(p => p.name.toLowerCase().includes("sumka") || p.category === "Aksessuarlar");
    
    if (mouse) addToCart(mouse);
    if (bag) addToCart(bag);
    setIsBundlePopupOpen(false);
  };

  const handleImageSearch = async (file: File) => {
    setIsImageSearchLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const res = await axios.post("/api/image-search", { image: reader.result });
        setActiveCategory(res.data.detectedCategory);
        setSearchQuery("");
        // Scroll to products
        document.getElementById("main-products")?.scrollIntoView({ behavior: "smooth" });
      } catch (error) {
        console.error("Image search failed:", error);
      } finally {
        setIsImageSearchLoading(false);
      }
    };
  };

  const handleVoiceCommand = (command: string) => {
    if (command.includes("noutbuklarni ko'rsat")) {
      setActiveCategory("Noutbuklar");
    } else if (command.includes("savatni och")) {
      setIsCartOpen(true);
    } else if (command.includes("narxi tushganlar")) {
      setSortBy("low");
      setSearchQuery("");
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleFavorite = (product: Product) => {
    setFavorites((prev) => {
      const isFav = prev.some((p) => p.id === product.id);
      if (isFav) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const handleAddReview = async (productId: string, review: { rating: number; comment: string; userName: string; reviewImage?: string; videoUrl?: string }) => {
    try {
      const res = await fetch(`/api/products/${productId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review)
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Error adding review:", error);
    }
  };

  const handleCheckout = async (customerData: any) => {
    localStorage.setItem("user_email", customerData.email);
    
    const orderData = {
      ...customerData,
      userId: user?.uid || null,
      items: cart.map(item => {
        const price = (activeGroup && activeGroup.productId === item.id) ? (item.groupPrice || item.price) : item.price;
        return { ...item, price };
      }),
      ref: refToken,
      exchangeRateUsed: exchangeRate,
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    try {
      // Save to Firestore
      const orderRef = await addDoc(collection(db, "orders"), orderData);
      
      if (user) {
        // Update user stats
        const userRef = doc(db, "users", user.uid);
        const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const earnedCoins = Math.floor(totalAmount / 10); // 1 coin per $10

        await updateDoc(userRef, {
          totalSpent: increment(totalAmount),
          sCoins: increment(earnedCoins),
          orderCount: increment(1),
          orders: arrayUnion({ ...orderData, id: orderRef.id })
        });
      }

      setCart([]);
      localStorage.removeItem("active_group");
      setActiveGroup(null);
      
      // Refresh analytics
      if (user) await fetchAnalytics();
      
      return { ...orderData, id: orderRef.id };
    } catch (error) {
      console.error("Error placing order:", error);
      throw error;
    }
  };

  const fetchWarranties = async () => {
    if (!warrantyEmail) return;
    setIsWarrantyLoading(true);
    try {
      const res = await fetch(`/api/my-warranties?email=${warrantyEmail}`);
      if (res.ok) {
        const data = await res.json();
        setWarranties(data);
      }
    } catch (error) {
      console.error("Error fetching warranties:", error);
    } finally {
      setIsWarrantyLoading(false);
    }
  };

  const handleSetPriceAlert = async (productId: string, email: string, currentPrice: number) => {
    try {
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email, alertPrice: currentPrice })
      });
      if (res.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error setting price alert:", error);
      return false;
    }
  };

  const handleAddProduct = async (newProduct: Omit<Product, "id">) => {
    try {
      const res = await fetch("/api/admin/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-role": adminUser?.role || ""
        },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/delete-product/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleFastCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastCheckoutProduct || !fastCheckoutName || !fastCheckoutPhone) return;

    setIsFastCheckoutLoading(true);
    try {
      // Calculate price with Flash Sale if applicable
      let price = fastCheckoutProduct.price;
      if (isFlashSaleActive && flashSaleProduct?.id === fastCheckoutProduct.id) {
        price = Math.round(fastCheckoutProduct.price * 0.95);
      } else if (fastCheckoutProduct.dynamicPrice) {
        price = fastCheckoutProduct.dynamicPrice;
      }

      const res = await axios.post("/api/fast-order", {
        name: fastCheckoutName,
        phone: fastCheckoutPhone,
        productId: fastCheckoutProduct.id,
        price: price,
        giftWrapping: fastCheckoutGift
      });

      setFastCheckoutSuccess(res.data.message);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      setTimeout(() => {
        setIsFastCheckoutOpen(false);
        setFastCheckoutSuccess(null);
        setFastCheckoutProduct(null);
        setFastCheckoutName("");
        setFastCheckoutPhone("");
      }, 5000);
    } catch (error) {
      console.error("Fast checkout failed:", error);
    } finally {
      setIsFastCheckoutLoading(false);
    }
  };
  const handleAISend = async (e: React.FormEvent) => {
    e.preventDefault();

    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setAiInput("");
    setIsAiLoading(true);

    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setAiMessages(prev => [...prev, { role: "ai", text: data.text }]);
    } catch (error) {
      setAiMessages(prev => [...prev, { role: "ai", text: "Kechirasiz, hozirda AI yordamchisi bilan bog'lanib bo'lmadi." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });
      
      if (res.ok) {
        const user = await res.json();
        setAdminUser(user);
        setIsAdminAuthenticated(true);
      } else {
        setLoginError("Noto'g'ri xavfsizlik kaliti.");
      }
    } catch (error) {
      setLoginError("Tizimda xatolik yuz berdi.");
    }
  };

  const filteredProducts = products
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPrice = p.price >= minPrice && p.price <= maxPrice;
      const matchesCategory = activeCategory === "all" || p.category.toLowerCase() === activeCategory.toLowerCase();
      return matchesSearch && matchesPrice && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "low") return a.price - b.price;
      if (sortBy === "high") return b.price - a.price;
      return 0;
    });

  const cartTotal = useMemo(() => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Smart Bundle Discount (15% if Laptop + Mouse + Bag)
    const hasLaptop = cart.some(item => item.category === "Noutbuklar");
    const hasMouse = cart.some(item => item.name.toLowerCase().includes("sichqoncha") || item.category === "Aksessuarlar");
    const hasBag = cart.some(item => item.name.toLowerCase().includes("sumka") || item.category === "Aksessuarlar");

    if (hasLaptop && hasMouse && hasBag) {
      return total * 0.85;
    }
    
    return total;
  }, [cart]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [searchQuery, products]);

  return (
    <ErrorBoundary>
      <div className={`min-h-screen transition-colors duration-500 ${theme === "dark" ? "bg-brand-bg text-white" : "bg-white text-black"}`}>
        <AnimatePresence mode="wait">
        {view === "store" ? (
          <motion.div
            key="store"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Navbar
              cartCount={cartCount}
              onCartClick={() => setIsCartOpen(true)}
              favoritesCount={favorites.length}
              onFavoritesClick={() => setIsFavoritesOpen(true)}
              onSearch={setSearchQuery}
              onImageSearch={handleImageSearch}
              onVoiceCommand={handleVoiceCommand}
              logo={settings.logoBase64}
              isUzsMode={isUzsMode}
              onToggleUzs={() => setIsUzsMode(!isUzsMode)}
              language={language}
              onLanguageChange={setLanguage}
              theme={theme}
              onToggleTheme={toggleTheme}
              searchResults={searchResults}
              onProductClick={(p) => {
                setSelectedProduct(p);
                setSearchQuery("");
              }}
              onTrackClick={() => setIsTrackingOpen(true)}
              onWarrantyClick={() => setIsWarrantyModalOpen(true)}
              onProfileClick={() => setIsProfileOpen(true)}
              user={user}
              userData={userData}
              onLogin={loginWithGoogle}
              onLogout={handleLogout}
            />

            {/* Fast Checkout Modal */}
            <AnimatePresence>
              {isFastCheckoutOpen && fastCheckoutProduct && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsFastCheckoutOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md glass p-8 rounded-[40px] border border-white/10 shadow-2xl space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Zap className="w-6 h-6 text-brand-accent fill-brand-accent" />
                        <h3 className="text-xl font-black tracking-tighter uppercase">Tezkor Sotib Olish</h3>
                      </div>
                      <button onClick={() => setIsFastCheckoutOpen(false)} className="p-2 hover:bg-white/5 rounded-full">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {fastCheckoutSuccess ? (
                      <div className="text-center py-8 space-y-4">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                          <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>
                        <p className="text-lg font-bold text-white leading-tight">{fastCheckoutSuccess}</p>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Buyurtma ID: #{Date.now().toString().slice(-6)}</p>
                      </div>
                    ) : (
                      <form onSubmit={handleFastCheckout} className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
                          <img src={fastCheckoutProduct.image} className="w-16 h-16 object-cover rounded-xl" />
                          <div>
                            <p className="text-sm font-bold">{fastCheckoutProduct.name}</p>
                            <p className="text-brand-accent font-black">
                              {formatCurrency(
                                (isFlashSaleActive && flashSaleProduct?.id === fastCheckoutProduct.id) 
                                ? Math.round(fastCheckoutProduct.price * 0.95) 
                                : (fastCheckoutProduct.dynamicPrice || fastCheckoutProduct.price),
                                isUzsMode,
                                exchangeRate
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                              type="text"
                              placeholder="Ismingiz"
                              value={fastCheckoutName}
                              onChange={(e) => setFastCheckoutName(e.target.value)}
                              required
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-accent transition-all"
                            />
                          </div>
                          <div className="relative">
                            <Speaker className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                              type="tel"
                              placeholder="Telefon raqamingiz"
                              value={fastCheckoutPhone}
                              onChange={(e) => setFastCheckoutPhone(e.target.value)}
                              required
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-accent transition-all"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                          <input
                            type="checkbox"
                            checked={fastCheckoutGift}
                            onChange={(e) => setFastCheckoutGift(e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-accent focus:ring-brand-accent"
                          />
                          <div className="flex-1">
                            <p className="text-xs font-bold uppercase tracking-widest">🎁 Sovg'a sifatida o'rash</p>
                            <p className="text-[10px] text-gray-500 font-bold">+$1.00 qo'shiladi</p>
                          </div>
                        </label>

                        <button
                          type="submit"
                          disabled={isFastCheckoutLoading}
                          className="btn-primary w-full py-4 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,212,255,0.3)]"
                        >
                          {isFastCheckoutLoading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Zap className="w-5 h-5 fill-current" />
                              TASDIQLASH
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* AR Model Viewer Modal */}
            <AnimatePresence>
              {arModelUrl && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-3xl">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-full h-full flex flex-col"
                  >
                    <div className="p-6 flex justify-between items-center glass border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <Box className="w-6 h-6 text-brand-accent" />
                        <h3 className="text-xl font-black tracking-tighter uppercase">AR Try-On Mode</h3>
                      </div>
                      <button 
                        onClick={() => setArModelUrl(null)}
                        className="p-3 glass rounded-full hover:bg-white/10 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    
                    <div className="flex-1 relative">
                      {/* @ts-ignore */}
                      <model-viewer
                        src={arModelUrl}
                        ar
                        ar-modes="webxr scene-viewer quick-look"
                        camera-controls
                        poster="poster.webp"
                        shadow-intensity="1"
                        auto-rotate
                        style={{ width: '100%', height: '100%', '--poster-color': 'transparent' }}
                      >
                        <button slot="ar-button" className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-brand-accent text-brand-bg px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl">
                          XONANGIZGA QO'YISH
                        </button>
                      </model-viewer>
                    </div>
                    
                    <div className="p-6 glass border-t border-white/10 text-center">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                        Smartfoningiz kamerasidan foydalanib mahsulotni xonangizga joylashtiring
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Flash Sale Banner */}
            <AnimatePresence>
              {isFlashSaleActive && flashSaleProduct && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-gradient-to-r from-red-600 via-brand-accent to-red-600 py-3 px-6 text-center relative overflow-hidden"
                >
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-white/20 skew-x-[-20deg]"
                  />
                  <div className="relative flex items-center justify-center gap-6 text-white">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 animate-pulse" />
                      <span className="font-black tracking-tighter uppercase text-sm">Flash Sale: {flashSaleProduct.name}</span>
                      <span className="bg-white text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">-5% SPECIAL</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono font-bold text-sm">{formatTime(flashSaleTimeLeft)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs line-through opacity-50">{formatCurrency(flashSaleProduct.price, isUzsMode, exchangeRate)}</span>
                        <span className="font-black text-lg drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                          {formatCurrency(Math.round(flashSaleProduct.price * 0.95), isUzsMode, exchangeRate)}
                        </span>
                      </div>
                      <button 
                        onClick={() => addToCart(flashSaleProduct)}
                        className="bg-white text-brand-bg px-4 py-1 rounded-full text-xs font-black uppercase hover:scale-105 transition-transform"
                      >
                        Hozir olish
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <main className="max-w-7xl mx-auto px-6 py-12">
              {/* Categories Dropdown Section */}
              <div className="relative mb-12">
                <button
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="flex items-center gap-3 px-8 py-4 bg-brand-accent text-brand-bg rounded-2xl font-black tracking-widest uppercase shadow-[0_0_30px_rgba(0,212,255,0.4)] hover:shadow-[0_0_50px_rgba(0,212,255,0.6)] transition-all group"
                >
                  <LayoutGrid className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
                  Bo'limlar
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isCategoryDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-4 w-64 glass rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50"
                    >
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setActiveCategory("all");
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-6 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all ${
                            activeCategory === "all" 
                            ? "bg-brand-accent text-brand-bg" 
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          Barchasi
                        </button>
                        {Array.from(new Set(products.map(p => p.category))).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              setActiveCategory(cat);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full text-left px-6 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all ${
                              activeCategory === cat 
                              ? "bg-brand-accent text-brand-bg" 
                              : "text-gray-400 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-black tracking-tighter mb-2"
                  >
                    S <span className="text-brand-accent">STORE</span>
                  </motion.h2>
                  <p className="text-gray-500">Premium electronics for the modern era.</p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <div className="glass px-4 py-2 rounded-xl flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-500 uppercase">Price</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minPrice || ""}
                        onChange={(e) => setMinPrice(Number(e.target.value))}
                        className="w-20 bg-white/5 border border-white/10 rounded-lg py-1 px-2 text-xs focus:outline-none focus:border-brand-accent"
                      />
                      <span className="text-gray-600">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxPrice || ""}
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                        className="w-20 bg-white/5 border border-white/10 rounded-lg py-1 px-2 text-xs focus:outline-none focus:border-brand-accent"
                      />
                    </div>
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="glass px-4 py-2 rounded-xl text-xs font-bold focus:outline-none border-none appearance-none cursor-pointer"
                  >
                    <option value="none">Sort By</option>
                    <option value="low">Price: Low to High</option>
                    <option value="high">Price: High to Low</option>
                  </select>
                </div>
              </header>

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="glass rounded-xl aspect-[3/4] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                      onShowDetails={(p) => setSelectedProduct(p)}
                      isUzsMode={isUzsMode}
                      exchangeRate={exchangeRate}
                      isFavorite={favorites.some((p) => p.id === product.id)}
                      onToggleFavorite={toggleFavorite}
                      isFlashSale={isFlashSaleActive && flashSaleProduct?.id === product.id}
                    />
                  ))}
                </div>
              )}
            </main>
          </motion.div>
        ) : (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-brand-bg"
          >
            {!isAdminAuthenticated ? (
              <div className="min-h-screen flex items-center justify-center p-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="glass p-12 rounded-3xl w-full max-w-md space-y-8"
                >
                  <div className="text-center space-y-4 mb-12">
                    <div className="w-20 h-20 bg-brand-accent/20 rounded-3xl flex items-center justify-center mx-auto border border-brand-accent/30">
                      <ShieldCheck className="w-10 h-10 text-brand-accent" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase">
                      Admin Access
                    </h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                      Enter security key to continue
                    </p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-8">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <input
                          type="password"
                          placeholder="Security Key"
                          value={adminPassword}
                          onChange={e => setAdminPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 focus:outline-none focus:border-brand-accent transition-colors text-center tracking-widest text-sm"
                        />
                        {loginError && <p className="text-red-500 text-[10px] text-center font-bold">{loginError}</p>}
                      </div>

                      <button 
                        disabled={!adminPassword}
                        type="submit" 
                        className="w-full py-4 rounded-xl bg-brand-accent text-brand-bg font-black tracking-widest uppercase hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all disabled:opacity-50"
                      >
                        Login to Dashboard
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setView("store")}
                      className="w-full text-gray-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Store
                    </button>
                  </form>
                </motion.div>
              </div>
            ) : (
              <AdminPanel
                products={products}
                settings={settings}
                adminUser={adminUser}
                userData={userData}
                onAddProduct={handleAddProduct}
                onDeleteProduct={handleDeleteProduct}
                onUpdateSettings={handleUpdateSettings}
                onLogout={() => {
                  handleLogout();
                  setAdminPassword("");
                  setView("store");
                }}
                exchangeRate={exchangeRate}
                onUpdateExchangeRate={(rate, manual) => {
                  fetch("/api/admin/exchange-rate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rate, manualOverride: manual })
                  }).then(() => fetchExchangeRate());
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Tracking Modal */}
      <AnimatePresence>
        {isTrackingOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-brand-bg/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`glass p-8 rounded-[40px] w-full max-w-lg space-y-8 relative ${theme === "light" ? "bg-white border-gray-200" : ""}`}
            >
              <button
                onClick={() => {
                  setIsTrackingOpen(false);
                  setTrackingData(null);
                  setTrackingId("");
                }}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-brand-accent" />
                </div>
                <h2 className="text-3xl font-black tracking-tighter">BUYURTMANI KUZATISH</h2>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Order Tracking System</p>
              </div>

              <form onSubmit={handleTrackOrder} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buyurtma ID (masalan: S-STORE-12345)"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-accent transition-all font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isTrackingLoading || !trackingId}
                  className="w-full py-4 bg-brand-accent text-brand-bg rounded-2xl font-black tracking-widest uppercase shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:shadow-[0_0_50px_rgba(0,212,255,0.5)] transition-all disabled:opacity-50"
                >
                  {isTrackingLoading ? "Qidirilmoqda..." : "KUZATISH"}
                </button>
              </form>

              {trackingData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-6 border-t border-white/10"
                >
                  {trackingData.error ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-center text-sm font-bold">
                      {trackingData.error}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Status</p>
                          <p className="text-lg font-black text-brand-accent uppercase">{trackingData.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Mijoz</p>
                          <p className="text-sm font-bold">{trackingData.customerName}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative pt-8">
                        <div className="absolute top-0 left-0 right-0 flex justify-between px-2">
                          {[
                            { label: "Qabul qilindi", status: "Pending Payment", icon: Clock },
                            { label: "To'landi", status: "Paid", icon: CheckCircle2 },
                            { label: "Yuborildi", status: "Shipped", icon: Truck },
                            { label: "Yetkazildi", status: "Delivered", icon: Package }
                          ].map((step, i, arr) => {
                            const statuses = arr.map(s => s.status);
                            const currentIndex = statuses.indexOf(trackingData.status);
                            const isActive = statuses.indexOf(step.status) <= currentIndex;
                            const isCurrent = step.status === trackingData.status;

                            return (
                              <div key={step.status} className="flex flex-col items-center gap-2 relative z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                                  isActive ? "bg-brand-accent text-brand-bg shadow-[0_0_15px_#00d4ff]" : "bg-white/5 text-gray-600 border border-white/10"
                                }`}>
                                  <step.icon className="w-5 h-5" />
                                </div>
                                <span className={`text-[8px] font-bold uppercase tracking-tighter text-center w-16 ${isActive ? "text-brand-accent" : "text-gray-600"}`}>
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="h-1 bg-white/5 rounded-full mt-5 relative overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ 
                              width: trackingData.status === "Pending Payment" ? "12.5%" :
                                     trackingData.status === "Paid" ? "37.5%" :
                                     trackingData.status === "Shipped" ? "62.5%" :
                                     trackingData.status === "Delivered" ? "100%" : "0%"
                            }}
                            className="h-full bg-brand-accent shadow-[0_0_10px_#00d4ff]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warranty Modal */}
      <AnimatePresence>
        {isWarrantyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWarrantyModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl glass rounded-[40px] overflow-hidden p-8 space-y-8"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-brand-accent" />
                  <h2 className="text-2xl font-black tracking-tighter uppercase">Mening Kafolatlarim</h2>
                </div>
                <button onClick={() => setIsWarrantyModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-4">
                <input
                  type="email"
                  placeholder="Email manzilingizni kiriting..."
                  value={warrantyEmail}
                  onChange={(e) => setWarrantyEmail(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-brand-accent transition-all"
                />
                <button
                  onClick={fetchWarranties}
                  disabled={isWarrantyLoading}
                  className="px-8 bg-brand-accent text-brand-bg font-black rounded-2xl hover:shadow-[0_0_20px_#00d4ff] transition-all disabled:opacity-50"
                >
                  {isWarrantyLoading ? "Qidirilmoqda..." : "Tekshirish"}
                </button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {warranties.length === 0 && !isWarrantyLoading && (
                  <div className="text-center py-12 text-gray-500">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest">Hozircha kafolatlar topilmadi</p>
                  </div>
                )}
                {warranties.map((w) => (
                  <motion.div
                    key={w.warrantyId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row gap-6 items-center"
                  >
                    <div className="w-32 h-32 bg-white p-2 rounded-2xl shrink-0">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WarrantyID:${w.warrantyId}|Order:${w.orderId}`} 
                        alt="Warranty QR"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 space-y-2 text-center md:text-left">
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {w.items.map((item: any) => (
                          <span key={item.id} className="text-[10px] font-black bg-brand-accent/10 text-brand-accent px-2 py-1 rounded-lg border border-brand-accent/20">
                            {item.name}
                          </span>
                        ))}
                      </div>
                      <h4 className="text-lg font-bold font-mono text-brand-accent">{w.warrantyId}</h4>
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amal qilish muddati:</p>
                        <p className="text-sm font-bold text-green-500">{new Date(w.expiry).toLocaleDateString()} gacha</p>
                      </div>
                      <div className="pt-2">
                        <span className="text-[10px] font-black bg-green-500/10 text-green-500 px-3 py-1 rounded-full border border-green-500/20 uppercase tracking-widest">
                          Status: Active
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        isUzsMode={isUzsMode}
        exchangeRate={exchangeRate}
      />

      <Checkout
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onCheckout={handleCheckout}
        promoCodes={promoCodes}
        cartTotal={cart.reduce((sum, item) => {
          const price = (activeGroup && activeGroup.productId === item.id) ? (item.groupPrice || item.price) : item.price;
          return sum + price * item.quantity;
        }, 0)}
        userLevel={userAnalytics?.userLevel}
        isUzsMode={isUzsMode}
        exchangeRate={exchangeRate}
        settings={settings}
      />

      <LogisticsTracker
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
        order={trackingOrder}
      />

      {/* Smart Bundle Popup */}
      <AnimatePresence>
        {isBundlePopupOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBundlePopupOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass p-8 rounded-3xl border border-brand-accent/30 shadow-[0_0_50px_rgba(0,212,255,0.2)] text-center space-y-6"
            >
              <div className="w-20 h-20 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto">
                <ShoppingBag className="w-10 h-10 text-brand-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tighter uppercase">Smart Bundle!</h3>
                <p className="text-gray-400 text-sm">
                  {bundleProduct?.name} uchun maxsus taklif! Sichqoncha va sumkani ham qo'shing va umumiy narxdan <span className="text-brand-accent font-bold">15% tejang!</span>
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={addBundleToCart}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2 group"
                >
                  <Zap className="w-5 h-5 group-hover:animate-bounce" />
                  Buni ham qo'shing va 15% tejang!
                </button>
                <button
                  onClick={() => setIsBundlePopupOpen(false)}
                  className="w-full py-4 rounded-xl glass text-gray-500 font-bold hover:text-white transition-colors"
                >
                  Yo'q, rahmat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Search Loading Overlay */}
      <AnimatePresence>
        {isImageSearchLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-brand-bg/90 backdrop-blur-xl flex flex-col items-center justify-center space-y-8"
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
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-10 h-10 text-brand-accent animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold tracking-widest uppercase">AI Vision Scanning</h3>
              <p className="text-gray-500 font-mono text-xs">ANALYZING_IMAGE_PATTERNS...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductDetails
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
        isUzsMode={isUzsMode}
        exchangeRate={exchangeRate}
        onAddReview={handleAddReview}
        onOpenAR={(url) => setArModelUrl(url)}
        onFastCheckout={(product) => {
          setFastCheckoutProduct(product);
          setIsFastCheckoutOpen(true);
        }}
        language={language}
        onSetPriceAlert={handleSetPriceAlert}
      />

      {/* User Profile Analytics Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-brand-bg/95 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl glass rounded-[40px] p-8 relative overflow-hidden"
            >
              <button
                onClick={() => setIsProfileOpen(false)}
                className="absolute top-8 right-8 p-4 glass rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 bg-brand-accent/20 rounded-3xl flex items-center justify-center border border-brand-accent/30 overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-10 h-10 text-brand-accent" />
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tighter uppercase">{userData?.displayName || user?.displayName || "Mening profilim"}</h2>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{user?.email || "User Spending Analytics"}</p>
                </div>
              </div>

              {!user && !userAnalytics ? (
                <div className="space-y-6 text-center py-12">
                  <p className="text-gray-400 text-sm">Profil ma'lumotlarini ko'rish uchun tizimga kiring:</p>
                  <button
                    onClick={loginWithGoogle}
                    className="px-12 py-4 bg-brand-accent text-brand-bg rounded-2xl font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:scale-105 transition-transform"
                  >
                    Google orqali kirish
                  </button>
                </div>
              ) : !userAnalytics ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Ma'lumotlar yuklanmoqda...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="glass p-6 rounded-3xl border border-white/5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Umumiy xarajat</p>
                      <p className="text-3xl font-black text-brand-accent">
                        {formatCurrency(userAnalytics.totalSpent, isUzsMode, exchangeRate)}
                      </p>
                    </div>
                    <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-center items-center text-center">
                      <Award className={`w-8 h-8 mb-2 ${userAnalytics.rank === "Gold Member" ? "text-yellow-500" : userAnalytics.rank === "Silver Member" ? "text-gray-400" : "text-orange-700"}`} />
                      <p className="text-sm font-black uppercase tracking-tighter">{userAnalytics.rank}</p>
                    </div>
                  </div>

                  {/* S-Coins & Level */}
                  <div className="glass p-8 rounded-[40px] border border-white/5 space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">S-Coins Balansi</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-accent/20 rounded-full flex items-center justify-center">
                            <Zap className="w-5 h-5 text-brand-accent" />
                          </div>
                          <p className="text-4xl font-black text-white">{userAnalytics.sCoins.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Daraja</p>
                        <p className="text-xl font-black text-brand-accent uppercase italic">{userAnalytics.userLevel}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-gray-500">Progress</span>
                        <span className="text-brand-accent">
                          {userAnalytics.userLevel === "Cyber Legend" ? "MAX" : 
                           userAnalytics.userLevel === "Tech Enthusiast" ? `${userAnalytics.sCoins}/5000` : 
                           `${userAnalytics.sCoins}/1000`}
                        </span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ 
                            width: userAnalytics.userLevel === "Cyber Legend" ? "100%" : 
                                   userAnalytics.userLevel === "Tech Enthusiast" ? `${(userAnalytics.sCoins / 5000) * 100}%` : 
                                   `${(userAnalytics.sCoins / 1000) * 100}%` 
                          }}
                          className="h-full bg-gradient-to-r from-brand-accent to-brand-accent/50 rounded-full shadow-[0_0_15px_rgba(0,212,255,0.5)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <ShoppingBag className="w-5 h-5 text-brand-accent" />
                      <h3 className="text-lg font-black tracking-tighter uppercase">Mening Buyurtmalarim</h3>
                    </div>
                    {userAnalytics.orderCount === 0 ? (
                      <p className="text-center py-8 text-gray-500 text-xs font-bold uppercase tracking-widest">Hozircha buyurtmalar yo'q</p>
                    ) : (
                      <div className="space-y-3">
                        {userAnalytics.orders.map((order: any) => (
                          <div key={order.id} className="glass p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center">
                                <Package className="w-5 h-5 text-brand-accent" />
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-tighter text-white">#{order.id.slice(-6)}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">{order.status}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs font-bold text-white">{formatCurrency(order.total, isUzsMode, exchangeRate)}</p>
                                <p className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                              </div>
                              {order.status === "Paid" && (
                                <button
                                  onClick={() => {
                                    setTrackingOrder(order);
                                    setIsLogisticsOpen(true);
                                  }}
                                  className="p-2 bg-brand-accent/20 text-brand-accent rounded-lg hover:bg-brand-accent/30 transition-all"
                                  title="Kuryerni kuzatish"
                                >
                                  <Truck className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-brand-accent" />
                      <h3 className="text-lg font-black tracking-tighter uppercase">Kategoriyalar bo'yicha</h3>
                    </div>
                    {userAnalytics.categoryBreakdown.map((cat: any) => (
                      <div key={cat.category} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                          <span className="text-gray-400">{cat.category}</span>
                          <span className="text-brand-accent">{cat.percentage}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.percentage}%` }}
                            className="h-full bg-brand-accent shadow-[0_0_10px_#00d4ff]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setUserAnalytics(null);
                      setProfileEmail("");
                    }}
                    className="w-full py-4 border border-white/10 rounded-2xl text-gray-500 font-bold uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all text-xs"
                  >
                    Boshqa email bilan kirish
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sales Notifications */}
      <div className="fixed bottom-24 left-8 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {recentSales.slice(0, 1).map((sale, idx) => (
            <motion.div
              key={sale.timestamp}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.9 }}
              className="glass p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 max-w-[300px] pointer-events-auto"
            >
              <div className="w-10 h-10 bg-brand-accent/20 rounded-full flex items-center justify-center border border-brand-accent/30">
                <TrendingUp className="w-5 h-5 text-brand-accent" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-tighter text-white">
                  {sale.customerName} hozirgina sotib oldi!
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase truncate">
                  {sale.productName}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* AI Chat Widget */}
      <div className="fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {isAIChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-[350px] h-[500px] glass rounded-[30px] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-brand-accent/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center shadow-[0_0_15px_#00d4ff]">
                    <Zap className="w-6 h-6 text-brand-bg" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black tracking-tighter">S-AI ASSISTANT</h4>
                    <p className="text-[10px] text-brand-accent font-bold uppercase tracking-widest">Online</p>
                  </div>
                </div>
                <button onClick={() => setIsAIChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {aiMessages.length === 0 && (
                  <div className="text-center space-y-4 pt-12">
                    <MessageSquare className="w-12 h-12 text-gray-700 mx-auto" />
                    <p className="text-sm text-gray-500 font-bold">Qanday yordam bera olaman?</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {["Sovg'a tavsiya qil", "Eng arzon mahsulotlar", "Yangi mahsulotlar"].map(hint => (
                        <button 
                          key={hint}
                          onClick={() => setAiInput(hint)}
                          className="text-[10px] px-3 py-2 bg-white/5 border border-white/10 rounded-full hover:border-brand-accent transition-colors"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                      msg.role === "user" 
                        ? "bg-brand-accent text-brand-bg font-bold rounded-tr-none" 
                        : "bg-white/5 border border-white/10 text-gray-300 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none flex gap-1">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleAISend} className="p-4 border-t border-white/10 bg-black/20">
                <div className="relative">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Savolingizni yozing..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-12 focus:outline-none focus:border-brand-accent transition-colors text-sm"
                  />
                  <button 
                    type="submit"
                    disabled={!aiInput.trim() || isAiLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-accent text-brand-bg rounded-xl disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsAIChatOpen(!isAIChatOpen)}
          className="w-16 h-16 bg-brand-accent text-brand-bg rounded-full shadow-[0_0_30px_#00d4ff] flex items-center justify-center relative group"
        >
          <MessageSquare className="w-8 h-8" />
          <div className="absolute -top-12 right-0 bg-brand-accent text-brand-bg px-4 py-2 rounded-xl text-[10px] font-black tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI YORDAMCHI
          </div>
        </motion.button>
      </div>

      {/* AR Modal */}
      <AnimatePresence>
        {arModelUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-brand-bg/95 backdrop-blur-3xl"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-4xl h-[80vh] glass rounded-[40px] relative overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Box className="w-8 h-8 text-brand-accent" />
                  <h2 className="text-3xl font-black tracking-tighter uppercase">AR PREVIEW</h2>
                </div>
                <button onClick={() => setArModelUrl(null)} className="p-4 glass rounded-full hover:bg-white/10 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 relative">
                <model-viewer
                  src={arModelUrl}
                  ar
                  ar-modes="webxr scene-viewer quick-look"
                  camera-controls
                  poster="poster.webp"
                  shadow-intensity="1"
                  auto-rotate
                  style={{ width: "100%", height: "100%", "--poster-color": "transparent" }}
                >
                  <button slot="ar-button" className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-brand-accent text-brand-bg px-8 py-4 rounded-2xl font-black tracking-widest uppercase shadow-[0_0_30px_#00d4ff]">
                    XONADA KO'RISH (AR)
                  </button>
                </model-viewer>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Favorites Modal */}
      <AnimatePresence>
        {isFavoritesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-bg/95 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-6xl h-[80vh] glass rounded-[40px] p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <Heart className="w-8 h-8 text-red-500 fill-red-500" />
                  <h2 className="text-4xl font-black tracking-tighter">SARALANGANLAR</h2>
                </div>
                <button 
                  onClick={() => setIsFavoritesOpen(false)}
                  className="p-4 glass rounded-full hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                {favorites.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <Heart className="w-16 h-16 text-gray-700" />
                    <h3 className="text-xl font-bold text-gray-500">Hali hech narsa yo'q</h3>
                    <p className="text-gray-600 max-w-xs">O'zingizga yoqqan mahsulotlarni yurakcha tugmasini bosish orqali shu yerga saqlashingiz mumkin.</p>
                    <button 
                      onClick={() => setIsFavoritesOpen(false)}
                      className="btn-primary px-8"
                    >
                      Xaridni boshlash
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {favorites.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={addToCart}
                        onShowDetails={(p) => {
                          setSelectedProduct(p);
                          setIsFavoritesOpen(false);
                        }}
                        isUzsMode={isUzsMode}
                        exchangeRate={exchangeRate}
                        isFavorite={true}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Currency Calculator Widget */}
      <div className="fixed bottom-24 right-6 z-40 hidden md:block">
        <CurrencyCalculator rate={exchangeRate} />
      </div>

      <footer className="border-t border-white/10 py-12 px-6 mt-24 bg-black/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            {settings.logoBase64 ? (
              <img src={settings.logoBase64} alt="Logo" className="h-6 w-auto" />
            ) : (
              <ShoppingBag className="w-6 h-6 text-brand-accent" />
            )}
            <h1 className="text-xl font-black tracking-tighter text-brand-accent">S STORE</h1>
          </div>
          <div className="flex gap-8 text-sm text-gray-500">
            <button onClick={() => setView("admin")} className="hover:text-white transition-colors">Admin</button>
            <button onClick={() => setIsAboutOwnerOpen(true)} className="hover:text-white transition-colors">Asoschi haqida</button>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-xs text-gray-600 uppercase font-bold tracking-widest">
            © 2026 S STORE. Asoschi: <span className="text-brand-accent">Shohidbek Mahmudov</span>
          </p>
        </div>
      </footer>

      {/* Auth Error Modal */}
      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass p-8 rounded-[40px] w-full max-w-md text-center space-y-6 border border-red-500/30"
            >
              <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto">
                <ShieldCheck className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tighter uppercase text-red-500">Xatolik yuz berdi</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {authError}
                </p>
                {authError.includes("Authorized domains") && (
                  <div className="mt-4 p-4 bg-white/5 rounded-2xl text-left space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Qo'shilishi kerak bo'lgan domenlar:</p>
                    <code className="block text-[10px] font-mono text-brand-accent break-all bg-black/40 p-2 rounded-lg">
                      {window.location.hostname}
                    </code>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setAuthError(null)}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black tracking-widest uppercase hover:bg-red-600 transition-colors"
              >
                Tushunarli
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Owner Modal */}
      <AnimatePresence>
        {isAboutOwnerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-brand-bg/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass p-12 rounded-[40px] w-full max-w-md text-center space-y-8 relative overflow-hidden"
            >
              <div className="w-24 h-24 bg-brand-accent/20 rounded-3xl flex items-center justify-center mx-auto">
                <User className="w-12 h-12 text-brand-accent" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black tracking-tighter uppercase">Asoschi haqida</h3>
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                  <p className="text-gray-300 leading-relaxed">
                    Shohidbek Mahmudov - 14 yoshli dasturchi va S STORE loyihasi asoschisi. 
                    U kelajak texnologiyalarini hamma uchun ochiq va qulay qilishni maqsad qilgan.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsAboutOwnerOpen(false)}
                className="btn-primary w-full py-4"
              >
                Yopish
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
