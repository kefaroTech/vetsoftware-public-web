/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseInput, VetBaseSelect,
   VET_ACCT_STATUS, vetAcctPetCtx, vetAcctOwner, vetAcctPets, vetAcctGroupByPet, vetAcctChargesSubtotal,
   vetAcctChargesTotal, vetAcctPagado, vetAcctSaldo,
   vetMoney, VET_SHOP_PAY, VET_SHOP_SERVICES, VET_SHOP_PRODUCTS_INITIAL,
   VET_TAX_RATES, vetTaxName, vetTaxRate, vetComputeTotals */

// ============================================================================
// Detalle de cuenta (por propietario) — cargos agrupados por mascota + abonos
// ============================================================================

function VetAccountDetail({ account, store, onBack }) {
  const owner = vetAcctOwner(account.ownerId);
  const pets = vetAcctPets(account);
  const [chargeOpen, setChargeOpen] = React.useState(false);
  const [pagoOpen, setPagoOpen] = React.useState(false);
  const [cerrarOpen, setCerrarOpen] = React.useState(false);

  const total = vetAcctChargesTotal(account);
  const pagado = vetAcctPagado(account);
  const saldo = vetAcctSaldo(account);

  // Agrupar cargos por mascota (+ grupo General)
  const groups = React.useMemo(() => vetAcctGroupByPet(account), [account.charges]);

  const isOpen = account.estado === 'ABIERTA';

  return (
    <div className="vet-acct-detail">
      <button type="button" className="vet-hosp-back" onClick={onBack}>
        <VetIcons.ArrowLeft size={15} strokeWidth={1.7} /> Volver a cuentas
      </button>

      <div className="vet-hosp-detail-head">
        <div className="vet-hosp-detail-avatar">{(owner?.name || '?').slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vet-hosp-detail-name-row">
            <h1 className="vet-hosp-detail-name">{owner?.name}</h1>
            <span className="vet-shop-stpill" style={{ background: VET_ACCT_STATUS[account.estado].bg, color: VET_ACCT_STATUS[account.estado].fg }}>{VET_ACCT_STATUS[account.estado].label}</span>
          </div>
          <div className="vet-hosp-detail-meta">
            {pets.length > 0 && <><VetIcons.PawPrint size={12} strokeWidth={1.8} style={{ verticalAlign: '-1px', marginRight: 3 }} />{pets.map((p) => p.name).join(', ')} · </>}
            cuenta abierta {account.openedAt}
          </div>
        </div>
        {isOpen && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="button" className="vet-historia-btn-ghost" onClick={() => setPagoOpen(true)}>
              <VetIcons.Receipt size={14} strokeWidth={1.7} /> Registrar abono
            </button>
            <button type="button" className="vet-hosp-discharge-btn" onClick={() => setCerrarOpen(true)}>
              Cerrar cuenta
            </button>
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="vet-acct-summary">
        <div className="vet-acct-sum-box"><div className="vet-acct-sum-lab">Acumulado</div><div className="vet-acct-sum-val">{vetMoney(total)}</div></div>
        <div className="vet-acct-sum-box"><div className="vet-acct-sum-lab">Abonado</div><div className="vet-acct-sum-val">{vetMoney(pagado)}</div></div>
        <div className="vet-acct-sum-box alert"><div className="vet-acct-sum-lab">Saldo pendiente</div><div className="vet-acct-sum-val">{vetMoney(saldo)}</div></div>
      </div>

      <div className="vet-acct-cols">
        {/* Cargos agrupados por mascota */}
        <section className="vet-hosp-section">
          <header className="vet-hosp-section-head">
            <div className="vet-hosp-section-title"><VetIcons.FileText size={16} strokeWidth={1.7} /><span>Cargos por mascota</span></div>
            {isOpen && (
              <button type="button" className="vet-hosp-add-link" onClick={() => setChargeOpen(true)}>
                <VetIcons.Plus size={13} strokeWidth={1.8} /> Agregar cargo
              </button>
            )}
          </header>
          <div className="vet-acct-charges">
            {groups.map((g) => (
              <div key={g.key} className="vet-acct-petgroup">
                <div className="vet-acct-petgroup-head">
                  <div className="vet-acct-petgroup-id">
                    {g.pet
                      ? <><span className="vet-acct-petavatar">{g.pet.name.slice(0, 2).toUpperCase()}</span><span className="vet-acct-petname">{g.pet.name}</span><span className="vet-acct-pettaxa">{g.pet.specie?.name}{g.pet.breed?.name ? ' · ' + g.pet.breed.name : ''}</span></>
                      : <><span className="vet-acct-petavatar general"><VetIcons.Package size={13} strokeWidth={1.8} /></span><span className="vet-acct-petname">General</span><span className="vet-acct-pettaxa">Cargos no asociados a una mascota</span></>}
                  </div>
                  <span className="vet-acct-petgroup-sub">{vetMoney(vetAcctChargesSubtotal(g.charges))}</span>
                </div>
                {g.charges.map((c) => (
                  <div key={c.id} className="vet-acct-charge">
                    {c.kind === 'dia_hosp' && <VetIcons.BedDouble size={14} strokeWidth={1.7} style={{ color: 'var(--amatista-600)', flexShrink: 0 }} />}
                    {c.kind === 'servicio' && <VetIcons.Stethoscope size={14} strokeWidth={1.7} style={{ color: 'oklch(45% 0.15 240)', flexShrink: 0 }} />}
                    {c.kind === 'producto' && <VetIcons.Package size={14} strokeWidth={1.7} style={{ color: 'var(--warm-500)', flexShrink: 0 }} />}
                    <span className="vet-acct-charge-name">{c.concepto}{c.qty > 1 ? ` ×${c.qty}` : ''}</span>
                    <span className="vet-acct-charge-date">{c.date.slice(5)}</span>
                    <span className="vet-acct-charge-amt">{vetMoney(c.unitPrice * c.qty)}</span>
                    {isOpen && (
                      <button type="button" className="vet-acct-charge-x" onClick={() => store.removeCharge(account.id, c.id)} aria-label="Quitar">
                        <VetIcons.X size={12} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {groups.length === 0 && <div className="vet-hosp-mini-empty">Sin cargos todavía.</div>}
          </div>
        </section>

        {/* Abonos */}
        <section className="vet-hosp-section">
          <header className="vet-hosp-section-head">
            <div className="vet-hosp-section-title"><VetIcons.Receipt size={16} strokeWidth={1.7} /><span>Abonos</span></div>
          </header>
          <div className="vet-acct-pagos">
            {account.pagos.length === 0 ? (
              <div className="vet-hosp-mini-empty">Sin abonos registrados.</div>
            ) : account.pagos.map((p) => (
              <div key={p.id} className="vet-acct-pago">
                <div>
                  <div className="vet-acct-pago-amt">{vetMoney(p.monto)}</div>
                  <div className="vet-acct-pago-meta">{p.date} · {VET_SHOP_PAY[p.metodo]}</div>
                </div>
                <VetIcons.Check size={15} strokeWidth={2} style={{ color: 'oklch(55% 0.15 150)' }} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <VetAcctChargeModal open={chargeOpen} account={account} onClose={() => setChargeOpen(false)}
        onSave={(c) => { store.addCharge(account.id, c); setChargeOpen(false); }} />
      <VetAcctPagoModal open={pagoOpen} saldo={saldo} onClose={() => setPagoOpen(false)}
        onSave={(p) => { store.addPago(account.id, p); setPagoOpen(false); }} />

      <VetAcctCerrarModal open={cerrarOpen} account={account} owner={owner} pets={pets}
        saldo={saldo} pagado={pagado}
        onClose={() => setCerrarOpen(false)}
        onConfirm={(pago) => { store.cerrar(account.id, pago); setCerrarOpen(false); }} />
    </div>
  );
}

// ============================================================================
// Cerrar y cobrar cuenta — 2 pasos: cobro (método + desglose) → recibo
// ============================================================================

function VetAcctCerrarModal({ open, account, owner, pets, saldo, pagado, onClose, onConfirm }) {
  const [step, setStep] = React.useState('cobro');   // 'cobro' | 'recibo'
  const [motivo, setMotivo] = React.useState('COBRADA'); // 'COBRADA' | 'CANCELADA'
  const [metodo, setMetodo] = React.useState('EFECTIVO');
  const [recibido, setRecibido] = React.useState('');
  const [nota, setNota] = React.useState('');
  const [reciboData, setReciboData] = React.useState(null);
  const [feDocType, setFeDocType] = React.useState('DOC_EQUIV_POS');
  const [feFinalConsumer, setFeFinalConsumer] = React.useState(false);

  React.useEffect(() => { if (open) { setStep('cobro'); setMotivo('COBRADA'); setMetodo('EFECTIVO'); setRecibido(''); setNota(''); setReciboData(null); setFeDocType('DOC_EQUIV_POS'); setFeFinalConsumer(false); } }, [open]);

  // Desglose por impuesto (hook SIEMPRE antes de cualquier early return)
  const breakdown = React.useMemo(() => {
    const lines = account.charges.map((c) => ({ unitPrice: c.unitPrice, qty: c.qty, taxId: c.taxId, priceIncludesTax: c.priceIncludesTax !== false }));
    const t = vetComputeTotals(lines, 0, null);
    const byTax = {};
    for (const c of account.charges) {
      const rate = vetTaxRate(c.taxId);
      if (rate <= 0) continue;
      const g = c.unitPrice * c.qty;
      const base = c.priceIncludesTax !== false ? g / (1 + rate) : g;
      if (!byTax[c.taxId]) byTax[c.taxId] = { name: vetTaxName(c.taxId), tax: 0 };
      byTax[c.taxId].tax += base * rate;
    }
    return { ...t, taxRows: Object.values(byTax) };
  }, [account.charges]);

  if (!open) return null;

  const esCancelada = motivo === 'CANCELADA';
  const recNum = Number(recibido) || 0;
  const cambio = metodo === 'EFECTIVO' ? Math.max(0, recNum - saldo) : 0;
  const falta = metodo === 'EFECTIVO' && recNum > 0 && recNum < saldo;
  const canConfirm = esCancelada ? nota.trim().length > 0 : (metodo !== 'EFECTIVO' || recNum >= saldo);

  function confirmar() {
    if (esCancelada) {
      setReciboData({ motivo: 'CANCELADA', monto: 0, nota: nota.trim(), fecha: '2026-06-05' });
    } else {
      const code = 'REC-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
      setReciboData({ motivo: 'COBRADA', monto: saldo, metodo, recibido: metodo === 'EFECTIVO' ? recNum : saldo, cambio, code, fecha: '2026-06-05', feDocType, feFinalConsumer });
    }
    setStep('recibo');
  }

  // ---- Paso recibo ----
  if (step === 'recibo' && reciboData) {
    const cancel = reciboData.motivo === 'CANCELADA';
    return (
      <VetModalShell open={open} title={cancel ? 'Cuenta cancelada' : 'Recibo de cierre'}
        subtitle={cancel ? owner?.name : `${owner?.name} · ${reciboData.code}`}
        icon={cancel ? VetIcons.X : VetIcons.Receipt} accent={cancel ? 'warm' : 'amatista'} width={460}
        onClose={() => { onConfirm(reciboData); }}
        footerActions={
          <button type="button" className="vet-btn-primary-modal" onClick={() => onConfirm(reciboData)}>
            <VetIcons.Check size={15} strokeWidth={2} /> Listo
          </button>
        }>
        <div className="vet-acct-receipt">
          <div className="vet-acct-receipt-badge" style={cancel ? { background: 'oklch(92% 0.06 60)', color: 'oklch(50% 0.10 60)' } : null}>
            {cancel ? <VetIcons.X size={26} strokeWidth={2.4} /> : <VetIcons.Check size={26} strokeWidth={2.4} />}
          </div>
          <div className="vet-acct-receipt-title">{cancel ? 'Cuenta cancelada sin cobro' : 'Cuenta cerrada y cobrada'}</div>
          <div className="vet-acct-receipt-amt">{cancel ? vetMoney(0) : vetMoney(saldo)}</div>
          <div className="vet-acct-receipt-rows">
            <div className="vet-acct-close-row"><span>Propietario</span><span>{owner?.name}</span></div>
            <div className="vet-acct-close-row"><span>Mascotas</span><span>{pets.map((p) => p.name).join(', ') || '—'}</span></div>
            <div className="vet-acct-close-row"><span>Cargos</span><span>{account.charges.length}</span></div>
            {cancel ? (
              <>
                <div className="vet-acct-close-row"><span>Saldo anulado</span><span>{vetMoney(saldo)}</span></div>
                <div className="vet-acct-close-row"><span>Motivo</span><span style={{ textAlign: 'right', maxWidth: 240 }}>{reciboData.nota}</span></div>
              </>
            ) : (
              <>
                <div className="vet-acct-close-row"><span>Método</span><span>{VET_SHOP_PAY[reciboData.metodo]}</span></div>
                {reciboData.metodo === 'EFECTIVO' && (
                  <>
                    <div className="vet-acct-close-row"><span>Recibido</span><span>{vetMoney(reciboData.recibido)}</span></div>
                    <div className="vet-acct-close-row"><span>Cambio</span><span>{vetMoney(reciboData.cambio)}</span></div>
                  </>
                )}
                <div className="vet-acct-close-row vet-acct-close-total"><span>Total cobrado</span><span>{vetMoney(saldo)}</span></div>
              </>
            )}
          </div>
          {!cancel && (
            <div className="vet-fe-receiptdoc">
              <VetIcons.Receipt size={14} strokeWidth={1.8} />
              <span>{reciboData.feDocType === 'FE_VENTA' ? 'Factura electrónica' : 'Documento POS'} en proceso · <strong>Validando DIAN…</strong></span>
            </div>
          )}
        </div>
      </VetModalShell>
    );
  }

  // ---- Paso cobro / cancelación ----
  return (
    <VetModalShell open={open} title="Cerrar cuenta"
      subtitle={`${owner?.name} · saldo ${vetMoney(saldo)}`} icon={VetIcons.Receipt} accent="amatista" width={520}
      onClose={onClose}
      footerLeft={!esCancelada ? <span className="vet-bill-foottotal">A cobrar <strong>{vetMoney(saldo)}</strong></span> : null}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={!canConfirm}
            style={!canConfirm ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={confirmar}>
            {esCancelada ? 'Cancelar cuenta' : 'Cobrar y cerrar'}
          </button>
        </>
      }>
      <div className="vet-action-modal-body">
        {/* Motivo de cierre */}
        <div>
          <div className="vet-acct-fieldlabel">Motivo del cierre</div>
          <div className="vet-bill-dest two">
            <button type="button" className={'vet-bill-destopt' + (motivo === 'COBRADA' ? ' active' : '')} onClick={() => setMotivo('COBRADA')}>
              <VetIcons.Check size={14} strokeWidth={2.2} className="vet-bill-destcheck" />
              <div><div className="vet-bill-desttitle">Cobrada</div><div className="vet-bill-destsub">Se liquida el saldo pendiente.</div></div>
            </button>
            <button type="button" className={'vet-bill-destopt' + (motivo === 'CANCELADA' ? ' active' : '')} onClick={() => setMotivo('CANCELADA')}>
              <VetIcons.X size={14} strokeWidth={2.2} className="vet-bill-destcheck" />
              <div><div className="vet-bill-desttitle">Cancelada</div><div className="vet-bill-destsub">Se anula sin cobrar el saldo.</div></div>
            </button>
          </div>
        </div>

        {/* Desglose */}
        <div className="vet-acct-close">
          <div className="vet-acct-close-row"><span>Base gravable + exenta</span><span>{vetMoney(breakdown.base)}</span></div>
          {breakdown.taxRows.map((r, i) => (
            <div key={i} className="vet-acct-close-row vet-acct-close-tax"><span>{r.name}</span><span>{vetMoney(r.tax)}</span></div>
          ))}
          {breakdown.taxRows.length === 0 && (
            <div className="vet-acct-close-row vet-acct-close-tax"><span>Impuestos</span><span>Sin impuestos</span></div>
          )}
          <div className="vet-acct-close-row vet-acct-close-total"><span>Total cuenta</span><span>{vetMoney(breakdown.total)}</span></div>
          {pagado > 0 && <div className="vet-acct-close-row"><span>Ya abonado</span><span>− {vetMoney(pagado)}</span></div>}
          <div className="vet-acct-close-row vet-acct-close-saldo"><span>{esCancelada ? 'Saldo a anular' : 'Saldo a cobrar'}</span><span>{vetMoney(saldo)}</span></div>
        </div>

        {esCancelada ? (
          <div>
            <div className="vet-acct-fieldlabel">Motivo de la cancelación <span style={{ color: 'oklch(55% 0.16 25)' }}>*</span></div>
            <VetBaseInput value={nota} onChange={setNota} placeholder="Ej. cortesía, garantía, error de facturación…" />
          </div>
        ) : (
          <>
            {/* Método de pago */}
            <div>
              <div className="vet-acct-fieldlabel">Método de pago</div>
              <div className="vet-acct-paymethods">
                {Object.entries(VET_SHOP_PAY).map(([k, label]) => (
                  <button key={k} type="button"
                    className={'vet-acct-paybtn' + (metodo === k ? ' active' : '')}
                    onClick={() => setMetodo(k)}>{label}</button>
                ))}
              </div>
            </div>

            {/* Efectivo → recibido + cambio */}
            {metodo === 'EFECTIVO' && (
              <div className="vet-acct-cash">
                <div style={{ flex: 1 }}>
                  <div className="vet-acct-fieldlabel">Efectivo recibido</div>
                  <VetBaseInput type="number" value={recibido} onChange={setRecibido} placeholder={String(saldo)} />
                  {falta && <div className="vet-acct-cash-falta">Falta {vetMoney(saldo - recNum)}</div>}
                </div>
                <div className="vet-acct-cash-change">
                  <span>Cambio</span>
                  <strong>{vetMoney(cambio)}</strong>
                </div>
              </div>
            )}

            {/* Documento fiscal — auto-emisión al cerrar */}
            <div className="vet-fe-closesec">
              <div className="vet-acct-fieldlabel" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <VetIcons.Receipt size={13} strokeWidth={1.8} /> Documento electrónico
              </div>
              <div className="vet-fe-closedocs">
                <button type="button" className={'vet-fe-doctype' + (feDocType === 'DOC_EQUIV_POS' ? ' on' : '')} onClick={() => setFeDocType('DOC_EQUIV_POS')}>
                  <span className="vet-fe-doctype-rb">{feDocType === 'DOC_EQUIV_POS' && <span />}</span>
                  Documento POS
                </button>
                <button type="button" className={'vet-fe-doctype' + (feDocType === 'FE_VENTA' ? ' on' : '')} onClick={() => setFeDocType('FE_VENTA')}>
                  <span className="vet-fe-doctype-rb">{feDocType === 'FE_VENTA' && <span />}</span>
                  Factura electrónica
                </button>
              </div>
              <button type="button" className={'vet-fe-toggle' + (feFinalConsumer ? ' on' : '')} style={{ marginTop: 8 }} onClick={() => setFeFinalConsumer((v) => !v)}>
                <span className="vet-fe-toggle-box">{feFinalConsumer && <VetIcons.Check size={12} strokeWidth={2.6} />}</span>
                Consumidor final
              </button>
              {feDocType === 'FE_VENTA' && !feFinalConsumer && (
                <div className="vet-fe-clientwarn" style={{ marginTop: 8 }}>
                  <VetIcons.User size={14} strokeWidth={1.8} />
                  <span>Verifica que <strong>{owner?.name.split(' ')[0]}</strong> tenga documento, tipo y ciudad completos en su ficha fiscal.</span>
                </div>
              )}
              <p className="vet-fe-closehelp"><VetIcons.History size={12} strokeWidth={1.8} /> La emisión es <strong>automática</strong> al cerrar la venta y <strong>asíncrona</strong>: el documento nace <em>Validando…</em> sin bloquear el cobro.</p>
            </div>
          </>
        )}

        <p className="vet-acct-close-note">
          {esCancelada
            ? <>Al cancelar, la cuenta pasa a <strong>CERRADA</strong> sin cobro y el saldo queda anulado con el motivo indicado.</>
            : <>{account.charges.length} cargos. Al cobrar, la cuenta pasa a <strong>CERRADA</strong> y se genera el recibo con el desglose de impuestos.</>}
        </p>
      </div>
    </VetModalShell>
  );
}

// Modal agregar cargo
function VetAcctChargeModal({ open, account, onClose, onSave }) {
  const ownerPets = React.useMemo(() => {
    const owner = vetAcctOwner(account.ownerId);
    if (!owner) return [];
    return (window.VET_MOCK_PETS?.[owner.id]) || [];
  }, [account.ownerId]);
  const firstPetId = ownerPets[0]?.id || '';

  const [d, setD] = React.useState({ source: 'servicio', pickId: '', kind: 'servicio', concepto: '', unitPrice: '', qty: 1, taxId: 'excluido', priceIncludesTax: true, petId: firstPetId });
  const [query, setQuery] = React.useState('');
  React.useEffect(() => { if (open) { setD({ source: 'servicio', pickId: '', kind: 'servicio', concepto: '', unitPrice: '', qty: 1, taxId: 'excluido', priceIncludesTax: true, petId: firstPetId }); setQuery(''); } }, [open, firstPetId]);
  const u = (p) => setD((x) => ({ ...x, ...p }));

  function setSource(src) {
    setQuery('');
    u({ source: src, pickId: '', concepto: '', unitPrice: '', taxId: src === 'producto' ? 'iva19' : 'excluido', priceIncludesTax: true, kind: src === 'manual' ? 'servicio' : src });
  }
  function pickItem(it) {
    const inc = it.priceIncludesTax !== false;
    u({ pickId: it.id, concepto: it.name, unitPrice: it.salePrice, taxId: it.taxId, priceIncludesTax: inc, kind: d.source === 'producto' ? 'producto' : 'servicio' });
  }
  const valid = d.concepto.trim() && d.unitPrice;
  const catalog = d.source === 'producto' ? (VET_SHOP_PRODUCTS_INITIAL || []) : VET_SHOP_SERVICES;
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((it) => it.name.toLowerCase().includes(q) || (it.category || '').toLowerCase().includes(q));
  }, [catalog, query, d.source]);

  const sources = [
    { value: 'servicio', label: 'Servicio', icon: VetIcons.Stethoscope },
    { value: 'producto', label: 'Producto', icon: VetIcons.Package },
    { value: 'manual', label: 'Manual', icon: VetIcons.Edit },
  ];

  return (
    <VetModalShell open={open} onClose={onClose} title="Agregar cargo" subtitle="Se suma a la cuenta abierta"
      icon={VetIcons.Plus} accent="amatista" width={680}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={!valid}
            style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onSave({ date: '2026-05-23', petId: d.petId || null, concepto: d.concepto.trim(), kind: d.kind, qty: Number(d.qty) || 1, unitPrice: Number(d.unitPrice) || 0, taxId: d.taxId || 'excluido', priceIncludesTax: d.priceIncludesTax !== false })}>
            Agregar cargo
          </button>
        </>
      }>
      <div className="vet-action-modal-body">
        {/* Mascota a la que corresponde el cargo */}
        <div>
          <div className="vet-acct-fieldlabel">¿Para cuál mascota?</div>
          <div className="vet-acct-petchips">
            {ownerPets.map((p) => (
              <button key={p.id} type="button"
                className={'vet-acct-petchip' + (d.petId === p.id ? ' active' : '')}
                onClick={() => u({ petId: p.id })}>
                <span className="vet-acct-petchip-av">{p.name.slice(0, 2).toUpperCase()}</span>
                {p.name}
              </button>
            ))}
            <button type="button"
              className={'vet-acct-petchip' + (!d.petId ? ' active' : '')}
              onClick={() => u({ petId: '' })}>
              <span className="vet-acct-petchip-av general"><VetIcons.Package size={12} strokeWidth={1.8} /></span>
              General
            </button>
          </div>
        </div>

        <div className="vet-acct-srcseg" role="tablist">
          {sources.map((s) => (
            <button key={s.value} type="button" role="tab" aria-selected={d.source === s.value}
              className={'vet-acct-srcbtn' + (d.source === s.value ? ' active' : '')}
              onClick={() => setSource(s.value)}>
              <s.icon size={15} strokeWidth={1.8} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {d.source !== 'manual' ? (
          <>
            <div className="vet-acct-search">
              <VetIcons.Search size={15} strokeWidth={1.8} />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={d.source === 'producto' ? 'Buscar producto…' : 'Buscar servicio…'} autoFocus />
            </div>
            <div className="vet-acct-catalog">
              {filtered.length === 0 && <div className="vet-acct-catalog-empty">Sin resultados</div>}
              {filtered.map((it) => {
                const sel = d.pickId === it.id;
                const out = d.source === 'producto' && it.stock <= 0;
                return (
                  <button key={it.id} type="button" disabled={out}
                    className={'vet-acct-catrow' + (sel ? ' selected' : '') + (out ? ' out' : '')}
                    onClick={() => pickItem(it)}>
                    <div className="vet-acct-catrow-main">
                      <span className="vet-acct-catrow-name">{it.name}</span>
                      {it.category && <span className="vet-acct-catrow-cat">{it.category}</span>}
                      {out && <span className="vet-acct-catrow-out">Agotado</span>}
                    </div>
                    <span className="vet-acct-catrow-price">{vetMoney(it.salePrice)}</span>
                    {sel && <VetIcons.Check size={15} strokeWidth={2.2} className="vet-acct-catrow-check" />}
                  </button>
                );
              })}
            </div>
            {d.pickId !== '' && (
              <>
                <div className="vet-acct-taxinfo">
                  <VetIcons.Receipt size={13} strokeWidth={1.8} />
                  <span>{vetTaxName(d.taxId)} · {d.priceIncludesTax !== false ? 'incluido en el precio' : 'se suma al precio'}</span>
                  <span className="vet-acct-taxinfo-hint">heredado del catálogo</span>
                </div>
                <div className="vet-acct-qtyrow">
                  <span className="vet-acct-qtylabel">Cantidad</span>
                  <div className="vet-acct-stepper">
                    <button type="button" onClick={() => u({ qty: Math.max(1, (Number(d.qty) || 1) - 1) })}>−</button>
                    <input type="number" value={d.qty} onChange={(e) => u({ qty: e.target.value })} />
                    <button type="button" onClick={() => u({ qty: (Number(d.qty) || 1) + 1 })}>+</button>
                  </div>
                  <span className="vet-acct-linetotal">{vetMoney((Number(d.unitPrice) || 0) * (Number(d.qty) || 1))}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <VetBaseField label="Concepto" required>
              {({ id }) => <VetBaseInput id={id} value={d.concepto} onChange={(v) => u({ concepto: v })} placeholder="Ej. Día de hospitalización" autoFocus />}
            </VetBaseField>
            <div className="vet-form-grid-2">
              <VetBaseField label="Precio unitario" required>
                {({ id }) => <VetBaseInput id={id} type="number" value={d.unitPrice} onChange={(v) => u({ unitPrice: v })} placeholder="95000" />}
              </VetBaseField>
              <VetBaseField label="Cantidad">
                {({ id }) => <VetBaseInput id={id} type="number" value={d.qty} onChange={(v) => u({ qty: v })} />}
              </VetBaseField>
            </div>
            <div className="vet-form-grid-2">
              <VetBaseField label="Impuesto">
                {({ id }) => <VetBaseSelect id={id} value={d.taxId} onChange={(v) => u({ taxId: v })}
                  options={(VET_TAX_RATES || []).map((t) => ({ value: t.id, label: t.name }))} />}
              </VetBaseField>
              <VetBaseField label="¿El precio incluye el impuesto?">
                {({ id }) => <VetBaseSelect id={id} value={d.priceIncludesTax !== false ? 'si' : 'no'} onChange={(v) => u({ priceIncludesTax: v === 'si' })}
                  options={[{ value: 'si', label: 'Sí, incluido' }, { value: 'no', label: 'No, se suma' }]} />}
              </VetBaseField>
            </div>
          </>
        )}
      </div>
    </VetModalShell>
  );
}

// Modal registrar abono — con paso de confirmación
function VetAcctPagoModal({ open, saldo, onClose, onSave }) {
  const [monto, setMonto] = React.useState('');
  const [metodo, setMetodo] = React.useState('EFECTIVO');
  const [done, setDone] = React.useState(null);   // { monto, metodo } tras confirmar
  React.useEffect(() => { if (open) { setMonto(''); setMetodo('EFECTIVO'); setDone(null); } }, [open]);
  const n = Number(monto) || 0;
  const valid = n > 0 && n <= saldo;
  const nuevoSaldo = Math.max(0, saldo - n);

  // ---- Paso confirmación ----
  if (open && done) {
    const liquida = done.nuevoSaldo <= 0;
    return (
      <VetModalShell open={open} onClose={onClose} title="Abono registrado"
        subtitle={vetMoney(done.monto)} icon={VetIcons.Check} accent="amatista" width={440}
        footerActions={
          <button type="button" className="vet-btn-primary-modal" onClick={() => onSave({ date: '2026-05-23', monto: done.monto, metodo: done.metodo })}>
            <VetIcons.Check size={15} strokeWidth={2} /> Listo
          </button>
        }>
        <div className="vet-acct-receipt">
          <div className="vet-acct-receipt-badge"><VetIcons.Check size={26} strokeWidth={2.4} /></div>
          <div className="vet-acct-receipt-title">Abono registrado</div>
          <div className="vet-acct-receipt-amt">{vetMoney(done.monto)}</div>
          <div className="vet-acct-receipt-rows">
            <div className="vet-acct-close-row"><span>Método</span><span>{VET_SHOP_PAY[done.metodo]}</span></div>
            <div className="vet-acct-close-row"><span>Saldo anterior</span><span>{vetMoney(saldo)}</span></div>
            <div className="vet-acct-close-row vet-acct-close-total"><span>Saldo restante</span><span>{vetMoney(done.nuevoSaldo)}</span></div>
          </div>
          {liquida && <p className="vet-acct-close-note" style={{ textAlign: 'center' }}>Con este abono el saldo queda en cero. Puedes cerrar la cuenta.</p>}
        </div>
      </VetModalShell>
    );
  }

  return (
    <VetModalShell open={open} onClose={onClose} title="Registrar abono"
      subtitle={`Saldo pendiente: ${vetMoney(saldo)}`} icon={VetIcons.Receipt} accent="amatista" width={440}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={!valid}
            style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => setDone({ monto: n, metodo, nuevoSaldo })}>
            Registrar abono
          </button>
        </>
      }>
      <div className="vet-action-modal-body">
        <VetBaseField label="Monto del abono" required>
          {({ id }) => <VetBaseInput id={id} type="number" value={monto} onChange={setMonto} placeholder={String(saldo)} />}
        </VetBaseField>
        <VetBaseField label="Método de pago" required>
          {({ id }) => <VetBaseSelect id={id} value={metodo} onChange={setMetodo}
            options={Object.entries(VET_SHOP_PAY).map(([k, v]) => ({ value: k, label: v }))} />}
        </VetBaseField>
        {n > 0 && valid && (
          <div className="vet-acct-close">
            <div className="vet-acct-close-row"><span>Saldo actual</span><span>{vetMoney(saldo)}</span></div>
            <div className="vet-acct-close-row"><span>Abono</span><span>− {vetMoney(n)}</span></div>
            <div className="vet-acct-close-row vet-acct-close-saldo"><span>Saldo restante</span><span>{vetMoney(nuevoSaldo)}</span></div>
          </div>
        )}
        {n > saldo && <p className="vet-pauta-help vet-pauta-err">El abono no puede superar el saldo pendiente.</p>}
      </div>
    </VetModalShell>
  );
}

Object.assign(window, { VetAccountDetail });
