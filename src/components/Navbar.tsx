import { ShoppingCart, Search, Menu } from "lucide-react";
import { motion } from "motion/react";

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  onSearch: (query: string) => void;
  logo?: string;
}

export default function Navbar({ cartCount, onCartClick, onSearch, logo }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between">
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
        <div className="hidden md:flex gap-6 text-sm font-medium text-gray-400">
          <a href="#" className="hover:text-brand-accent transition-colors">Electronics</a>
          <a href="#" className="hover:text-brand-accent transition-colors">Accessories</a>
          <a href="#" className="hover:text-brand-accent transition-colors">Support</a>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-8 relative hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <input
          type="text"
          placeholder="Search products..."
          onChange={(e) => onSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-accent transition-colors"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onCartClick}
          className="relative p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <ShoppingCart className="w-6 h-6 text-brand-accent" />
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
