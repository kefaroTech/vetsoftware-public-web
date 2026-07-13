/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseInput, VetBaseSelect,
   VET_FE_TAX_PROFILE, VET_FE_PROVIDER, VET_FE_RESOLUTIONS, VET_FE_WITHHOLDING,
   VET_FE_DOC_TYPE, VET_FE_COMPANY_DOCTYPE, VET_FE_TAX_REGIME, VET_FE_ENVIRONMENT,
   VET_FE_RESPONSABILITIES, VET_FE_ECONOMIC_ACTIVITIES, vetFeMoney, vetFeCan, useVetToast */

// ============================================================================
// Facturación electrónica — Tablero de habilitación + Configuración
// ============================================================================

function VetFeReadyBoard({ onGo }) {
  const profileOk = !!VET_FE_TAX_PROFILE;
  const providerOk = !!VET_FE_PROVIDER;
  const resFE = VET_FE_RESOLUTIONS.find((r) => r.documentType === 'FE_VENTA' && r.enabled);
  const resPOS = VET_FE_RESOLUTIONS.find((r) => r.documentType === 'DOC_EQUIV_POS' && r.enabled);
  const withholdingOk = !!VET_FE_WITHHOLDING;

  const steps = [
    { key: 'profile', ok: profileOk, icon: VetIcons.User, title: 'Perfil fiscal de la empresa', sub: profileOk ? VET_FE_TAX_PROFILE.legalName : 'Identidad fiscal del emisor', tab: 'perfil' },
    { key: 'provider', ok: providerOk, hidden: true, icon: VetIcons.Settings, title: 'Proveedor DIAN', sub: '', tab: 'proveedor' },
    { key: 'res', ok: !!resFE || !!resPOS, icon: VetIcons.FileText, title: 'Resoluciones de numeración', sub: (resFE || resPOS) ? `${VET_FE_RESOLUTIONS.filter((r) => r.enabled).length} activas` : 'Al menos una activa por tipo a emitir', tab: 'numeracion' },
    { key: 'reten', ok: withholdingOk, optional: true, icon: VetIcons.Receipt, title: 'Retenciones', sub: withholdingOk ? 'Configuradas' : 'Opcional · para clientes agentes retenedores', tab: 'retenciones' },
  ];
  const required = steps.filter((s) => !s.optional && !s.hidden);
  const doneCount = required.filter((s) => s.ok).length;
  const ready = doneCount === required.length;
  const visibleSteps = steps.filter((s) => !s.hidden);

  return (
    <div className="vet-fe-board">
      <div className={'vet-fe-readycard' + (ready ? ' ready' : '')}>
        <div className="vet-fe-readycard-ic">
          {ready ? <VetIcons.ShieldCheck size={26} strokeWidth={1.8} /> : <VetIcons.FileText size={26} strokeWidth={1.8} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vet-fe-readycard-title">{ready ? 'Lista para facturar' : 'Configuración pendiente'}</div>
          <div className="vet-fe-readycard-sub">
            {ready ? 'La empresa cumple los requisitos para emitir documentos electrónicos.' : `${doneCount} de ${required.length} requisitos completos.`}
          </div>
        </div>
        <div className="vet-fe-readycard-prog">{doneCount}/{required.length}</div>
      </div>

      <div className="vet-fe-checklist">
        {visibleSteps.map((s) => (
          <button key={s.key} type="button" className="vet-fe-checkrow" onClick={() => onGo(s.tab)}>
            <div className={'vet-fe-check-ic' + (s.ok ? ' ok' : s.optional ? ' opt' : ' pend')}>
              {s.ok ? <VetIcons.Check size={16} strokeWidth={2.4} /> : <s.icon size={16} strokeWidth={1.8} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="vet-fe-check-title">{s.title}{s.optional && <span className="vet-fe-opt-tag">Opcional</span>}</div>
              <div className="vet-fe-check-sub">{s.sub}</div>
            </div>
            <span className="vet-fe-check-cta">{s.ok ? 'Editar' : 'Configurar'} <VetIcons.ChevronRight size={14} strokeWidth={1.8} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Perfil fiscal ----
function VetFePerfilFiscal() {
  const toast = useVetToast();
  const [d, setD] = React.useState({ ...VET_FE_TAX_PROFILE });
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const isNit = d.documentType === 'NIT';

  return (
    <div className="vet-fe-formcol">
      <VetFeSectionHead icon={VetIcons.User} title="Perfil fiscal de la empresa" sub="Identidad fiscal del emisor (singleton por empresa)" />
      <div className="vet-fe-card">
        <div className="vet-form-grid-2">
          <VetBaseField label="Tipo de documento" required>
            {({ id }) => <VetBaseSelect id={id} value={d.documentType} onChange={(v) => u({ documentType: v })}
              options={Object.entries(VET_FE_COMPANY_DOCTYPE).map(([k, v]) => ({ value: k, label: v }))} />}
          </VetBaseField>
          <VetBaseField label="Número de documento" required>
            {({ id }) => <VetBaseInput id={id} value={d.companyDocumentId} onChange={(v) => u({ companyDocumentId: v })} placeholder="901456789" />}
          </VetBaseField>
          {isNit && (
            <VetBaseField label="Dígito de verificación" required>
              {({ id }) => <VetBaseInput id={id} value={d.companyDocumentVerificationDigit} onChange={(v) => u({ companyDocumentVerificationDigit: v.slice(0, 1) })} placeholder="3" />}
            </VetBaseField>
          )}
          <div className="vet-form-span-2">
            <VetBaseField label="Razón social" required>
              {({ id }) => <VetBaseInput id={id} value={d.legalName} onChange={(v) => u({ legalName: v })} />}
            </VetBaseField>
          </div>
          <VetBaseField label="Régimen tributario" required>
            {({ id }) => <VetBaseSelect id={id} value={d.taxRegime} onChange={(v) => u({ taxRegime: v })}
              options={Object.entries(VET_FE_TAX_REGIME).map(([k, v]) => ({ value: k, label: v }))} />}
          </VetBaseField>
          <VetBaseField label="Correo fiscal (DIAN)" required>
            {({ id }) => <VetBaseInput id={id} type="email" value={d.fiscalEmail} onChange={(v) => u({ fiscalEmail: v })} />}
          </VetBaseField>
          <VetBaseField label="Nombre comercial">
            {({ id }) => <VetBaseInput id={id} value={d.commercialName} onChange={(v) => u({ commercialName: v })} />}
          </VetBaseField>
          <VetBaseField label="Actividad económica (CIIU)">
            {({ id }) => <VetBaseSelect id={id} value={d.economicActivityId} onChange={(v) => u({ economicActivityId: Number(v) })}
              options={VET_FE_ECONOMIC_ACTIVITIES.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))} />}
          </VetBaseField>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="vet-acct-fieldlabel">Responsabilidades RUT <span style={{ color: 'oklch(55% 0.16 25)' }}>*</span></div>
          <div className="vet-fe-chips">
            {VET_FE_RESPONSABILITIES.map((r) => {
              const on = d.responsibilities.includes(r);
              return (
                <button key={r} type="button" className={'vet-fe-respchip' + (on ? ' on' : '')}
                  onClick={() => u({ responsibilities: on ? d.responsibilities.filter((x) => x !== r) : [...d.responsibilities, r] })}>
                  {on && <VetIcons.Check size={11} strokeWidth={2.6} />}{r}
                </button>
              );
            })}
          </div>
          <p className="vet-pauta-help" style={{ marginTop: 8 }}>Selecciona al menos un código de responsabilidad del RUT (p. ej. O-13, R-99-PN).</p>
        </div>
      </div>
      <div className="vet-fe-formfoot">
        <button type="button" className="vet-btn-primary-modal" onClick={() => toast.success('Perfil fiscal guardado', d.legalName)}>Guardar perfil fiscal</button>
      </div>
    </div>
  );
}

// ---- Proveedor DIAN ----
function VetFeProveedor() {
  const toast = useVetToast();
  const [d, setD] = React.useState({ ...VET_FE_PROVIDER, clientSecret: '', username: '', password: '', apiToken: '', webhookSecret: '' });
  const [confirmProd, setConfirmProd] = React.useState(false);
  const u = (p) => setD((x) => ({ ...x, ...p }));

  function SecretField({ label, field, configured }) {
    return (
      <VetBaseField label={label}>
        {({ id }) => (
          <div>
            <VetBaseInput id={id} type="password" value={d[field]} onChange={(v) => u({ [field]: v })}
              placeholder={configured ? '•••••••• (configurado)' : 'Sin configurar'} />
            <div className={'vet-fe-secret-state' + (configured ? ' ok' : '')}>
              {configured ? <><VetIcons.Check size={11} strokeWidth={2.4} /> Configurado · deja vacío para conservar</> : 'Sin configurar'}
            </div>
          </div>
        )}
      </VetBaseField>
    );
  }

  return (
    <div className="vet-fe-formcol">
      <VetFeSectionHead icon={VetIcons.Settings} title="Proveedor DIAN" sub="Conexión con el proveedor tecnológico (MATIAS). Contiene secretos." />
      <div className="vet-fe-card">
        <div className="vet-form-grid-2">
          <VetBaseField label="Proveedor">
            {({ id }) => <VetBaseSelect id={id} value={d.provider} onChange={(v) => u({ provider: v })} options={[{ value: 'MATIAS', label: 'MATIAS' }]} />}
          </VetBaseField>
          <VetBaseField label="Ambiente" required>
            {({ id }) => <VetBaseSelect id={id} value={d.environment} onChange={(v) => { if (v === 'PRODUCTION' && d.environment !== 'PRODUCTION') setConfirmProd(true); u({ environment: v }); }}
              options={Object.entries(VET_FE_ENVIRONMENT).map(([k, v]) => ({ value: k, label: v }))} />}
          </VetBaseField>
          <div className="vet-form-span-2">
            <VetBaseField label="URL base" required>
              {({ id }) => <VetBaseInput id={id} value={d.baseUrl} onChange={(v) => u({ baseUrl: v })} />}
            </VetBaseField>
          </div>
          <VetBaseField label="Client ID">
            {({ id }) => <VetBaseInput id={id} value={d.clientId} onChange={(v) => u({ clientId: v })} />}
          </VetBaseField>
          <VetBaseField label="Ref. de numeración del proveedor">
            {({ id }) => <VetBaseInput id={id} value={d.numberingProviderRef} onChange={(v) => u({ numberingProviderRef: v })} />}
          </VetBaseField>
        </div>

        {d.environment === 'PRODUCTION' && (
          <div className="vet-fe-prodwarn"><VetIcons.Bell size={14} strokeWidth={1.8} /> En <strong>Producción</strong> las emisiones son reales y tienen efectos fiscales ante la DIAN.</div>
        )}

        <div className="vet-fe-secrets">
          <div className="vet-acct-fieldlabel" style={{ marginBottom: 10 }}>Credenciales (secretas)</div>
          <div className="vet-form-grid-2">
            <SecretField label="Client Secret" field="clientSecret" configured={d.clientSecretConfigured} />
            <SecretField label="API Token (PAT)" field="apiToken" configured={d.apiTokenConfigured} />
            <SecretField label="Usuario (login MATIAS)" field="username" configured={d.usernameConfigured} />
            <SecretField label="Contraseña" field="password" configured={d.passwordConfigured} />
            <SecretField label="Webhook Secret (HMAC)" field="webhookSecret" configured={d.webhookSecretConfigured} />
          </div>
        </div>
      </div>
      <div className="vet-fe-formfoot">
        <button type="button" className="vet-btn-primary-modal" onClick={() => toast.success('Proveedor DIAN guardado', 'Credenciales actualizadas')}>Guardar proveedor</button>
      </div>
    </div>
  );
}

function VetFeSectionHead({ icon: Icon, title, sub }) {
  return (
    <div className="vet-fe-sechead">
      <div className="vet-fe-sechead-ic"><Icon size={18} strokeWidth={1.8} /></div>
      <div><div className="vet-fe-sechead-title">{title}</div><div className="vet-fe-sechead-sub">{sub}</div></div>
    </div>
  );
}

Object.assign(window, { VetFeReadyBoard, VetFePerfilFiscal, VetFeProveedor, VetFeSectionHead });
