import { Product, Review } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Star, MessageSquare, User, Camera, Trash2, Maximize2, Box, Bell, CheckCircle2, Play, Users, Link as LinkIcon, Copy, Check, Zap } from "lucide-react";
import { formatCurrency } from "../utils/currency";
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Language, translations } from "../translations";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

interface ProductDetailsProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  isUzsMode: boolean;
  exchangeRate: number;
  onAddReview: (productId: string, review: { rating: number; comment: string; userName: string; reviewImage?: string; videoUrl?: string }) => Promise<void>;
  onOpenAR?: (url: string) => void;
  onFastCheckout?: (product: Product) => void;
  language: Language;
  onSetPriceAlert: (productId: string, email: string, currentPrice: number) => Promise<boolean>;
}

export default function ProductDetails({ product, onClose, onAddToCart, isUzsMode, exchangeRate, onAddReview, onOpenAR, onFastCheckout, language, onSetPriceAlert }: ProductDetailsProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [userName, setUserName] = useState("");
  const [reviewImage, setReviewImage] = useState<string | null>(null);
  const [reviewVideo, setReviewVideo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertStatus, setAlertStatus] = useState<"idle" | "loading" | "success">("idle");
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupLink, setGroupLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  useEffect(() => {
    if (!product) return;
    
    const reviewsRef = collection(db, "products", product.id, "reviews");
    const q = query(reviewsRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const revs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        } as Review;
      });
      setReviews(revs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `products/${product.id}/reviews`);
    });

    return () => unsubscribe();
  }, [product]);

  useEffect(() => {
    if (auth.currentUser) {
      setUserName(auth.currentUser.displayName || "");
    }
  }, []);

  useEffect(() => {
    const savedGroup = localStorage.getItem("active_group");
    if (savedGroup) {
      const parsed = JSON.parse(savedGroup);
      if (parsed.productId === product?.id) {
        setActiveGroup(parsed);
      }
    }
  }, [product]);

  const handleCreateGroup = async () => {
    if (!product) return;
    const email = prompt("Guruh yaratish uchun email manzilingizni kiriting:");
    if (!email) return;

    try {
      const res = await axios.post("/api/groups", {
        productId: product.id,
        creatorEmail: email
      });
      const link = `${window.location.origin}?group=${res.data.id}`;
      setGroupLink(link);
      setIsGroupModalOpen(true);
      setActiveGroup(res.data);
      localStorage.setItem("active_group", JSON.stringify(res.data));
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(groupLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setReviewImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Video hajmi 10MB dan oshmasligi kerak");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setReviewVideo(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !comment || !userName) return;

    setIsSubmitting(true);
    try {
      await onAddReview(product.id, { 
        rating, 
        comment, 
        userName, 
        reviewImage: reviewImage || undefined,
        videoUrl: reviewVideo || undefined
      });
      setComment("");
      setUserName("");
      setRating(5);
      setReviewImage(null);
      setReviewVideo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !alertEmail) return;
    setAlertStatus("loading");
    const success = await onSetPriceAlert(product.id, alertEmail, product.price);
    if (success) {
      setAlertStatus("success");
      setTimeout(() => {
        setIsAlertModalOpen(false);
        setAlertStatus("idle");
        setAlertEmail("");
      }, 2000);
    } else {
      setAlertStatus("idle");
    }
  };

  const averageRating = reviews.length 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl glass rounded-3xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
          >
            <div className="w-full md:w-1/2 aspect-square bg-white/5 overflow-y-auto hide-scrollbar">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="p-8 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-brand-accent font-bold">
                    {product.category}
                  </span>
                  <h2 className="text-2xl font-bold">{product.name}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex flex-col">
                      {product.isTrending && (
                        <span className="text-xs text-gray-500 line-through">
                          {formatCurrency(product.price, isUzsMode, exchangeRate)}
                        </span>
                      )}
                      <p className="text-xl font-black text-brand-accent">
                        {formatCurrency(product.dynamicPrice || product.price, isUzsMode, exchangeRate)}
                      </p>
                    </div>
                    {averageRating && (
                      <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-bold text-yellow-500">{averageRating}</span>
                        <span className="text-[10px] text-yellow-500/60">({reviews.length})</span>
                      </div>
                    )}
                  </div>
                  {/* Stock Status */}
                  <div className="mt-2">
                    {product.stockQuantity === 0 ? (
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                        {t.outOfStock}
                      </span>
                    ) : product.stockQuantity < 5 ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20"
                      >
                        {t.onlyLeft.replace("{count}", product.stockQuantity.toString())}
                      </motion.span>
                    ) : (
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                        Omborda mavjud ({product.stockQuantity})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAlertModalOpen(true)}
                    className="p-2 hover:bg-white/5 rounded-full text-brand-accent transition-all group relative"
                    title={t.priceDropAlert}
                  >
                    <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rounded-full animate-ping" />
                  </button>
                  <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {onOpenAR && (
                <button
                  onClick={() => product["3dModelUrl"] ? onOpenAR(product["3dModelUrl"]) : null}
                  disabled={!product["3dModelUrl"]}
                  className={`mb-6 w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black tracking-widest uppercase transition-all group ${
                    product["3dModelUrl"] 
                    ? "bg-brand-accent/10 border border-brand-accent/30 text-brand-accent hover:bg-brand-accent/20" 
                    : "bg-white/5 border border-white/10 text-gray-500 cursor-wait"
                  }`}
                >
                  <Box className={`w-5 h-5 ${product["3dModelUrl"] ? "group-hover:scale-110" : ""} transition-transform`} />
                  {product["3dModelUrl"] ? t.arView : "3D model yuklanmoqda..."}
                </button>
              )}

              <div className="space-y-4 mb-8">
                <button
                  disabled={product.stockQuantity === 0}
                  onClick={() => {
                    onAddToCart(product);
                    onClose();
                  }}
                  className={`btn-primary w-full flex items-center justify-center gap-2 shrink-0 ${
                    product.stockQuantity === 0 ? "opacity-50 grayscale cursor-not-allowed bg-gray-700" : ""
                  }`}
                >
                  {product.stockQuantity === 0 ? (
                    t.outOfStock
                  ) : (
                    <>
                      <Plus className="w-5 h-5" /> {t.addToCart}
                    </>
                  )}
                </button>

                <button
                  disabled={product.stockQuantity === 0}
                  onClick={() => onFastCheckout?.(product)}
                  className={`w-full py-4 bg-white text-black rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] ${
                    product.stockQuantity === 0 ? "opacity-50 grayscale cursor-not-allowed" : ""
                  }`}
                >
                  <Zap className="w-5 h-5 fill-current" />
                  Hoziroq sotib olish
                </button>

                {product.groupPrice && (
                  <button
                    onClick={handleCreateGroup}
                    className="w-full py-4 glass border border-brand-accent/30 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-brand-accent/10 transition-all group"
                  >
                    <div className="flex items-center gap-2 text-brand-accent font-black uppercase tracking-widest">
                      <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Guruh bilan sotib olish
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      Faqat {formatCurrency(product.groupPrice, isUzsMode, exchangeRate)} (3 kishi)
                    </span>
                  </button>
                )}

                {activeGroup && (
                  <div className="p-4 bg-brand-accent/5 border border-brand-accent/20 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-accent/20 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-brand-accent" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-white">Faol guruh</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                          {activeGroup.participants.length}/3 Ishtirokchi
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setGroupLink(`${window.location.origin}?group=${activeGroup.id}`);
                        setIsGroupModalOpen(true);
                      }}
                      className="text-[10px] font-black text-brand-accent uppercase hover:underline"
                    >
                      Havolani ko'rish
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-8 flex-1">
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tighter mb-2">{t.specs}</h4>
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    {Object.entries(product.specs || {}).map(([key, value], idx) => (
                      <div key={key} className={`flex justify-between p-3 text-sm ${idx % 2 === 0 ? 'bg-white/5' : ''}`}>
                        <span className="text-gray-400">{key}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tighter mb-2">Description</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Reviews Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tighter">{t.reviews}</h4>
                    <span className="text-[10px] font-bold text-gray-600 uppercase">{reviews.length} Comments</span>
                  </div>

                  {/* Review Form */}
                  <form onSubmit={handleSubmitReview} className="glass p-4 rounded-2xl space-y-4 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setRating(s)}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star className={`w-4 h-4 ${s <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-600"}`} />
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Rate Product</span>
                    </div>

                    <div className="space-y-3">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Your Name"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          required
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-brand-accent transition-colors"
                        />
                      </div>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 w-3 h-3 text-gray-500" />
                        <textarea
                          placeholder="Write your review..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          required
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-brand-accent transition-colors resize-none"
                        />
                      </div>

                      {/* Photo/Video Upload */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-4">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Camera className="w-3 h-3" />
                            Rasm qo'shish
                          </button>
                          <button
                            type="button"
                            onClick={() => document.getElementById('video-upload')?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Play className="w-3 h-3" />
                            Video qo'shish
                          </button>
                          <input
                            type="file"
                            id="video-upload"
                            onChange={handleVideoUpload}
                            accept="video/*"
                            className="hidden"
                          />
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>

                        <div className="flex gap-4">
                          {reviewImage && (
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-brand-accent/30 group">
                              <img src={reviewImage} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setReviewImage(null)}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {reviewVideo && (
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-brand-accent/30 group bg-black">
                              <video src={reviewVideo} className="w-full h-full object-cover" muted />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-4 h-4 text-white" />
                              </div>
                              <button
                                type="button"
                                onClick={() => setReviewVideo(null)}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? "Submitting..." : t.submitReview}
                    </button>
                  </form>

                  {/* Review List */}
                  <div className="space-y-4">
                    {reviews.length === 0 ? (
                      <p className="text-xs text-gray-600 text-center italic">No reviews yet. Be the first to review!</p>
                    ) : (
                      reviews.map((review) => (
                        <div key={review.id} className="glass p-4 rounded-2xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-brand-accent">{review.userName}</span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-2 h-2 ${s <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-800"}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">{review.comment}</p>
                          
                          {review.reviewImage && (
                            <div 
                              className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 cursor-pointer group"
                              onClick={() => setLightboxImage(review.reviewImage!)}
                            >
                              <img src={review.reviewImage} alt="Review" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}

                          {review.videoUrl && (
                            <div 
                              className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 cursor-pointer group bg-black"
                              onClick={() => setActiveVideo(review.videoUrl!)}
                            >
                              <video src={review.videoUrl} className="w-full h-full object-cover opacity-60" muted />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-8 h-8 text-white drop-shadow-lg" />
                              </div>
                              <div className="absolute bottom-1 right-1 bg-brand-accent text-brand-bg px-1 rounded text-[8px] font-black">
                                VIDEO
                              </div>
                            </div>
                          )}

                          <p className="text-[8px] text-gray-600 uppercase font-bold">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>

          {/* Video Player Modal */}
          <AnimatePresence>
            {activeVideo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-3xl"
                onClick={() => setActiveVideo(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="relative w-full max-w-lg aspect-[9/16] bg-black rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <video
                    src={activeVideo}
                    autoPlay
                    loop
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => setActiveVideo(null)}
                    className="absolute top-6 right-6 p-4 glass rounded-full hover:bg-white/10 transition-colors z-10"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-12 left-8 right-8 pointer-events-none">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center backdrop-blur-md">
                        <User className="w-6 h-6 text-brand-accent" />
                      </div>
                      <span className="text-white font-black text-lg drop-shadow-lg uppercase tracking-tighter">Video Sharh</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Price Drop Alert Modal */}
          <AnimatePresence>
            {isAlertModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-md glass p-8 rounded-[30px] border border-white/10 shadow-2xl space-y-6"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Bell className="w-6 h-6 text-brand-accent" />
                      <h3 className="text-xl font-black tracking-tighter uppercase">{t.priceDropAlert}</h3>
                    </div>
                    <button onClick={() => setIsAlertModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {alertStatus === "success" ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center py-8 space-y-4"
                    >
                      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                      </div>
                      <p className="text-sm font-bold text-green-500 uppercase tracking-widest">{t.alertSet}</p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSetAlert} className="space-y-4">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                        Mahsulot narxi tushganda sizga email orqali xabar beramiz.
                      </p>
                      <input
                        type="email"
                        placeholder="Email manzilingiz"
                        value={alertEmail}
                        onChange={(e) => setAlertEmail(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-brand-accent transition-all"
                      />
                      <button
                        type="submit"
                        disabled={alertStatus === "loading"}
                        className="btn-primary w-full py-4 flex items-center justify-center gap-3"
                      >
                        {alertStatus === "loading" ? "Yuborilmoqda..." : t.submitReview}
                      </button>
                    </form>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Group Buy Modal */}
          <AnimatePresence>
            {isGroupModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-md glass p-8 rounded-[30px] border border-white/10 shadow-2xl space-y-6"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-brand-accent" />
                      <h3 className="text-xl font-black tracking-tighter uppercase">Guruh havolasi</h3>
                    </div>
                    <button onClick={() => setIsGroupModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                      Ushbu havolani 2 ta do'stingizga yuboring. Agar 24 soat ichida 3 kishi sotib olsa, chegirma qo'llaniladi!
                    </p>
                    
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] font-mono text-gray-400 truncate">
                        {groupLink}
                      </div>
                      <button
                        onClick={copyToClipboard}
                        className="p-3 bg-brand-accent text-brand-bg rounded-xl hover:bg-brand-accent/80 transition-all"
                      >
                        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      onClick={() => setIsGroupModalOpen(false)}
                      className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      Tushunarli
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lightbox Modal */}
          <AnimatePresence>
            {lightboxImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
                onClick={() => setLightboxImage(null)}
              >
                <button
                  className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  onClick={() => setLightboxImage(null)}
                >
                  <X className="w-6 h-6 text-white" />
                </button>
                <motion.img
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  src={lightboxImage}
                  alt="Full Review"
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
