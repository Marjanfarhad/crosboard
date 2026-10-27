import { useEffect, useRef, useState } from "react";
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

import { ReviewDialog } from "./components/ReviewDialog";
import {
  buildSampleChart,
  formatMoney,
  workspaceDate,
} from "./lib/sampleChart";

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

const moves = [
  "Share the wine club waitlist update",
  "Turn Monday’s post into a paid note",
  "Set Friday’s cohort reminder",
];

function Metric({
  label,
  value,
  change,
  detail,
}: {
  label: string;
  value: string;
  change: string;
  detail: string;
}) {
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

function ProductCard({
  product,
  index,
  onMore,
}: {
  product: Product;
  index: number;
  onMore: () => void;
}) {
  return (
    <article
      id={`product-${product.id}`}
      tabIndex={-1}
      className={`product-card product-${product.color}`}
    >
      <div className="product-card-top">
        <span className="product-index">0{index + 1}</span>
        <button
          className="icon-button subtle"
          aria-label={`More options for ${product.name}`}
          onClick={onMore}
        >
          <MoreHorizontal size={17} />
        </button>
      </div>
      <div className="product-orb">
        <Sparkles size={19} />
      </div>
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

function RangeToggle({
  range,
  onChange,
}: {
  range: Range;
  onChange: (range: Range) => void;
}) {
  return (
    <div className="range-toggle" aria-label="Chart range">
      {(["7D", "30D", "MTD"] as Range[]).map(item => (
        <button
          key={item}
          className={range === item ? "selected" : ""}
          aria-pressed={range === item}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map(toast => (
        <button
          key={toast.id}
          className={`toast toast-${toast.tone}`}
          onClick={() => onDismiss(toast.id)}
        >
          <span className="toast-mark">
            {toast.tone === "success" ? <Check size={13} /> : <Zap size={13} />}
          </span>
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
  const [showHelp, setShowHelp] = useState(false);
  const [showClip, setShowClip] = useState(false);
  const [productError, setProductError] = useState("");
  const [today, setToday] = useState(() => workspaceDate());
  const nextMovesRef = useRef<HTMLElement>(null);
  const mainHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusView = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(workspaceDate()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (focusView.current) mainHeadingRef.current?.focus();
  }, [activeNav]);

  const pushToast = (message: string, tone: ToastItem["tone"] = "default") => {
    const id = Date.now() + Math.random();
    setToasts(current => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(
      () => setToasts(current => current.filter(item => item.id !== id)),
      3400
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (showAdd || showHelp || showClip) return;
        event.preventDefault();
        setShowMobileNav(false);
        setIsSearchOpen(current => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showAdd, showHelp, showClip]);

  const chart = buildSampleChart(range, today);
  const monthlyRevenue = formatMoney(buildSampleChart("MTD", today).total);
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );
  const isCommand = activeNav === "Command";

  const selectNav = (label: string) => {
    focusView.current = true;
    setActiveNav(label);
    setShowMobileNav(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const addProduct = () => {
    const title = newProduct.trim();
    if (!title) {
      setProductError("Give the product a working title first.");
      return;
    }
    setProducts(current => [
      ...current,
      {
        id: Date.now(),
        name: title,
        type: "New concept",
        revenue: "$0",
        trend: "draft",
        color: "cream",
        note: "Ready for your first signal",
      },
    ]);
    setProductError("");
    setNewProduct("");
    setShowAdd(false);
    pushToast("Sample product added for this session.", "success");
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-content">
        Skip to workspace
      </a>
      <aside className={`sidebar ${showMobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark">
            <span>c</span>
          </div>
          <div>
            <div className="brand-name">CROS</div>
            <div className="brand-sub">Creator Revenue OS</div>
          </div>
          <button
            className="mobile-close icon-button subtle"
            aria-label="Close navigation"
            onClick={() => setShowMobileNav(false)}
          >
            <X size={17} />
          </button>
        </div>
        <button
          className="workspace-switcher"
          onClick={() => setShowHelp(true)}
        >
          <div className="avatar">M</div>
          <div className="workspace-copy">
            <strong>Sample workspace</strong>
            <span>Session only · no cloud sync</span>
          </div>
          <ChevronDown size={14} />
        </button>
        <div className="nav-heading">Workspace</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              aria-current={activeNav === label ? "page" : undefined}
              onClick={() => selectNav(label)}
            >
              <Icon size={17} strokeWidth={activeNav === label ? 2.3 : 1.7} />
              <span>{label}</span>
              {label === "Command" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="nav-heading lower">Tools</div>
        <nav className="main-nav">
          <button
            className="nav-item"
            onClick={() => {
              setShowMobileNav(false);
              setIsSearchOpen(true);
            }}
          >
            <Search size={17} />
            <span>Search</span>
            <kbd>⌘ K</kbd>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setShowMobileNav(false);
              setShowHelp(true);
            }}
          >
            <CircleHelp size={17} />
            <span>Help center</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="signal-card">
            <div className="signal-top">
              <span className="live-dot" /> Sample signal
            </div>
            <p>Explore the workflow with fictional data.</p>
            <button onClick={() => setShowHelp(true)}>
              About this workspace <ArrowUpRight size={13} />
            </button>
          </div>
          <button className="profile-row" onClick={() => setShowHelp(true)}>
            <div className="avatar small">M</div>
            <span>Demo visitor</span>
            <MoreHorizontal size={16} />
          </button>
        </div>
      </aside>

      {showMobileNav && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setShowMobileNav(false)}
        />
      )}

      <main className="main-content" id="workspace-content" tabIndex={-1}>
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark small-mark">
              <span>c</span>
            </div>
            <span>CROS</span>
          </div>
          <div className="breadcrumb">
            <span>{activeNav}</span>
            <span className="slash">/</span>
            <strong>{today.label}</strong>
          </div>
          <div className="top-actions">
            <button
              className="command-trigger"
              onClick={() => {
                setShowMobileNav(false);
                setIsSearchOpen(true);
              }}
            >
              <Command size={15} />
              <span>Quick command</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() =>
                pushToast(
                  "No live notifications. This workspace uses sample data."
                )
              }
            >
              <Bell size={17} />
            </button>
            <button
              className="mobile-menu icon-button"
              aria-label="Open menu"
              onClick={() => setShowMobileNav(true)}
            >
              <Menu size={19} />
            </button>
          </div>
        </header>

        <div className="content-wrap">
          <div className="demo-banner" role="note">
            <strong>Demo workspace — sample data</strong>
            <span>
              Products and checklist changes last until reload. No live revenue,
              AI, analytics or publishing connection.
            </span>
            <button className="text-button" onClick={() => setShowHelp(true)}>
              How it works
            </button>
          </div>
          {!isCommand && (
            <div className="view-heading">
              <div className="section-kicker">Workspace / {activeNav}</div>
              <h1 ref={mainHeadingRef} tabIndex={-1}>
                {activeNav}
              </h1>
            </div>
          )}
          {isCommand && (
            <>
              <section className="hero-grid">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span className="eyebrow-line" /> {today.label} / Kabul time
                  </div>
                  <h1 ref={mainHeadingRef} tabIndex={-1}>
                    Build once.
                    <br />
                    <em>Compound</em> forever.
                  </h1>
                  <p className="hero-description">
                    A quiet system for turning your best ideas into durable
                    revenue. Your next move is already visible.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="primary-button"
                      onClick={() => setShowAdd(true)}
                    >
                      <Plus size={16} /> Add a product
                    </button>
                    <button
                      className="text-button"
                      onClick={() => (
                        nextMovesRef.current?.scrollIntoView({
                          behavior: window.matchMedia(
                            "(prefers-reduced-motion: reduce)"
                          ).matches
                            ? "instant"
                            : "smooth",
                          block: "start",
                        }),
                        nextMovesRef.current?.focus({ preventScroll: true })
                      )}
                    >
                      View next moves <ArrowUpRight size={15} />
                    </button>
                  </div>
                </div>
                <div className="hero-art" aria-label="CROS signal field">
                  <div className="hero-art-grid" />
                  <div className="hero-orbit orbit-one" />
                  <div className="hero-orbit orbit-two" />
                  <div className="hero-spark spark-a" />
                  <div className="hero-spark spark-b" />
                  <div className="hero-art-label">
                    <span>signal / 001</span>
                    <strong>
                      steady
                      <br />
                      growth
                    </strong>
                  </div>
                  <div className="hero-number">01</div>
                </div>
              </section>
            </>
          )}
          {(isCommand || activeNav === "Performance") && (
            <section className="metrics-grid" aria-label="Key metrics">
              <Metric
                label="Monthly revenue"
                value={monthlyRevenue}
                change="sample"
                detail="Fictional month-to-date revenue"
              />
              <Metric
                label="Audience to offer"
                value="6.8%"
                change="sample"
                detail="Illustrative conversion rate"
              />
              <Metric
                label="Capacity this week"
                value="68%"
                change="sample"
                detail="Illustrative capacity, not a schedule"
              />
            </section>
          )}

          {(isCommand || activeNav === "Products") && (
            <section className="section-block products-section">
              <div className="section-heading">
                <div>
                  <div className="section-kicker">01 / Portfolio</div>
                  <h2>Your revenue stack</h2>
                </div>
                <button
                  className="outline-button"
                  onClick={() => setShowAdd(true)}
                >
                  New product <Plus size={15} />
                </button>
              </div>
              <div className="product-grid">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    onMore={() =>
                      pushToast(
                        `${product.name}: ${product.type}. ${product.note} (sample data).`
                      )
                    }
                  />
                ))}
                <button className="add-card" onClick={() => setShowAdd(true)}>
                  <span>
                    <Plus size={20} />
                  </span>
                  <strong>Capture a new idea</strong>
                  <small>
                    Add an offer, experiment, or product in progress
                  </small>
                </button>
              </div>
              {searchTerm && filteredProducts.length === 0 && (
                <div className="empty-search">
                  No products match “{searchTerm}”. Try a different signal.
                </div>
              )}
            </section>
          )}

          {(isCommand || activeNav === "Performance") && (
            <section className="insight-layout">
              <div className="chart-panel panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">02 / Pulse</div>
                    <h2>Revenue rhythm</h2>
                  </div>
                  <RangeToggle range={range} onChange={setRange} />
                </div>
                <div className="chart-summary">
                  <div>
                    <span>Sample booked revenue · USD</span>
                    <strong>{formatMoney(chart.total)}</strong>
                  </div>
                  <div className="chart-summary-change">
                    <TrendingUp size={15} /> {chart.period}
                  </div>
                </div>
                <div className="bar-chart" aria-hidden="true">
                  {chart.bars.map(bar => (
                    <div className="bar-column" key={bar.label}>
                      <span className="bar-value">
                        {formatMoney(bar.amount)}
                      </span>
                      <div
                        className="bar"
                        style={{ height: `${bar.value}%` }}
                      />
                      <span className="bar-label">{bar.label}</span>
                    </div>
                  ))}
                </div>
                <div className="chart-footer">
                  <span>
                    <i className="legend-dot" /> {chart.grouping}
                  </span>
                  <span>Sample data · not synced</span>
                </div>
                <details className="chart-data">
                  <summary>View chart data</summary>
                  <table>
                    <caption>
                      {chart.period} · sample booked revenue in USD
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Period</th>
                        <th scope="col">Revenue (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chart.bars.map(bar => (
                        <tr key={bar.label}>
                          <th scope="row">{bar.label}</th>
                          <td>{formatMoney(bar.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row">Total</th>
                        <td>{formatMoney(chart.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </details>
              </div>
              <div className="insight-panel panel">
                <div className="insight-mark">
                  <Zap size={18} />
                </div>
                <div className="section-kicker">Signal worth keeping</div>
                <h2>Check evidence before acting.</h2>
                <p>
                  This chart illustrates a reporting layout. It does not
                  establish growth, conversion gains or a revenue forecast.
                </p>
                <div className="insight-rule" />
                <div className="insight-foot">
                  <span>Sample data only</span>
                  <button onClick={() => selectNav("Analyst")}>
                    Open analyst <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {isCommand && (
            <section
              className="lower-grid"
              id="next-moves"
              ref={nextMovesRef}
              tabIndex={-1}
              aria-label="Next moves checklist"
            >
              <div className="moves-panel panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">03 / Momentum</div>
                    <h2>Next moves</h2>
                  </div>
                  <span className="count-label">
                    {moves.length - doneMoves.length} open
                  </span>
                </div>
                <div className="move-list">
                  {moves.map((move, index) => (
                    <button
                      className={`move-row ${doneMoves.includes(move) ? "is-done" : ""}`}
                      aria-pressed={doneMoves.includes(move)}
                      key={move}
                      onClick={() =>
                        setDoneMoves(current =>
                          current.includes(move)
                            ? current.filter(item => item !== move)
                            : [...current, move]
                        )
                      }
                    >
                      <span className="move-number">0{index + 1}</span>
                      <span className="move-copy">
                        <strong>{move}</strong>
                        <small>
                          {index === 0
                            ? "Audience"
                            : index === 1
                              ? "Product"
                              : "Operations"}
                        </small>
                      </span>
                      <span className="move-check">
                        {doneMoves.includes(move) ? (
                          <Check size={14} />
                        ) : (
                          <ArrowUpRight size={14} />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="capacity-panel panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">04 / Capacity</div>
                    <h2>Make room for signal.</h2>
                  </div>
                  <Target size={19} />
                </div>
                <p>
                  You have enough space for one meaningful build this week.
                  Protect it.
                </p>
                <div className="capacity-bar">
                  <span style={{ width: "68%" }} />
                </div>
                <div className="capacity-meta">
                  <span>68% allocated</span>
                  <strong>12 hrs left</strong>
                </div>
                <button
                  className="text-button"
                  onClick={() =>
                    pushToast(
                      "Planning example only. No calendar or weekly plan has been changed."
                    )
                  }
                >
                  Plan the block <ArrowUpRight size={15} />
                </button>
              </div>
            </section>
          )}

          {activeNav === "Studio" && (
            <section className="panel review-panel">
              <div className="section-kicker">Sample content queue</div>
              <h2>Review before publishing</h2>
              <p>
                No production video library is connected. This fictional item
                demonstrates an unfinished review.
              </p>
              <article className="sample-clip">
                <span className="status-needs-edits">
                  Needs edits · 3 remaining
                </span>
                <h3>My redneck wine story</h3>
                <p>Sample short-form video · no playable asset attached</p>
                <button
                  className="outline-button"
                  onClick={() => setShowClip(true)}
                >
                  View review checklist
                </button>
              </article>
              <p>
                Publishing requires a finished asset and explicit human
                approval. Publishing is unavailable here.
              </p>
            </section>
          )}
          {activeNav === "Analyst" && (
            <section className="panel review-panel">
              <div className="section-kicker">Evidence status</div>
              <h2>No live analysis available</h2>
              <p>
                This source version has no connected analytics property or live
                AI analysis. Sample charts cannot support business
                recommendations.
              </p>
              <dl>
                <dt>Data source</dt>
                <dd>Fictional fixtures</dd>
                <dt>Live refresh</dt>
                <dd>Unavailable</dd>
                <dt>Recommendations</dt>
                <dd>Withheld until real data is verified</dd>
              </dl>
              <button
                className="outline-button"
                onClick={() => selectNav("Performance")}
              >
                Explore sample performance
              </button>
            </section>
          )}

          <footer className="footer">
            <span>CROS / Creator Revenue OS</span>
            <span>Quiet systems compound.</span>
            <span>Review candidate</span>
          </footer>
        </div>
      </main>

      <ReviewDialog
        open={showAdd}
        onOpenChange={open => {
          setShowAdd(open);
          if (!open) setProductError("");
        }}
        title="Name the next thing."
        description="Create a session-only sample product. Reloading clears your changes."
      >
        <form
          onSubmit={event => {
            event.preventDefault();
            addProduct();
          }}
          noValidate
        >
          <label htmlFor="product-name">Product title</label>
          <input
            id="product-name"
            value={newProduct}
            maxLength={120}
            aria-invalid={!!productError}
            aria-describedby={productError ? "product-error" : undefined}
            onChange={event => {
              setNewProduct(event.target.value);
              setProductError("");
            }}
            placeholder="e.g. The Sunday Dispatch"
          />
          {productError && (
            <p id="product-error" role="alert">
              {productError}
            </p>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button">
              <Plus size={15} /> Add to stack
            </button>
          </div>
        </form>
      </ReviewDialog>
      <ReviewDialog
        open={isSearchOpen}
        onOpenChange={open => {
          setIsSearchOpen(open);
          if (!open) setSearchTerm("");
        }}
        title="Search products"
        description="Find products in this sample session by title."
      >
        <label htmlFor="product-search">Product title to find</label>
        <input
          id="product-search"
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
          placeholder="Search product titles"
        />
        <p role="status">{filteredProducts.length} matching products</p>
        <ul className="search-matches">
          {filteredProducts.map(product => (
            <li key={product.id}>
              <button
                className="outline-button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchTerm("");
                  selectNav("Products");
                  window.requestAnimationFrame(() =>
                    document.getElementById(`product-${product.id}`)?.focus()
                  );
                }}
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
        {filteredProducts.length === 0 && (
          <p>No products match “{searchTerm}”. Try another title.</p>
        )}
      </ReviewDialog>
      <ReviewDialog
        open={showHelp}
        onOpenChange={setShowHelp}
        title="Workspace help"
        description="What works here and what still needs a live connection."
      >
        <h3>Products and search</h3>
        <p>
          Add sample products and find them by title. Products and checklist
          changes are kept in memory until reload; they are not backed up or
          synced.
        </p>
        <h3>Performance</h3>
        <p>
          7D covers seven dates, 30D covers thirty dates, and MTD starts on the
          first day of this month. Dates use Kabul time. All amounts are
          fictional USD figures. Open the data table to inspect each period.
        </p>
        <h3>Studio and Analyst</h3>
        <p>
          Studio shows a sample review checklist. There is no video asset, live
          analytics, AI generation or publishing connection in this source
          version.
        </p>
      </ReviewDialog>
      <ReviewDialog
        open={showClip}
        onOpenChange={setShowClip}
        title="Video review checklist"
        description="Sample item — needs edits; not approved for publishing."
      >
        <ol>
          <li>Attach and inspect the final video asset.</li>
          <li>Review narration, captions and factual claims.</li>
          <li>Obtain explicit human approval of the final video.</li>
        </ol>
        <p>
          No edits or approvals have been completed by opening this checklist.
        </p>
      </ReviewDialog>
      <ToastStack
        toasts={toasts}
        onDismiss={id =>
          setToasts(current => current.filter(item => item.id !== id))
        }
      />
    </div>
  );
}
