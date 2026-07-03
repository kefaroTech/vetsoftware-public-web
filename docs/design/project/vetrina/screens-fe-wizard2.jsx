/* global React, VetIcons, VetBaseField, VetBaseInput, VetBaseSelect, VetDateInput,
   vetCalcDV, vetFeReqStatus, VET_FE_RESPONSIBILITY_DESC,
   VET_FE_COMPANY_DOCTYPE, VET_FE_TAX_REGIME, VET_FE_ENVIRONMENT, VET_FE_RESPONSABILITIES,
   VET_FE_ECONOMIC_ACTIVITIES, VET_FE_DOC_TYPE, vetFeMoney, VetFeSectionHead */

// ============================================================================
// Wizard de habilitación — Stepper + 4 pasos + activación
// ============================================================================

const VET_FE_WIZ_STEPS = [
  { n: 1, label: 'Identidad fiscal' },
  { n: 2, label: 'Resoluciones' },
  { n: 3, label: 'Revisión y activación' },
];

function VetFeWizard({ store, initialStep, onExit }) {
  const { state } = store;
  const st = vetFeReqStatus(state);
  const [step, setStep] = React.useState(initialStep || 1);
  const reqByStep = { 1: st.profileOk, 2: st.resOk, 3: state.activated };

  function go(n) { if (n >= 1 && n <= 3) setStep(n); }

  return (
    <div className="vet-fe-wizard">
      <header className="vet-fe-wiz-top">
        <button type="button" className="vet-fe-wiz-exit" onClick={onExit}>
          <VetIcons.ArrowLeft size={15} strokeWidth={1.8} /> Volver al estado
        </button>
        <span className="vet-fe-wiz-title">Habilitar facturación electrónica</span>
        {st.sandbox && <span className="vet-fe-wiz-envbadge">Modo Pruebas</span>}
      </header>

      <div className="vet-fe-wiz-stepper">
        {VET_FE_WIZ_STEPS.map((s, i) => {
          const done = reqByStep[s.n] && s.n < step;
          const cur = s.n === step;
          return (
            <React.Fragment key={s.n}>
              <button type="button" className={'vet-fe-wstep' + (cur ? ' cur' : '') + (done ? ' done' : '')} onClick={() => go(s.n)}>
                <span className="vet-fe-wstep-dot">{done ? <VetIcons.Check size={13} strokeWidth={2.6} /> : s.n}</span>
                <span className="vet-fe-wstep-lbl">{s.label}</span>
              </button>
              {i < VET_FE_WIZ_STEPS.length - 1 && <span className={'vet-fe-wstep-bar' + (s.n < step ? ' done' : '')} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="vet-fe-wiz-body">
        {step === 1 && <VetFeStepIdentity store={store} onNext={() => go(2)} />}
        {step === 2 && <VetFeStepResolutions store={store} onBack={() => go(1)} onNext={() => go(3)} />}
        {step === 3 && <VetFeStepReview store={store} onEditStep={go} onExit={onExit} />}
      </div>
    </div>
  );
}

function VetFeWizFoot({ onBack, onNext, nextLabel = 'Guardar y continuar', nextDisabled, draftNote }) {
  return (
    <div className="vet-fe-wizfoot">
      {onBack ? <button type="button" className="vet-btn-ghost-modal" onClick={onBack}>Atrás</button> : <span />}
      <div className="vet-fe-wizfoot-right">
        {draftNote && <span className="vet-fe-draftnote">{draftNote}</span>}
        <button type="button" className="vet-btn-primary-modal" disabled={nextDisabled}
          style={nextDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : null} onClick={onNext}>{nextLabel}</button>
      </div>
    </div>
  );
}

// ---- Paso 1: Cuenta proveedor (MATIAS) ----
function VetFeStepProvider({ store, onNext }) {
  const [d, setD] = React.useState({ ...store.state.provider, clientSecret: '', apiToken: '' });
  const [testing, setTesting] = React.useState(false);
  const [tested, setTested] = React.useState(store.state.provider.connectionTested);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const valid = d.baseUrl && d.clientId;

  function test() {
    setTesting(true);
    setTimeout(() => { setTesting(false); setTested(true); store.toast.success('Conexión exitosa', 'La cuenta MATIAS respondió correctamente.'); }, 900);
  }
  function save() { store.setProvider({ ...d, connectionTested: tested, lastVerified: '2026-06-21 10:00' }); store.toast.success('Cuenta del proveedor guardada', ''); onNext(); }

  return (
    <div className="vet-fe-formcol">
      <VetFeSectionHead icon={VetIcons.Settings} title="Cuenta del proveedor (MATIAS)" sub="Enlaza la cuenta emisora de esta clínica con el proveedor tecnológico autorizado por la DIAN." />
      <div className="vet-fe-card">
        {/* Selector de ambiente */}
        <div className="vet-fe-envsel">
          {Object.entries(VET_FE_ENVIRONMENT).map(([k, v]) => (
            <button key={k} type="button" className={'vet-fe-envbtn' + (d.environment === k ? ' on' : '') + (k === 'PRODUCTION' ? ' prod' : '')} onClick={() => u({ environment: k })}>
              <span className="vet-fe-envbtn-dot" />
              <div><div className="vet-fe-envbtn-t">{v}</div><div className="vet-fe-envbtn-s">{k === 'SANDBOX' ? 'Para validar sin efectos fiscales' : 'Emisión real ante la DIAN'}</div></div>
            </button>
          ))}
        </div>
        {d.environment === 'PRODUCTION' && <div className="vet-fe-prodwarn" style={{ marginTop: 12 }}><VetIcons.Bell size={14} strokeWidth={1.9} /> En Producción los documentos tienen <strong>validez fiscal</strong>. Asegúrate de haber validado en Pruebas.</div>}

        <div className="vet-form-grid-2" style={{ marginTop: 16 }}>
          <div className="vet-form-span-2">
            <VetBaseField label="URL base del proveedor" required>
              {({ id }) => <VetBaseInput id={id} value={d.baseUrl} onChange={(v) => u({ baseUrl: v })} placeholder="https://api.matias.co/v1" />}
            </VetBaseField>
            <p className="vet-fe-help">Te la entrega MATIAS al crear la cuenta de la clínica.</p>
          </div>
          <VetBaseField label="Client ID" required>
            {({ id }) => <VetBaseInput id={id} value={d.clientId} onChange={(v) => u({ clientId: v })} />}
          </VetBaseField>
          <VetBaseField label="Ref. de numeración del proveedor">
            {({ id }) => <VetBaseInput id={id} value={d.numberingProviderRef} onChange={(v) => u({ numberingProviderRef: v })} />}
          </VetBaseField>
          <VetBaseField label="Client Secret">
            {({ id }) => <VetBaseInput id={id} type="password" value={d.clientSecret} onChange={(v) => u({ clientSecret: v })} placeholder={d.clientSecretConfigured ? '•••••••• (configurado)' : 'Sin configurar'} />}
          </VetBaseField>
          <VetBaseField label="Token de integración (PAT)">
            {({ id }) => <VetBaseInput id={id} type="password" value={d.apiToken} onChange={(v) => u({ apiToken: v })} placeholder={d.apiTokenConfigured ? '•••••••• (configurado)' : 'Si ya tienes una cuenta, pega el token' } />}
          </VetBaseField>
        </div>

        <div className="vet-fe-conntest">
          <button type="button" className="vet-historia-btn-ghost" onClick={test} disabled={testing || !valid}>
            <VetIcons.History size={14} strokeWidth={1.8} /> {testing ? 'Probando…' : 'Probar conexión'}
          </button>
          {tested && !testing && <span className="vet-fe-conn-ok"><VetIcons.Check size={13} strokeWidth={2.4} /> Conexión verificada</span>}
        </div>
      </div>
      <VetFeWizFoot onNext={save} nextDisabled={!valid} draftNote="Se guarda como borrador automáticamente" />
    </div>
  );
}

// ---- Paso 2: Identidad fiscal ----
function VetFeStepIdentity({ store, onBack, onNext }) {
  const [d, setD] = React.useState({ ...store.state.profile });
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const isNit = d.documentType === 'NIT';
  const dv = isNit ? vetCalcDV(d.companyDocumentId) : '';
  const [actQuery, setActQuery] = React.useState('');
  const valid = d.companyDocumentId && d.legalName && d.taxRegime && d.fiscalEmail && (d.responsibilities || []).length;

  const acts = VET_FE_ECONOMIC_ACTIVITIES.filter((a) => !actQuery || `${a.code} ${a.name}`.toLowerCase().includes(actQuery.toLowerCase()));
  const selAct = VET_FE_ECONOMIC_ACTIVITIES.find((a) => a.id === d.economicActivityId);

  function save() { store.setProfile({ ...d, companyDocumentVerificationDigit: dv, lastVerified: '2026-06-21 10:00' }); store.toast.success('Identidad fiscal guardada', ''); onNext(); }

  return (
    <div className="vet-fe-formcol">
      <VetFeSectionHead icon={VetIcons.User} title="Identidad fiscal de la empresa" sub="Datos del emisor tal como están registrados en el RUT. Aparecen en cada documento." />
      <div className="vet-fe-card">
        <div className="vet-form-grid-2">
          <VetBaseField label="Tipo de documento" required>
            {({ id }) => <VetBaseSelect id={id} value={d.documentType} onChange={(v) => u({ documentType: v })}
              options={Object.entries(VET_FE_COMPANY_DOCTYPE).map(([k, v]) => ({ value: k, label: v }))} />}
          </VetBaseField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
            <VetBaseField label="Número de documento" required>
              {({ id }) => <VetBaseInput id={id} value={d.companyDocumentId} onChange={(v) => u({ companyDocumentId: v.replace(/\D/g, '') })} placeholder="901456789" />}
            </VetBaseField>
            {isNit && (
              <div className="vet-fe-dv">
                <div className="vet-fe-dv-lbl">DV</div>
                <div className="vet-fe-dv-val">{dv || '–'}</div>
              </div>
            )}
          </div>
          {isNit && <p className="vet-fe-help vet-form-span-2" style={{ marginTop: -8 }}>El dígito de verificación se calcula automáticamente.</p>}
          <div className="vet-form-span-2">
            <VetBaseField label="Razón social" required>
              {({ id }) => <VetBaseInput id={id} value={d.legalName} onChange={(v) => u({ legalName: v })} />}
            </VetBaseField>
          </div>
          <VetBaseField label="Nombre comercial">
            {({ id }) => <VetBaseInput id={id} value={d.commercialName} onChange={(v) => u({ commercialName: v })} placeholder="Opcional" />}
          </VetBaseField>
          <VetBaseField label="Correo fiscal" required>
            {({ id }) => <VetBaseInput id={id} type="email" value={d.fiscalEmail} onChange={(v) => u({ fiscalEmail: v })} />}
          </VetBaseField>
          <VetBaseField label="Régimen de IVA" required>
            {({ id }) => <VetBaseSelect id={id} value={d.taxRegime} onChange={(v) => u({ taxRegime: v })}
              options={Object.entries(VET_FE_TAX_REGIME).map(([k, v]) => ({ value: k, label: v }))} />}
          </VetBaseField>
          <div className="vet-form-span-2">
            <VetBaseField label="Actividad económica (CIIU)">
              {({ id }) => (
                <div className="vet-fe-actpick">
                  <VetBaseInput id={id} value={selAct ? `${selAct.code} · ${selAct.name}` : actQuery} onChange={(v) => { u({ economicActivityId: null }); setActQuery(v); }} placeholder="Busca por código o descripción…" />
                  {actQuery && !selAct && (
                    <div className="vet-fe-actlist">
                      {acts.map((a) => <button key={a.id} type="button" className="vet-fe-actrow" onClick={() => { u({ economicActivityId: a.id }); setActQuery(''); }}><strong>{a.code}</strong> {a.name}</button>)}
                      {acts.length === 0 && <div className="vet-fe-actrow empty">Sin resultados</div>}
                    </div>
                  )}
                </div>
              )}
            </VetBaseField>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="vet-acct-fieldlabel">Responsabilidades fiscales (RUT) <span style={{ color: 'oklch(55% 0.16 25)' }}>*</span></div>
          <p className="vet-fe-help" style={{ margin: '4px 0 10px' }}>Selecciona las que apliquen según tu RUT.</p>
          <div className="vet-fe-resplist">
            {VET_FE_RESPONSABILITIES.map((r) => {
              const on = (d.responsibilities || []).includes(r);
              return (
                <button key={r} type="button" className={'vet-fe-respitem' + (on ? ' on' : '')}
                  onClick={() => u({ responsibilities: on ? d.responsibilities.filter((x) => x !== r) : [...(d.responsibilities || []), r] })}>
                  <span className="vet-fe-respbox">{on && <VetIcons.Check size={11} strokeWidth={2.6} />}</span>
                  <span><strong>{r}</strong> · {VET_FE_RESPONSIBILITY_DESC[r]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <VetFeWizFoot onBack={onBack} onNext={save} nextDisabled={!valid} draftNote="Se guarda como borrador automáticamente" />
    </div>
  );
}

Object.assign(window, { VetFeWizard, VetFeWizFoot });
