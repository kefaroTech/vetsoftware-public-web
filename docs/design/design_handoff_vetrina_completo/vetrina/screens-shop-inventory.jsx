/* global React, VetIcons, VetModalShell,
   VetBaseField, VetBaseInput, VetBaseSelect, VetBaseTextarea, VetDateInput,
   VET_SHOP_CATEGORIES, VET_SHOP_CAT_TONE,
   vetShopStockState, vetMoney, useVetToast */

// ============================================================================
// Inventario
// ============================================================================

const VET_SHOP_STOCK_LABEL = {
  OK:      { label: 'En stock',   tone: { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)' } },
  BAJO:    { label: 'Stock bajo', tone: { bg: 'oklch(94% 0.07 80)',  fg: 'oklch(45% 0.13 70)' } },
  AGOTADO: { label: 'Agotado',    tone: { bg: 'oklch(93% 0.06 25)',  fg: 'oklch(48% 0.19 25)' } },
};

function vetCatName(id) { return (VET_SHOP_CATEGORIES.find((c) => c.id === id) || {}).name || id; }

function vetExpirySoon(date) {
  if (!date) return false;
  const d = new Date(date), now = new Date('2026-05-23');
  const days = (d - now) / 86400000;
  return days <= 120;
}

function VetShopInventoryView({ shop }) {
  const [query, setQuery] = React.useState('');
  const [cat, setCat] = React.useState('');
  const [stState, setStState] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [formOpen, setFormOpen] = React.useState(null);   // { initial } | null
  const [restockFor, setRestockFor] = React.useState(null);
  const pageSize = 10;

  const lowCount = shop.products.filter((p) => vetShopStockState(p) !== 'OK').length;
  const expiryCount = shop.products.filter((p) => vetExpirySoon(p.expiryDate)).length;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return shop.products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (stState && vetShopStockState(p) !== stState) return false;
      if (q && !(p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.supplier ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [shop.products, query, cat, stState]);

  React.useEffect(() => { setPage(1); }, [query, cat, stState]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="vet-shop-inv">
      <header className="vet-shop-inv-head">
        <div>
          <div className="vet-shop-kicker">Tienda · Inventario</div>
          <h1 className="vet-shop-title">Inventario de productos</h1>
        </div>
        <button type="button" className="vet-shop-cta" onClick={() => setFormOpen({ initial: null })}>
          <VetIcons.Plus size={16} strokeWidth={1.8} /> Nuevo producto
        </button>
      </header>

      {(lowCount > 0 || expiryCount > 0) && (
        <div className="vet-shop-alert">
          <VetIcons.Bell size={15} strokeWidth={1.8} />
          <span>
            {lowCount > 0 && <><strong>{lowCount}</strong> con stock bajo o agotado</>}
            {lowCount > 0 && expiryCount > 0 && ' · '}
            {expiryCount > 0 && <><strong>{expiryCount}</strong> por vencer (≤120 días)</>}
          </span>
        </div>
      )}

      <div className="vet-shop-inv-filters">
        <div className="vet-shop-search inv">
          <VetIcons.Search size={15} strokeWidth={1.7} style={{ color: 'var(--warm-500)' }} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nombre, SKU o proveedor…" />
        </div>
        <select className="vet-shop-fsel" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {VET_SHOP_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="vet-shop-fsel" value={stState} onChange={(e) => setStState(e.target.value)}>
          <option value="">Todo estado</option>
          <option value="OK">En stock</option>
          <option value="BAJO">Stock bajo</option>
          <option value="AGOTADO">Agotado</option>
        </select>
      </div>

      <table className="vet-shop-table">
        <thead>
          <tr>
            <th>Producto</th><th>Categoría</th><th>SKU</th>
            <th>Precio venta</th><th>Stock</th><th>Estado</th><th>Vence</th><th></th>
          </tr>
        </thead>
        <tbody>
          {slice.length === 0 ? (
            <tr><td colSpan={8} className="vet-shop-table-empty">Sin productos para el filtro.</td></tr>
          ) : slice.map((p) => {
            const st = vetShopStockState(p);
            const cfg = VET_SHOP_STOCK_LABEL[st];
            return (
              <tr key={p.id} className="vet-shop-trow" onClick={() => setFormOpen({ initial: p })}>
                <td className="vet-shop-tname">{p.name}</td>
                <td><span className="vet-shop-catpill" style={VET_SHOP_CAT_TONE[p.category]}>{vetCatName(p.category)}</span></td>
                <td className="vet-shop-tsku">{p.sku}</td>
                <td>{vetMoney(p.salePrice)}</td>
                <td className="vet-shop-tstock">{p.stock} u</td>
                <td><span className="vet-shop-stpill" style={cfg.tone}>{cfg.label}</span></td>
                <td className={'vet-shop-texp' + (vetExpirySoon(p.expiryDate) ? ' soon' : '')}>{p.expiryDate ?? '—'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="vet-shop-restock" onClick={() => setRestockFor(p)}>Reabastecer</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pageCount > 1 && (
        <div className="vet-shop-pag">
          <span>{filtered.length} productos · página {page} de {pageCount}</span>
          <div className="vet-shop-pag-ctrl">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><VetIcons.ChevronLeft size={14} /></button>
            <button type="button" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}><VetIcons.ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      <VetShopProductForm open={!!formOpen} initial={formOpen?.initial}
        onClose={() => setFormOpen(null)}
        onSave={(d) => { shop.upsertProduct(d); setFormOpen(null); }} />

      <VetShopRestockModal open={!!restockFor} product={restockFor}
        onClose={() => setRestockFor(null)}
        onConfirm={(qty) => { shop.restock(restockFor.id, qty); setRestockFor(null); }} />
    </div>
  );
}

// ============================================================================
// Product form
// ============================================================================

function VetShopProductForm({ open, initial, onClose, onSave }) {
  const [d, setD] = React.useState({});
  React.useEffect(() => {
    if (!open) return;
    setD(initial ? { ...initial }
      : { name: '', sku: '', category: 'alimento', costPrice: '', salePrice: '', stock: '', minStock: '', supplier: '', expiryDate: '', notes: '' });
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const valid = d.name?.trim() && d.sku?.trim() && d.salePrice;

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title={initial ? 'Editar producto' : 'Nuevo producto'}
      subtitle="Inventario de la tienda"
      icon={VetIcons.Package} accent="amatista" width={580}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={!valid}
            style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onSave({ ...d, costPrice: Number(d.costPrice) || 0, salePrice: Number(d.salePrice) || 0, stock: Number(d.stock) || 0, minStock: Number(d.minStock) || 0 })}>
            {initial ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        <VetBaseField label="Nombre" required>
          {({ id }) => <VetBaseInput id={id} value={d.name} onChange={(v) => u({ name: v })} placeholder="Royal Canin Adult 3kg" />}
        </VetBaseField>
        <div className="vet-form-grid-2">
          <VetBaseField label="SKU / Código" required>
            {({ id }) => <VetBaseInput id={id} value={d.sku} onChange={(v) => u({ sku: v })} placeholder="ALM-0001" />}
          </VetBaseField>
          <VetBaseField label="Categoría" required>
            {({ id }) => <VetBaseSelect id={id} value={d.category} onChange={(v) => u({ category: v })}
              options={VET_SHOP_CATEGORIES.map((c) => ({ value: c.id, label: c.name }))} />}
          </VetBaseField>
          <VetBaseField label="Precio compra">
            {({ id }) => <VetBaseInput id={id} type="number" value={d.costPrice} onChange={(v) => u({ costPrice: v })} placeholder="48000" />}
          </VetBaseField>
          <VetBaseField label="Precio venta" required>
            {({ id }) => <VetBaseInput id={id} type="number" value={d.salePrice} onChange={(v) => u({ salePrice: v })} placeholder="72000" />}
          </VetBaseField>
          <VetBaseField label="Stock actual">
            {({ id }) => <VetBaseInput id={id} type="number" value={d.stock} onChange={(v) => u({ stock: v })} placeholder="24" />}
          </VetBaseField>
          <VetBaseField label="Stock mínimo">
            {({ id }) => <VetBaseInput id={id} type="number" value={d.minStock} onChange={(v) => u({ minStock: v })} placeholder="6" />}
          </VetBaseField>
          <VetBaseField label="Proveedor">
            {({ id }) => <VetBaseInput id={id} value={d.supplier} onChange={(v) => u({ supplier: v })} placeholder="Royal Canin" />}
          </VetBaseField>
          <VetBaseField label="Vencimiento (opcional)">
            {({ id }) => <VetDateInput id={id} value={d.expiryDate} onChange={(v) => u({ expiryDate: v })} />}
          </VetBaseField>
        </div>
        <VetBaseField label="Notas">
          {({ id }) => <VetBaseTextarea id={id} value={d.notes} onChange={(v) => u({ notes: v })} rows={2} />}
        </VetBaseField>
      </div>
    </VetModalShell>
  );
}

// ============================================================================
// Restock modal
// ============================================================================

function VetShopRestockModal({ open, product, onClose, onConfirm }) {
  const [qty, setQty] = React.useState('');
  React.useEffect(() => { if (open) setQty(''); }, [open]);
  const n = Number(qty) || 0;
  if (!open || !product) return null;
  return (
    <VetModalShell
      open={open} onClose={onClose}
      title="Reabastecer"
      subtitle={`${product.name} · stock actual ${product.stock} u`}
      icon={VetIcons.Package} accent="amatista" width={420}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={n <= 0}
            style={n <= 0 ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onConfirm(n)}>
            Sumar {n > 0 ? `${n} u` : ''}
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        <VetBaseField label="Unidades a agregar" required>
          {({ id }) => <VetBaseInput id={id} type="number" value={qty} onChange={setQty} placeholder="12" />}
        </VetBaseField>
        {n > 0 && <div className="vet-shop-change"><span>Nuevo stock</span><strong>{product.stock + n} u</strong></div>}
      </div>
    </VetModalShell>
  );
}

Object.assign(window, { VetShopInventoryView });
