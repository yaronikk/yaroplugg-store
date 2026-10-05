import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Search, ShoppingBag, House, UserRound, Heart, ChevronLeft, Plus, Minus, X, Check, SlidersHorizontal, ArrowUpRight } from 'lucide-react'
import './index.css'
import { products } from './data'
import type { Product, CartItem } from './types'

type Screen = 'shop' | 'categories' | 'favorites' | 'profile'
type Order = { id: string; total: number; status: string; items: CartItem[] }

const categories = ['New', 'Clothing', 'Accessories']

function App() {
  const [screen, setScreen] = useState<Screen>('shop')
  const [activeCategory, setActiveCategory] = useState('New')
  const [selected, setSelected] = useState<Product | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [toast, setToast] = useState('')
  const [orders, setOrders] = useState<Order[]>([])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const matchesQuery = !q || `${p.name} ${p.description}`.toLowerCase().includes(q)
      const productCategory = String(p.category); const matchesCategory = activeCategory === 'New' || (activeCategory === 'Clothing' && productCategory !== 'Accessories') || activeCategory === 'Accessories'
      return matchesQuery && matchesCategory
    })
  }, [query, activeCategory])

  const favoriteProducts = products.filter((p) => favorites.includes(p.id))
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 1600)
  }

  function toggleFavorite(id: string) {
    setFavorites((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id])
  }

  function addToBag(item: CartItem) {
    setCart((current) => {
      const existing = current.find((x) => x.product.id === item.product.id && x.size === item.size && x.color === item.color)
      return existing
        ? current.map((x) => x === existing ? { ...x, quantity: x.quantity + item.quantity } : x)
        : [...current, item]
    })
    setSelected(null)
    notify('Added to bag')
  }

  function createOrder(customer: { name: string; phone: string; delivery: string }) {
    void customer
    const order: Order = { id: String(Date.now()).slice(-6), total, status: 'Confirmed', items: cart }
    setOrders((current) => [order, ...current])
    setCart([])
    setShowCheckout(false)
    setScreen('profile')
    notify('Order confirmed')
  }

  return (
    <div className="app-shell">
      <main className="store-shell safe-bottom">
        <header className="topbar">
          <button className="wordmark-mini" onClick={() => setScreen('shop')} aria-label="YAROPLUGG Store">YAROPLUGG</button>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={23} strokeWidth={1.7} /></button>
            <button className="icon-button bag-button" onClick={() => setShowCart(true)} aria-label="Bag">
              <ShoppingBag size={23} strokeWidth={1.7} />
              {count > 0 && <span className="bag-badge">{count}</span>}
            </button>
          </div>
        </header>

        {screen === 'shop' && (
          <ShopHome
            category={activeCategory}
            setCategory={setActiveCategory}
            products={filtered}
            favorites={favorites}
            onFavorite={toggleFavorite}
            onProduct={setSelected}
            onCategories={() => setScreen('categories')}
          />
        )}
        {screen === 'categories' && (
          <CategoriesScreen active={activeCategory} setActive={setActiveCategory} onProduct={setSelected} />
        )}
        {screen === 'favorites' && (
          <FavoritesScreen products={favoriteProducts} onProduct={setSelected} onFavorite={toggleFavorite} />
        )}
        {screen === 'profile' && (
          <ProfileScreen orders={orders} />
        )}

        <nav className="bottom-nav">
          <NavItem icon={<House size={22} />} label="SHOP" active={screen === 'shop'} onClick={() => setScreen('shop')} />
          <NavItem icon={<SlidersHorizontal size={22} />} label="CATEGORIES" active={screen === 'categories'} onClick={() => setScreen('categories')} />
          <NavItem icon={<Heart size={22} />} label="FAVORITES" active={screen === 'favorites'} onClick={() => setScreen('favorites')} badge={favorites.length} />
          <NavItem icon={<UserRound size={22} />} label="PROFILE" active={screen === 'profile'} onClick={() => setScreen('profile')} />
        </nav>

        {searchOpen && <SearchOverlay query={query} setQuery={setQuery} onClose={() => setSearchOpen(false)} onProduct={(p) => { setSearchOpen(false); setSelected(p) }} />}
        {selected && <ProductSheet product={selected} favorite={favorites.includes(selected.id)} onFavorite={() => toggleFavorite(selected.id)} onClose={() => setSelected(null)} onAdd={addToBag} />}
        {showCart && <BagSheet items={cart} total={total} onClose={() => setShowCart(false)} onChange={setCart} onCheckout={() => { setShowCart(false); setShowCheckout(true) }} />}
        {showCheckout && <Checkout total={total} onClose={() => setShowCheckout(false)} onDone={createOrder} />}
        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  )
}

function NavItem({ icon, label, active, onClick, badge = 0 }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return <button onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
    <span className="nav-icon">{icon}{badge > 0 && <span className="nav-badge">{badge}</span>}</span>
    <span>{label}</span>
  </button>
}

function ShopHome({ category, setCategory, products, favorites, onFavorite, onProduct, onCategories }: { category: string; setCategory: (v: string) => void; products: Product[]; favorites: string[]; onFavorite: (id: string) => void; onProduct: (p: Product) => void; onCategories: () => void }) {
  return <div className="page shop-page">
    <section className="brand-hero">
      <div className="hero-topline">
        <span>CLOTHES</span><span>PEOPLE</span><span>IDEAS</span><span>YAROPLUGG</span><b>+</b>
      </div>
      <div className="hero-logo">YAROPLUGG<span>i</span><i /></div>
      <div className="hero-copy">
        <div className="hero-title">YAROPLUGG STORE</div>
        <div className="hero-subtitle">MORE THAN CLOTHES<br />INDEPENDENT BRAND<br />EST. 2023</div>
      </div>
      <div className="hero-progress"><span>01 / 03</span><b /><i /><i /></div>
    </section>

    <div className="category-strip">
      {categories.map((categoryName) => <button key={categoryName} className={category === categoryName ? 'selected' : ''} onClick={() => setCategory(categoryName)}>{categoryName}</button>)}
      <button className="more-button" onClick={onCategories}>•••</button>
    </div>

    <section className="products-section">
      <div className="section-heading"><span>{category === 'New' ? 'NEW ARRIVALS' : category.toUpperCase()}</span><button onClick={onCategories}>VIEW ALL <ArrowUpRight size={15} /></button></div>
      <div className="product-grid">
        {products.slice(0, 1).map((p) => <ProductCard key={p.id} product={p} favorite={favorites.includes(p.id)} onFavorite={() => onFavorite(p.id)} onClick={() => onProduct(p)} />)}
      </div>
      {products.length === 0 && <EmptyState title="COMING SOON" text="New pieces are on the way." />}
    </section>
  </div>
}

function CategoriesScreen({ active, setActive, onProduct }: { active: string; setActive: (v: string) => void; onProduct: (p: Product) => void }) {
  const visible = products.filter((p) => { const productCategory = String(p.category); return active === 'New' || active === 'Clothing' || (active === 'Accessories' && productCategory === 'Accessories') })
  return <div className="page inner-page">
    <div className="eyebrow">YAROPLUGG STORE</div>
    <h1 className="page-title">CATEGORIES</h1>
    <div className="category-list">{categories.map((name) => <button key={name} onClick={() => setActive(name)} className={active === name ? 'active' : ''}>{name}<ArrowUpRight size={17} /></button>)}</div>
    <div className="section-heading"><span>{active.toUpperCase()}</span><span className="muted">{visible.length} ITEM{visible.length === 1 ? '' : 'S'}</span></div>
    <div className="product-grid">{visible.map((p) => <ProductCard key={p.id} product={p} favorite={false} onFavorite={() => {}} onClick={() => onProduct(p)} />)}</div>
  </div>
}

function FavoritesScreen({ products, onProduct, onFavorite }: { products: Product[]; onProduct: (p: Product) => void; onFavorite: (id: string) => void }) {
  return <div className="page inner-page"><div className="eyebrow">YOUR SELECTION</div><h1 className="page-title">FAVORITES</h1>{products.length ? <div className="product-grid">{products.map((p) => <ProductCard key={p.id} product={p} favorite onFavorite={() => onFavorite(p.id)} onClick={() => onProduct(p)} />)}</div> : <EmptyState title="NO FAVORITES" text="Save pieces you love." />}</div>
}

function ProfileScreen({ orders }: { orders: Order[] }) {
  return <div className="page inner-page"><div className="eyebrow">YAROPLUGG</div><h1 className="page-title">PROFILE</h1><div className="profile-card"><span>TELEGRAM</span><strong>YOUR ACCOUNT</strong><p>Your Telegram identity will be used for orders. No separate registration needed.</p></div><div className="profile-menu"><div><span>MY ORDERS</span><b>{orders.length}</b></div><div><span>LANGUAGE</span><b>EN</b></div><div><span>SUPPORT</span><ArrowUpRight size={18} /></div></div>{orders.length > 0 && <div className="orders-preview">{orders.map((o) => <div key={o.id}><span>ORDER #{o.id}</span><b>{o.status}</b><strong>€{o.total}</strong></div>)}</div>}</div>
}

function ProductCard({ product, favorite, onFavorite, onClick }: { product: Product; favorite: boolean; onFavorite: () => void; onClick: () => void }) {
  return <article className="product-card">
    <button className="product-image-wrap" onClick={onClick}>
      <img src={product.images[0]} alt={product.name} />
      <span className="product-index">01</span>
    </button>
    <button className={`heart-button ${favorite ? 'liked' : ''}`} onClick={onFavorite} aria-label="Favorite"><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button>
    <button className="product-meta" onClick={onClick}><span>{product.name.toUpperCase()}</span><b>€{product.price}</b></button>
  </article>
}

function SearchOverlay({ query, setQuery, onClose, onProduct }: { query: string; setQuery: (v: string) => void; onClose: () => void; onProduct: (p: Product) => void }) {
  const results = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  return <div className="overlay dark-overlay"><div className="search-panel"><button className="sheet-close" onClick={onClose}><X size={20} /></button><div className="eyebrow">SEARCH YAROPLUGG</div><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pieces..." />{query && <div className="search-results">{results.map((p) => <button key={p.id} onClick={() => onProduct(p)}><img src={p.images[0]} alt="" /><span>{p.name}</span><b>€{p.price}</b></button>)}</div>}</div></div>
}

function ProductSheet({ product, favorite, onFavorite, onClose, onAdd }: { product: Product; favorite: boolean; onFavorite: () => void; onClose: () => void; onAdd: (item: CartItem) => void }) {
  const [size, setSize] = useState(product.sizes[1] || product.sizes[0])
  const [color, setColor] = useState(product.colors[0].name)
  return <div className="overlay dark-overlay"><div className="product-sheet"><div className="sheet-image"><img src={product.images[0]} alt={product.name} /><button className="sheet-close" onClick={onClose}><X size={20} /></button><button className={`sheet-heart ${favorite ? 'liked' : ''}`} onClick={onFavorite}><Heart size={20} fill={favorite ? 'currentColor' : 'none'} /></button></div><div className="sheet-body"><div className="product-kicker">{product.category.toUpperCase()}</div><div className="product-heading"><h2>{product.name.toUpperCase()}</h2><strong>€{product.price}</strong></div><p>{product.description}</p><div className="option-block"><span>SIZE</span><div className="size-row">{product.sizes.map((s) => <button key={s} className={size === s ? 'selected' : ''} onClick={() => setSize(s)}>{s}</button>)}</div></div><div className="option-block"><span>COLOR — {color.toUpperCase()}</span><div className="color-row">{product.colors.map((c) => <button key={c.name} aria-label={c.name} onClick={() => setColor(c.name)} style={{ background: c.hex }} className={color === c.name ? 'selected' : ''} />)}</div></div><button className="primary-button" onClick={() => onAdd({ product, size, color, quantity: 1 })}>ADD TO BAG <ArrowUpRight size={18} /></button></div></div></div>
}

function BagSheet({ items, total, onClose, onChange, onCheckout }: { items: CartItem[]; total: number; onClose: () => void; onChange: (items: CartItem[]) => void; onCheckout: () => void }) {
  return (
    <div className="overlay dark-overlay">
      <div className="bag-sheet">
        <div className="sheet-header">
          <div><div className="eyebrow">YAROPLUGG</div><h2>YOUR BAG</h2></div>
          <button className="sheet-close" onClick={onClose}><X size={20} /></button>
        </div>
        {items.length === 0 ? <EmptyState title="YOUR BAG IS EMPTY" text="Find something you like." /> : <>
          <div className="bag-items">
            {items.map((item, index) => (
              <div className="bag-item" key={`${item.product.id}-${item.size}-${item.color}`}>
                <img src={item.product.images[0]} alt="" />
                <div className="bag-item-info">
                  <span>{item.product.name.toUpperCase()}</span>
                  <small>{item.color} / {item.size}</small>
                  <div>
                    <div className="qty">
                      <button onClick={() => onChange(items.map((x, i) => i === index ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}><Minus size={14} /></button>
                      <b>{item.quantity}</b>
                      <button onClick={() => onChange(items.map((x, i) => i === index ? { ...x, quantity: x.quantity + 1 } : x))}><Plus size={14} /></button>
                    </div>
                    <strong>€{item.product.price * item.quantity}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bag-total"><span>TOTAL</span><strong>€{total}</strong></div>
          <button className="primary-button" onClick={onCheckout}>CHECKOUT <ArrowUpRight size={18} /></button>
        </>}
      </div>
    </div>
  )
}
function Checkout({ total, onClose, onDone }: { total: number; onClose: () => void; onDone: (x: { name: string; phone: string; delivery: string }) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [delivery, setDelivery] = useState('SmartPost / Omniva')
  return <div className="overlay checkout-overlay"><div className="checkout-page"><button className="back-button" onClick={onClose}><ChevronLeft size={20} /></button><div className="eyebrow">YAROPLUGG STORE</div><h1>CHECKOUT</h1><div className="form-stack"><Field label="NAME" value={name} onChange={setName} placeholder="Your name" /><Field label="PHONE" value={phone} onChange={setPhone} placeholder="+372 ..." /><label><span>DELIVERY</span><select value={delivery} onChange={(e) => setDelivery(e.target.value)}><option>SmartPost / Omniva</option><option>Courier</option><option>Pick-up</option></select></label><div className="payment-box"><span>PAYMENT</span><strong>CASH ON DELIVERY</strong></div></div><div className="checkout-total"><span>TOTAL</span><strong>€{total}</strong></div><button disabled={!name || phone.replace(/\D/g, '').length < 7} className="primary-button" onClick={() => onDone({ name, phone, delivery })}>PLACE ORDER <ArrowUpRight size={18} /></button></div></div>
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) { return <label><span>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label> }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><Heart size={30} /><strong>{title}</strong><span>{text}</span></div> }

createRoot(document.getElementById('root')!).render(<App />)
