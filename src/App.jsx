import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  X,
  ChevronLeft,
  Send,
  MessageCircle,
  Camera,
  Globe,
  Phone,
  Plus,
  Minus,
  Truck,
  CreditCard,
  CheckCircle,
  Menu,
  ArrowRight,
  Sparkles,
  Loader2,
  Lock,
  LogOut,
  UploadCloud,
  PackagePlus,
  ClipboardList,
  Receipt,
  AlertCircle,
} from "lucide-react";
import {
  fetchProducts,
  subscribeToProducts,
  placeOrder,
  fetchOrders,
  signInAdmin,
  signOutAdmin,
  getAdminSession,
  onAdminAuthStateChange,
  uploadProductImage,
  addProduct,
  updateProductStock,
} from "./lib/supabase.js";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const SIZES = ["XS", "S", "M", "L", "XL"];

// Returns the stock count for a given product + size, defaulting to 0 if missing
function getStock(product, size) {
  if (!product?.stock) return 0;
  const value = product.stock[size];
  return typeof value === "number" ? value : 0;
}

// Returns true if every size for a product is out of stock
function isFullyOutOfStock(product) {
  if (!product?.stock) return true;
  return SIZES.every((s) => getStock(product, s) <= 0);
}

// Picks the first size with stock available, falling back to "M"
function firstAvailableSize(product) {
  const found = SIZES.find((s) => getStock(product, s) > 0);
  return found || "M";
}

/**
 * Tracks which product IDs just had their stock change (added/updated/sold),
 * so the storefront can briefly flash a "just updated" highlight.
 * Returns a Set of product IDs that changed on the most recent update.
 */
function useStockChangeFlash(products) {
  const prevRef = useRef({});
  const [changedIds, setChangedIds] = useState(new Set());

  useEffect(() => {
    const prev = prevRef.current;
    const changed = new Set();

    products.forEach((p) => {
      const prevStock = prev[p.id];
      const nextStock = JSON.stringify(p.stock || {});
      if (prevStock !== undefined && prevStock !== nextStock) {
        changed.add(p.id);
      }
    });

    if (changed.size > 0) {
      setChangedIds(changed);
      const timer = setTimeout(() => setChangedIds(new Set()), 1200);
      prevRef.current = Object.fromEntries(products.map((p) => [p.id, JSON.stringify(p.stock || {})]));
      return () => clearTimeout(timer);
    }

    prevRef.current = Object.fromEntries(products.map((p) => [p.id, JSON.stringify(p.stock || {})]));
  }, [products]);

  return changedIds;
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar({ cartCount, onOpenCart, onEnterCloset, currentView, onBackToLanding }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Products", href: "#products" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "backdrop-blur-md bg-white/70 border-b border-black/5 shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={currentView !== "landing" ? onBackToLanding : () => {}}
          className="flex items-center gap-2 group"
        >
          <span
            className="font-serif text-xl tracking-[0.25em] text-[#1C1C1C] uppercase"
            style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
          >
            LOVE MAZE
          </span>
          <span className="w-1 h-1 rounded-full bg-[#C4917A] group-hover:scale-150 transition-transform" />
        </button>

        {/* Center links — hidden in closet, hidden mobile */}
        {currentView === "landing" && (
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs tracking-[0.2em] uppercase text-[#1C1C1C]/50 hover:text-[#1C1C1C] transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {currentView === "landing" ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEnterCloset}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#C4917A] text-[#FFFFFF] text-xs tracking-[0.15em] uppercase font-semibold rounded-none hover:bg-[#1C1C1C] transition-colors duration-300"
            >
              Enter Closet
              <ArrowRight size={12} />
            </motion.button>
          ) : (
            <button
              onClick={onBackToLanding}
              className="hidden md:flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-[#1C1C1C]/60 hover:text-[#1C1C1C] transition-colors"
            >
              <ChevronLeft size={14} /> Back to Main
            </button>
          )}

          {/* Cart */}
          <button
            onClick={onOpenCart}
            className="relative p-2 text-[#1C1C1C]/70 hover:text-[#1C1C1C] transition-colors"
          >
            <ShoppingBag size={20} strokeWidth={1.5} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C4917A] text-[#FFFFFF] text-[9px] font-bold rounded-full flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && currentView === "landing" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden backdrop-blur-md bg-white/80 border-t border-black/5"
          >
            <div className="px-5 py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-xs tracking-[0.2em] uppercase text-[#1C1C1C]/60 hover:text-[#1C1C1C] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={() => { onEnterCloset(); setMenuOpen(false); }}
                className="mt-2 py-3 bg-[#C4917A] text-[#FFFFFF] text-xs tracking-[0.15em] uppercase font-semibold"
              >
                Enter Closet
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── MAZE GRID OVERLAY (signature element) ───────────────────────────────────
function MazeOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="maze" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M0 0 H60 M0 0 V60 M60 0 V30 M0 30 H30 M30 30 V60 M0 60 H60" stroke="rgba(0,0,0,0.03)" strokeWidth="0.5" fill="none"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#maze)" />
      </svg>
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero({ onEnterCloset }) {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#FFFFFF]">
      <MazeOverlay />

      {/* Ambient gradient blob */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#C4917A]/10 blur-[120px] pointer-events-none" />

      {/* Background imagery placeholder */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF9F6]/40 via-transparent to-[#FAF9F6]" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#EAE6DF] to-transparent" />
        {/* Editorial image placeholder */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 w-[35vw] max-w-md aspect-[3/4] border border-black/5 bg-gradient-to-b from-[#EAE6DF] to-[#E3DAC9] hidden lg:block">
          <div className="absolute inset-0 flex items-end p-6">
            <span className="text-[10px] tracking-[0.3em] text-[#1C1C1C]/30 uppercase">Editorial — SS25</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="max-w-3xl"
        >
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-[11px] tracking-[0.4em] text-[#C4917A] uppercase mb-6"
          >
            Spring / Summer 2025
          </motion.p>

          <h1
            className="font-serif text-[clamp(3.5rem,9vw,8rem)] leading-[0.9] text-[#1C1C1C] mb-8 tracking-tight"
            style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
          >
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="block"
            >
              Lose yourself
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="block italic text-[#C4917A]"
            >
              in style.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="text-[#1C1C1C]/50 text-sm leading-relaxed max-w-sm mb-10 tracking-wide"
          >
            A labyrinth of considered garments — each piece a deliberate turn, every look a destination.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="flex flex-wrap items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "#1C1C1C" }}
              whileTap={{ scale: 0.98 }}
              onClick={onEnterCloset}
              className="group flex items-center gap-3 px-8 py-4 bg-[#C4917A] text-[#FFFFFF] text-xs tracking-[0.2em] uppercase font-bold transition-colors duration-300"
            >
              Enter the Maze
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <a
              href="#about"
              className="text-xs tracking-[0.2em] uppercase text-[#1C1C1C]/40 hover:text-[#1C1C1C]/70 transition-colors border-b border-black/10 pb-0.5"
            >
              Our story
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-[#1C1C1C]/30 to-transparent"
        />
        <span className="text-[9px] tracking-[0.3em] text-[#1C1C1C]/30 uppercase">Scroll</span>
      </motion.div>
    </section>
  );
}

// ─── ABOUT ────────────────────────────────────────────────────────────────────
function About() {
  return (
    <section id="about" className="bg-[#FAF9F6] py-24 md:py-36 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
          {/* Left: Typography */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[11px] tracking-[0.4em] text-[#C4917A] uppercase mb-6">About the Brand</p>
            <h2
              className="font-serif text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.1] text-[#1C1C1C] mb-8"
              style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
            >
              A labyrinth
              <br />
              <em>of style.</em>
            </h2>
            <div className="space-y-5 text-[#1C1C1C]/55 text-sm leading-[1.9]">
              <p>
                Love Maze was born from the belief that getting dressed is a form of orientation —
                a way of placing yourself in the world and declaring your direction, even when the path ahead is uncertain.
              </p>
              <p>
                We make clothes for people who are comfortable being lost. Not aimless, but exploratory.
                Each season is a new corridor, and every piece a decision point. Enter at your own pace.
              </p>
              <p className="text-[#1C1C1C]/35 text-xs tracking-wide border-l border-[#C4917A]/40 pl-4">
                — Founded in Nairobi, 2022. Worn globally.
              </p>
            </div>

            <div className="mt-12 flex gap-8">
              {[["12+", "Collections"], ["4K+", "Customers"], ["9", "Countries"]].map(([num, label]) => (
                <div key={label}>
                  <p className="font-serif text-3xl text-[#1C1C1C]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{num}</p>
                  <p className="text-[10px] tracking-[0.25em] text-[#1C1C1C]/40 uppercase mt-1">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: image grid */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { h: "h-64", bg: "from-[#EAE6DF] to-[#E3DAC9]", label: "Atelier" },
              { h: "h-40", bg: "from-[#F4EFE8] to-[#EAE6DF]", label: "Craft" },
              { h: "h-40", bg: "from-[#E3DAC9] to-[#EAE6DF]", label: "Detail" },
              { h: "h-64", bg: "from-[#EAE6DF] to-[#F4EFE8]", label: "Vision" },
            ].map(({ h, bg, label }, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4 }}
                className={`${h} bg-gradient-to-b ${bg} border border-black/5 relative overflow-hidden group`}
              >
                <MazeOverlay />
                <div className="absolute inset-0 bg-[#C4917A]/0 group-hover:bg-[#C4917A]/5 transition-colors duration-500" />
                <span className="absolute bottom-3 left-3 text-[9px] tracking-[0.3em] text-[#1C1C1C]/30 uppercase group-hover:text-[#1C1C1C]/50 transition-colors">
                  {label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── FEATURED PRODUCTS ────────────────────────────────────────────────────────
function FeaturedProducts({ products, onAddToCart, onEnterCloset }) {
  const featured = products.slice(0, 3);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedSizes, setSelectedSizes] = useState({});
  const changedIds = useStockChangeFlash(products);

  return (
    <section id="products" className="bg-[#FFFFFF] py-24 md:py-36">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4"
        >
          <div>
            <p className="text-[11px] tracking-[0.4em] text-[#C4917A] uppercase mb-3">Trending Now</p>
            <h2
              className="font-serif text-[clamp(2rem,4vw,3.5rem)] text-[#1C1C1C]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              This Season's Edit
            </h2>
          </div>
          <button
            onClick={onEnterCloset}
            className="text-xs tracking-[0.2em] uppercase text-[#1C1C1C]/40 hover:text-[#C4917A] transition-colors flex items-center gap-2"
          >
            View full collection <ArrowRight size={12} />
          </button>
        </motion.div>

        {featured.length === 0 ? (
          <div className="py-20 text-center text-[#1C1C1C]/30 text-sm tracking-wide">
            Loading the collection ✦
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-px bg-black/5">
            {featured.map((product, i) => {
              const outOfStock = isFullyOutOfStock(product);
              const activeSize = selectedSizes[product.id] || firstAvailableSize(product);

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.15 }}
                  animate={changedIds.has(product.id) ? { backgroundColor: ["#FFFFFF", "#EAE6DF", "#FFFFFF"] } : {}}
                  onHoverStart={() => setHoveredId(product.id)}
                  onHoverEnd={() => setHoveredId(null)}
                  className="relative bg-[#FFFFFF] group cursor-pointer overflow-hidden"
                >
                  {/* Product visual */}
                  <div className={`relative h-80 bg-gradient-to-b ${product.gradient || "from-[#EAE6DF] to-[#E3DAC9]"} overflow-hidden`}>
                    <MazeOverlay />
                    <motion.div
                      animate={{ scale: hoveredId === product.id ? 1.05 : 1 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-24 h-32 border border-black/10 bg-white/40 flex items-center justify-center">
                        <Sparkles size={24} className="text-[#1C1C1C]/20" />
                      </div>
                    </motion.div>

                    {/* Tag */}
                    {product.tag && (
                      <span className="absolute top-4 left-4 text-[9px] tracking-[0.3em] uppercase px-2 py-1 bg-[#FFFFFF] text-[#C4917A]">
                        {product.tag}
                      </span>
                    )}

                    {outOfStock && (
                      <span className="absolute top-4 right-4 text-[9px] tracking-[0.3em] uppercase px-2 py-1 bg-[#1C1C1C] text-[#FFFFFF]">
                        Out of Stock
                      </span>
                    )}

                    {/* Quick-add overlay */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: hoveredId === product.id ? 1 : 0, y: hoveredId === product.id ? 0 : 20 }}
                      transition={{ duration: 0.3 }}
                      className="absolute bottom-4 left-4 right-4"
                    >
                      <div className="flex gap-1 mb-2">
                        {SIZES.slice(1).map((s) => {
                          const stock = getStock(product, s);
                          const disabled = stock <= 0;
                          return (
                            <button
                              key={s}
                              disabled={disabled}
                              onClick={() => setSelectedSizes(prev => ({ ...prev, [product.id]: s }))}
                              className={`flex-1 py-1.5 text-[9px] tracking-widest uppercase transition-colors ${
                                disabled
                                  ? "bg-[#FAF9F6]/80 text-[#1C1C1C]/20 cursor-not-allowed line-through"
                                  : activeSize === s
                                    ? "bg-[#C4917A] text-[#FFFFFF]"
                                    : "bg-[#FFFFFF]/80 text-[#1C1C1C]/50 hover:text-[#1C1C1C] hover:bg-[#FFFFFF]"
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => !outOfStock && onAddToCart(product, activeSize)}
                        disabled={outOfStock}
                        style={{ opacity: outOfStock ? 0.4 : 1 }}
                        className="w-full py-3 bg-[#C4917A] text-[#FFFFFF] text-xs tracking-[0.2em] uppercase font-bold hover:bg-[#1C1C1C] transition-colors disabled:cursor-not-allowed"
                      >
                        {outOfStock ? "Out of Stock" : "Add to Bag"}
                      </button>
                    </motion.div>
                  </div>

                  {/* Product info */}
                  <div className="p-5 border-t border-black/5">
                    <p className="text-[10px] tracking-[0.25em] text-[#1C1C1C]/35 uppercase mb-1">{product.category}</p>
                    <div className="flex items-center justify-between">
                      <h3 className="text-[#1C1C1C] text-sm font-medium">{product.name}</h3>
                      <span className="text-[#C4917A] text-sm font-semibold">${product.price}</span>
                    </div>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-[#1C1C1C]/30 mt-2">
                      {outOfStock
                        ? "Currently unavailable"
                        : `${getStock(product, activeSize)} left in ${activeSize}`}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer({ onAdminLoginClick }) {
  return (
    <footer id="contact" className="bg-[#FAF9F6] border-t border-black/5 py-16">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand col */}
          <div>
            <h3
              className="font-serif text-2xl text-[#1C1C1C] tracking-[0.2em] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              LOVE MAZE
            </h3>
            <p className="text-[#1C1C1C]/40 text-xs leading-relaxed max-w-xs">
              Considered garments for the unapologetically exploratory. Nairobi-born, globally worn.
            </p>
          </div>

          {/* Navigate */}
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-[#1C1C1C]/35 mb-5">Navigate</p>
            <div className="space-y-3">
              {["New Arrivals", "Outerwear", "Tops & Tees", "Accessories", "Sale"].map((item) => (
                <p key={item} className="text-xs text-[#1C1C1C]/55 hover:text-[#1C1C1C] transition-colors cursor-pointer">{item}</p>
              ))}
            </div>
          </div>

          {/* Socials */}
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-[#1C1C1C]/35 mb-5">Find Us</p>
            <div className="flex gap-3">
              {[
                { icon: <Camera size={18} strokeWidth={1.5} />, label: "Instagram", href: "https://www.instagram.com/v_utagwa/" },
                { icon: <Globe size={18} strokeWidth={1.5} />, label: "X.com", href: "https://x.com/v_s_diaries" },
                {
                  icon: <Phone size={18} strokeWidth={1.5} />,
                  label: "WhatsApp",
                  href: `https://wa.me/254112123643?text=${encodeURIComponent("Hi Love Maze, I'm reaching out regarding...")}`,
                },
              ].map(({ icon, label, href }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, color: "#C4917A" }}
                  className="w-10 h-10 border border-black/10 flex items-center justify-center text-[#1C1C1C]/40 hover:border-[#C4917A]/50 hover:text-[#C4917A] transition-colors"
                  title={label}
                >
                  {icon}
                </motion.a>
              ))}
            </div>
            <p className="mt-6 text-[#1C1C1C]/30 text-[10px] tracking-wide">hello@lovemaze.co</p>
          </div>
        </div>

        <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-[10px] tracking-[0.2em] text-[#1C1C1C]/30 uppercase">
            © {new Date().getFullYear()} Love Maze. All rights reserved.
          </p>
          <div className="flex gap-5 items-center">
            {["Privacy", "Terms", "Returns"].map((t) => (
              <span key={t} className="text-[10px] tracking-[0.15em] uppercase text-[#1C1C1C]/30 cursor-pointer hover:text-[#1C1C1C]/60 transition-colors">{t}</span>
            ))}
            <button
              onClick={onAdminLoginClick}
              className="text-[10px] tracking-[0.15em] uppercase text-[#1C1C1C]/15 hover:text-[#C4917A] transition-colors"
              title="Store owner sign in"
            >
              ·
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── CHATBOT ──────────────────────────────────────────────────────────────────
function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Welcome to Love Maze ✦ I'm here to help with sizing, styling, or anything else. What can I guide you to?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { from: "user", text: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `You are Love Maze AI, a helpful fashion assistant for the clothing brand "Love Maze". 
          The brand is modern, minimalist, and elegant streetwear/high-fashion. You help customers with:
          - Sizing (our sizes run XS, S, M, L, XL — true to size, slight oversized fit)
          - Styling advice
          - Product questions (we carry Tops, Outerwear, Bottoms, Accessories — prices $65-$340)
          - Shipping (free over $200, 3-5 business days locally, 7-14 internationally)
          - Returns (30-day policy)
          Keep responses concise, warm, and on-brand. Use ✦ occasionally as a brand flourish.`,
          messages: [
            ...messages.filter(m => m.from !== "system").map(m => ({
              role: m.from === "user" ? "user" : "assistant",
              content: m.text,
            })),
            { role: "user", content: userMsg },
          ],
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "I'll find that out for you — one moment ✦";
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { from: "bot", text: "Connection lost — try again in a moment ✦" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#C4917A] text-[#FFFFFF] flex items-center justify-center shadow-lg"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={18} />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={18} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-[#FFFFFF] border border-black/10 shadow-2xl flex flex-col"
            style={{ maxHeight: "420px" }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-[#1C1C1C]">Love Maze AI</p>
                <p className="text-[10px] text-[#C4917A] tracking-wide">✦ Online — ask me anything</p>
              </div>
              <Sparkles size={14} className="text-[#C4917A]/60" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "280px" }}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                      msg.from === "user"
                        ? "bg-[#C4917A] text-[#FFFFFF] font-medium"
                        : "bg-[#FAF9F6] text-[#1C1C1C]/80 border border-black/5"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-1 pl-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-[#C4917A]"
                    />
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-black/5 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about sizing..."
                className="flex-1 bg-[#FAF9F6] border border-black/10 px-3 py-2 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="w-9 h-9 bg-[#C4917A] text-[#FFFFFF] flex items-center justify-center hover:bg-[#1C1C1C] transition-colors disabled:opacity-40"
              >
                <Send size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── CLOSET VIEW ─────────────────────────────────────────────────────────────
function ClosetView({ products, onAddToCart, onBackToLanding }) {
  const [selectedSizes, setSelectedSizes] = useState({});
  const scrollRef = useRef(null);
  const changedIds = useStockChangeFlash(products);

  const categories = ["All", "Tops", "Outerwear", "Bottoms", "Accessories"];
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-[#FFFFFF] pt-20"
    >
      {/* Closet header */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#1C1C1C]/40 hover:text-[#C4917A] transition-colors mb-6"
            >
              <ChevronLeft size={14} /> Back to Main
            </button>
            <h1
              className="font-serif text-[clamp(2.5rem,5vw,4rem)] text-[#1C1C1C]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              The Closet
            </h1>
            <p className="text-[#1C1C1C]/35 text-xs tracking-wide mt-2">SS25 — {products.length} pieces</p>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-[10px] tracking-[0.25em] uppercase transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-[#C4917A] text-[#FFFFFF] font-bold"
                  : "border border-black/10 text-[#1C1C1C]/40 hover:border-black/30 hover:text-[#1C1C1C]/70"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal scroll closet — digital clothing rack */}
      <div
        ref={scrollRef}
        className="overflow-x-scroll scrollbar-none whitespace-nowrap snap-x snap-mandatory pb-12 px-5 md:px-8"
        style={{ scrollPaddingLeft: "1.25rem" }}
      >
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-[#1C1C1C]/30 text-sm tracking-wide w-full">
            Loading the closet ✦
          </div>
        ) : (
          <div className="inline-flex gap-4">
            {filtered.map((product, i) => {
              const outOfStock = isFullyOutOfStock(product);
              const activeSize = selectedSizes[product.id] || firstAvailableSize(product);

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={
                    changedIds.has(product.id)
                      ? { opacity: 1, x: 0, backgroundColor: ["#FFFFFF", "#EAE6DF", "#FFFFFF"] }
                      : { opacity: 1, x: 0 }
                  }
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                  className="inline-block align-top whitespace-normal snap-start w-72 bg-[#FFFFFF] border border-black/5 flex-shrink-0 group"
                >                  {/* Image */}
                  <div className={`relative h-80 bg-gradient-to-b ${product.gradient || "from-[#EAE6DF] to-[#E3DAC9]"} overflow-hidden`}>
                    <MazeOverlay />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-32 border border-black/10 bg-white/40 flex items-center justify-center">
                        <Sparkles size={22} className="text-[#1C1C1C]/20" />
                      </div>
                    </div>
                    {product.tag && (
                      <span className="absolute top-3 left-3 text-[9px] tracking-[0.3em] uppercase px-2 py-1 bg-[#FFFFFF]/90 text-[#C4917A]">
                        {product.tag}
                      </span>
                    )}
                    <span className="absolute top-3 right-3 text-[9px] tracking-[0.2em] uppercase px-2 py-1 bg-[#FFFFFF]/70 text-[#1C1C1C]/50">
                      {product.category}
                    </span>
                    {outOfStock && (
                      <span className="absolute bottom-3 left-3 text-[9px] tracking-[0.3em] uppercase px-2 py-1 bg-[#1C1C1C] text-[#FFFFFF]">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-[#1C1C1C] text-sm leading-snug pr-2">{product.name}</h3>
                      <span className="text-[#C4917A] font-semibold text-sm flex-shrink-0">${product.price}</span>
                    </div>

                    {/* Size selector */}
                    <p className="text-[9px] tracking-[0.3em] uppercase text-[#1C1C1C]/30 mb-2">Size</p>
                    <div className="flex gap-1 mb-2">
                      {SIZES.map((s) => {
                        const stock = getStock(product, s);
                        const disabled = stock <= 0;
                        return (
                          <button
                            key={s}
                            disabled={disabled}
                            onClick={() => setSelectedSizes((prev) => ({ ...prev, [product.id]: s }))}
                            className={`flex-1 py-2 text-[9px] tracking-wider uppercase transition-all duration-200 ${
                              disabled
                                ? "border border-black/5 text-[#1C1C1C]/15 cursor-not-allowed line-through"
                                : activeSize === s
                                  ? "bg-[#C4917A] text-[#FFFFFF] font-bold"
                                  : "border border-black/10 text-[#1C1C1C]/40 hover:border-[#C4917A]/50 hover:text-[#1C1C1C]/80"
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-[#1C1C1C]/30 mb-4">
                      {outOfStock
                        ? "Currently unavailable"
                        : `${getStock(product, activeSize)} in stock — ${activeSize}`}
                    </p>

                    <motion.button
                      whileHover={{ scale: outOfStock ? 1 : 1.01 }}
                      whileTap={{ scale: outOfStock ? 1 : 0.98 }}
                      onClick={() => !outOfStock && onAddToCart(product, activeSize)}
                      disabled={outOfStock}
                      style={{ opacity: outOfStock ? 0.4 : 1 }}
                      className="w-full py-3 bg-[#FAF9F6] border border-black/10 text-[#1C1C1C]/70 text-xs tracking-[0.2em] uppercase hover:bg-[#C4917A] hover:text-[#FFFFFF] hover:border-[#C4917A] transition-all duration-300 font-medium disabled:cursor-not-allowed disabled:hover:bg-[#FAF9F6] disabled:hover:text-[#1C1C1C]/70 disabled:hover:border-black/10"
                    >
                      {outOfStock ? "Out of Stock" : "Add to Closet Bag"}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── CART DRAWER ──────────────────────────────────────────────────────────────
function CartDrawer({ cart, isOpen, onClose, onUpdateQty, onRemove }) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [form, setForm] = useState({ name: "", address: "", email: "", card: "", expiry: "", cvv: "" });

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shipping = subtotal > 200 ? 0 : 15;
  const total = subtotal + shipping;

  const handleOrder = async () => {
    setOrderError("");
    setSubmitting(true);
    try {
      await placeOrder({
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          size: item.size,
          qty: item.qty,
          price: item.price,
        })),
        customer: {
          name: form.name,
          email: form.email,
          address: form.address,
        },
        payment: {
          card: form.card,
          expiry: form.expiry,
          cvv: form.cvv,
        },
        subtotal,
        shipping,
        total,
      });

      setOrderPlaced(true);
      setTimeout(() => {
        setOrderPlaced(false);
        setCheckoutOpen(false);
        onClose();
      }, 3500);
    } catch (err) {
      if (err?.message === "OUT_OF_STOCK" || err?.code === "OUT_OF_STOCK") {
        setOrderError("One or more items in your bag just sold out. Please update your bag and try again.");
      } else {
        setOrderError("Something went wrong placing your order. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#FFFFFF] border-l border-black/5 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-[#1C1C1C]">Your Bag</p>
                <p className="text-[10px] text-[#1C1C1C]/35 mt-0.5">{cart.length} item{cart.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={onClose} className="p-2 text-[#1C1C1C]/40 hover:text-[#1C1C1C] transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <ShoppingBag size={32} className="text-[#1C1C1C]/10 mb-4" />
                  <p className="text-[#1C1C1C]/35 text-sm">Your bag is empty</p>
                  <p className="text-[#1C1C1C]/20 text-xs mt-1">Explore the collection to find your next piece</p>
                </div>
              ) : (
                cart.map((item) => (
                  <motion.div
                    key={`${item.id}-${item.size}`}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-4 py-4 border-b border-black/5"
                  >
                    <div className={`w-16 h-20 bg-gradient-to-b ${item.gradient || "from-[#EAE6DF] to-[#E3DAC9]"} flex-shrink-0 flex items-center justify-center`}>
                      <Sparkles size={14} className="text-[#1C1C1C]/20" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1C1C1C] text-xs font-medium leading-snug">{item.name}</p>
                      <p className="text-[#1C1C1C]/35 text-[10px] mt-0.5 uppercase tracking-wider">Size: {item.size}</p>
                      <p className="text-[#C4917A] text-xs font-semibold mt-2">${item.price}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button onClick={() => onRemove(item.id, item.size)} className="text-[#1C1C1C]/25 hover:text-[#1C1C1C]/70 transition-colors">
                        <X size={12} />
                      </button>
                      <div className="flex items-center gap-2 border border-black/10">
                        <button
                          onClick={() => onUpdateQty(item.id, item.size, -1)}
                          className="w-6 h-6 flex items-center justify-center text-[#1C1C1C]/40 hover:text-[#1C1C1C] transition-colors"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-xs text-[#1C1C1C] w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => onUpdateQty(item.id, item.size, 1)}
                          className="w-6 h-6 flex items-center justify-center text-[#1C1C1C]/40 hover:text-[#1C1C1C] transition-colors"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Summary + CTA */}
            {cart.length > 0 && (
              <div className="px-6 py-5 border-t border-black/5 space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#1C1C1C]/45">
                    <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#1C1C1C]/45">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? <span className="text-[#C4917A]">Free</span> : `$${shipping}`}</span>
                  </div>
                  <div className="flex justify-between text-[#1C1C1C] font-semibold border-t border-black/5 pt-2 mt-2">
                    <span>Total</span><span>${total.toFixed(2)}</span>
                  </div>
                </div>
                {subtotal < 200 && (
                  <p className="text-[10px] text-[#C4917A]/80 text-center tracking-wide">
                    Add ${(200 - subtotal).toFixed(0)} more for free shipping ✦
                  </p>
                )}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCheckoutOpen(true)}
                  className="w-full py-4 bg-[#C4917A] text-[#FFFFFF] text-xs tracking-[0.2em] uppercase font-bold hover:bg-[#1C1C1C] transition-colors flex items-center justify-center gap-2"
                >
                  Proceed to Checkout <ArrowRight size={12} />
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#FFFFFF] border border-black/10 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {orderPlaced ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-12 text-center"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-16 h-16 bg-[#C4917A]/10 border border-[#C4917A]/30 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircle size={28} className="text-[#C4917A]" />
                  </motion.div>
                  <h3 className="font-serif text-2xl text-[#1C1C1C] mb-3" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                    Order Placed ✦
                  </h3>
                  <p className="text-[#1C1C1C]/45 text-sm">You'll receive a confirmation shortly. Thank you for shopping Love Maze.</p>
                </motion.div>
              ) : (
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3
                      className="font-serif text-2xl text-[#1C1C1C]"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      Checkout
                    </h3>
                    <button onClick={() => setCheckoutOpen(false)} className="text-[#1C1C1C]/30 hover:text-[#1C1C1C]/70 transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Shipping */}
                    <div>
                      <p className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#C4917A] mb-4">
                        <Truck size={12} /> Shipping Details
                      </p>
                      <div className="space-y-3">
                        {[
                          { key: "name", placeholder: "Full name" },
                          { key: "email", placeholder: "Email address" },
                          { key: "address", placeholder: "Shipping address" },
                        ].map(({ key, placeholder }) => (
                          <input
                            key={key}
                            value={form[key]}
                            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors tracking-wide"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Payment */}
                    <div>
                      <p className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#C4917A] mb-4">
                        <CreditCard size={12} /> Payment
                      </p>
                      <div className="space-y-3">
                        <input
                          value={form.card}
                          onChange={(e) => setForm((f) => ({ ...f, card: e.target.value }))}
                          placeholder="Card number"
                          className="w-full bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors tracking-wide"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            value={form.expiry}
                            onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
                            placeholder="MM / YY"
                            className="bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors"
                          />
                          <input
                            value={form.cvv}
                            onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value }))}
                            placeholder="CVV"
                            className="bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Order summary line */}
                    <div className="bg-[#FAF9F6] px-4 py-3 border border-black/5 flex justify-between items-center">
                      <span className="text-[10px] tracking-[0.2em] uppercase text-[#1C1C1C]/40">Total due</span>
                      <span className="text-[#C4917A] font-semibold">${total.toFixed(2)}</span>
                    </div>

                    {orderError && (
                      <div className="bg-[#C4917A]/10 border border-[#C4917A]/30 px-4 py-3 text-xs text-[#1C1C1C]/70 tracking-wide">
                        {orderError}
                      </div>
                    )}

                    <motion.button
                      whileHover={{ scale: submitting ? 1 : 1.01 }}
                      whileTap={{ scale: submitting ? 1 : 0.98 }}
                      onClick={handleOrder}
                      disabled={submitting}
                      className="w-full py-4 bg-[#C4917A] text-[#FFFFFF] text-xs tracking-[0.2em] uppercase font-bold hover:bg-[#1C1C1C] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Processing
                        </>
                      ) : (
                        `Place Order — $${total.toFixed(2)}`
                      )}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({ onBackToLanding, onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const session = await signInAdmin(email, password);
      onSignedIn(session.session || session);
    } catch (err) {
      if (err?.code === "UNAUTHORIZED") {
        setError("This account doesn't have store owner access.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#FAF9F6] pt-32 pb-20 flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm bg-[#FFFFFF] border border-black/5 p-8"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[#EAE6DF] flex items-center justify-center mb-4">
            <Lock size={18} className="text-[#C4917A]" />
          </div>
          <h1
            className="font-serif text-3xl text-[#1C1C1C]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Store Owner Sign In
          </h1>
          <p className="text-[#1C1C1C]/40 text-xs tracking-wide mt-2">
            Manage inventory, uploads, and orders for Love Maze.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors tracking-wide"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors tracking-wide"
          />

          {error && (
            <div className="flex items-start gap-2 bg-[#EAE6DF]/60 border border-[#C4917A]/20 px-3 py-2 text-[11px] text-[#1C1C1C]/70 tracking-wide">
              <AlertCircle size={13} className="text-[#C4917A] flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <motion.button
            whileHover={{ scale: submitting ? 1 : 1.01 }}
            whileTap={{ scale: submitting ? 1 : 0.98 }}
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#C4917A] text-[#FFFFFF] text-xs tracking-[0.2em] uppercase font-bold hover:bg-[#1C1C1C] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Signing In
              </>
            ) : (
              "Sign In"
            )}
          </motion.button>
        </form>

        <button
          onClick={onBackToLanding}
          className="w-full mt-6 flex items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[#1C1C1C]/35 hover:text-[#1C1C1C] transition-colors"
        >
          <ChevronLeft size={12} /> Back to Store
        </button>
      </motion.div>
    </section>
  );
}


// ─── ADMIN: UPLOAD NEW COLLECTION ITEM ────────────────────────────────────────
function UploadItemTab() {
  const initialStock = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Tops",
    tag: "",
  });
  const [stock, setStock] = useState(initialStock);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "success" | "error", message: string }

  const categories = ["Tops", "Outerwear", "Bottoms", "Accessories"];

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const adjustStock = (size, delta) => {
    setStock((prev) => ({ ...prev, [size]: Math.max(0, (prev[size] || 0) + delta) }));
  };

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", category: "Tops", tag: "" });
    setStock(initialStock);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!form.name.trim() || !form.price) {
      setFeedback({ type: "error", message: "Title and price are required." });
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }

      await addProduct({
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category: form.category,
        tag: form.tag.trim(),
        imageUrl,
        stock,
      });

      setFeedback({ type: "success", message: "Item added to the collection ✦" });
      resetForm();
    } catch (err) {
      console.error("Failed to add product:", err);
      setFeedback({ type: "error", message: "Something went wrong while saving this item. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <p className="text-[11px] tracking-[0.4em] text-[#C4917A] uppercase mb-2">New Arrival</p>
      <h2
        className="font-serif text-3xl text-[#1C1C1C] mb-8"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
      >
        Upload New Collection Item
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title + Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.3em] uppercase text-[#1C1C1C]/40 mb-2">Title</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Dusk Cropped Knit"
              className="w-full bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.3em] uppercase text-[#1C1C1C]/40 mb-2">Price (Kes)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="120.00"
              className="w-full bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[9px] tracking-[0.3em] uppercase text-[#1C1C1C]/40 mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="A short, evocative description of the piece..."
            rows={3}
            className="w-full bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors resize-none"
          />
        </div>

        {/* Category + Tag */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] tracking-[0.3em] uppercase text-[#1C1C1C]/40 mb-2">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] outline-none focus:border-[#C4917A]/50 transition-colors"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.3em] uppercase text-[#1C1C1C]/40 mb-2">Tag (optional)</label>
            <input
              value={form.tag}
              onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value.toUpperCase() }))}
              placeholder="NEW, BESTSELLER, LIMITED..."
              className="w-full bg-[#FAF9F6] border border-black/10 px-4 py-3 text-xs text-[#1C1C1C] placeholder-[#1C1C1C]/30 outline-none focus:border-[#C4917A]/50 transition-colors uppercase"
            />
          </div>
        </div>

        {/* Size + stock counters */}
        <div>
          <label className="block text-[9px] tracking-[0.3em] uppercase text-[#1C1C1C]/40 mb-3">Stock per Size</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["XS", "S", "M", "L", "XL"].map((size) => (
              <div key={size} className="border border-black/10 px-3 py-3 flex flex-col items-center gap-2 bg-[#FAF9F6]">
                <span className="text-[10px] tracking-[0.25em] uppercase text-[#1C1C1C]/50">{size}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustStock(size, -1)}
                    className="w-6 h-6 flex items-center justify-center border border-black/10 text-[#1C1C1C]/50 hover:text-[#1C1C1C] hover:border-[#C4917A]/50 transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-sm text-[#1C1C1C] w-6 text-center font-medium">{stock[size]}</span>
                  <button
                    type="button"
                    onClick={() => adjustStock(size, 1)}
                    className="w-6 h-6 flex items-center justify-center border border-black/10 text-[#1C1C1C]/50 hover:text-[#1C1C1C] hover:border-[#C4917A]/50 transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-[9px] tracking-[0.3em] uppercase text-[#1C1C1C]/40 mb-3">Product Image</label>
          <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-black/15 bg-[#FAF9F6] py-10 cursor-pointer hover:border-[#C4917A]/50 transition-colors">
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-32 object-cover border border-black/10" />
            ) : (
              <>
                <UploadCloud size={22} className="text-[#C4917A]" />
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#1C1C1C]/40">Click to upload an image</span>
              </>
            )}
          </label>
        </div>

        {feedback && (
          <div
            className={`px-4 py-3 text-xs tracking-wide border ${
              feedback.type === "success"
                ? "bg-[#E3DAC9]/40 border-[#C4917A]/30 text-[#1C1C1C]/70"
                : "bg-[#EAE6DF]/60 border-[#C4917A]/20 text-[#1C1C1C]/70"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <motion.button
          whileHover={{ scale: submitting ? 1 : 1.01 }}
          whileTap={{ scale: submitting ? 1 : 0.98 }}
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-[#C4917A] text-[#FFFFFF] text-xs tracking-[0.2em] uppercase font-bold hover:bg-[#1C1C1C] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving
            </>
          ) : (
            <>
              <PackagePlus size={14} /> Add to Collection
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}

// ─── ADMIN: LIVE PRODUCT INVENTORY TABLE ──────────────────────────────────────
function InventoryTab({ products }) {
  const [editingId, setEditingId] = useState(null);
  const [editStock, setEditStock] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const startEditing = (product) => {
    setEditingId(product.id);
    setEditStock({ ...(product.stock || {}) });
    setFeedback(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditStock({});
  };

  const adjustEditStock = (size, delta) => {
    setEditStock((prev) => ({ ...prev, [size]: Math.max(0, (prev[size] || 0) + delta) }));
  };

  const saveStock = async (productId) => {
    setSavingId(productId);
    setFeedback(null);
    try {
      await updateProductStock(productId, editStock);
      setFeedback({ type: "success", message: "Inventory updated ✦" });
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update stock:", err);
      setFeedback({ type: "error", message: "Couldn't update inventory. Please try again." });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <p className="text-[11px] tracking-[0.4em] text-[#C4917A] uppercase mb-2">Real-Time</p>
      <h2
        className="font-serif text-3xl text-[#1C1C1C] mb-2"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
      >
        Live Product Inventory
      </h2>
      <p className="text-[#1C1C1C]/40 text-xs tracking-wide mb-8">
        {products.length} item{products.length !== 1 ? "s" : ""} in the collection — updates sync instantly across the storefront.
      </p>

      {feedback && (
        <div
          className={`mb-4 px-4 py-3 text-xs tracking-wide border ${
            feedback.type === "success"
              ? "bg-[#E3DAC9]/40 border-[#C4917A]/30 text-[#1C1C1C]/70"
              : "bg-[#EAE6DF]/60 border-[#C4917A]/20 text-[#1C1C1C]/70"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {products.length === 0 ? (
        <div className="py-16 text-center text-[#1C1C1C]/30 text-sm tracking-wide">No products yet ✦</div>
      ) : (
        <div className="overflow-x-auto border border-black/5">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead>
              <tr className="bg-[#FAF9F6] border-b border-black/5">
                <th className="px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-[#1C1C1C]/40 font-medium">Item</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-[#1C1C1C]/40 font-medium">Category</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-[#1C1C1C]/40 font-medium">Price</th>
                {SIZES.map((s) => (
                  <th key={s} className="px-3 py-3 text-[9px] tracking-[0.25em] uppercase text-[#1C1C1C]/40 font-medium text-center">{s}</th>
                ))}
                <th className="px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-[#1C1C1C]/40 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isEditing = editingId === product.id;
                const stockSource = isEditing ? editStock : product.stock || {};

                return (
                  <tr key={product.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 text-[#1C1C1C] font-medium whitespace-nowrap">{product.name}</td>
                    <td className="px-4 py-3 text-[#1C1C1C]/50 whitespace-nowrap">{product.category}</td>
                    <td className="px-4 py-3 text-[#C4917A] font-semibold whitespace-nowrap">${product.price}</td>
                    {SIZES.map((s) => {
                      const value = stockSource[s] ?? 0;
                      const outOfStock = value <= 0;
                      return (
                        <td key={s} className="px-3 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => adjustEditStock(s, -1)}
                                className="w-5 h-5 flex items-center justify-center border border-black/10 text-[#1C1C1C]/50 hover:border-[#C4917A]/50 transition-colors"
                              >
                                <Minus size={9} />
                              </button>
                              <span className="w-6 text-center text-[#1C1C1C]">{value}</span>
                              <button
                                type="button"
                                onClick={() => adjustEditStock(s, 1)}
                                className="w-5 h-5 flex items-center justify-center border border-black/10 text-[#1C1C1C]/50 hover:border-[#C4917A]/50 transition-colors"
                              >
                                <Plus size={9} />
                              </button>
                            </div>
                          ) : outOfStock ? (
                            <span className="inline-block px-2 py-1 text-[9px] tracking-[0.15em] uppercase bg-[#EAE6DF] text-[#C4917A] border border-[#C4917A]/20">
                              Out
                            </span>
                          ) : (
                            <span className="text-[#1C1C1C]">{value}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveStock(product.id)}
                            disabled={savingId === product.id}
                            className="px-3 py-1.5 bg-[#C4917A] text-[#FFFFFF] text-[9px] tracking-[0.2em] uppercase font-bold hover:bg-[#1C1C1C] transition-colors disabled:opacity-60"
                          >
                            {savingId === product.id ? "Saving" : "Save"}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1.5 border border-black/10 text-[#1C1C1C]/50 text-[9px] tracking-[0.2em] uppercase hover:text-[#1C1C1C] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(product)}
                          className="px-3 py-1.5 border border-black/10 text-[#1C1C1C]/60 text-[9px] tracking-[0.2em] uppercase hover:border-[#C4917A]/50 hover:text-[#C4917A] transition-colors"
                        >
                          Edit Stock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: ORDER HISTORY LOGS ────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchOrders();
        setOrders(data || []);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
        setError("Couldn't load order history. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totalRevenue = orders.reduce((acc, order) => acc + (order.total || 0), 0);

  return (
    <div>
      <p className="text-[11px] tracking-[0.4em] text-[#C4917A] uppercase mb-2">Checkout Activity</p>
      <h2
        className="font-serif text-3xl text-[#1C1C1C] mb-2"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
      >
        Order History Logs
      </h2>
      <p className="text-[#1C1C1C]/40 text-xs tracking-wide mb-8">
        {orders.length} recent order{orders.length !== 1 ? "s" : ""} — ${totalRevenue.toFixed(2)} in tracked revenue.
      </p>

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-[#1C1C1C]/30 text-sm tracking-wide">
          <Loader2 size={16} className="animate-spin" /> Loading orders
        </div>
      ) : error ? (
        <div className="py-8 px-4 bg-[#EAE6DF]/60 border border-[#C4917A]/20 text-xs text-[#1C1C1C]/70 tracking-wide">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center text-[#1C1C1C]/30 text-sm tracking-wide">No orders yet ✦</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-black/5 bg-[#FFFFFF]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-5 py-4 border-b border-black/5 bg-[#FAF9F6]">
                <div>
                  <p className="text-xs text-[#1C1C1C] font-medium">{order.customer?.name || "Guest"}</p>
                  <p className="text-[10px] text-[#1C1C1C]/40 mt-0.5">{order.customer?.email}</p>
                  <p className="text-[10px] text-[#1C1C1C]/40 mt-0.5">{order.customer?.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] tracking-[0.25em] uppercase text-[#1C1C1C]/30">
                    {order.created_at ? new Date(order.created_at).toLocaleString() : ""}
                  </p>
                  <p className="text-[#C4917A] font-semibold text-sm mt-1">${(order.total || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-[#1C1C1C]/70">
                      {item.name} <span className="text-[#1C1C1C]/30 uppercase text-[10px]">({item.size}) × {item.qty}</span>
                    </span>
                    <span className="text-[#1C1C1C]/60">${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs pt-2 mt-2 border-t border-black/5 text-[#1C1C1C]/50">
                  <span>Subtotal</span>
                  <span>${(order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#1C1C1C]/50">
                  <span>Shipping</span>
                  <span>{order.shipping === 0 ? <span className="text-[#C4917A]">Free</span> : `$${(order.shipping || 0).toFixed(2)}`}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-[#1C1C1C] pt-1">
                  <span>Total</span>
                  <span>${(order.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard({ products, onBackToLanding, onSignOut }) {
  const [activeTab, setActiveTab] = useState("upload");

  const tabs = [
    { id: "upload", label: "Upload New Item", icon: PackagePlus },
    { id: "inventory", label: "Live Inventory", icon: ClipboardList },
    { id: "orders", label: "Order History", icon: Receipt },
  ];

  return (
    <section className="min-h-screen bg-[#FAF9F6] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[11px] tracking-[0.4em] text-[#C4917A] uppercase mb-3">Store Owner</p>
            <h1
              className="font-serif text-[clamp(2rem,4vw,3.5rem)] text-[#1C1C1C]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[#1C1C1C]/40 hover:text-[#1C1C1C] transition-colors"
            >
              <ChevronLeft size={12} /> View Store
            </button>
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 px-4 py-2 border border-black/10 text-[10px] tracking-[0.2em] uppercase text-[#1C1C1C]/60 hover:border-[#C4917A]/50 hover:text-[#C4917A] transition-colors"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-10 border-b border-black/5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-[10px] tracking-[0.25em] uppercase transition-colors border-b-2 ${
                activeTab === id
                  ? "border-[#C4917A] text-[#1C1C1C] font-bold"
                  : "border-transparent text-[#1C1C1C]/40 hover:text-[#1C1C1C]/70"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-[#FFFFFF] border border-black/5 p-6 md:p-10">
          {activeTab === "upload" && <UploadItemTab />}
          {activeTab === "inventory" && <InventoryTab products={products} />}
          {activeTab === "orders" && <OrdersTab />}
        </div>
      </div>
    </section>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [currentView, setCurrentView] = useState("landing");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [adminSession, setAdminSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

  // Initial admin session check + auth state subscription
  useEffect(() => {
    let unsubscribeAuth;

    const checkSession = async () => {
      try {
        const session = await getAdminSession();
        setAdminSession(session);
      } catch (err) {
        console.error("Failed to check admin session:", err);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();

    try {
      unsubscribeAuth = onAdminAuthStateChange((session) => {
        setAdminSession(session);
      });
    } catch (err) {
      console.error("Failed to subscribe to auth state:", err);
    }

    return () => {
      if (typeof unsubscribeAuth === "function") unsubscribeAuth();
    };
  }, []);

  // Initial fetch + real-time subscription for inventory updates
  useEffect(() => {
    let unsubscribe;

    const load = async () => {
      try {
        const data = await fetchProducts();
        setProducts(data || []);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };

    load();

    try {
      unsubscribe = subscribeToProducts((updatedProducts) => {
        setProducts(updatedProducts || []);
      });
    } catch (err) {
      console.error("Failed to subscribe to product updates:", err);
    }

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const handleAddToCart = (product, size) => {
    const stock = getStock(product, size);
    if (stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id && i.size === size);
      if (existing) {
        return prev.map((i) => i.id === product.id && i.size === size ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, size, qty: 1 }];
    });
    setCartOpen(true);
  };

  const handleUpdateQty = (id, size, delta) => {
    setCart((prev) =>
      prev.map((i) => i.id === id && i.size === size ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  };

  const handleRemove = (id, size) => {
    setCart((prev) => prev.filter((i) => !(i.id === id && i.size === size)));
  };

  const enterCloset = () => {
    setCurrentView("closet");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToLanding = () => {
    setCurrentView("landing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAdminLogin = () => {
    setCurrentView("admin-login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdminSignedIn = (session) => {
    setAdminSession(session);
    setCurrentView("admin-dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdminSignOut = async () => {
    try {
      await signOutAdmin();
    } catch (err) {
      console.error("Failed to sign out:", err);
    } finally {
      setAdminSession(null);
      setCurrentView("landing");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-[#FFFFFF] min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Google Font loader */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #FAF9F6; }
        ::-webkit-scrollbar-thumb { background: #C4917A; }
        * { box-sizing: border-box; }
        .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>

      <Navbar
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onEnterCloset={enterCloset}
        currentView={currentView}
        onBackToLanding={backToLanding}
      />

      <AnimatePresence mode="wait">
        {currentView === "landing" && (
          <motion.main
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Hero onEnterCloset={enterCloset} />
            <About />
            <FeaturedProducts products={products} onAddToCart={handleAddToCart} onEnterCloset={enterCloset} />
            <Footer onAdminLoginClick={openAdminLogin} />
          </motion.main>
        )}

        {currentView === "closet" && (
          <motion.main
            key="closet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ClosetView products={products} onAddToCart={handleAddToCart} onBackToLanding={backToLanding} />
          </motion.main>
        )}

        {currentView === "admin-login" && (
          <motion.main
            key="admin-login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AdminLogin
              onBackToLanding={backToLanding}
              onSignedIn={handleAdminSignedIn}
            />
          </motion.main>
        )}

        {currentView === "admin-dashboard" && (
          <motion.main
            key="admin-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {checkingSession ? (
              <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
                <Loader2 size={24} className="animate-spin text-[#C4917A]" />
              </div>
            ) : adminSession ? (
              <AdminDashboard
                products={products}
                onBackToLanding={backToLanding}
                onSignOut={handleAdminSignOut}
              />
            ) : (
              <AdminLogin
                onBackToLanding={backToLanding}
                onSignedIn={handleAdminSignedIn}
              />
            )}
          </motion.main>
        )}
      </AnimatePresence>

      <CartDrawer
        cart={cart}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemove={handleRemove}
      />

      <Chatbot />
    </div>
  );
}