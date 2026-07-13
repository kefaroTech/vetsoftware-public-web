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
    toast.success(cancelada ? 'Cuenta cancelada' : 'Venta cerrada · factura en proceso',
      cancelada ? 'Saldo anulado sin cobro.' : 'Documento electrónico emitido · validando DIAN.');
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
  const [pet, setPet] = React.useState(null);          // mascota opcional creada
  const [petName, setPetName] = React.useState('');
  const [petSpecie, setPetSpecie] = React.useState('Canino');
  const [petForm, setPetForm] = React.useState(false);

  React.useEffect(() => { if (open) { setOwner(null); setPet(null); setPetName(''); setPetSpecie('Canino'); setPetForm(false); } }, [open]);
  React.useEffect(() => { setPet(null); setPetForm(false); setPetName(''); }, [owner]);

  const existingPets = owner ? (window.VET_MOCK_PETS?.[owner.id] || []) : [];

  // Una cuenta es por propietario: duplicado si el dueño ya tiene cuenta abierta
  const dup = owner && existing.some((a) => a.ownerId === owner.id && a.estado === 'ABIERTA');

  function savePet() {
    if (!petName.trim()) return;
    setPet({ id: 'newp-' + Date.now().toString(36), name: petName.trim(), specie: { name: petSpecie }, breed: { name: '—' } });
    setPetForm(false);
  }

  return (
    <VetModalShell open={open} onClose={onClose} title="Abrir cuenta" subtitle="Selecciona el propietario"
      icon={VetIcons.Plus} accent="amatista" width={580}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={!owner || dup}
            style={(!owner || dup) ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onCreate({ ownerId: owner.id, origen: 'general', pet })}>
            Abrir cuenta
          </button>
        </>
      }>
      <div className="vet-action-modal-body">
        <div>
          <div className="vet-acct-fieldlabel">Propietario</div>
          {owner ? (
            <div className="vet-picker-picked">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="vet-picker-badge"><VetIcons.User size={13} strokeWidth={1.7} /></div>
                <div>
                  <div className="vet-picker-picked-name">{owner.name}</div>
                  <div className="vet-picker-picked-meta">{owner.documentId || owner.document || '—'}</div>
                </div>
              </div>
              <button type="button" className="vet-picker-link" onClick={() => setOwner(null)}>
                <VetIcons.X size={12} strokeWidth={1.8} /> Cambiar
              </button>
            </div>
          ) : (
            <VetCustomerPicker mode="basic" onPick={(c) => setOwner({ id: c.id, name: c.name, documentId: c.documentId })} />
          )}
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

        {owner && !dup && (
          <div>
            <div className="vet-acct-fieldlabel">Mascota <span className="vet-cpk-opttag">opcional</span></div>
            {pet ? (
              <div className="vet-picker-picked">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="vet-picker-badge"><VetIcons.PawPrint size={13} strokeWidth={1.7} /></div>
                  <div>
                    <div className="vet-picker-picked-name">{pet.name}</div>
                    <div className="vet-picker-picked-meta">{pet.specie.name}</div>
                  </div>
                </div>
                <button type="button" className="vet-picker-link" onClick={() => setPet(null)}>
                  <VetIcons.X size={12} strokeWidth={1.8} /> Quitar
                </button>
              </div>
            ) : petForm ? (
              <div className="vet-acct-petform">
                <div className="vet-form-grid-2">
                  <VetBaseField label="Nombre de la mascota" required>
                    {({ id }) => <VetBaseInput id={id} value={petName} onChange={setPetName} placeholder="Ej. Luna" autoFocus />}
                  </VetBaseField>
                  <VetBaseField label="Especie">
                    {({ id }) => <VetBaseSelect id={id} value={petSpecie} onChange={setPetSpecie}
                      options={['Canino', 'Felino', 'Ave', 'Conejo', 'Otro'].map((s) => ({ value: s, label: s }))} />}
                  </VetBaseField>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="button" className="vet-btn-ghost-modal" onClick={() => { setPetForm(false); setPetName(''); }}>Cancelar</button>
                  <button type="button" className="vet-btn-primary-modal" disabled={!petName.trim()}
                    style={!petName.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : null} onClick={savePet}>
                    Registrar mascota
                  </button>
                </div>
              </div>
            ) : (
              <>
                {existingPets.length > 0 && (
                  <div className="vet-acct-petexist">
                    {existingPets.map((p) => (
                      <span key={p.id} className="vet-acct-petchip-ro"><VetIcons.PawPrint size={11} strokeWidth={1.8} /> {p.name}</span>
                    ))}
                    <span className="vet-acct-petexist-note">ya registradas</span>
                  </div>
                )}
                <button type="button" className="vet-cpk-newbtn" style={{ padding: '9px 14px' }} onClick={() => setPetForm(true)}>
                  <VetIcons.Plus size={15} strokeWidth={2.2} /> Registrar mascota nueva
                </button>
                <p className="vet-acct-orighelp" style={{ marginTop: 8 }}>
                  Opcional. Puedes abrir la cuenta sin mascota y asociarla al agregar cargos.
                </p>
              </>
            )}
          </div>
        )}
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
  const [tab, setTab] = React.useState('abiertas');
  const current = openId ? acct.accounts.find((a) => a.id === openId) : null;

  if (current) return <VetAccountDetail account={current} store={acct} onBack={() => setOpenId(null)} />;

  const abiertas = acct.accounts.filter((a) => a.estado === 'ABIERTA');
  const cerradas = acct.accounts.filter((a) => a.estado === 'CERRADA');
  const totalPend = abiertas.reduce((s, a) => s + vetAcctSaldo(a), 0);
  const visibles = tab === 'abiertas' ? abiertas : cerradas;

  return (
    <div className="vet-shop-inv">
      <header className="vet-shop-inv-head">
        <div>
          <div className="vet-shop-kicker">Tienda · Cuentas</div>
          <h1 className="vet-shop-title">Cuentas</h1>
        </div>
        <button type="button" className="vet-shop-addbtn" onClick={() => setCreateOpen(true)}>
          <VetIcons.Plus size={16} strokeWidth={2} /> Abrir cuenta
        </button>
      </header>

      <div className="vet-lab-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'abiertas'}
          className={'vet-lab-tab' + (tab === 'abiertas' ? ' active' : '')}
          onClick={() => setTab('abiertas')}>
          <VetIcons.Receipt size={15} strokeWidth={1.7} />
          <span>Activas</span>
          {abiertas.length > 0 && <span className="vet-lab-tab-badge">{abiertas.length}</span>}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'cerradas'}
          className={'vet-lab-tab' + (tab === 'cerradas' ? ' active' : '')}
          onClick={() => setTab('cerradas')}>
          <VetIcons.Check size={15} strokeWidth={1.7} />
          <span>Cerradas</span>
          <span className="vet-lab-tab-badge muted">{cerradas.length}</span>
        </button>
      </div>

      {tab === 'abiertas' && abiertas.length > 0 && (
        <div className="vet-shop-alert" style={{ background: 'oklch(94% 0.07 80)', borderColor: 'oklch(88% 0.09 80)', color: 'oklch(40% 0.10 70)' }}>
          <VetIcons.Receipt size={15} strokeWidth={1.8} />
          <span><strong>{abiertas.length}</strong> cuenta{abiertas.length === 1 ? '' : 's'} abierta{abiertas.length === 1 ? '' : 's'} · saldo acumulado pendiente <strong>{vetMoney(totalPend)}</strong></span>
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="vet-hosp-empty">
          <div className="vet-hosp-empty-ic"><VetIcons.Receipt size={28} strokeWidth={1.5} /></div>
          <div className="vet-hosp-empty-title">{tab === 'abiertas' ? 'Sin cuentas activas' : 'Sin cuentas cerradas'}</div>
          <p className="vet-hosp-empty-desc">{tab === 'abiertas' ? 'Abre una cuenta para acumular cargos.' : 'Las cuentas cobradas o canceladas aparecerán aquí.'}</p>
        </div>
      ) : (
      <div className="vet-acct-grid">
        {visibles.map((a) => {
          const owner = vetAcctOwner(a.ownerId);
          const pets = vetAcctPets(a);
          const cancelada = a.cierre && a.cierre.motivo === 'CANCELADA';
          const st = a.estado === 'CERRADA'
            ? (cancelada ? { bg: 'oklch(94% 0.06 60)', fg: 'oklch(48% 0.10 60)', label: 'Cancelada' }
                         : { bg: 'var(--warm-200)', fg: 'var(--warm-600)', label: 'Pagada' })
            : VET_ACCT_STATUS[a.estado];
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
                <div className="vet-acct-saldo"><span>{a.estado === 'CERRADA' ? (cancelada ? 'Anulado' : 'Cobrado') : 'Saldo'}</span><strong>{vetMoney(a.estado === 'CERRADA' && !cancelada ? vetAcctChargesTotal(a) : saldo)}</strong></div>
              </div>
            </button>
          );
        })}
      </div>
      )}

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
