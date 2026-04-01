import { Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface ProductDetailsProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductDetails({ product, onClose }: ProductDetailsProps) {
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
            className="relative w-full max-w-2xl glass rounded-3xl overflow-hidden flex flex-col md:flex-row"
          >
            <div className="w-full md:w-1/2 aspect-square bg-white/5">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-brand-accent font-bold">
                    {product.category}
                  </span>
                  <h2 className="text-2xl font-bold">{product.name}</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tighter mb-2">Specifications</h4>
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    {Object.entries(product.specs).map(([key, value], idx) => (
                      <div key={key} className={`flex justify-between p-3 text-sm ${idx % 2 === 0 ? 'bg-white/5' : ''}`}>
                        <span className="text-gray-400">{key}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {product.description}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
