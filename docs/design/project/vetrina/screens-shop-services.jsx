/* global React, VetIcons, VetModalShell,
   VetBaseField, VetBaseInput, VetBaseSelect, VetBaseTextarea,
   VET_SHOP_SERVICE_CATEGORIES, VET_SHOP_SVC_TONE, vetSvcCatName, vetMoney */

// ============================================================================
// Servicios — administración de servicios ofrecidos a venta
// ============================================================================

function VetShopServicesView({ shop }) {
  const [query, setQuery] = React.useState('');
  const [cat, setCat] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(null);   // { initial } | null
  const [removeFor, setRemoveFor] = React.useState(null);
  const [catOpen, setCatOpen] = React.useState(false);
  const cats = shop.svcCats || [];

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return shop.services.filter((s) => {
      if (cat && s.category !== cat) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [shop.services, query, cat]);

  // Agrupar por categoría para lectura
  const groups = React.useMemo(() => {
    const map = new Map();
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category).push(s);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="vet-shop-inv">
      <header className="vet-shop-inv-head">
        <div>
          <div className="vet-shop-kicker">Tienda · Servicios</div>
          <h1 className="vet-shop-title">Servicios ofrecidos</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" className="vet-historia-btn-ghost" onClick={() => setCatOpen(true)}>
            <VetIcons.Package size={14} strokeWidth={1.8} /> Categorías
          </button>
          <button type="button" className="vet-shop-cta" onClick={() => setFormOpen({ initial: null })}>
            <VetIcons.Plus size={16} strokeWidth={1.8} /> Nuevo servicio
          </button>
        </div>
      </header>

      <div className="vet-shop-inv-filters">
        <div className="vet-shop-search inv">
          <VetIcons.Search size={15} strokeWidth={1.7} style={{ color: 'var(--warm-500)' }} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar servicio…" />
        </div>
        <select className="vet-shop-fsel" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {groups.length === 0 ? (
        <div className="vet-shop-table-empty" style={{ padding: 48, textAlign: 'center', color: 'var(--warm-500)' }}>
          Sin servicios para el filtro.
        </div>
      ) : groups.map(([catId, items]) => (
        <section key={catId} className="vet-svc-group">
          <div className="vet-svc-group-head">
            <span className="vet-shop-catpill" style={VET_SHOP_SVC_TONE[catId]}>{vetSvcCatName(catId)}</span>
            <span className="vet-svc-group-count">{items.length}</span>
          </div>
          <div className="vet-svc-list">
            {items.map((s) => (
              <div key={s.id} className="vet-svc-row" onClick={() => setFormOpen({ initial: s })}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="vet-svc-name">{s.name}</div>
                  {s.notes && <div className="vet-svc-notes">{s.notes}</div>}
                </div>
                <div className="vet-svc-price">{vetMoney(s.salePrice)}</div>
                <div className="vet-svc-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="vet-plan-icon" onClick={() => setFormOpen({ initial: s })} aria-label="Editar">
                    <VetIcons.Edit size={14} strokeWidth={1.7} />
                  </button>
                  <button type="button" className="vet-plan-icon danger" onClick={() => setRemoveFor(s)} aria-label="Eliminar">
                    <VetIcons.Trash size={14} strokeWidth={1.7} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <VetShopServiceForm open={!!formOpen} initial={formOpen?.initial} cats={cats}
        onClose={() => setFormOpen(null)}
        onSave={(d) => { shop.upsertService(d); setFormOpen(null); }} />

      <VetCategoryManager
        open={catOpen} onClose={() => setCatOpen(false)}
        title="Categorías de servicios"
        categories={cats}
        counts={Object.fromEntries(cats.map((c) => [c.id, shop.services.filter((s) => s.category === c.id).length]))}
        onUpsert={shop.upsertSvcCat}
        onRemove={shop.removeSvcCat}
      />

      <VetModalShell open={!!removeFor} title="Eliminar servicio"
        subtitle={removeFor?.name} icon={VetIcons.Trash} accent="danger" width={420}
        onClose={() => setRemoveFor(null)}
        footerActions={
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setRemoveFor(null)}>Cancelar</button>
            <button type="button" className="vet-drawer-danger" onClick={() => { shop.removeService(removeFor.id); setRemoveFor(null); }}>
              <VetIcons.Trash size={13} strokeWidth={1.7} /> Eliminar
            </button>
          </>
        }>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.55 }}>
          <strong>{removeFor?.name}</strong> dejará de aparecer en el punto de venta. Las ventas
          ya registradas no se modifican.
        </p>
      </VetModalShell>
    </div>
  );
}

// ============================================================================
// Service form
// ============================================================================

function VetShopServiceForm({ open, initial, cats, onClose, onSave }) {
  const [d, setD] = React.useState({});
  React.useEffect(() => {
    if (!open) return;
    setD(initial ? { ...initial } : { name: '', category: 'consulta', salePrice: '', taxId: 'excluido', notes: '' });
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const valid = d.name?.trim() && d.salePrice;

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title={initial ? 'Editar servicio' : 'Nuevo servicio'}
      subtitle="Servicios ofrecidos a venta"
      icon={VetIcons.Stethoscope} accent="amatista" width={520}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={!valid}
            style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onSave({ ...d, salePrice: Number(d.salePrice) || 0 })}>
            {initial ? 'Guardar cambios' : 'Crear servicio'}
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        <VetBaseField label="Nombre del servicio" required>
          {({ id }) => <VetBaseInput id={id} value={d.name} onChange={(v) => u({ name: v })} placeholder="Ej. Consulta general" />}
        </VetBaseField>
        <div className="vet-form-grid-2">
          <VetBaseField label="Categoría" required>
            {({ id }) => <VetBaseSelect id={id} value={d.category} onChange={(v) => u({ category: v })}
              options={(cats || VET_SHOP_SERVICE_CATEGORIES).map((c) => ({ value: c.id, label: c.name }))} />}
          </VetBaseField>
          <VetBaseField label="Precio" required>
            {({ id }) => <VetBaseInput id={id} type="number" value={d.salePrice} onChange={(v) => u({ salePrice: v })} placeholder="55000" />}
          </VetBaseField>
        </div>
        <VetBaseField label="Impuesto">
          {({ id }) => <VetBaseSelect id={id} value={d.taxId || 'excluido'} onChange={(v) => u({ taxId: v })}
            options={window.VET_TAX_RATES.map((t) => ({ value: t.id, label: t.name }))} />}
        </VetBaseField>
        <VetBaseField label="¿El precio incluye impuestos?">
          {({ id }) => <VetBaseSelect id={id} value={(d.priceIncludesTax !== false) ? 'si' : 'no'} onChange={(v) => u({ priceIncludesTax: v === 'si' })}
            options={[{ value: 'si', label: 'Sí, incluido' }, { value: 'no', label: 'No, se suma' }]} />}
        </VetBaseField>
        <VetBaseField label="Notas (opcional)">
          {({ id }) => <VetBaseTextarea id={id} value={d.notes} onChange={(v) => u({ notes: v })} rows={2} placeholder="Descripción, qué incluye…" />}
        </VetBaseField>
      </div>
    </VetModalShell>
  );
}

Object.assign(window, { VetShopServicesView });
