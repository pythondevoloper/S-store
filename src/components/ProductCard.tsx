import { Product } from "../types";
import { motion } from "motion/react";
import { Plus, Info } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onShowDetails: (product: Product) => void;
  key?: string | number;
}

export default function ProductCard({ product, onAddToCart, onShowDetails }: ProductCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="glass rounded-2xl overflow-hidden group flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-white/5">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
          <button
            onClick={() => onShowDetails(product)}
            className="w-full glass py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
          >
            <Info className="w-3 h-3" /> View Specs
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] uppercase tracking-widest text-brand-accent font-bold">
            {product.category}
          </span>
          <span className="text-lg font-bold">${product.price}</span>
        </div>
        <h3 className="text-lg font-bold mb-2 group-hover:text-brand-accent transition-colors">
          {product.name}
        </h3>
        <p className="text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
          {product.description}
        </p>
        <button
          onClick={() => onAddToCart(product)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add to Cart
        </button>
      </div>
    </motion.div>
  );
}
