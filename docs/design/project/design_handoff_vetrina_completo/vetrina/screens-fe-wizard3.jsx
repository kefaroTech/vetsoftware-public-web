/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseInput, VetBaseSelect, VetDateInput,
   vetFeReqStatus, VET_FE_DOC_TYPE, VET_FE_COMPANY_DOCTYPE, VET_FE_TAX_REGIME, VET_FE_ENVIRONMENT,
   VET_FE_RESPONSIBILITY_DESC, vetFeMoney, VetFeSectionHead, VetFeWizFoot */

// ============================================================================
// Wizard — Paso 3 (Resoluciones) y Paso 4 (Revisión y activación)
// ============================================================================

const VET_FE_RES_REQUIRED = ['FE_VENTA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'DOC_EQUIV_POS'];

function VetFeStepResolutions({ store, onBack, onNext }) {
  const { state } = store;
  const [form, setForm] = React.useState(null);

  function save(d) { store.upsertResolution(d); store.toast.success(d.id ? 'Resolución actualizada' : 'Resolución creada', d.resolutionNumber); setForm(null); }

  const byType = {};
  for (const r of state.resolutions) if (r.enabled) byType[r.documentType] = r;

  return (
    <div className="vet-fe-formcol">
      <VetFeSectionHead icon={VetIcons.FileText} title="Resoluciones de numeración" sub="Rangos de consecutivos autorizados por la DIAN. Deben coincidir EXACTAMENTE con las registradas ante el proveedor." />

      <div className="vet-fe-resgrid">
        {VET_FE_RES_REQUIRED.map((dt) => {
          const r = byType[dt];
          const needsKey = dt === 'FE_VENTA';
          return (
            <div key={dt} className={'vet-fe-rescard' + (r ? ' set' : '')}>
              <div className="vet-fe-rescard-top">
                <div className="vet-fe-rescard-type">{VET_FE_DOC_TYPE[dt].label}{needsKey && <span className="vet-fe-keyreq">clave técnica</span>}</div>
                {r ? <span className="vet-fe-reqbadge ok">Configurada</span> : <span className="vet-fe-reqbadge pend">Pendiente</span>}
              </div>
              {r ? (
                <>
                  <div className="vet-fe-rescard-meta">Res. {r.resolutionNumber} · <strong>{r.prefix}</strong> {r.rangeFrom.toLocaleString('es')}–{r.rangeTo.toLocaleString('es')}</div>
                  <div className="vet-fe-rescard-meta">Vigencia {r.validFrom} → {r.validTo}</div>
                  {(() => { const total = r.rangeTo - r.rangeFrom + 1; const used = r.currentNumber - r.rangeFrom; const pct = Math.min(100, Math.round(used / total * 100)); const low = (r.rangeTo - r.currentNumber) / total < 0.1; return (
                    <div className="vet-fe-res-consumo"><div className="vet-fe-res-bar"><span style={{ width: pct + '%', background: low ? 'oklch(60% 0.18 25)' : 'var(--amatista-500)' }} /></div>
                    <div className="vet-fe-res-barlbl">{(r.rangeTo - r.currentNumber).toLocaleString('es')} disponibles{low && <span className="vet-fe-res-warn"> · por agotarse</span>}</div></div>
                  ); })()}
                  <button type="button" className="vet-fe-rescard-btn" onClick={() => setForm({ initial: r })}><VetIcons.Edit size={13} strokeWidth={1.8} /> Editar</button>
                </>
              ) : (
                <>
                  <div className="vet-fe-rescard-empty">Sin resolución activa para este tipo.</div>
                  <button type="button" className="vet-fe-rescard-btn add" onClick={() => setForm({ initial: { documentType: dt } })}><VetIcons.Plus size={13} strokeWidth={2} /> Agregar</button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="vet-fe-help">La <strong>clave técnica</strong> es obligatoria solo para la factura electrónica (FEV); la entrega la DIAN al habilitar el rango.</p>

      <VetFeWizFoot onBack={onBack} onNext={onNext} nextLabel="Continuar a revisión" nextDisabled={!byType['FE_VENTA']} draftNote={!byType['FE_VENTA'] ? 'La factura electrónica (FEV) es obligatoria' : null} />

      <VetFeResForm open={!!form} initial={form?.initial} onClose={() => setForm(null)} onSave={save} />
    </div>
  );
}

function VetFeResForm({ open, initial, onClose, onSave }) {
  const [d, setD] = React.useState({});
  React.useEffect(() => {
    if (!open) return;
    setD(initial && initial.id ? { ...initial } : { documentType: initial?.documentType || 'FE_VENTA', resolutionNumber: '', prefix: '', rangeFrom: '', rangeTo: '', validFrom: '2026-01-01', validTo: '2027-01-01', technicalKey: '' });
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const needsKey = d.documentType === 'FE_VENTA';
  const badRange = d.rangeFrom && d.rangeTo && Number(d.rangeFrom) > Number(d.rangeTo);
  const badDates = d.validFrom && d.validTo && d.validFrom > d.validTo;
  const valid = d.resolutionNumber && d.prefix && d.rangeFrom && d.rangeTo && !badRange && !badDates && (!needsKey || d.technicalKey);

  return (
    <VetModalShell open={open} onClose={onClose} title={initial?.id ? 'Editar resolución' : 'Agregar resolución'} subtitle={VET_FE_DOC_TYPE[d.documentType]?.label}
      icon={VetIcons.FileText} accent="amatista" width={560}
      footerActions={<><button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
        <button type="button" className="vet-btn-primary-modal" disabled={!valid} style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null}
          onClick={() => onSave({ ...d, rangeFrom: Number(d.rangeFrom), rangeTo: Number(d.rangeTo) })}>{initial?.id ? 'Guardar' : 'Crear'}</button></>}>
      <div className="vet-action-modal-body">
        <div className="vet-form-grid-2">
          <VetBaseField label="Tipo de documento" required>
            {({ id }) => <VetBaseSelect id={id} value={d.documentType} onChange={(v) => u({ documentType: v })}
              options={Object.entries(VET_FE_DOC_TYPE).map(([k, v]) => ({ value: k, label: v.label }))} />}
          </VetBaseField>
          <VetBaseField label="Prefijo" required>
            {({ id }) => <VetBaseInput id={id} value={d.prefix} onChange={(v) => u({ prefix: v.toUpperCase() })} placeholder="FE" />}
          </VetBaseField>
          <div className="vet-form-span-2">
            <VetBaseField label="Número de resolución" required>
              {({ id }) => <VetBaseInput id={id} value={d.resolutionNumber} onChange={(v) => u({ resolutionNumber: v })} placeholder="18764003912345" />}
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
          {needsKey && (
            <div className="vet-form-span-2">
              <VetBaseField label="Clave técnica (DIAN)" required>
                {({ id }) => <VetBaseInput id={id} value={d.technicalKey} onChange={(v) => u({ technicalKey: v })} />}
              </VetBaseField>
            </div>
          )}
        </div>
        {badRange && <p className="vet-pauta-help vet-pauta-err">El rango "desde" no puede ser mayor que "hasta".</p>}
        {badDates && <p className="vet-pauta-help vet-pauta-err">La fecha "desde" no puede ser posterior a "hasta".</p>}
      </div>
    </VetModalShell>
  );
}

// ---- Paso 4: Revisión y activación ----
function VetFeStepReview({ store, onEditStep, onExit }) {
  const { state } = store;
  const st = vetFeReqStatus(state);
  const p = state.profile;
  const [emitting, setEmitting] = React.useState(false);
  const [emitOk, setEmitOk] = React.useState(false);

  function emitTest() {
    setEmitting(true);
    setTimeout(() => { setEmitting(false); setEmitOk(true); store.toast.success('Documento de prueba validado', 'La DIAN aceptó el documento en Sandbox.'); }, 1200);
  }
  function toggleActivate() {
    if (!st.readyToActivate) return;
    store.activate(!state.activated);
    if (!state.activated) store.toast.success('Facturación activada', 'La clínica ya puede emitir documentos.');
  }

  const sections = [
    { step: 1, ok: st.profileOk, title: 'Identidad fiscal', rows: [['Razón social', p.legalName], ['Documento', `${(VET_FE_COMPANY_DOCTYPE[p.documentType] || '').split(' ')[0]} ${p.companyDocumentId}${p.companyDocumentVerificationDigit ? '-' + p.companyDocumentVerificationDigit : ''}`], ['Régimen', VET_FE_TAX_REGIME[p.taxRegime]], ['Correo fiscal', p.fiscalEmail], ['Responsabilidades', (p.responsibilities || []).join(', ')]] },
    { step: 2, ok: st.resOk, title: 'Resoluciones', rows: state.resolutions.filter((r) => r.enabled).map((r) => [VET_FE_DOC_TYPE[r.documentType].label, `${r.prefix} ${r.rangeFrom}–${r.rangeTo}`]) },
  ];

  return (
    <div className="vet-fe-formcol">
      <VetFeSectionHead icon={VetIcons.ShieldCheck} title="Revisión y activación" sub="Verifica todo antes de activar. Puedes emitir un documento de prueba en Sandbox." />

      {sections.map((s) => (
        <div key={s.step} className="vet-fe-card vet-fe-reviewcard">
          <div className="vet-fe-review-head">
            <div className="vet-fe-review-title">
              <span className={'vet-fe-review-badge ' + (s.ok ? 'ok' : 'pend')}>{s.ok ? <VetIcons.Check size={12} strokeWidth={2.6} /> : '!'}</span>
              {s.title}
            </div>
            <button type="button" className="vet-fe-check-cta" onClick={() => onEditStep(s.step)}>Editar <VetIcons.ChevronRight size={13} strokeWidth={1.8} /></button>
          </div>
          <div className="vet-fe-review-rows">
            {s.rows.map((r, i) => <div key={i}><span>{r[0]}</span><strong>{r[1] || '—'}</strong></div>)}
          </div>
        </div>
      ))}

      {/* Documento de prueba */}
      <div className="vet-fe-card vet-fe-testemit">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vet-fe-card-title" style={{ marginBottom: 4 }}>Documento de prueba</div>
          <div className="vet-fe-help" style={{ margin: 0 }}>Emite una factura de prueba de punta a punta para validar la configuración antes de activar.</div>
        </div>
        {emitOk ? <span className="vet-fe-conn-ok"><VetIcons.Check size={14} strokeWidth={2.4} /> Prueba validada</span>
          : <button type="button" className="vet-historia-btn-ghost" onClick={emitTest} disabled={emitting || !st.readyToActivate}>{emitting ? 'Emitiendo…' : 'Emitir documento de prueba'}</button>}
      </div>

      {/* Activación */}
      <div className={'vet-fe-activatebox' + (state.activated ? ' on' : '') + (!st.readyToActivate ? ' blocked' : '')}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vet-fe-activate-title">{state.activated ? 'Facturación activada' : 'Activar facturación'}</div>
          <div className="vet-fe-activate-sub">
            {st.readyToActivate ? 'Todos los prerrequisitos están completos.' : 'Faltan prerrequisitos para poder activar.'}
          </div>
          {!st.readyToActivate && (
            <ul className="vet-fe-blocklist">
              {!st.profileOk && <li>Identidad fiscal incompleta</li>}
              {!st.resOk && <li>Falta al menos una resolución (FEV)</li>}
            </ul>
          )}
        </div>
        <button type="button" className={'vet-fe-switch' + (state.activated ? ' on' : '')} disabled={!st.readyToActivate} onClick={toggleActivate} aria-pressed={state.activated}>
          <span className="vet-fe-switch-knob" />
        </button>
      </div>

      {state.activated && (
        <div className="vet-fe-successbox">
          <div className="vet-fe-success-ic"><VetIcons.ShieldCheck size={24} strokeWidth={1.8} /></div>
          <div style={{ flex: 1 }}>
            <div className="vet-fe-success-title">¡Facturación electrónica activa!</div>
            <div className="vet-fe-success-sub">Las ventas y cierres de cuenta ahora generan documentos electrónicos automáticamente.</div>
          </div>
          <button type="button" className="vet-shop-cta" onClick={onExit}>Ir al estado</button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { VetFeStepResolutions, VetFeStepReview, VetFeStepProvider: window.VetFeStepProvider });
