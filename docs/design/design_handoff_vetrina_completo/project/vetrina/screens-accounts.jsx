/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseInput, VetBaseSelect,
   VET_ACCT_STATUS, VET_ACCT_TODAY, VET_ACCOUNTS_INITIAL, vetAcctPetCtx, vetAcctOwner, vetAcctPets, VetPatientCascadePicker,
   vetAcctChargesTotal, vetAcctPagado, vetAcctSaldo,
   vetMoney, VET_SHOP_PAY, useVetToast */

// ============================================================================
// Cuentas abiertas — store
// ============================================================================

function useVetAccountsState() {
  const toast = useVetToast();
  const [accounts, setAccounts] = React.useState(VET_ACCOUNTS_INITIAL);

  function patch(id, fn) { setAccounts((arr) => arr.map((a) => a.id === id ? fn(a) : a)); }

  function addCharge(id, charge) {
    patch(id, (a) => ({ ...a, charges: [...a.charges, { ...charge, id: 'c' + Date.now().toString(36) }] }));
    toast.success('Cargo agregado', `${charge.concepto} · ${vetMoney(charge.unitPrice * charge.qty)}`);
  }
  function removeCharge(id, chargeId) {
    patch(id, (a) => ({ ...a, charges: a.charges.filter((c) => c.id !== chargeId) }));
  }
  function addPago(id, pago) {
    patch(id, (a) => ({ ...a, pagos: [...a.pagos, { ...pago, id: 'p' + Date.now().toString(36) }] }));
    toast.success('Abono registrado', vetMoney(pago.monto));
  }
  function cerrar(id, pago) {
    const cancelada = pago && pago.motivo === 'CANCELADA';
    patch(id, (a) => ({
      ...a,
      estado: 'CERRADA',
      cierre: pago ? { motivo: pago.motivo || 'COBRADA', nota: pago.nota, fecha: pago.fecha } : null,
      pagos: pago && !cancelada ? [...a.pagos, { ...pago, id: 'p' + Date.now().toString(36) }] : a.pagos,
    }));
    toast.success(cancelada ? 'Cuenta cancelada' : 'Cuenta cerrada',
      cancelada ? 'Saldo anulado sin cobro.' : 'Saldo liquidado y recibo generado.');
  }
  function crear(data) {
    const id = 8000 + Math.floor(Math.random() * 9000);
    setAccounts((arr) => [{
      id, ownerId: data.ownerId, origen: data.origen,
      estado: 'ABIERTA', openedAt: VET_ACCT_TODAY + ' 09:00',
      charges: data.charges ?? [],
      pagos: [],
    }, ...arr]);
    toast.success('Cuenta abierta', 'Lista para acumular cargos.');
    return id;
  }

  return { accounts, addCharge, removeCharge, addPago, cerrar, crear };
}

// ============================================================================
// Crear cuenta — modal con cascade de paciente
// ============================================================================

const VET_ACCT_ORIGENES = [
  { value: 'hospitalizacion', label: 'Hospitalización', icon: 'BedDouble' },
  { value: 'consulta', label: 'Consulta / tratamiento', icon: 'Stethoscope' },
  { value: 'cirugia', label: 'Cirugía', icon: 'Scissors' },
  { value: 'general', label: 'General / otros', icon: 'Receipt' },
];

function VetAcctOwnerPicker({ selected, onSelect, onClear }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  React.useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const t = setTimeout(() => {
      const ql = q.toLowerCase();
      setResults(window.VET_MOCK_OWNERS.filter((o) =>
        o.name.toLowerCase().includes(ql) || o.document.toLowerCase().includes(ql) || (o.phone || '').toLowerCase().includes(ql)));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  if (selected) {
    const pets = window.VET_MOCK_PETS[selected.id] || [];
    return (
      <div className="vet-picker-picked">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="vet-picker-badge"><VetIcons.User size={13} strokeWidth={1.7} /></div>
          <div>
            <div className="vet-picker-picked-name">{selected.name}</div>
            <div className="vet-picker-picked-meta">{selected.document} · {pets.length} mascota{pets.length === 1 ? '' : 's'}</div>
          </div>
        </div>
        <button type="button" className="vet-picker-link" onClick={onClear}>
          <VetIcons.X size={12} strokeWidth={1.8} /> Cambiar
        </button>
      </div>
    );
  }
  return (
    <div className="vet-picker-step">
      <div className="vet-picker-search">
        <VetIcons.Search size={14} strokeWidth={1.7} />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar propietario por nombre o documento…" autoFocus />
      </div>
      {query && results.length === 0 && <div className="vet-picker-state">Sin resultados</div>}
      {results.length > 0 && (
        <div className="vet-picker-results">
          {results.map((o) => (
            <button key={o.id} type="button" className="vet-picker-result" onClick={() => onSelect(o)}>
              <div className="vet-picker-avatar"><VetIcons.User size={14} strokeWidth={1.7} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="vet-picker-name">{o.name}</div>
                <div className="vet-picker-meta">{o.document} · {o.phone}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VetAcctCreateModal({ open, existing, onClose, onCreate }) {
  const [owner, setOwner] = React.useState(null);
  const [origen, setOrigen] = React.useState('hospitalizacion');

  React.useEffect(() => { if (open) { setOwner(null); setOrigen('hospitalizacion'); } }, [open]);

  // Una cuenta es por propietario: duplicado si el dueño ya tiene cuenta abierta
  const dup = owner && existing.some((a) => a.ownerId === owner.id && a.estado === 'ABIERTA');

  return (
    <VetModalShell open={open} onClose={onClose} title="Abrir cuenta" subtitle="Selecciona el propietario y el origen"
      icon={VetIcons.Plus} accent="amatista" width={580}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={!owner || dup}
            style={(!owner || dup) ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onCreate({ ownerId: owner.id, origen })}>
            Abrir cuenta
          </button>
        </>
      }>
      <div className="vet-action-modal-body">
        <div>
          <div className="vet-acct-fieldlabel">Propietario</div>
          <VetAcctOwnerPicker selected={owner} onSelect={setOwner} onClear={() => setOwner(null)} />
          <p className="vet-acct-orighelp" style={{ marginTop: 8 }}>
            La cuenta es del propietario. Los cargos de sus distintas mascotas se agrupan dentro de la misma cuenta.
          </p>
          {dup && (
            <div className="vet-acct-dupwarn">
              <VetIcons.Receipt size={14} strokeWidth={1.8} />
              <span>{owner.name.split(' ')[0]} ya tiene una cuenta abierta. Ábrela desde la lista para agregar cargos.</span>
            </div>
          )}
        </div>
        <div>
          <div className="vet-acct-fieldlabel">Origen de la cuenta</div>
          <div className="vet-acct-origseg">
            {VET_ACCT_ORIGENES.map((o) => {
              const Ic = VetIcons[o.icon] || VetIcons.Receipt;
              return (
                <button key={o.value} type="button"
                  className={'vet-acct-srcbtn' + (origen === o.value ? ' active' : '')}
                  onClick={() => setOrigen(o.value)}>
                  <Ic size={15} strokeWidth={1.8} />
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>
          <p className="vet-acct-orighelp">
            La cuenta queda <strong>abierta</strong> y acumula cargos día a día hasta que la cierres y cobres el saldo.
          </p>
        </div>
      </div>
    </VetModalShell>
  );
}

// ============================================================================
// Lista de cuentas
// ============================================================================

function VetAccountsView() {
  const acct = useVetAccountsState();
  const [openId, setOpenId] = React.useState(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const current = openId ? acct.accounts.find((a) => a.id === openId) : null;

  if (current) return <VetAccountDetail account={current} store={acct} onBack={() => setOpenId(null)} />;

  const abiertas = acct.accounts.filter((a) => a.estado === 'ABIERTA');
  const totalPend = abiertas.reduce((s, a) => s + vetAcctSaldo(a), 0);

  return (
    <div className="vet-shop-inv">
      <header className="vet-shop-inv-head">
        <div>
          <div className="vet-shop-kicker">Tienda · Cuentas abiertas</div>
          <h1 className="vet-shop-title">Cuentas abiertas</h1>
        </div>
        <button type="button" className="vet-shop-addbtn" onClick={() => setCreateOpen(true)}>
          <VetIcons.Plus size={16} strokeWidth={2} /> Abrir cuenta
        </button>
      </header>

      {abiertas.length > 0 && (
        <div className="vet-shop-alert" style={{ background: 'oklch(94% 0.07 80)', borderColor: 'oklch(88% 0.09 80)', color: 'oklch(40% 0.10 70)' }}>
          <VetIcons.Receipt size={15} strokeWidth={1.8} />
          <span><strong>{abiertas.length}</strong> cuenta{abiertas.length === 1 ? '' : 's'} abierta{abiertas.length === 1 ? '' : 's'} · saldo acumulado pendiente <strong>{vetMoney(totalPend)}</strong></span>
        </div>
      )}

      <div className="vet-acct-grid">
        {acct.accounts.map((a) => {
          const owner = vetAcctOwner(a.ownerId);
          const pets = vetAcctPets(a);
          const st = VET_ACCT_STATUS[a.estado];
          const saldo = vetAcctSaldo(a);
          const petLabel = pets.length === 0 ? 'Sin mascotas'
            : pets.length <= 2 ? pets.map((p) => p.name).join(', ')
            : `${pets[0].name}, ${pets[1].name} +${pets.length - 2}`;
          return (
            <button key={a.id} type="button" className="vet-acct-card" onClick={() => setOpenId(a.id)}>
              <div className="vet-acct-card-top">
                <div className="vet-acct-card-pet">
                  <div className="vet-acct-avatar">{(owner?.name || '?').slice(0, 2).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="vet-acct-name">{owner?.name}</div>
                    <div className="vet-acct-owner">
                      <VetIcons.PawPrint size={11} strokeWidth={1.8} style={{ verticalAlign: '-1px', marginRight: 3 }} />
                      {petLabel}
                    </div>
                  </div>
                </div>
                <span className="vet-shop-stpill" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
              </div>
              <div className="vet-acct-card-meta">
                <span>{a.charges.length} cargos · {pets.length || '—'} mascota{pets.length === 1 ? '' : 's'} · desde {a.openedAt.slice(5, 10)}</span>
              </div>
              <div className="vet-acct-card-totals">
                <div><span>Acumulado</span><strong>{vetMoney(vetAcctChargesTotal(a))}</strong></div>
                {vetAcctPagado(a) > 0 && <div><span>Abonado</span><strong>−{vetMoney(vetAcctPagado(a))}</strong></div>}
                <div className="vet-acct-saldo"><span>Saldo</span><strong>{vetMoney(saldo)}</strong></div>
              </div>
            </button>
          );
        })}
      </div>

      <VetAcctCreateModal
        open={createOpen}
        existing={acct.accounts}
        onClose={() => setCreateOpen(false)}
        onCreate={(data) => { const id = acct.crear(data); setCreateOpen(false); setOpenId(id); }}
      />
    </div>
  );
}

Object.assign(window, { useVetAccountsState, VetAccountsView });
