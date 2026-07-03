/* global React, VetIcons,
   VET_SHOP_CATEGORIES, VET_SHOP_CAT_TONE,
   VET_SHOP_SERVICE_CATEGORIES, VET_SHOP_SVC_TONE,
   vetShopStockState, vetMoney, vetShopCustomerName, vetComputeTotals,
   vetApplyPromo, vetPromoStatus,
   VetShopProductCard, VetShopServiceCard, VetShopPayModal, VetShopReceiptModal,
   VetModalShell, VetPatientCascadePicker, useVetToast */

// ============================================================================
// POS — Punto de venta (productos + servicios + paquetes con promociones)
// ============================================================================

function VetShopPOSView({ shop }) {
  const toast = useVetToast();
  const [mode, setMode] = React.useState('producto'); // producto | servicio | paquete
  const [query, setQuery] = React.useState('');
  const [cat, setCat] = React.useState('');
  const [cart, setCart] = React.useState([]);      // [{ kind:'product'|'service'|'bundle', id, qty }]
  const [customer, setCustomer] = React.useState(null);
  const [fiscalCustomer, setFiscalCustomer] = React.useState(null);
  const [custOpen, setCustOpen] = React.useState(false);
  const [custPurpose, setCustPurpose] = React.useState('assoc'); // 'assoc' | 'fiscal'
  const [discount, setDiscount] = React.useState('');
  const [payOpen, setPayOpen] = React.useState(false);
  const [receipt, setReceipt] = React.useState(null);

  React.useEffect(() => { setCat(''); setQuery(''); }, [mode]);

  const cats = mode === 'producto' ? VET_SHOP_CATEGORIES : mode === 'servicio' ? VET_SHOP_SERVICE_CATEGORIES : [];
  const bundles = shop.promos.filter((p) => p.type === 'PAQUETE' && vetPromoStatus(p) === 'ACTIVA');

  const filteredProducts = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return shop.products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (q && !(p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [shop.products, query, cat]);

  const filteredServices = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return shop.services.filter((s) => {
      if (cat && s.category !== cat) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [shop.services, query, cat]);

  function priceFor(item, kind) { return vetApplyPromo(item, kind, shop.promos); }
  function bundleName(id) { return (bundles.find((b) => b.id === id) || {}).name; }

  function resolve(line) {
    if (line.kind === 'bundle') {
      const b = shop.promos.find((p) => p.id === line.id);
      const allExcl = b.bundleItems.every((bi) => {
        const it = bi.kind === 'service' ? shop.services.find((s) => s.id === bi.id) : shop.products.find((p) => p.id === bi.id);
        return it && (it.taxId === 'excluido' || it.taxId === 'exento');
      });
      return { name: b.name, salePrice: b.bundlePrice, original: vetBundleOriginal(b), promo: b, taxId: allExcl ? 'excluido' : 'iva19', priceIncludesTax: true };
    }
    const it = line.kind === 'service' ? shop.services.find((s) => s.id === line.id) : shop.products.find((p) => p.id === line.id);
    const info = priceFor(it, line.kind === 'service' ? 'servicio' : 'product');
    return { name: it.name, salePrice: info.price, original: info.original, promo: info.promo, taxId: it.taxId, priceIncludesTax: it.priceIncludesTax };
  }
  function vetBundleOriginal(b) {
    return b.bundleItems.reduce((a, bi) => {
      const it = bi.kind === 'service' ? shop.services.find((s) => s.id === bi.id) : shop.products.find((p) => p.id === bi.id);
      return a + (it ? it.salePrice * bi.qty : 0);
    }, 0);
  }

  function addProduct(product) {
    setCart((c) => {
      const ex = c.find((l) => l.kind === 'product' && l.id === product.id);
      const prod = shop.products.find((p) => p.id === product.id);
      if (ex) {
        if (ex.qty >= prod.stock) { toast.warn('Sin stock', `Solo quedan ${prod.stock} u.`); return c; }
        return c.map((l) => (l.kind === 'product' && l.id === product.id) ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...c, { kind: 'product', id: product.id, qty: 1 }];
    });
  }
  function addService(svc) {
    setCart((c) => {
      const ex = c.find((l) => l.kind === 'service' && l.id === svc.id);
      if (ex) return c.map((l) => (l.kind === 'service' && l.id === svc.id) ? { ...l, qty: l.qty + 1 } : l);
      return [...c, { kind: 'service', id: svc.id, qty: 1 }];
    });
  }
  function addBundle(b) {
    setCart((c) => {
      const ex = c.find((l) => l.kind === 'bundle' && l.id === b.id);
      if (ex) return c.map((l) => (l.kind === 'bundle' && l.id === b.id) ? { ...l, qty: l.qty + 1 } : l);
      return [...c, { kind: 'bundle', id: b.id, qty: 1 }];
    });
  }
  function setQty(line, qty) {
    let q = Math.max(1, qty);
    if (line.kind === 'product') q = Math.min(q, shop.products.find((p) => p.id === line.id).stock);
    setCart((c) => c.map((l) => (l.kind === line.kind && l.id === line.id) ? { ...l, qty: q } : l));
  }
  function removeLine(line) { setCart((c) => c.filter((l) => !(l.kind === line.kind && l.id === line.id))); }

  const lines = cart.map((l) => {
    const r = resolve(l);
    return { ...l, name: r.name, unitPrice: r.salePrice, original: r.original, promo: r.promo, taxId: r.taxId, priceIncludesTax: r.priceIncludesTax, total: r.salePrice * l.qty };
  });
  const promoSavings = lines.reduce((a, l) => a + ((l.original ? (l.original - l.unitPrice) : 0) * l.qty), 0);
  const T = vetComputeTotals(lines, discount, shop.taxConfig);
  const total = T.total;

  function buildItems() {
    return cart.map((l) => {
      const r = resolve(l);
      return { kind: l.kind, id: l.id, qty: l.qty, unitPrice: r.salePrice, name: r.name, taxId: r.taxId, priceIncludesTax: r.priceIncludesTax };
    });
  }

  function confirmPay({ method }) {
    const items = buildItems();
    const code = shop.registerSale({
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      customerId: customer?.owner?.id ?? null,
      items, discount: disc, paymentMethod: method,
    });
    setPayOpen(false);
    setReceipt({ code, paymentMethod: method, discount: T.disc, savings: promoSavings, customerId: customer?.owner?.id ?? null, items, taxConfig: shop.taxConfig });
    setCart([]); setCustomer(null); setFiscalCustomer(null); setDiscount('');
  }

  return (
    <div className="vet-shop-pos">
      <div className="vet-shop-catalog">
        <div className="vet-shop-catalog-head">
          <div className="vet-shop-modetabs">
            <button type="button" className={'vet-shop-modetab' + (mode === 'producto' ? ' active' : '')} onClick={() => setMode('producto')}>
              <VetIcons.Package size={14} strokeWidth={1.7} /> Productos
            </button>
            <button type="button" className={'vet-shop-modetab' + (mode === 'servicio' ? ' active' : '')} onClick={() => setMode('servicio')}>
              <VetIcons.Stethoscope size={14} strokeWidth={1.7} /> Servicios
            </button>
            <button type="button" className={'vet-shop-modetab' + (mode === 'paquete' ? ' active' : '')} onClick={() => setMode('paquete')}>
              <VetIcons.Package size={14} strokeWidth={1.7} /> Paquetes
            </button>
          </div>
          {mode !== 'paquete' && (
            <>
              <div className="vet-shop-search">
                <VetIcons.Search size={15} strokeWidth={1.7} style={{ color: 'var(--warm-500)' }} />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder={mode === 'producto' ? 'Buscar producto o SKU…' : 'Buscar servicio…'} />
              </div>
              <div className="vet-shop-cats">
                <button type="button" className={'vet-shop-cat' + (cat === '' ? ' active' : '')} onClick={() => setCat('')}>Todos</button>
                {cats.map((c) => (
                  <button key={c.id} type="button" className={'vet-shop-cat' + (cat === c.id ? ' active' : '')} onClick={() => setCat(c.id)}>{c.name}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="vet-shop-grid">
          {mode === 'producto' && (filteredProducts.length === 0
            ? <div className="vet-shop-grid-empty">Sin productos para el filtro.</div>
            : filteredProducts.map((p) => <VetShopProductCard key={p.id} product={p} priceInfo={priceFor(p, 'product')} onAdd={addProduct} />))}
          {mode === 'servicio' && (filteredServices.length === 0
            ? <div className="vet-shop-grid-empty">Sin servicios para el filtro.</div>
            : filteredServices.map((s) => <VetShopServiceCard key={s.id} service={s} priceInfo={priceFor(s, 'servicio')} onAdd={addService} />))}
          {mode === 'paquete' && (bundles.length === 0
            ? <div className="vet-shop-grid-empty">No hay paquetes activos.</div>
            : bundles.map((b) => (
                <button key={b.id} type="button" className="vet-shop-pcard vet-shop-bundle" onClick={() => addBundle(b)}>
                  <span className="vet-shop-promo-badge">Paquete</span>
                  <div className="vet-shop-pcard-thumb" style={{ background: 'var(--amatista-100)', color: 'var(--amatista-700)' }}>
                    <VetIcons.Package size={22} strokeWidth={1.6} />
                  </div>
                  <div className="vet-shop-pcard-name">{b.name}</div>
                  <div className="vet-shop-bundle-items">
                    {b.bundleItems.map((bi, i) => {
                      const it = bi.kind === 'service' ? shop.services.find((s) => s.id === bi.id) : shop.products.find((p) => p.id === bi.id);
                      return <span key={i}>{bi.qty}× {it?.name ?? '—'}</span>;
                    })}
                  </div>
                  <div className="vet-shop-pcard-foot">
                    <span className="vet-shop-pcard-price">
                      <span className="vet-shop-price-old">{vetMoney(vetBundleOriginal(b))}</span>
                      {vetMoney(b.bundlePrice)}
                    </span>
                  </div>
                </button>
              )))}
        </div>
      </div>

      <aside className="vet-shop-ticket">
        <header className="vet-shop-ticket-head">
          <VetIcons.Receipt size={17} strokeWidth={1.7} />
          <span>Ticket de venta</span>
        </header>

        <button type="button" className="vet-shop-customer" onClick={() => { if (customer) { setCustomer(null); setFiscalCustomer(null); } else { setCustPurpose('assoc'); setCustOpen(true); } }}>
          <VetIcons.User size={14} strokeWidth={1.7} />
          <span>{customer ? customer.owner.name : 'Asociar propietario (opcional)'}</span>
          {customer && <VetIcons.X size={13} strokeWidth={1.8} style={{ marginLeft: 'auto' }} />}
        </button>

        <div className="vet-shop-lines">
          {lines.length === 0 ? (
            <div className="vet-shop-lines-empty">
              <VetIcons.Receipt size={26} strokeWidth={1.4} />
              <span>Agrega productos, servicios o paquetes</span>
            </div>
          ) : lines.map((l) => (
            <div key={l.kind + l.id} className="vet-shop-line">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="vet-shop-line-name">
                  {l.kind === 'service' && <span className="vet-shop-line-tag">Servicio</span>}
                  {l.kind === 'bundle' && <span className="vet-shop-line-tag">Paquete</span>}
                  {l.name}
                </div>
                <div className="vet-shop-line-price">
                  {l.promo && l.original > l.unitPrice && <span className="vet-shop-price-old">{vetMoney(l.original)}</span>}
                  {vetMoney(l.unitPrice)} c/u
                </div>
              </div>
              <div className="vet-shop-qty">
                <button type="button" onClick={() => setQty(l, l.qty - 1)}>−</button>
                <span>{l.qty}</span>
                <button type="button" onClick={() => setQty(l, l.qty + 1)}>+</button>
              </div>
              <div className="vet-shop-line-total">{vetMoney(l.total)}</div>
              <button type="button" className="vet-shop-line-x" onClick={() => removeLine(l)} aria-label="Quitar">
                <VetIcons.Trash size={13} strokeWidth={1.7} />
              </button>
            </div>
          ))}
        </div>

        <div className="vet-shop-summary">
          <div className="vet-shop-disc">
            <span>Descuento</span>
            <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
          </div>
          <div className="vet-shop-srow"><span>Subtotal (base)</span><span>{vetMoney(T.base)}</span></div>
          {promoSavings > 0 && <div className="vet-shop-srow savings"><span>Ahorro por promociones</span><span>−{vetMoney(promoSavings)}</span></div>}
          {T.disc > 0 && <div className="vet-shop-srow"><span>Descuento</span><span>−{vetMoney(T.disc)}</span></div>}
          {T.byRate.filter((r) => r.amount > 0).map((r) => (
            <div key={r.id} className="vet-shop-srow"><span>{r.name}</span><span>{vetMoney(r.amount)}</span></div>
          ))}
          <div className="vet-shop-srow grand"><span>Total</span><span>{vetMoney(total)}</span></div>
          <button type="button" className="vet-shop-charge" disabled={lines.length === 0}
            style={lines.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => setPayOpen(true)}>
            Cobrar {vetMoney(total)}
          </button>
        </div>
      </aside>

      <VetModalShell open={custOpen} z={1600} title={custPurpose === 'fiscal' ? 'Cliente a facturar' : 'Asociar propietario'} subtitle={custPurpose === 'fiscal' ? 'La factura electrónica irá a su nombre' : 'Vincula la venta a un cliente (opcional)'}
        icon={VetIcons.User} accent="amatista" width={custPurpose === 'fiscal' ? 640 : 560} onClose={() => setCustOpen(false)}>
        <VetCustomerPicker mode={custPurpose === 'fiscal' ? 'fiscal' : 'basic'} onPick={(c) => {
          if (custPurpose === 'fiscal') { setFiscalCustomer(c); setCustomer({ owner: { id: c.id, name: c.name }, animal: null }); }
          else { setCustomer({ owner: { id: c.id, name: c.name, document: c.documentId, email: c.email }, animal: null }); }
          setCustOpen(false);
        }} />
      </VetModalShell>

      <VetShopPayModal open={payOpen} total={total}
        customer={fiscalCustomer}
        onSelectCustomer={() => { setCustPurpose('fiscal'); setCustOpen(true); }}
        onUpdateCustomer={(c) => setFiscalCustomer((p) => ({ ...p, ...c }))}
        onClose={() => setPayOpen(false)} onConfirm={confirmPay} />
      <VetShopReceiptModal open={!!receipt} sale={receipt} products={shop.products} taxConfig={shop.taxConfig} onClose={() => setReceipt(null)} />
    </div>
  );
}

Object.assign(window, { VetShopPOSView });
