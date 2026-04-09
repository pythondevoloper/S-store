import { Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Info, Heart, Zap } from "lucide-react";
import { formatCurrency } from "../utils/currency";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onShowDetails: (product: Product) => void;
  isUzsMode: boolean;
  exchangeRate: number;
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
  isFlashSale?: boolean;
  hasWowDiscount?: boolean;
  key?: string | number;
}

export default function ProductCard({ product, onAddToCart, onShowDetails, isUzsMode, exchangeRate, isFavorite, onToggleFavorite, isFlashSale, hasWowDiscount }: ProductCardProps) {
  const averageRating = product.reviews?.length 
    ? (product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length).toFixed(1)
    : null;

  let displayPrice = isFlashSale ? Math.round(product.price * 0.95) : (product.dynamicPrice || product.price);
  
  if (hasWowDiscount) {
    displayPrice = Math.round(displayPrice * 0.95);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      data-product-id={product.id}
      className={`glass rounded-xl overflow-hidden group flex flex-col h-full relative ${isFlashSale ? 'border-2 border-brand-accent shadow-[0_0_20px_rgba(0,212,255,0.3)]' : ''}`}
    >
      <button
        onClick={() => onToggleFavorite(product)}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-full glass hover:bg-white/10 transition-colors group/heart"
      >
        <motion.div
          whileTap={{ scale: 1.5 }}
          animate={{ scale: isFavorite ? [1, 1.2, 1] : 1 }}
        >
          <Heart 
            className={`w-4 h-4 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-400 group-hover/heart:text-white"}`} 
          />
        </motion.div>
      </button>

        <div className="relative aspect-square overflow-hidden bg-white/5">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          {product.stockQuantity === 0 && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="px-4 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                Sotuvda yo'q
              </span>
            </div>
          )}
          {isFlashSale && (
            <div className="absolute top-4 left-4 z-10">
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="px-3 py-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] flex items-center gap-1"
              >
                <Zap className="w-2 h-2 fill-current" />
                -5% SPECIAL
              </motion.span>
            </div>
          )}
          {hasWowDiscount && (
            <div className="absolute top-14 left-4 z-10">
              <motion.span
                animate={{ scale: [1, 1.2, 1], rotate: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="px-3 py-1 bg-brand-accent text-brand-bg text-[8px] font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_#00d4ff] flex items-center gap-1"
              >
                <Zap className="w-2 h-2 fill-current" />
                WOW -5%
              </motion.span>
            </div>
          )}
          {product.stockQuantity > 0 && product.stockQuantity < 5 && !isFlashSale && (
            <div className="absolute top-4 left-4 z-10">
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="px-3 py-1 bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
              >
                Faqat {product.stockQuantity} dona!
              </motion.span>
            </div>
          )}
          {product.isTrending && !isFlashSale && (
            <div className="absolute top-14 left-4 z-10">
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="px-3 py-1 bg-brand-accent text-brand-bg text-[8px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_#00d4ff]"
              >
                🔥 Ommabop! Narx tushdi
              </motion.span>
            </div>
          )}
          {product.groupPrice && !isFlashSale && (
            <div className="absolute top-[90px] left-4 z-10">
              <motion.span
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="px-3 py-1 bg-brand-accent/20 backdrop-blur-md border border-brand-accent/30 text-brand-accent text-[8px] font-black uppercase tracking-widest rounded-full"
              >
                👥 Guruh: -2%
              </motion.span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <button
            onClick={() => onShowDetails(product)}
            className="w-full glass py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
          >
            <Info className="w-3 h-3" /> View Specs
          </button>
        </div>
      </div>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-widest text-brand-accent font-bold">
              {product.category}
            </span>
            {averageRating && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-yellow-500 text-[10px]">★</span>
                <span className="text-[10px] font-bold">{averageRating}</span>
                <span className="text-[8px] text-gray-500">({product.reviews?.length})</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            {(product.isTrending || isFlashSale) && (
              <span className="text-[8px] text-gray-500 line-through">
                {formatCurrency(product.price, isUzsMode, exchangeRate)}
              </span>
            )}
            <span className={`text-sm font-bold ${isFlashSale ? 'text-red-500' : 'text-brand-accent'}`}>
              {formatCurrency(displayPrice, isUzsMode, exchangeRate)}
            </span>
          </div>
        </div>
        <h3 className="text-sm font-bold mb-1 group-hover:text-brand-accent transition-colors line-clamp-1">
          {product.name}
        </h3>
        <p className="text-gray-400 text-[11px] leading-tight line-clamp-2 mb-3 flex-1">
          {product.description}
        </p>
        <button
          disabled={product.stockQuantity === 0}
          onClick={() => onAddToCart(product)}
          className={`btn-primary w-full py-2 text-xs flex items-center justify-center gap-2 ${
            product.stockQuantity === 0 ? "opacity-50 grayscale cursor-not-allowed bg-gray-700" : ""
          }`}
        >
          {product.stockQuantity === 0 ? (
            "Sotuvda yo'q"
          ) : (
            <>
              <Plus className="w-3 h-3" /> Add to Cart
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
