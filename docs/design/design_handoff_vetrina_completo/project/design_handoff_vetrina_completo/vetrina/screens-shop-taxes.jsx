/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseInput, vetMoney */

// ============================================================================
// Impuestos — administración de tasas (CRUD)
// ============================================================================

function VetShopTaxesView({ shop }) {
  const [formOpen, setFormOpen] = React.useState(null);   // { initial } | null
  const [removeFor, setRemoveFor] = React.useState(null);

  return (
    <div className="vet-shop-inv">
      <header className="vet-shop-inv-head">
        <div>
          <div className="vet-shop-kicker">Tienda · Impuestos</div>
          <h1 className="vet-shop-title">Administración de impuestos</h1>
        </div>
        <button type="button" className="vet-shop-cta" onClick={() => setFormOpen({ initial: null })}>
          <VetIcons.Plus size={16} strokeWidth={1.8} /> Nuevo impuesto
        </button>
      </header>

      <table className="vet-shop-table">
        <thead>
          <tr><th>Impuesto</th><th>Porcentaje</th><th>Ejemplo sobre $100.000</th><th></th></tr>
        </thead>
        <tbody>
          {shop.taxRates.length === 0 ? (
            <tr><td colSpan={4} className="vet-shop-table-empty">Sin impuestos. Crea el primero.</td></tr>
          ) : shop.taxRates.map((t) => (
            <tr key={t.id} className="vet-shop-trow" onClick={() => setFormOpen({ initial: t })}>
              <td className="vet-shop-tname">{t.name}</td>
              <td className="vet-shop-tstock">{Math.round(t.rate * 100)}%</td>
              <td>{vetMoney(Math.round(100000 * t.rate))}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="vet-svc-actions">
                  <button type="button" className="vet-plan-icon" onClick={() => setFormOpen({ initial: t })} aria-label="Editar">
                    <VetIcons.Edit size={14} strokeWidth={1.7} />
                  </button>
                  <button type="button" className="vet-plan-icon danger" onClick={() => setRemoveFor(t)} aria-label="Eliminar">
                    <VetIcons.Trash size={14} strokeWidth={1.7} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="vet-tax-note">
        Cada producto y servicio tiene asignado un impuesto (campo "Impuesto" en su ficha) e indica
        si su precio ya lo incluye. En el punto de venta el impuesto se calcula por línea y se agrupa
        por tasa en la factura.
      </p>

      <VetShopTaxForm open={!!formOpen} initial={formOpen?.initial}
        onClose={() => setFormOpen(null)}
        onSave={(d) => { shop.upsertTaxRate(d); setFormOpen(null); }} />

      <VetModalShell open={!!removeFor} title="Eliminar impuesto" subtitle={removeFor?.name}
        icon={VetIcons.Trash} accent="danger" width={420} onClose={() => setRemoveFor(null)}
        footerActions={
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setRemoveFor(null)}>Cancelar</button>
            <button type="button" className="vet-drawer-danger" onClick={() => { shop.removeTaxRate(removeFor.id); setRemoveFor(null); }}>
              <VetIcons.Trash size={13} strokeWidth={1.7} /> Eliminar
            </button>
          </>
        }>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.55 }}>
          <strong>{removeFor?.name}</strong> dejará de estar disponible. Los productos que lo tenían
          asignado deberán actualizarse a otra tasa.
        </p>
      </VetModalShell>
    </div>
  );
}

function VetShopTaxForm({ open, initial, onClose, onSave }) {
  const [d, setD] = React.useState({});
  React.useEffect(() => {
    if (!open) return;
    setD(initial ? { ...initial, pct: Math.round(initial.rate * 100) } : { name: '', pct: '' });
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const valid = d.name?.trim() && d.pct !== '' && d.pct != null;

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title={initial ? 'Editar impuesto' : 'Nuevo impuesto'}
      subtitle="Tasa de impuesto"
      icon={VetIcons.BarChart3} accent="amatista" width={460}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={!valid}
            style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onSave({ id: d.id, name: d.name.trim(), rate: (Number(d.pct) || 0) / 100 })}>
            {initial ? 'Guardar cambios' : 'Crear impuesto'}
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        <VetBaseField label="Nombre" required>
          {({ id }) => <VetBaseInput id={id} value={d.name} onChange={(v) => u({ name: v })} placeholder="Ej. IVA 19%, Impoconsumo 8%, Exento…" />}
        </VetBaseField>
        <VetBaseField label="Porcentaje" required>
          {({ id }) => (
            <div className="vet-tax-pct">
              <VetBaseInput id={id} type="number" value={d.pct} onChange={(v) => u({ pct: v })} placeholder="19" />
              <span>%</span>
            </div>
          )}
        </VetBaseField>
        <p className="vet-tax-note" style={{ marginTop: 0 }}>
          Usa 0% para impuestos exentos o excluidos. El nombre es libre: puedes crear IVA, impoconsumo,
          tasas especiales, etc.
        </p>
      </div>
    </VetModalShell>
  );
}

Object.assign(window, { VetShopTaxesView });
