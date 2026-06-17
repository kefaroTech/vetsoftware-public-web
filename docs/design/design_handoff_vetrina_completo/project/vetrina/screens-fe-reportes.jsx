/* global React, VetIcons, vetFeMoney, VET_FE_DOCUMENTS, VET_FE_DOC_TYPE, VET_FE_STATUS,
   VET_FE_PAYMENT_MEANS, VetFeStatusPill */

// ============================================================================
// Facturación electrónica — Reportes: libro de ventas + conciliación
// ============================================================================

function VetFeReportes() {
  const [tab, setTab] = React.useState('libro');
  const [from, setFrom] = React.useState('2026-06-01');
  const [to, setTo] = React.useState('2026-06-30');

  const docs = VET_FE_DOCUMENTS.filter((d) => d.issueDate >= from && d.issueDate <= to);

  return (
    <div className="vet-fe-reportes">
      <div className="vet-fe-repfilters">
        <div className="vet-lab-tabs" role="tablist" style={{ flex: 1 }}>
          <button type="button" className={'vet-lab-tab' + (tab === 'libro' ? ' active' : '')} onClick={() => setTab('libro')}>
            <VetIcons.BarChart3 size={15} strokeWidth={1.7} /> Libro de ventas
          </button>
          <button type="button" className={'vet-lab-tab' + (tab === 'concil' ? ' active' : '')} onClick={() => setTab('concil')}>
            <VetIcons.ShieldCheck size={15} strokeWidth={1.7} /> Conciliación DIAN
          </button>
        </div>
        <div className="vet-lab-date-range">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="vet-lab-date-sep">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {tab === 'libro' ? <VetFeLibro docs={docs} /> : <VetFeConciliacion docs={docs} />}
    </div>
  );
}

function VetFeLibro({ docs }) {
  const totals = docs.reduce((t, d) => ({
    base: t.base + d.base, iva: t.iva + d.iva, inc: t.inc + d.inc, total: t.total + d.payable,
    reteFuente: t.reteFuente + d.reteFuente, count: t.count + 1,
  }), { base: 0, iva: 0, inc: 0, total: 0, reteFuente: 0, count: 0 });

  // impuestos por tarifa
  const byRate = {};
  for (const d of docs) for (const l of d.lines) {
    const k = `${l.taxScheme}-${l.taxRate}`;
    if (!byRate[k]) byRate[k] = { scheme: l.taxScheme, rate: l.taxRate, base: 0, tax: 0 };
    byRate[k].base += l.lineExtensionAmount; byRate[k].tax += l.taxAmount;
  }
  // recaudo por medio
  const byMeans = {};
  for (const d of docs) { if (!byMeans[d.paymentMeans]) byMeans[d.paymentMeans] = 0; byMeans[d.paymentMeans] += d.payable; }

  return (
    <div className="vet-fe-rep">
      <div className="vet-fe-rep-cards">
        <div className="vet-fe-rep-card"><span>Documentos</span><strong>{totals.count}</strong></div>
        <div className="vet-fe-rep-card"><span>Base</span><strong>{vetFeMoney(totals.base)}</strong></div>
        <div className="vet-fe-rep-card"><span>IVA</span><strong>{vetFeMoney(totals.iva)}</strong></div>
        <div className="vet-fe-rep-card hl"><span>Total</span><strong>{vetFeMoney(totals.total)}</strong></div>
      </div>

      <div className="vet-fe-rep-cols">
        <div className="vet-fe-card">
          <div className="vet-fe-card-title">Impuestos por tarifa</div>
          <table className="vet-fe-minitable">
            <thead><tr><th>Esquema</th><th>Tarifa</th><th style={{ textAlign: 'right' }}>Base</th><th style={{ textAlign: 'right' }}>Impuesto</th></tr></thead>
            <tbody>{Object.values(byRate).map((r, i) => (
              <tr key={i}><td>{r.scheme}</td><td>{r.rate}%</td><td style={{ textAlign: 'right' }}>{vetFeMoney(r.base)}</td><td style={{ textAlign: 'right' }}>{vetFeMoney(r.tax)}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="vet-fe-card">
          <div className="vet-fe-card-title">Recaudo por medio de pago</div>
          <table className="vet-fe-minitable">
            <thead><tr><th>Medio</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
            <tbody>{Object.entries(byMeans).map(([k, v]) => (
              <tr key={k}><td>{VET_FE_PAYMENT_MEANS[k]}</td><td style={{ textAlign: 'right' }}>{vetFeMoney(v)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="vet-fe-card">
        <div className="vet-fe-card-title">Documentos del periodo</div>
        <table className="vet-fe-minitable">
          <thead><tr><th>Número</th><th>Tipo</th><th>Fecha</th><th>Cliente</th><th style={{ textAlign: 'right' }}>Base</th><th style={{ textAlign: 'right' }}>IVA</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado</th></tr></thead>
          <tbody>{docs.map((d) => (
            <tr key={d.id}>
              <td><span className="vet-fe-num">{d.prefix}-{d.consecutive}</span></td>
              <td>{VET_FE_DOC_TYPE[d.documentType].label}</td>
              <td className="vet-fe-date">{d.issueDate}</td>
              <td>{d.customer.legalName || d.customer.name}</td>
              <td style={{ textAlign: 'right' }}>{vetFeMoney(d.base)}</td>
              <td style={{ textAlign: 'right' }}>{vetFeMoney(d.iva)}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{vetFeMoney(d.payable)}</td>
              <td><VetFeStatusPill status={d.dianStatus} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="vet-fe-formfoot">
        <button type="button" className="vet-historia-btn-ghost"><VetIcons.Download size={14} strokeWidth={1.8} /> Exportar (CSV)</button>
      </div>
    </div>
  );
}

function VetFeConciliacion({ docs }) {
  const counts = { VALIDADO: 0, RECHAZADO: 0, CONTINGENCIA: 0, PENDIENTE: 0 };
  for (const d of docs) if (counts[d.dianStatus] !== undefined) counts[d.dianStatus]++;
  const needs = docs.filter((d) => ['RECHAZADO', 'CONTINGENCIA', 'PENDIENTE'].includes(d.dianStatus));

  const cards = [
    { k: 'VALIDADO', label: 'Validados', tone: 'oklch(55% 0.15 150)' },
    { k: 'PENDIENTE', label: 'Pendientes', tone: 'oklch(55% 0.16 240)' },
    { k: 'CONTINGENCIA', label: 'En contingencia', tone: 'oklch(65% 0.14 75)' },
    { k: 'RECHAZADO', label: 'Rechazados', tone: 'oklch(58% 0.20 25)' },
  ];

  return (
    <div className="vet-fe-rep">
      <div className="vet-fe-rep-cards">
        {cards.map((c) => (
          <div key={c.k} className="vet-fe-rep-card"><span>{c.label}</span><strong style={{ color: c.tone }}>{counts[c.k]}</strong></div>
        ))}
      </div>

      <div className="vet-fe-card">
        <div className="vet-fe-card-title">Requieren atención ({needs.length})</div>
        {needs.length === 0 ? (
          <div className="vet-hosp-mini-empty">Todos los documentos del periodo están validados.</div>
        ) : (
          <table className="vet-fe-minitable">
            <thead><tr><th>Número</th><th>Tipo</th><th>Fecha</th><th>Cliente</th><th>Estado</th></tr></thead>
            <tbody>{needs.map((d) => (
              <tr key={d.id}>
                <td><span className="vet-fe-num">{d.prefix}-{d.consecutive}</span></td>
                <td>{VET_FE_DOC_TYPE[d.documentType].label}</td>
                <td className="vet-fe-date">{d.issueDate}</td>
                <td>{d.customer.legalName || d.customer.name}</td>
                <td><VetFeStatusPill status={d.dianStatus} /></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Root — pestañas del módulo (tablero / config / documentos / reportes)
// ============================================================================

function VetFacturacionView() {
  /* global vetFeHasModule, VetFeUpsell, VetFeReadyBoard, VetFePerfilFiscal, VetFeProveedor,
     VetFeNumeracion, VetFeRetenciones, VetFeDocsView, vetFeCan */
  const [tab, setTab] = React.useState('tablero');

  if (!vetFeHasModule()) return <VetFeUpsell />;

  const tabs = [
    { k: 'tablero', label: 'Tablero', icon: VetIcons.ShieldCheck },
    { k: 'reportes', label: 'Reportes', icon: VetIcons.BarChart3, perm: 'salesReport.read' },
    { k: 'config', label: 'Configuración', icon: VetIcons.Settings },
  ].filter((t) => !t.perm || vetFeCan(t.perm));

  return (
    <div className="vet-fe-page">
      <header className="vet-fe-pagehead">
        <div>
          <div className="vet-shop-kicker">Facturación electrónica · DIAN <span className="vet-fe-premium">Premium</span></div>
          <h1 className="vet-shop-title">Facturación electrónica</h1>
        </div>
      </header>

      <div className="vet-lab-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.k} type="button" role="tab" className={'vet-lab-tab' + (tab === t.k ? ' active' : '')} onClick={() => setTab(t.k)}>
            <t.icon size={15} strokeWidth={1.7} /> <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'tablero' && <VetFeReadyBoard onGo={(sub) => { setTab('config'); window.__feConfigTab = sub; }} />}
      {tab === 'reportes' && <VetFeReportes />}
      {tab === 'config' && <VetFeConfigTabs />}
    </div>
  );
}

function VetFeConfigTabs() {
  /* global VetFePerfilFiscal, VetFeProveedor, VetFeNumeracion, VetFeRetenciones */
  const [sub, setSub] = React.useState(window.__feConfigTab || 'perfil');
  React.useEffect(() => { window.__feConfigTab = null; }, []);
  const subs = [
    { k: 'perfil', label: 'Perfil fiscal', perm: 'companyTaxProfile.read' },
    { k: 'numeracion', label: 'Numeración', perm: 'numberingResolution.read' },
    { k: 'retenciones', label: 'Retenciones', perm: 'withholdingConfig.read' },
  ].filter((s) => !s.perm || vetFeCan(s.perm));

  return (
    <div className="vet-fe-config">
      <div className="vet-fe-subtabs">
        {subs.map((s) => (
          <button key={s.k} type="button" className={'vet-fe-subtab' + (sub === s.k ? ' active' : '')} onClick={() => setSub(s.k)}>{s.label}</button>
        ))}
      </div>
      {sub === 'perfil' && <VetFePerfilFiscal />}
      {sub === 'numeracion' && <VetFeNumeracion />}
      {sub === 'retenciones' && <VetFeRetenciones />}
    </div>
  );
}

function VetFeUpsell() {
  return (
    <div className="vet-fe-upsell">
      <div className="vet-fe-upsell-ic"><VetIcons.ShieldCheck size={34} strokeWidth={1.6} /></div>
      <h1 className="vet-fe-upsell-title">La facturación electrónica está disponible en el plan Premium</h1>
      <p className="vet-fe-upsell-sub">Cumple con la DIAN y emite documentos fiscales válidos directamente desde tus ventas.</p>
      <div className="vet-fe-upsell-list">
        {['Factura electrónica válida ante la DIAN', 'Documento equivalente POS', 'Notas crédito y débito', 'Libro de ventas y conciliación'].map((b) => (
          <div key={b} className="vet-fe-upsell-item"><VetIcons.Check size={15} strokeWidth={2.4} /> {b}</div>
        ))}
      </div>
      <button type="button" className="vet-shop-cta vet-fe-upsell-cta">Conocer Premium</button>
    </div>
  );
}

Object.assign(window, { VetFacturacionView, VetFeReportes });
