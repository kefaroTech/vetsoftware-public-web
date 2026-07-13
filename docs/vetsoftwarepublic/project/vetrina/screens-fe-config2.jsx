/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseInput, VetBaseSelect, VetDateInput,
   VET_FE_RESOLUTIONS, VET_FE_WITHHOLDING, VET_FE_DOC_TYPE, vetFeMoney, useVetToast */

// ============================================================================
// Facturación electrónica — Resoluciones de numeración + Retenciones
// ============================================================================

function VetFeNumeracion() {
  const toast = useVetToast();
  const [rows, setRows] = React.useState(VET_FE_RESOLUTIONS);
  const [form, setForm] = React.useState(null); // {initial} | null

  function save(d) {
    if (d.id) { setRows((a) => a.map((r) => r.id === d.id ? { ...r, ...d } : r)); toast.success('Resolución actualizada', d.resolutionNumber); }
    else { const id = Date.now(); setRows((a) => [...a, { ...d, id, currentNumber: d.rangeFrom, enabled: true }]); toast.success('Resolución creada', d.resolutionNumber); }
    setForm(null);
  }

  return (
    <div className="vet-fe-formcol">
      <div className="vet-fe-listhead">
        <VetFeSectionHead icon={VetIcons.FileText} title="Resoluciones de numeración" sub="Rangos de consecutivos autorizados por la DIAN, por tipo de documento" />
        <button type="button" className="vet-shop-cta" onClick={() => setForm({ initial: null })}><VetIcons.Plus size={16} strokeWidth={2} /> Nueva resolución</button>
      </div>

      <div className="vet-fe-restable">
        {rows.map((r) => {
          const used = r.currentNumber - r.rangeFrom;
          const total = r.rangeTo - r.rangeFrom + 1;
          const pct = Math.min(100, Math.round((used / total) * 100));
          const low = (r.rangeTo - r.currentNumber) / total < 0.1;
          const vto = new Date(r.validTo) < new Date('2026-08-01');
          return (
            <div key={r.id} className="vet-fe-resrow">
              <div className="vet-fe-res-main">
                <div className="vet-fe-res-type">{VET_FE_DOC_TYPE[r.documentType].label}{r.prefix && <span className="vet-fe-res-prefix">{r.prefix}</span>}</div>
                <div className="vet-fe-res-meta">Res. {r.resolutionNumber} · rango {r.rangeFrom.toLocaleString('es')}–{r.rangeTo.toLocaleString('es')}</div>
                <div className="vet-fe-res-meta">Vigencia {r.validFrom} → {r.validTo}{vto && <span className="vet-fe-res-warn"> · por vencer</span>}</div>
              </div>
              <div className="vet-fe-res-consumo">
                <div className="vet-fe-res-bar"><span style={{ width: pct + '%', background: low ? 'oklch(60% 0.18 25)' : 'var(--amatista-500)' }} /></div>
                <div className="vet-fe-res-barlbl">{used.toLocaleString('es')} usados · {(r.rangeTo - r.currentNumber).toLocaleString('es')} disponibles{low && <span className="vet-fe-res-warn"> · por agotarse</span>}</div>
              </div>
              <div className="vet-fe-res-actions">
                <span className="vet-shop-stpill" style={r.enabled ? { background: 'oklch(94% 0.06 150)', color: 'oklch(40% 0.13 150)' } : { background: 'var(--warm-200)', color: 'var(--warm-600)' }}>{r.enabled ? 'Activa' : 'Inactiva'}</span>
                <button type="button" className="vet-plan-icon" onClick={() => setForm({ initial: r })}><VetIcons.Edit size={14} strokeWidth={1.8} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <VetFeResolutionForm open={!!form} initial={form?.initial} onClose={() => setForm(null)} onSave={save} />
    </div>
  );
}

function VetFeResolutionForm({ open, initial, onClose, onSave }) {
  const [d, setD] = React.useState({});
  React.useEffect(() => {
    if (!open) return;
    setD(initial ? { ...initial } : { documentType: 'FE_VENTA', resolutionNumber: '', resolutionDate: '2026-01-01', prefix: '', rangeFrom: '', rangeTo: '', validFrom: '2026-01-01', validTo: '2027-01-01', technicalKey: '' });
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const valid = d.resolutionNumber && d.rangeFrom && d.rangeTo && Number(d.rangeFrom) <= Number(d.rangeTo);

  return (
    <VetModalShell open={open} onClose={onClose} title={initial ? 'Editar resolución' : 'Nueva resolución'} subtitle="Numeración autorizada por la DIAN"
      icon={VetIcons.FileText} accent="amatista" width={560}
      footerActions={<><button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
        <button type="button" className="vet-btn-primary-modal" disabled={!valid} style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null}
          onClick={() => onSave({ ...d, rangeFrom: Number(d.rangeFrom), rangeTo: Number(d.rangeTo) })}>{initial ? 'Guardar' : 'Crear'}</button></>}>
      <div className="vet-action-modal-body">
        <div className="vet-form-grid-2">
          <VetBaseField label="Tipo de documento" required>
            {({ id }) => <VetBaseSelect id={id} value={d.documentType} onChange={(v) => u({ documentType: v })}
              options={Object.entries(VET_FE_DOC_TYPE).map(([k, v]) => ({ value: k, label: v.label }))} />}
          </VetBaseField>
          <VetBaseField label="Prefijo">
            {({ id }) => <VetBaseInput id={id} value={d.prefix} onChange={(v) => u({ prefix: v })} placeholder="FE" />}
          </VetBaseField>
          <div className="vet-form-span-2">
            <VetBaseField label="Número de resolución" required>
              {({ id }) => <VetBaseInput id={id} value={d.resolutionNumber} onChange={(v) => u({ resolutionNumber: v })} />}
            </VetBaseField>
          </div>
          <VetBaseField label="Rango desde" required>
            {({ id }) => <VetBaseInput id={id} type="number" value={d.rangeFrom} onChange={(v) => u({ rangeFrom: v })} />}
          </VetBaseField>
          <VetBaseField label="Rango hasta" required>
            {({ id }) => <VetBaseInput id={id} type="number" value={d.rangeTo} onChange={(v) => u({ rangeTo: v })} />}
          </VetBaseField>
          <VetBaseField label="Vigente desde" required>
            {({ id }) => <VetDateInput id={id} value={d.validFrom} onChange={(v) => u({ validFrom: v })} />}
          </VetBaseField>
          <VetBaseField label="Vigente hasta" required>
            {({ id }) => <VetDateInput id={id} value={d.validTo} onChange={(v) => u({ validTo: v })} />}
          </VetBaseField>
          <div className="vet-form-span-2">
            <VetBaseField label="Clave técnica (DIAN)">
              {({ id }) => <VetBaseInput id={id} value={d.technicalKey} onChange={(v) => u({ technicalKey: v })} />}
            </VetBaseField>
          </div>
        </div>
        {d.rangeFrom && d.rangeTo && Number(d.rangeFrom) > Number(d.rangeTo) && <p className="vet-pauta-help vet-pauta-err">El rango "desde" no puede ser mayor que "hasta".</p>}
      </div>
    </VetModalShell>
  );
}

function VetFeRetenciones() {
  const toast = useVetToast();
  const [d, setD] = React.useState({ ...VET_FE_WITHHOLDING });
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const ej = 1000000;

  return (
    <div className="vet-fe-formcol">
      <VetFeSectionHead icon={VetIcons.Receipt} title="Retenciones" sub="Tarifas aplicadas a clientes marcados como agente retenedor (opcional)" />
      <div className="vet-fe-card">
        <div className="vet-form-grid-3">
          <VetBaseField label="ReteFuente (% sobre base)">
            {({ id }) => <VetBaseInput id={id} type="number" value={d.reteFuenteRate} onChange={(v) => u({ reteFuenteRate: Number(v) })} />}
          </VetBaseField>
          <VetBaseField label="ReteIVA (% sobre IVA)">
            {({ id }) => <VetBaseInput id={id} type="number" value={d.reteIvaRate} onChange={(v) => u({ reteIvaRate: Number(v) })} />}
          </VetBaseField>
          <VetBaseField label="ReteICA (% sobre base)">
            {({ id }) => <VetBaseInput id={id} type="number" value={d.reteIcaRate} onChange={(v) => u({ reteIcaRate: Number(v) })} />}
          </VetBaseField>
        </div>
        <div className="vet-fe-ej">
          <div className="vet-fe-ej-title">Ejemplo sobre base {vetFeMoney(ej)} (IVA 19%)</div>
          <div className="vet-fe-ej-rows">
            <div><span>ReteFuente</span><strong>−{vetFeMoney(ej * d.reteFuenteRate / 100)}</strong></div>
            <div><span>ReteIVA</span><strong>−{vetFeMoney(ej * 0.19 * d.reteIvaRate / 100)}</strong></div>
            <div><span>ReteICA</span><strong>−{vetFeMoney(ej * d.reteIcaRate / 100)}</strong></div>
          </div>
        </div>
        <p className="vet-pauta-help" style={{ marginTop: 12 }}>Se aplican solo a clientes marcados como <strong>agente retenedor</strong> en su ficha.</p>
      </div>
      <div className="vet-fe-formfoot">
        <button type="button" className="vet-btn-primary-modal" onClick={() => toast.success('Retenciones guardadas', '')}>Guardar retenciones</button>
      </div>
    </div>
  );
}

Object.assign(window, { VetFeNumeracion, VetFeRetenciones });
