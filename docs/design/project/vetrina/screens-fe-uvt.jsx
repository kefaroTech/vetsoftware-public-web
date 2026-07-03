/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseInput, VetBaseSelect,
   VET_FE_CUSTOMER_DOCTYPE, VET_FE_TAX_REGIME, VET_FE_CITIES, vetCalcDV, vetFeThreshold,
   VET_FE_UVT_VALUE, VET_FE_UVT_THRESHOLD_QTY, vetFeMoney, useVetToast */

// ============================================================================
// Factura electrónica obligatoria (> 5 UVT) — banner, checklist y modal de datos
// ============================================================================

// Evalúa qué datos fiscales del cliente están completos para emitir FE.
function vetFeCustomerChecklist(c) {
  if (!c) return { items: [], complete: false };
  const isNit = c.documentType === 'NIT';
  const isJuridica = c.personType === 'JURIDICA';
  const city = (VET_FE_CITIES || []).find((x) => x.id === c.cityId);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || '');
  const items = [
    { key: 'doc', label: 'Tipo y número de documento', ok: !!(c.documentType && c.documentId) },
    ...(isNit ? [{ key: 'dv', label: 'Dígito de verificación', ok: !!c.verificationDigit }] : []),
    { key: 'person', label: 'Tipo de persona', ok: !!c.personType },
    ...(isJuridica ? [{ key: 'legal', label: 'Razón social', ok: !!(c.legalName && c.legalName.trim()) }] : []),
    { key: 'email', label: 'Correo electrónico', ok: emailOk },
    { key: 'city', label: 'Ciudad (con código DANE)', ok: !!(city && city.dane) },
    { key: 'regime', label: 'Régimen tributario', ok: !!c.taxRegime },
  ];
  return { items, complete: items.every((i) => i.ok) };
}

// Banner ámbar de obligatoriedad
function VetFeThresholdBanner({ total }) {
  return (
    <div className="vet-fe-uvtbanner">
      <VetIcons.Bell size={16} strokeWidth={1.9} />
      <div>
        <strong>Esta venta supera 5 UVT ({vetFeMoney(vetFeThreshold())}).</strong>{' '}
        La DIAN exige <strong>Factura electrónica</strong> con los datos fiscales del cliente.
        <div className="vet-fe-uvtbanner-sub">5 UVT = {VET_FE_UVT_THRESHOLD_QTY} × {vetFeMoney(VET_FE_UVT_VALUE)} · total {vetFeMoney(total)}</div>
      </div>
    </div>
  );
}

// Bloque "Cliente" con checklist (3 estados: vacío / incompleto / completo)
function VetFeCustomerBlock({ customer, onSelect, onComplete }) {
  if (!customer) {
    return (
      <div className="vet-fe-custempty">
        <div className="vet-fe-custempty-ic"><VetIcons.User size={20} strokeWidth={1.7} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vet-fe-custempty-t">Cliente requerido</div>
          <div className="vet-fe-custempty-s">La factura electrónica debe ir a nombre de un cliente identificado.</div>
        </div>
        <button type="button" className="vet-btn-primary-modal" onClick={onSelect}>Seleccionar cliente</button>
      </div>
    );
  }
  const { items, complete } = vetFeCustomerChecklist(customer);
  return (
    <div className={'vet-fe-custcard' + (complete ? ' ok' : '')}>
      <div className="vet-fe-custcard-head">
        <div className="vet-fe-custcard-av">{(customer.name || customer.legalName || '?').slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vet-fe-custcard-name">{customer.legalName || customer.name}</div>
          <div className="vet-fe-custcard-doc">{VET_FE_CUSTOMER_DOCTYPE[customer.documentType]?.split(' (')[0] || '—'} {customer.documentId || ''}</div>
        </div>
        <button type="button" className="vet-fe-custcard-change" onClick={onSelect}>Cambiar</button>
      </div>
      <div className="vet-fe-checklistgrid">
        {items.map((it) => (
          <div key={it.key} className={'vet-fe-clitem' + (it.ok ? ' ok' : ' bad')}>
            {it.ok ? <VetIcons.Check size={13} strokeWidth={2.6} /> : <VetIcons.X size={13} strokeWidth={2.6} />}
            <span>{it.label}</span>
          </div>
        ))}
      </div>
      {!complete && (
        <button type="button" className="vet-fe-custcard-cta" onClick={onComplete}>
          <VetIcons.User size={14} strokeWidth={1.9} /> Completar datos fiscales del cliente
        </button>
      )}
    </div>
  );
}

// Modal "Completar datos fiscales del cliente"
function VetFeCustomerFiscalModal({ open, customer, onClose, onSave }) {
  const toast = useVetToast();
  const [d, setD] = React.useState({});
  const [touched, setTouched] = React.useState({});

  React.useEffect(() => {
    if (!open) return;
    setD({
      documentType: customer?.documentType || 'CEDULA_CIUDADANIA',
      documentId: customer?.documentId || '',
      personType: customer?.personType || 'NATURAL',
      legalName: customer?.legalName || customer?.name || '',
      email: customer?.email || '',
      cityId: customer?.cityId || '',
      taxRegime: customer?.taxRegime || 'NO_RESPONSABLE_IVA',
      isWithholdingAgent: customer?.isWithholdingAgent || false,
    });
    setTouched({});
  }, [open, customer]);

  const u = (p) => setD((x) => ({ ...x, ...p }));
  const t = (k) => setTouched((x) => ({ ...x, [k]: true }));
  const isNit = d.documentType === 'NIT';
  const isJuridica = d.personType === 'JURIDICA';
  const dv = isNit ? vetCalcDV(d.documentId) : '';
  const city = (VET_FE_CITIES || []).find((x) => x.id === d.cityId);
  const cityNoDane = city && !city.dane;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '');

  const errs = {
    documentId: !d.documentId ? 'Requerido' : '',
    legalName: isJuridica && !d.legalName.trim() ? 'Requerido para persona jurídica' : '',
    email: !d.email ? 'Requerido' : (!emailOk ? 'Correo inválido' : ''),
    cityId: !d.cityId ? 'Requerida' : (cityNoDane ? 'Esta ciudad no tiene código DANE, no puede usarse para facturar' : ''),
  };
  const valid = d.documentType && d.documentId && d.personType && (!isJuridica || d.legalName.trim()) && emailOk && d.cityId && !cityNoDane && d.taxRegime;

  function save() {
    setTouched({ documentId: true, legalName: true, email: true, cityId: true });
    if (!valid) return;
    onSave({ ...d, verificationDigit: isNit ? dv : null, legalName: isJuridica ? d.legalName.trim() : null, name: customer?.name || d.legalName });
    toast.success('Datos fiscales guardados', 'El cliente quedó listo para facturar.');
  }

  if (!open) return null;
  const err = (k) => touched[k] && errs[k];

  return (
    <VetModalShell open={open} onClose={onClose}
      title={`Datos fiscales de ${customer?.name || customer?.legalName || 'cliente'}`}
      subtitle="Necesarios para emitir la factura electrónica ante la DIAN"
      icon={VetIcons.User} accent="amatista" width={560}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" disabled={!valid}
            style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null} onClick={save}>Guardar y continuar</button>
        </>
      }>
      <div className="vet-action-modal-body">
        <div className="vet-form-grid-2">
          <VetBaseField label="Tipo de documento" required>
            {({ id }) => <VetBaseSelect id={id} value={d.documentType} onChange={(v) => u({ documentType: v })}
              options={Object.entries(VET_FE_CUSTOMER_DOCTYPE).map(([k, v]) => ({ value: k, label: v }))} />}
          </VetBaseField>
          <div style={{ display: 'grid', gridTemplateColumns: isNit ? '1fr auto' : '1fr', gap: 10, alignItems: 'start' }}>
            <VetBaseField label="Número de documento" required error={err('documentId')}>
              {({ id }) => <VetBaseInput id={id} value={d.documentId} onChange={(v) => u({ documentId: v.replace(/\D/g, '') })} onBlur={() => t('documentId')} />}
            </VetBaseField>
            {isNit && (
              <div className="vet-fe-dv">
                <div className="vet-fe-dv-lbl">DV</div>
                <div className="vet-fe-dv-val">{dv || '–'}</div>
              </div>
            )}
          </div>
        </div>

        <VetBaseField label="Tipo de persona" required>
          <div className="vet-fe-segmented">
            {[['NATURAL', 'Natural'], ['JURIDICA', 'Jurídica']].map(([k, lbl]) => (
              <button key={k} type="button" className={'vet-fe-seg' + (d.personType === k ? ' on' : '')} onClick={() => u({ personType: k })}>{lbl}</button>
            ))}
          </div>
        </VetBaseField>

        {isJuridica && (
          <VetBaseField label="Razón social" required error={err('legalName')}>
            {({ id }) => <VetBaseInput id={id} value={d.legalName} onChange={(v) => u({ legalName: v })} onBlur={() => t('legalName')} />}
          </VetBaseField>
        )}

        <VetBaseField label="Correo electrónico" required error={err('email')} hint="Se enviará la representación gráfica de la factura.">
          {({ id }) => <VetBaseInput id={id} type="email" value={d.email} onChange={(v) => u({ email: v })} onBlur={() => t('email')} />}
        </VetBaseField>

        <VetBaseField label="Ciudad" required error={err('cityId')}>
          {({ id }) => <VetBaseSelect id={id} value={d.cityId} onChange={(v) => { u({ cityId: v }); t('cityId'); }} placeholder="Selecciona la ciudad"
            options={VET_FE_CITIES.map((cc) => ({ value: cc.id, label: cc.dane ? `${cc.name} · DANE ${cc.dane}` : `${cc.name} · sin DANE` }))} />}
        </VetBaseField>

        <VetBaseField label="Régimen tributario" required>
          {({ id }) => <VetBaseSelect id={id} value={d.taxRegime} onChange={(v) => u({ taxRegime: v })}
            options={Object.entries(VET_FE_TAX_REGIME).map(([k, v]) => ({ value: k, label: v }))} />}
        </VetBaseField>

        <button type="button" className={'vet-fe-agenttoggle' + (d.isWithholdingAgent ? ' on' : '')} onClick={() => u({ isWithholdingAgent: !d.isWithholdingAgent })}>
          <span className="vet-fe-agentbox">{d.isWithholdingAgent && <VetIcons.Check size={12} strokeWidth={2.6} />}</span>
          <span><strong>Agente retenedor</strong><span className="vet-fe-agenthint">Si está activo se aplicarán retenciones (ReteFuente/IVA/ICA).</span></span>
        </button>
      </div>
    </VetModalShell>
  );
}

Object.assign(window, { vetFeCustomerChecklist, VetFeThresholdBanner, VetFeCustomerBlock, VetFeCustomerFiscalModal });
