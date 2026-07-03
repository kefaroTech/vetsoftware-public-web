/* global React, VetIcons, VetBaseField, VetBaseInput, VetBaseSelect,
   VET_MOCK_OWNERS, VET_FE_CUSTOMER_DOCTYPE, VET_FE_TAX_REGIME, VET_FE_CITIES,
   vetCalcDV, useVetToast */

// ============================================================================
// Customer picker con creación in-situ — buscar cliente o crear uno nuevo.
// mode: 'basic' (POS ≤5 UVT, fiscal opcional) | 'fiscal' (FE >5 UVT, fiscal requerido)
// onPick(customer) devuelve el cliente seleccionado/creado.
// ============================================================================

function VetCustomerPicker({ mode = 'basic', onPick }) {
  const fiscal = mode === 'fiscal';
  const [view, setView] = React.useState('search');   // 'search' | 'create'
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => {
      const ql = q.toLowerCase();
      setResults(VET_MOCK_OWNERS.filter((o) =>
        o.name.toLowerCase().includes(ql) || (o.document || '').toLowerCase().includes(ql) || (o.phone || '').toLowerCase().includes(ql)));
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function selectExisting(o) {
    onPick({ id: o.id, name: o.name, documentType: 'CEDULA_CIUDADANIA', documentId: o.document || '', personType: 'NATURAL', email: o.email || '', phone: o.phone || '', cityId: '', taxRegime: 'NO_RESPONSABLE_IVA', address: o.address || '', verificationDigit: null, legalName: null });
  }

  if (view === 'create') {
    return <VetCustomerCreateForm fiscal={fiscal} initialName={query.trim()} onBack={() => setView('search')} onCreated={onPick} />;
  }

  const q = query.trim();
  return (
    <div className="vet-cpk">
      <div className="vet-cpk-searchrow">
        <div className="vet-picker-search" style={{ flex: 1 }}>
          <VetIcons.Search size={14} strokeWidth={1.7} />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o documento…" autoFocus />
        </div>
        <button type="button" className="vet-cpk-newbtn" onClick={() => setView('create')}>
          <VetIcons.Plus size={15} strokeWidth={2.2} /> Crear cliente
        </button>
      </div>

      {searching && <div className="vet-picker-state">Buscando…</div>}

      {!searching && results.length > 0 && (
        <div className="vet-picker-results">
          {results.map((o) => (
            <button key={o.id} type="button" className="vet-picker-result" onClick={() => selectExisting(o)}>
              <div className="vet-picker-avatar"><VetIcons.User size={14} strokeWidth={1.7} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="vet-picker-name">{o.name}</div>
                <div className="vet-picker-meta">{o.document}{o.phone ? ' · ' + o.phone : ''}</div>
              </div>
              <VetIcons.ChevronRight size={15} strokeWidth={1.8} style={{ color: 'var(--warm-400)' }} />
            </button>
          ))}
        </div>
      )}

      {!searching && q && results.length === 0 && (
        <div className="vet-cpk-empty">
          <div className="vet-cpk-empty-ic"><VetIcons.Search size={20} strokeWidth={1.7} /></div>
          <div className="vet-cpk-empty-t">Sin resultados para “{q}”</div>
          <div className="vet-cpk-empty-s">No encontramos un cliente con ese nombre o documento.</div>
          <button type="button" className="vet-btn-primary-modal" onClick={() => setView('create')}>
            <VetIcons.Plus size={14} strokeWidth={2.2} /> Crear cliente nuevo
          </button>
        </div>
      )}

      {!q && (
        <div className="vet-cpk-hint">Escribe el nombre o documento del cliente. Si no existe, podrás crearlo.</div>
      )}
    </div>
  );
}

function VetCustomerCreateForm({ fiscal, initialName, onBack, onCreated }) {
  const toast = useVetToast();
  const [d, setD] = React.useState({
    name: initialName || '', documentId: '', phone: '', email: '', cityId: '', address: '',
    documentType: 'CEDULA_CIUDADANIA', personType: 'NATURAL', taxRegime: 'NO_RESPONSABLE_IVA', isWithholdingAgent: false,
  });
  const [touched, setTouched] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [failBanner, setFailBanner] = React.useState(false);
  const [citySearch, setCitySearch] = React.useState('');
  const [cityOpen, setCityOpen] = React.useState(false);

  const u = (p) => setD((x) => ({ ...x, ...p }));
  const mark = (k) => setTouched((x) => ({ ...x, [k]: true }));
  const isNit = d.documentType === 'NIT';
  const isJuridica = d.personType === 'JURIDICA';
  const dv = isNit ? vetCalcDV(d.documentId) : '';
  const city = (VET_FE_CITIES || []).find((c) => c.id === d.cityId);
  const cityNoDane = city && !city.dane;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '');

  const errs = {
    name: !d.name.trim() ? 'Requerido' : '',
    documentId: !d.documentId ? 'Requerido' : '',
    phone: !d.phone.trim() ? 'Requerido' : '',
    email: fiscal ? (!d.email ? 'Requerido' : (!emailOk ? 'Correo inválido' : '')) : (d.email && !emailOk ? 'Correo inválido' : ''),
    cityId: !d.cityId ? 'Requerida' : (cityNoDane ? 'Esta ciudad no tiene código DANE, no puede facturar' : ''),
    legalName: fiscal && isJuridica && !d.name.trim() ? 'Requerido' : '',
  };
  const requiredOk = !errs.name && !errs.documentId && !errs.phone && !errs.cityId && !errs.email && (!fiscal || (!errs.legalName && d.taxRegime));

  const cityOptions = (VET_FE_CITIES || []).filter((c) => c.name.toLowerCase().includes(citySearch.toLowerCase()));

  function submit() {
    setTouched({ name: true, documentId: true, phone: true, email: true, cityId: true, legalName: true });
    if (!requiredOk) return;
    setSaving(true); setFailBanner(false);
    setTimeout(() => {
      setSaving(false);
      // Simular fallo backend 1 de cada… no; siempre éxito en proto
      const created = {
        id: 'new-' + Date.now().toString(36),
        name: d.name.trim(),
        documentType: d.documentType, documentId: d.documentId, verificationDigit: isNit ? dv : null,
        personType: d.personType, legalName: isJuridica ? d.name.trim() : null,
        phone: d.phone.trim(), email: d.email.trim(), cityId: d.cityId, address: d.address.trim(),
        taxRegime: d.taxRegime, isWithholdingAgent: d.isWithholdingAgent,
      };
      toast.success('Cliente creado', `${created.name} quedó registrado y seleccionado.`);
      onCreated(created);
    }, 700);
  }

  const err = (k) => touched[k] && errs[k];

  return (
    <div className="vet-cpk-create">
      <button type="button" className="vet-cpk-back" onClick={onBack}>
        <VetIcons.ArrowLeft size={14} strokeWidth={1.9} /> Volver a la búsqueda
      </button>

      {failBanner && (
        <div className="vet-cpk-failbanner">
          <VetIcons.X size={14} strokeWidth={2.2} /> No se pudo crear el cliente. Revisa los datos e inténtalo de nuevo.
        </div>
      )}

      <div className="vet-cpk-sectlabel">Datos básicos</div>
      <div className="vet-form-grid-2">
        <VetBaseField label="Nombre" required error={err('name')}>
          {({ id }) => <VetBaseInput id={id} value={d.name} onChange={(v) => u({ name: v })} onBlur={() => mark('name')} placeholder="Nombre y apellido o razón social" />}
        </VetBaseField>
        <VetBaseField label="Teléfono" required error={err('phone')}>
          {({ id }) => <VetBaseInput id={id} value={d.phone} onChange={(v) => u({ phone: v })} onBlur={() => mark('phone')} placeholder="+57 …" />}
        </VetBaseField>
        <div style={{ display: 'grid', gridTemplateColumns: isNit ? '1fr auto' : '1fr', gap: 10, alignItems: 'start' }}>
          <VetBaseField label="Número de documento" required error={err('documentId')}>
            {({ id }) => <VetBaseInput id={id} value={d.documentId} onChange={(v) => u({ documentId: v.replace(/\D/g, '') })} onBlur={() => mark('documentId')} />}
          </VetBaseField>
          {isNit && <div className="vet-fe-dv"><div className="vet-fe-dv-lbl">DV</div><div className="vet-fe-dv-val">{dv || '–'}</div></div>}
        </div>
        <VetBaseField label={fiscal ? 'Correo electrónico' : 'Correo (opcional)'} required={fiscal} error={err('email')}>
          {({ id }) => <VetBaseInput id={id} type="email" value={d.email} onChange={(v) => u({ email: v })} onBlur={() => mark('email')} />}
        </VetBaseField>
        <div className="vet-form-span-2">
          <VetBaseField label="Ciudad" required error={err('cityId')}>
            {() => (
              <div className="vet-cpk-cityss">
                <button type="button" className="vet-cpk-cityfield" onClick={() => { setCityOpen((v) => !v); mark('cityId'); }}>
                  <span className={city ? '' : 'vet-cpk-cityph'}>{city ? (city.dane ? `${city.name} · DANE ${city.dane}` : `${city.name} · sin DANE`) : 'Selecciona la ciudad'}</span>
                  <VetIcons.ChevronDown size={15} strokeWidth={1.8} />
                </button>
                {cityOpen && (
                  <div className="vet-cpk-citymenu">
                    <div className="vet-picker-search" style={{ margin: 6 }}>
                      <VetIcons.Search size={13} strokeWidth={1.7} />
                      <input type="text" value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder="Buscar ciudad…" autoFocus />
                    </div>
                    <div className="vet-cpk-citylist">
                      {cityOptions.map((c) => (
                        <button key={c.id} type="button" className="vet-cpk-cityopt" onClick={() => { u({ cityId: c.id }); setCityOpen(false); setCitySearch(''); }}>
                          <span>{c.name}</span>
                          <span className={'vet-cpk-citytag' + (c.dane ? '' : ' bad')}>{c.dane ? `DANE ${c.dane}` : 'sin DANE'}</span>
                        </button>
                      ))}
                      {cityOptions.length === 0 && <div className="vet-picker-state">Sin coincidencias</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </VetBaseField>
        </div>
        <div className="vet-form-span-2">
          <VetBaseField label="Dirección (opcional)">
            {({ id }) => <VetBaseInput id={id} value={d.address} onChange={(v) => u({ address: v })} />}
          </VetBaseField>
        </div>
      </div>

      <div className="vet-cpk-sectlabel" style={{ marginTop: 16 }}>
        Datos fiscales {fiscal ? <span className="vet-cpk-reqtag">requeridos para factura electrónica</span> : <span className="vet-cpk-opttag">opcionales</span>}
      </div>
      <div className={'vet-cpk-fiscalbox' + (fiscal ? ' req' : '')}>
        <div className="vet-form-grid-2">
          <VetBaseField label="Tipo de documento" required={fiscal}>
            {({ id }) => <VetBaseSelect id={id} value={d.documentType} onChange={(v) => u({ documentType: v })}
              options={Object.entries(VET_FE_CUSTOMER_DOCTYPE).map(([k, v]) => ({ value: k, label: v }))} />}
          </VetBaseField>
          <VetBaseField label="Tipo de persona" required={fiscal}>
            <div className="vet-fe-segmented">
              {[['NATURAL', 'Natural'], ['JURIDICA', 'Jurídica']].map(([k, lbl]) => (
                <button key={k} type="button" className={'vet-fe-seg' + (d.personType === k ? ' on' : '')} onClick={() => u({ personType: k })}>{lbl}</button>
              ))}
            </div>
          </VetBaseField>
          {isJuridica && (
            <div className="vet-form-span-2">
              <VetBaseField label="Razón social" required={fiscal} error={fiscal ? err('legalName') : ''}>
                {({ id }) => <VetBaseInput id={id} value={d.name} onChange={(v) => u({ name: v })} onBlur={() => mark('legalName')} placeholder="Razón social de la empresa" />}
              </VetBaseField>
            </div>
          )}
          <VetBaseField label="Régimen tributario" required={fiscal}>
            {({ id }) => <VetBaseSelect id={id} value={d.taxRegime} onChange={(v) => u({ taxRegime: v })}
              options={Object.entries(VET_FE_TAX_REGIME).map(([k, v]) => ({ value: k, label: v }))} />}
          </VetBaseField>
        </div>
        <button type="button" className={'vet-fe-agenttoggle' + (d.isWithholdingAgent ? ' on' : '')} style={{ marginTop: 12 }} onClick={() => u({ isWithholdingAgent: !d.isWithholdingAgent })}>
          <span className="vet-fe-agentbox">{d.isWithholdingAgent && <VetIcons.Check size={12} strokeWidth={2.6} />}</span>
          <span><strong>Agente retenedor</strong><span className="vet-fe-agenthint">Si está activo se aplicarán retenciones.</span></span>
        </button>
      </div>

      <div className="vet-cpk-createfoot">
        <button type="button" className="vet-btn-ghost-modal" onClick={onBack}>Cancelar</button>
        <button type="button" className="vet-btn-primary-modal" disabled={!requiredOk || saving}
          style={(!requiredOk || saving) ? { opacity: 0.5, cursor: 'not-allowed' } : null} onClick={submit}>
          {saving ? 'Creando…' : 'Crear y seleccionar'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { VetCustomerPicker });
