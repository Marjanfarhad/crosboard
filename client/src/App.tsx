import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

type ProductColor = "lime" | "cream" | "orange";
type Range = "7D" | "30D" | "MTD";

type Product = {
  id: number;
  name: string;
  type: string;
  revenue: string;
  trend: string;
  color: ProductColor;
  note: string;
};

type ToastItem = { id: number; message: string; tone: "default" | "success" };

const navItems: { label: string; icon: LucideIcon }[] = [
  { label: "Command", icon: LayoutDashboard },
  { label: "Products", icon: FolderKanban },
  { label: "Studio", icon: Radio },
  { label: "Performance", icon: BarChart3 },
  { label: "Analyst", icon: Gauge },
];

const initialProducts: Product[] = [
  {
    id: 1,
    name: "Redneck Wine Club",
    type: "Subscription",
    revenue: "$4,820",
    trend: "+24%",
    color: "lime",
    note: "Offer is converting above baseline",
  },
  {
    id: 2,
    name: "Signal Notes",
    type: "Digital product",
    revenue: "$2,140",
    trend: "+11%",
    color: "cream",
    note: "7 sales since yesterday",
  },
  {
    id: 3,
    name: "One-Hour Offer",
    type: "Cohort",
    revenue: "$1,860",
    trend: "+8%",
    color: "orange",
    note: "Next cohort opens Friday",
  },
];

const baseBars = [
  { label: "M", value: 48, amount: "$8.2k" },
  { label: "T", value: 66, amount: "$9.8k" },
  { label: "W", value: 58, amount: "$9.1k" },
  { label: "T", value: 82, amount: "$11.7k" },
  { label: "F", value: 72, amount: "$10.3k" },
  { label: "S", value: 92, amount: "$12.8k" },
  { label: "S", value: 76, amount: "$11.4k" },
];

const moves = [
  "Share the wine club waitlist update",
  "Turn Monday’s post into a paid note",
  "Set Friday’s cohort reminder",
];

function Metric({ label, value, change, detail }: { label: string; value: string; change: string; detail: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value-row">
        <span className="metric-value">{value}</span>
        <span className="trend-pill">{change}</span>
      </div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}

function ProductCard({ product, index, onMore }: { product: Product; index: number; onMore: () => void }) {
  return (
    <article className={`product-card product-${product.color}`}>
      <div className="product-card-top">
        <span className="product-index">0{index + 1}</span>
        <button className="icon-button subtle" aria-label={`More options for ${product.name}`} onClick={onMore}>
          <MoreHorizontal size={17} />
        </button>
      </div>
      <div className="product-orb"><Sparkles size={19} /></div>
      <div className="product-type">{product.type}</div>
      <h3>{product.name}</h3>
      <p>{product.note}</p>
      <div className="product-card-bottom">
        <strong>{product.revenue}</strong>
        <span>{product.trend}</span>
      </div>
    </article>
  );
}

function RangeToggle({ range, onChange }: { range: Range; onChange: (range: Range) => void }) {
  return (
    <div className="range-toggle" aria-label="Chart range">
      {(["7D", "30D", "MTD"] as Range[]).map((item) => (
        <button key={item} className={range === item ? "selected" : ""} onClick={() => onChange(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <button key={toast.id} className={`toast toast-${toast.tone}`} onClick={() => onDismiss(toast.id)}>
          <span className="toast-mark">{toast.tone === "success" ? <Check size={13} /> : <Zap size={13} />}</span>
          {toast.message}
          <X size={13} />
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState("Command");
  const [range, setRange] = useState<Range>("7D");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [doneMoves, setDoneMoves] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [newProduct, setNewProduct] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const pushToast = (message: string, tone: ToastItem["tone"] = "default") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3400);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setShowAdd(false);
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const bars = useMemo(() => {
    if (range === "30D") return baseBars.map((bar, index) => ({ ...bar, value: Math.min(96, bar.value + (index % 2 ? 9 : 3)), amount: index === 5 ? "$48.4k" : bar.amount }));
    if (range === "MTD") return baseBars.map((bar, index) => ({ ...bar, value: Math.min(98, bar.value + (index > 3 ? 10 : 4)), amount: index === 5 ? "$36.8k" : bar.amount }));
    return baseBars;
  }, [range]);

  const pace = range === "7D" ? "$12,840" : range === "30D" ? "$48,400" : "$36,800";
  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const selectNav = (label: string) => {
    setActiveNav(label);
    setShowMobileNav(false);
    pushToast(`${label} view selected`);
  };

  const addProduct = () => {
    const title = newProduct.trim();
    if (!title) {
      pushToast("Give the product a working title first.");
      return;
    }
    setProducts((current) => [
      ...current,
      { id: Date.now(), name: title, type: "New concept", revenue: "$0", trend: "draft", color: "cream", note: "Ready for your first signal" },
    ]);
    setNewProduct("");
    setShowAdd(false);
    pushToast("Product added to your command board.", "success");
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${showMobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span>c</span></div>
          <div><div className="brand-name">CROS</div><div className="brand-sub">Creator Revenue OS</div></div>
          <button className="mobile-close icon-button subtle" aria-label="Close navigation" onClick={() => setShowMobileNav(false)}><X size={17} /></button>
        </div>
        <button className="workspace-switcher" onClick={() => pushToast("Workspace switcher is ready for your next space.")}>
          <div className="avatar">M</div>
          <div className="workspace-copy"><strong>Maya Shopnotes</strong><span>Personal workspace</span></div>
          <ChevronDown size={14} />
        </button>
        <div className="nav-heading">Workspace</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => selectNav(label)}>
              <Icon size={17} strokeWidth={activeNav === label ? 2.3 : 1.7} />
              <span>{label}</span>
              {label === "Command" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="nav-heading lower">Tools</div>
        <nav className="main-nav">
          <button className="nav-item" onClick={() => setIsSearchOpen(true)}><Search size={17} /><span>Search</span><kbd>⌘ K</kbd></button>
          <button className="nav-item" onClick={() => pushToast("Help center is coming soon.")}><CircleHelp size={17} /><span>Help center</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="signal-card"><div className="signal-top"><span className="live-dot" /> Live signal</div><p>Your system is in a good compounding loop.</p><button onClick={() => pushToast("Your strongest loop is content → offer → repeat.")}>See why <ArrowUpRight size={13} /></button></div>
          <button className="profile-row" onClick={() => pushToast("Profile settings are coming soon.")}><div className="avatar small">M</div><span>maya@shopnotes.co</span><MoreHorizontal size={16} /></button>
        </div>
      </aside>

      {showMobileNav && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setShowMobileNav(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark small-mark"><span>c</span></div><span>CROS</span></div>
          <div className="breadcrumb"><span>{activeNav}</span><span className="slash">/</span><strong>Tuesday, Sep 29</strong></div>
          <div className="top-actions">
            <button className="command-trigger" onClick={() => setIsSearchOpen(true)}><Command size={15} /><span>Quick command</span><kbd>⌘ K</kbd></button>
            <button className="icon-button" aria-label="Notifications" onClick={() => pushToast("You have 3 fresh signals.")}><Bell size={17} /><span className="notification-dot" /></button>
            <button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setShowMobileNav(true)}><Menu size={19} /></button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> Tuesday / 09.29.26</div>
              <h1>Build once.<br /><em>Compound</em> forever.</h1>
              <p className="hero-description">A quiet system for turning your best ideas into durable revenue. Your next move is already visible.</p>
              <div className="hero-actions"><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={16} /> Add a product</button><button className="text-button" onClick={() => document.getElementById("next-moves")?.scrollIntoView({ behavior: "smooth" })}>View next moves <ArrowUpRight size={15} /></button></div>
            </div>
            <div className="hero-art" aria-label="CROS signal field"><div className="hero-art-grid" /><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-spark spark-a" /><div className="hero-spark spark-b" /><div className="hero-art-label"><span>signal / 001</span><strong>steady<br />growth</strong></div><div className="hero-number">01</div></div>
          </section>

          <section className="metrics-grid" aria-label="Key metrics"><Metric label="Monthly revenue" value="$12,840" change="+18.4%" detail="vs. $10,842 last month" /><Metric label="Audience to offer" value="6.8%" change="+1.2%" detail="highest in the last 90 days" /><Metric label="Capacity this week" value="68%" change="on pace" detail="12 focused hours remaining" /></section>

          <section className="section-block products-section">
            <div className="section-heading"><div><div className="section-kicker">01 / Portfolio</div><h2>Your revenue stack</h2></div><button className="outline-button" onClick={() => setShowAdd(true)}>New product <Plus size={15} /></button></div>
            <div className="product-grid">{filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} onMore={() => pushToast(`${product.name} is healthy at ${product.trend}.`)} />)}<button className="add-card" onClick={() => setShowAdd(true)}><span><Plus size={20} /></span><strong>Capture a new idea</strong><small>Add an offer, experiment, or product in progress</small></button></div>
            {searchTerm && filteredProducts.length === 0 && <div className="empty-search">No products match “{searchTerm}”. Try a different signal.</div>}
          </section>

          <section className="insight-layout">
            <div className="chart-panel panel">
              <div className="panel-heading"><div><div className="section-kicker">02 / Pulse</div><h2>Revenue rhythm</h2></div><RangeToggle range={range} onChange={setRange} /></div>
              <div className="chart-summary"><div><span>Current pace</span><strong>{pace}</strong></div><div className="chart-summary-change"><TrendingUp size={15} /> 18.4% vs previous</div></div>
              <div className="bar-chart">{bars.map((bar, index) => <div className="bar-column" key={`${bar.label}-${index}`}><span className="bar-value">{bar.amount}</span><div className={`bar ${index === bars.length - 2 ? "current" : ""}`} style={{ height: `${bar.value}%` }} /><span className="bar-label">{bar.label}</span></div>)}</div>
              <div className="chart-footer"><span><i className="legend-dot" /> booked revenue</span><span>last updated 12 min ago</span></div>
            </div>
            <div className="insight-panel panel"><div className="insight-mark"><Zap size={18} /></div><div className="section-kicker">Signal worth keeping</div><h2>Your best loop is working.</h2><p>Products built from your strongest content are converting <strong>2.4× better</strong> than one-off launches.</p><div className="insight-rule" /><div className="insight-foot"><span>Based on 90 days of activity</span><button onClick={() => selectNav("Analyst")}>Open analyst <ArrowUpRight size={14} /></button></div></div>
          </section>

          <section className="lower-grid" id="next-moves">
            <div className="moves-panel panel"><div className="panel-heading"><div><div className="section-kicker">03 / Momentum</div><h2>Next moves</h2></div><span className="count-label">{moves.length - doneMoves.length} open</span></div><div className="move-list">{moves.map((move, index) => <button className={`move-row ${doneMoves.includes(move) ? "is-done" : ""}`} key={move} onClick={() => setDoneMoves((current) => current.includes(move) ? current.filter((item) => item !== move) : [...current, move])}><span className="move-number">0{index + 1}</span><span className="move-copy"><strong>{move}</strong><small>{index === 0 ? "Audience" : index === 1 ? "Product" : "Operations"}</small></span><span className="move-check">{doneMoves.includes(move) ? <Check size={14} /> : <ArrowUpRight size={14} />}</span></button>)}</div></div>
            <div className="capacity-panel panel"><div className="panel-heading"><div><div className="section-kicker">04 / Capacity</div><h2>Make room for signal.</h2></div><Target size={19} /></div><p>You have enough space for one meaningful build this week. Protect it.</p><div className="capacity-bar"><span style={{ width: "68%" }} /></div><div className="capacity-meta"><span>68% allocated</span><strong>12 hrs left</strong></div><button className="text-button" onClick={() => pushToast("Capacity block added to your weekly plan.", "success")}>Plan the block <ArrowUpRight size={15} /></button></div>
          </section>

          <footer className="footer"><span>CROS / Creator Revenue OS</span><span>Quiet systems compound.</span><span>Build 01.26</span></footer>
        </div>
      </main>

      {showAdd && <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAdd(false); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-product-title"><button className="modal-close icon-button subtle" aria-label="Close" onClick={() => setShowAdd(false)}><X size={17} /></button><div className="section-kicker">New signal / 05</div><h2 id="add-product-title">Name the next thing.</h2><p>Give your product a working title. You can shape the rest when the signal gets clearer.</p><label htmlFor="product-name">Product title</label><input id="product-name" autoFocus value={newProduct} onChange={(event) => setNewProduct(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addProduct(); }} placeholder="e.g. The Sunday Dispatch" /><div className="modal-actions"><button className="text-button" onClick={() => setShowAdd(false)}>Cancel</button><button className="primary-button" onClick={addProduct}><Plus size={15} /> Add to stack</button></div></div></div>}
      {isSearchOpen && <div className="search-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsSearchOpen(false); }}><div className="search-card" role="dialog" aria-modal="true" aria-labelledby="search-title"><div className="search-top"><div><div className="section-kicker">Workspace search</div><h2 id="search-title">Find a signal.</h2></div><button className="icon-button subtle" aria-label="Close search" onClick={() => setIsSearchOpen(false)}><X size={17} /></button></div><div className="search-input-wrap"><Search size={17} /><input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search products, notes, or ideas" /></div><div className="search-result"><span className="search-result-mark"><Sparkles size={15} /></span><div><strong>{searchTerm ? `${filteredProducts.length} matching products` : "Search your revenue stack"}</strong><small>{searchTerm ? "Results update as you type" : "Try “wine”, “notes”, or a new idea"}</small></div><kbd>↵</kbd></div></div></div>}
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((item) => item.id !== id))} />
    </div>
  );
}
