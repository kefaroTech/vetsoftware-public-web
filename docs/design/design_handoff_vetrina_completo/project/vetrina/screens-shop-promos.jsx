/* global React, VetIcons, VetModalShell,
   VetBaseField, VetBaseInput, VetBaseSelect, VetDateInput,
   VET_PROMO_TYPES, vetPromoStatus, VET_PROMO_STATUS_TONE,
   VET_SHOP_CATEGORIES, VET_SHOP_SERVICE_CATEGORIES,
   vetMoney, VetSwitchToggle */

// ============================================================================
// Promociones — administración
// ============================================================================

function vetPromoTarget(promo, shop) {
  if (promo.type === 'PAQUETE') return `${promo.bundleItems.length} ítems`;
  if (promo.target === 'categoria') {
    const all = [...VET_SHOP_CATEGORIES, ...VET_SHOP_SERVICE_CATEGORIES];
    return 'Categoría: ' + ((all.find((c) => c.id === promo.categoryId) || {}).name || promo.categoryId);
  }
  if (promo.target === 'producto') return (shop.products.find((p) => p.id === promo.targetId) || {}).name || '—';
  if (promo.target === 'servicio') return (shop.services.find((s) => s.id === promo.targetId) || {}).name || '—';
  return '—';
}

function vetPromoValue(promo) {
  if (promo.type === 'PAQUETE') return vetMoney(promo.bundlePrice);
  if (promo.type === 'PRECIO') return vetMoney(promo.specialPrice);
  return promo.valueKind === 'PCT' ? `${promo.value}%` : `−${vetMoney(promo.value)}`;
}

function VetShopPromosView({ shop }) {
  const [formOpen, setFormOpen] = React.useState(null);
  const [removeFor, setRemoveFor] = React.useState(null);

  const activeCount = shop.promos.filter((p) => vetPromoStatus(p) === 'ACTIVA').length;

  return (
    <div className="vet-shop-inv">
      <header className="vet-shop-inv-head">
        <div>
          <div className="vet-shop-kicker">Tienda · Promociones</div>
          <h1 className="vet-shop-title">Promociones y paquetes</h1>
        </div>
        <button type="button" className="vet-shop-cta" onClick={() => setFormOpen({ initial: null })}>
          <VetIcons.Plus size={16} strokeWidth={1.8} /> Nueva promoción
        </button>
      </header>

      {activeCount > 0 && (
        <div className="vet-shop-alert" style={{ background: 'oklch(94% 0.06 150)', borderColor: 'oklch(85% 0.08 150)', color: 'oklch(38% 0.13 150)' }}>
          <VetIcons.Bell size={15} strokeWidth={1.8} />
          <span><strong>{activeCount}</strong> promoción{activeCount === 1 ? '' : 'es'} activa{activeCount === 1 ? '' : 's'} aplicándose en el punto de venta.</span>
        </div>
      )}

      <table className="vet-shop-table">
        <thead>
          <tr><th>Promoción</th><th>Tipo</th><th>Aplica a</th><th>Valor</th><th>Vigencia</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {shop.promos.length === 0 ? (
            <tr><td colSpan={7} className="vet-shop-table-empty">Sin promociones. Crea la primera.</td></tr>
          ) : shop.promos.map((p) => {
            const st = vetPromoStatus(p);
            const tone = VET_PROMO_STATUS_TONE[st];
            return (
              <tr key={p.id} className="vet-shop-trow" onClick={() => setFormOpen({ initial: p })}>
                <td className="vet-shop-tname">{p.name}</td>
                <td><span className="vet-shop-catpill" style={{ background: 'var(--amatista-100)', color: 'var(--amatista-700)' }}>{VET_PROMO_TYPES[p.type]}</span></td>
                <td>{vetPromoTarget(p, shop)}</td>
                <td className="vet-shop-tstock">{vetPromoValue(p)}</td>
                <td className="vet-shop-texp">{p.startDate || p.endDate ? `${p.startDate ?? '—'} → ${p.endDate ?? '—'}` : 'Permanente'}</td>
                <td><span className="vet-shop-stpill" style={{ background: tone.bg, color: tone.fg }}>{tone.label}</span></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="vet-svc-actions">
                    <VetSwitchToggle value={p.active} onChange={(v) => shop.togglePromo(p.id, v)} />
                    <button type="button" className="vet-plan-icon danger" onClick={() => setRemoveFor(p)} aria-label="Eliminar">
                      <VetIcons.Trash size={14} strokeWidth={1.7} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <VetShopPromoForm open={!!formOpen} initial={formOpen?.initial} shop={shop}
        onClose={() => setFormOpen(null)}
        onSave={(d) => { shop.upsertPromo(d); setFormOpen(null); }} />

      <VetModalShell open={!!removeFor} title="Eliminar promoción" subtitle={removeFor?.name}
        icon={VetIcons.Trash} accent="danger" width={420} onClose={() => setRemoveFor(null)}
        footerActions={
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setRemoveFor(null)}>Cancelar</button>
            <button type="button" className="vet-drawer-danger" onClick={() => { shop.removePromo(removeFor.id); setRemoveFor(null); }}>
              <VetIcons.Trash size={13} strokeWidth={1.7} /> Eliminar
            </button>
          </>
        }>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.55 }}>
          <strong>{removeFor?.name}</strong> dejará de aplicarse. Las ventas ya registradas no cambian.
        </p>
      </VetModalShell>
    </div>
  );
}

// ============================================================================
// Promo form
// ============================================================================

function VetShopPromoForm({ open, initial, shop, onClose, onSave }) {
  const [d, setD] = React.useState({});
  React.useEffect(() => {
    if (!open) return;
    setD(initial ? { ...initial } : {
      name: '', type: 'DESCUENTO', target: 'categoria', categoryId: 'higiene',
      targetId: '', value: '', valueKind: 'PCT', specialPrice: '',
      bundlePrice: '', bundleItems: [], startDate: '', endDate: '', active: true,
    });
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));

  const allCats = [...VET_SHOP_CATEGORIES, ...VET_SHOP_SERVICE_CATEGORIES];
  const valid = d.name?.trim() && (
    d.type === 'PAQUETE' ? (d.bundlePrice && (d.bundleItems?.length > 0))
    : d.type === 'PRECIO' ? d.specialPrice
    : d.value);

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title={initial ? 'Editar promoción' : 'Nueva promoción'}
      subtitle="Descuentos, precios especiales y paquetes"
      icon={VetIcons.Receipt} accent="amatista" width={580}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={!valid}
            style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onSave({ ...d, value: Number(d.value) || 0, specialPrice: Number(d.specialPrice) || 0, bundlePrice: Number(d.bundlePrice) || 0, targetId: d.target === 'categoria' ? undefined : (Number(d.targetId) || d.targetId) })}>
            {initial ? 'Guardar cambios' : 'Crear promoción'}
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        <VetBaseField label="Nombre" required>
          {({ id }) => <VetBaseInput id={id} value={d.name} onChange={(v) => u({ name: v })} placeholder="Ej. 20% en Higiene" />}
        </VetBaseField>
        <VetBaseField label="Tipo" required>
          {({ id }) => <VetBaseSelect id={id} value={d.type} onChange={(v) => u({ type: v })}
            options={Object.entries(VET_PROMO_TYPES).map(([k, v]) => ({ value: k, label: v }))} />}
        </VetBaseField>

        {d.type !== 'PAQUETE' && (
          <>
            <div className="vet-form-grid-2">
              <VetBaseField label="Aplica a" required>
                {({ id }) => <VetBaseSelect id={id} value={d.target} onChange={(v) => u({ target: v, targetId: '' })}
                  options={[
                    { value: 'categoria', label: 'Categoría' },
                    { value: 'producto', label: 'Producto' },
                    { value: 'servicio', label: 'Servicio' },
                  ]} />}
              </VetBaseField>
              {d.target === 'categoria' && (
                <VetBaseField label="Categoría" required>
                  {({ id }) => <VetBaseSelect id={id} value={d.categoryId} onChange={(v) => u({ categoryId: v })}
                    options={allCats.map((c) => ({ value: c.id, label: c.name }))} />}
                </VetBaseField>
              )}
              {d.target === 'producto' && (
                <VetBaseField label="Producto" required>
                  {({ id }) => <VetBaseSelect id={id} value={d.targetId} onChange={(v) => u({ targetId: v })}
                    options={shop.products.map((p) => ({ value: p.id, label: p.name }))} />}
                </VetBaseField>
              )}
              {d.target === 'servicio' && (
                <VetBaseField label="Servicio" required>
                  {({ id }) => <VetBaseSelect id={id} value={d.targetId} onChange={(v) => u({ targetId: v })}
                    options={shop.services.map((s) => ({ value: s.id, label: s.name }))} />}
                </VetBaseField>
              )}
            </div>

            {d.type === 'DESCUENTO' ? (
              <div className="vet-form-grid-2">
                <VetBaseField label="Tipo de valor" required>
                  {({ id }) => <VetBaseSelect id={id} value={d.valueKind} onChange={(v) => u({ valueKind: v })}
                    options={[{ value: 'PCT', label: 'Porcentaje (%)' }, { value: 'FIJO', label: 'Monto fijo ($)' }]} />}
                </VetBaseField>
                <VetBaseField label={d.valueKind === 'PCT' ? 'Porcentaje' : 'Monto'} required>
                  {({ id }) => <VetBaseInput id={id} type="number" value={d.value} onChange={(v) => u({ value: v })} placeholder={d.valueKind === 'PCT' ? '20' : '5000'} />}
                </VetBaseField>
              </div>
            ) : (
              <VetBaseField label="Precio especial" required>
                {({ id }) => <VetBaseInput id={id} type="number" value={d.specialPrice} onChange={(v) => u({ specialPrice: v })} placeholder="59000" />}
              </VetBaseField>
            )}
          </>
        )}

        {d.type === 'PAQUETE' && (
          <VetPromoBundleEditor d={d} u={u} shop={shop} />
        )}

        <div className="vet-form-grid-2">
          <VetBaseField label="Inicio (opcional)">
            {({ id }) => <VetDateInput id={id} value={d.startDate} onChange={(v) => u({ startDate: v })} />}
          </VetBaseField>
          <VetBaseField label="Fin (opcional)">
            {({ id }) => <VetDateInput id={id} value={d.endDate} onChange={(v) => u({ endDate: v })} />}
          </VetBaseField>
        </div>
        <label className="vet-promo-active">
          <VetSwitchToggle value={d.active} onChange={(v) => u({ active: v })} />
          <span>Promoción activa</span>
        </label>
      </div>
    </VetModalShell>
  );
}

// Editor de ítems del paquete
function VetPromoBundleEditor({ d, u, shop }) {
  const [kind, setKind] = React.useState('service');
  const [pick, setPick] = React.useState('');
  const items = d.bundleItems || [];

  function add() {
    if (!pick) return;
    const id = kind === 'product' ? Number(pick) : pick;
    const ex = items.find((b) => b.kind === kind && String(b.id) === String(id));
    if (ex) u({ bundleItems: items.map((b) => (b.kind === kind && String(b.id) === String(id)) ? { ...b, qty: b.qty + 1 } : b) });
    else u({ bundleItems: [...items, { kind, id, qty: 1 }] });
    setPick('');
  }
  function remove(i) { u({ bundleItems: items.filter((_, idx) => idx !== i) }); }

  const original = items.reduce((a, bi) => {
    const it = bi.kind === 'service' ? shop.services.find((s) => s.id === bi.id) : shop.products.find((p) => p.id === bi.id);
    return a + (it ? it.salePrice * bi.qty : 0);
  }, 0);

  return (
    <div className="vet-promo-bundle">
      <span className="vet-hosp-range-label">Ítems del paquete</span>
      <div className="vet-promo-bundle-add">
        <select className="vet-shop-fsel" value={kind} onChange={(e) => { setKind(e.target.value); setPick(''); }}>
          <option value="service">Servicio</option>
          <option value="product">Producto</option>
        </select>
        <select className="vet-shop-fsel" style={{ flex: 1 }} value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Selecciona…</option>
          {(kind === 'service' ? shop.services : shop.products).map((it) => (
            <option key={it.id} value={it.id}>{it.name}</option>
          ))}
        </select>
        <button type="button" className="vet-shop-restock" onClick={add}>Añadir</button>
      </div>
      {items.length > 0 && (
        <div className="vet-promo-bundle-list">
          {items.map((bi, i) => {
            const it = bi.kind === 'service' ? shop.services.find((s) => s.id === bi.id) : shop.products.find((p) => p.id === bi.id);
            return (
              <div key={i} className="vet-promo-bundle-item">
                <span>{bi.qty}× {it?.name ?? '—'}</span>
                <button type="button" onClick={() => remove(i)} aria-label="Quitar"><VetIcons.X size={12} strokeWidth={2} /></button>
              </div>
            );
          })}
          <div className="vet-promo-bundle-orig">Precio normal sumado: {vetMoney(original)}</div>
        </div>
      )}
      <VetBaseField label="Precio del paquete" required>
        {({ id }) => <VetBaseInput id={id} type="number" value={d.bundlePrice} onChange={(v) => u({ bundlePrice: v })} placeholder="180000" />}
      </VetBaseField>
    </div>
  );
}

Object.assign(window, { VetShopPromosView });
