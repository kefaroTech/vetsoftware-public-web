/* global React, VetIcons, VetModalShell,
   VET_SHOP_SERVICES, VET_SHOP_PRODUCTS_INITIAL, VET_ACCOUNTS_INITIAL,
   vetAcctChargesTotal, vetAcctSaldo, vetMoney, useVetToast */

// ============================================================================
// Facturación de la consulta — reemplaza el paso "Resumen"
// Al guardar, según el estado de cuenta del cliente:
//  - Sin cuenta abierta  → abrir una nueva con los cargos de la consulta
//  - Con cuenta abierta   → agregar a la existente (muestra su saldo) o abrir otra
//  - Siempre permite "solo guardar" sin cobrar
// ============================================================================

function vetOwnerOpenAccount(ownerId) {
  return (VET_ACCOUNTS_INITIAL || []).find((a) => a.ownerId === ownerId && a.estado === 'ABIERTA') || null;
}
function vetOwnerHasOpenAccount(ownerId) { return !!vetOwnerOpenAccount(ownerId); }

const VET_ACCT_ORIGEN_LABEL = {
  hospitalizacion: 'Hospitalización', consulta: 'Consulta', cirugia: 'Cirugía', general: 'General',
};

function VetConsultaBillingModal({ open, owner, pet, consultationType, heading, subtitle, autoConsulta = true, onClose, onFinish }) {
  const toast = useVetToast();
  const account = owner ? vetOwnerOpenAccount(owner.id) : null;
  const hasAccount = !!account;

  // destino: 'existing' | 'new' | 'nada'
  const [destino, setDestino] = React.useState('new');
  const [items, setItems] = React.useState([]);
  const [tab, setTab] = React.useState('servicio');
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setDestino(hasAccount ? 'existing' : 'new');
    setTab('servicio');
    setQuery('');
    const match = autoConsulta && (VET_SHOP_SERVICES || []).find((s) =>
      consultationType && s.name.toLowerCase().includes('consulta'));
    setItems(match
      ? [{ key: 'svc-' + match.id, kind: 'servicio', id: match.id, name: match.name, unitPrice: match.salePrice, qty: 1 }]
      : []);
  }, [open, consultationType, hasAccount, autoConsulta]);

  function addItem(it, kind) {
    setItems((arr) => {
      const key = (kind === 'producto' ? 'prod-' : 'svc-') + it.id;
      const exists = arr.find((x) => x.key === key);
      if (exists) return arr.map((x) => x.key === key ? { ...x, qty: x.qty + 1 } : x);
      return [...arr, { key, kind, id: it.id, name: it.name, unitPrice: it.salePrice, qty: 1 }];
    });
  }
  function setQty(key, q) { setItems((arr) => arr.map((x) => x.key === key ? { ...x, qty: Math.max(1, q) } : x)); }
  function removeItem(key) { setItems((arr) => arr.filter((x) => x.key !== key)); }

  const total = items.reduce((s, x) => s + x.unitPrice * x.qty, 0);
  const showCharges = destino === 'existing' || destino === 'new';
  const catalog = tab === 'producto' ? (VET_SHOP_PRODUCTS_INITIAL || []) : (VET_SHOP_SERVICES || []);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((it) => it.name.toLowerCase().includes(q) || (it.category || '').toLowerCase().includes(q));
  }, [catalog, query, tab]);

  function finish() {
    const first = owner?.name.split(' ')[0] || '';
    if (destino === 'nada') { onFinish({ billed: false }); return; }
    if (destino === 'existing') {
      toast.success('Cargos agregados', `${items.length} ítem(s) sumados a la cuenta abierta de ${first}.`);
      onFinish({ billed: true, account: 'existing', accountId: account.id, items });
    } else {
      toast.success('Cuenta abierta', `Se creó una cuenta para ${first} con ${items.length} cargo(s).`);
      onFinish({ billed: true, account: 'new', items });
    }
  }

  if (!open) return null;
  const primaryLabel = destino === 'nada' ? 'Guardar consulta'
    : destino === 'existing' ? 'Guardar y agregar a cuenta'
    : 'Guardar y abrir cuenta';

  // Resumen de la cuenta existente
  const acctSaldo = account ? vetAcctSaldo(account) : 0;
  const acctTotal = account ? vetAcctChargesTotal(account) : 0;

  function DestOpt({ value, title, sub }) {
    return (
      <button type="button" className={'vet-bill-destopt' + (destino === value ? ' active' : '')} onClick={() => setDestino(value)}>
        <VetIcons.Check size={14} strokeWidth={2.2} className="vet-bill-destcheck" />
        <div>
          <div className="vet-bill-desttitle">{title}</div>
          <div className="vet-bill-destsub">{sub}</div>
        </div>
      </button>
    );
  }

  return (
    <VetModalShell open={open} onClose={onClose}
      title={heading || 'Facturación de la consulta'}
      subtitle={subtitle || (pet && owner ? `${pet.name} · ${owner.name}` : '')}
      icon={VetIcons.Receipt} accent="amatista" width={700}
      footerLeft={showCharges ? <span className="vet-bill-foottotal">Total cargos <strong>{vetMoney(total)}</strong></span> : null}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" onClick={finish}>{primaryLabel}</button>
        </>
      }>
      <div className="vet-action-modal-body">
        {/* Estado de la cuenta */}
        {hasAccount ? (
          <div className="vet-bill-acctcard">
            <div className="vet-bill-acctcard-top">
              <div className="vet-bill-acctcard-ic"><VetIcons.Receipt size={17} strokeWidth={1.8} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="vet-bill-acctcard-title">
                  {owner?.name.split(' ')[0]} ya tiene una cuenta abierta
                </div>
                <div className="vet-bill-acctcard-sub">
                  {VET_ACCT_ORIGEN_LABEL[account.origen] || 'General'} · {account.charges.length} cargos · desde {account.openedAt.slice(5, 10)}
                </div>
              </div>
              <div className="vet-bill-acctcard-saldo">
                <span>Saldo actual</span>
                <strong>{vetMoney(acctSaldo)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="vet-bill-acct none">
            <VetIcons.Receipt size={16} strokeWidth={1.8} />
            <span><strong>{owner?.name.split(' ')[0]}</strong> no tiene cuenta abierta. Puedes abrir una con los cargos de esta consulta.</span>
          </div>
        )}

        {/* Elección de destino */}
        <div className={'vet-bill-dest' + (hasAccount ? ' three' : '')}>
          {hasAccount && (
            <DestOpt value="existing"
              title="Agregar a la cuenta abierta"
              sub={`Los cargos suben el saldo a ${vetMoney(acctSaldo + total)}.`} />
          )}
          <DestOpt value="new"
            title={hasAccount ? 'Abrir una cuenta nueva' : 'Abrir cuenta y agregar cargos'}
            sub={hasAccount ? 'Para un motivo o responsable distinto.' : 'Selecciona los productos y servicios de la consulta.'} />
          <DestOpt value="nada"
            title="Solo guardar la consulta"
            sub="Sin cobro ni cuenta. Podrás cobrar después." />
        </div>

        {showCharges && (
          <div className="vet-bill-cols">
            <div className="vet-bill-catalog">
              <div className="vet-acct-srcseg" style={{ marginBottom: 8 }}>
                <button type="button" className={'vet-acct-srcbtn' + (tab === 'servicio' ? ' active' : '')} onClick={() => { setTab('servicio'); setQuery(''); }}>
                  <VetIcons.Stethoscope size={14} strokeWidth={1.8} /><span>Servicios</span>
                </button>
                <button type="button" className={'vet-acct-srcbtn' + (tab === 'producto' ? ' active' : '')} onClick={() => { setTab('producto'); setQuery(''); }}>
                  <VetIcons.Package size={14} strokeWidth={1.8} /><span>Productos</span>
                </button>
              </div>
              <div className="vet-acct-search" style={{ marginBottom: 8 }}>
                <VetIcons.Search size={14} strokeWidth={1.8} />
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" />
              </div>
              <div className="vet-bill-catlist">
                {filtered.length === 0 && <div className="vet-acct-catalog-empty">Sin resultados</div>}
                {filtered.map((it) => {
                  const out = tab === 'producto' && it.stock <= 0;
                  return (
                    <button key={it.id} type="button" disabled={out}
                      className={'vet-acct-catrow' + (out ? ' out' : '')}
                      onClick={() => addItem(it, tab)}>
                      <div className="vet-acct-catrow-main">
                        <span className="vet-acct-catrow-name">{it.name}</span>
                        {out && <span className="vet-acct-catrow-out">Agotado</span>}
                      </div>
                      <span className="vet-acct-catrow-price">{vetMoney(it.salePrice)}</span>
                      <VetIcons.Plus size={15} strokeWidth={2.2} className="vet-acct-catrow-check" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="vet-bill-selected">
              <div className="vet-bill-selhead">{destino === 'existing' ? 'Cargos de la cuenta' : 'Cargos de esta consulta'}</div>

              {destino === 'existing' && account && account.charges.length > 0 && (
                <div className="vet-bill-existing">
                  <div className="vet-bill-existing-lab">Ya en la cuenta · solo lectura</div>
                  {account.charges.map((c) => (
                    <div key={c.id} className="vet-bill-selrow locked">
                      <VetIcons.Check size={13} strokeWidth={2.2} style={{ color: 'var(--warm-400)', flexShrink: 0 }} />
                      <div className="vet-bill-selinfo">
                        <span className="vet-bill-selname">{c.concepto}{c.qty > 1 ? ` ×${c.qty}` : ''}</span>
                        <span className="vet-bill-selkind">{c.date.slice(5)}</span>
                      </div>
                      <span className="vet-bill-sellinetotal">{vetMoney(c.unitPrice * c.qty)}</span>
                    </div>
                  ))}
                  <div className="vet-bill-existing-div">Nuevos cargos</div>
                </div>
              )}

              {items.length === 0 ? (
                <div className="vet-bill-selempty">Aún no has agregado cargos.<br />Elige del catálogo a la izquierda.</div>
              ) : (
                <div className="vet-bill-sellist">
                  {items.map((x) => (
                    <div key={x.key} className="vet-bill-selrow">
                      <div className="vet-bill-selinfo">
                        <span className="vet-bill-selname">{x.name}</span>
                        <span className="vet-bill-selkind">{x.kind === 'producto' ? 'Producto' : 'Servicio'} · {vetMoney(x.unitPrice)}</span>
                      </div>
                      <div className="vet-acct-stepper vet-bill-stepper">
                        <button type="button" onClick={() => setQty(x.key, x.qty - 1)}>−</button>
                        <input type="number" value={x.qty} onChange={(e) => setQty(x.key, Number(e.target.value) || 1)} />
                        <button type="button" onClick={() => setQty(x.key, x.qty + 1)}>+</button>
                      </div>
                      <span className="vet-bill-sellinetotal">{vetMoney(x.unitPrice * x.qty)}</span>
                      <button type="button" className="vet-bill-selremove" onClick={() => removeItem(x.key)} aria-label="Quitar">
                        <VetIcons.X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </VetModalShell>
  );
}

Object.assign(window, { VetConsultaBillingModal, vetOwnerHasOpenAccount, vetOwnerOpenAccount });
