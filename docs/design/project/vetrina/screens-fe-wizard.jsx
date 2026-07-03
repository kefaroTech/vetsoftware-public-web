/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseInput, VetBaseSelect, VetDateInput,
   VET_FE_TAX_PROFILE, VET_FE_PROVIDER, VET_FE_RESOLUTIONS,
   VET_FE_COMPANY_DOCTYPE, VET_FE_TAX_REGIME, VET_FE_ENVIRONMENT, VET_FE_RESPONSABILITIES,
   VET_FE_ECONOMIC_ACTIVITIES, VET_FE_DOC_TYPE, vetFeMoney, useVetToast */

// ============================================================================
// Habilitación de facturación electrónica — store + helpers
// ============================================================================

// Dígito de verificación DIAN (NIT) — algoritmo oficial
function vetCalcDV(nit) {
  const digits = String(nit || '').replace(/\D/g, '');
  if (!digits) return '';
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;
  const rev = digits.split('').reverse();
  for (let i = 0; i < rev.length; i++) sum += Number(rev[i]) * (weights[i] || 0);
  const r = sum % 11;
  return String(r > 1 ? 11 - r : r);
}

const VET_FE_RESPONSIBILITY_DESC = {
  'O-13': 'Gran contribuyente',
  'O-15': 'Autorretenedor',
  'O-23': 'Agente de retención de IVA',
  'O-47': 'Régimen Simple de Tributación',
  'R-99-PN': 'No responsable / no aplica',
};

function useVetFeEnablement() {
  const toast = useVetToast();
  // Estado semilla: proveedor + identidad + resoluciones configurados (sandbox), SIN activar
  const [state, setState] = React.useState({
    provider: { ...VET_FE_PROVIDER, connectionTested: true, lastVerified: '2026-06-18 09:12' },
    profile: { ...VET_FE_TAX_PROFILE, lastVerified: '2026-06-18 09:14' },
    resolutions: VET_FE_RESOLUTIONS.map((r) => ({ ...r })),
    activated: false,
    lastVerified: { resolutions: '2026-06-18 09:15' },
  });

  const setProvider = (p) => setState((s) => ({ ...s, provider: { ...s.provider, ...p } }));
  const setProfile = (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  const upsertResolution = (r) => setState((s) => {
    if (r.id) return { ...s, resolutions: s.resolutions.map((x) => x.id === r.id ? { ...x, ...r } : x) };
    return { ...s, resolutions: [...s.resolutions, { ...r, id: Date.now(), currentNumber: r.rangeFrom, enabled: true }] };
  });
  const activate = (v) => setState((s) => ({ ...s, activated: v }));

  return { state, setProvider, setProfile, upsertResolution, activate, toast };
}

// Estado calculado de cada prerrequisito
function vetFeReqStatus(state) {
  const p = state.profile;
  const profileOk = !!(p && p.companyDocumentId && p.legalName && p.taxRegime && p.fiscalEmail && (p.responsibilities || []).length);
  const provOk = !!(state.provider && state.provider.baseUrl && state.provider.clientId);
  const enabledRes = state.resolutions.filter((r) => r.enabled);
  const resOk = enabledRes.length > 0;
  // alertas de resolución
  const today = new Date('2026-06-21');
  const resAlerts = [];
  for (const r of enabledRes) {
    const total = r.rangeTo - r.rangeFrom + 1;
    const left = r.rangeTo - r.currentNumber;
    if (left / total < 0.1) resAlerts.push({ kind: 'agotar', res: r });
    if (new Date(r.validTo) < today) resAlerts.push({ kind: 'vencida', res: r });
    else if ((new Date(r.validTo) - today) / 86400000 < 45) resAlerts.push({ kind: 'porvencer', res: r });
  }
  return {
    profileOk, provOk, resOk,
    resAttention: resAlerts.length > 0,
    resAlerts,
    readyToActivate: profileOk && resOk,
    sandbox: state.provider?.environment === 'SANDBOX',
  };
}

// ============================================================================
// Panel de estado de habilitación
// ============================================================================

function VetFeStatusPanel({ store, onOpenWizard, onEditStep }) {
  const { state } = store;
  const st = vetFeReqStatus(state);

  const reqs = [
    { key: 'profile', step: 1, ok: st.profileOk, title: 'Identidad fiscal de la empresa', desc: st.profileOk ? state.profile.legalName : 'Datos del emisor ante la DIAN', verified: state.profile?.lastVerified },
    { key: 'res', step: 2, ok: st.resOk, attention: st.resAttention, title: 'Resoluciones de numeración', desc: st.resOk ? `${state.resolutions.filter((r) => r.enabled).length} activas` : 'Al menos una por tipo a emitir', verified: state.lastVerified?.resolutions },
    { key: 'act', step: 3, ok: state.activated, title: 'Activación de facturación', desc: state.activated ? 'Módulo activo' : 'Pendiente de activar', verified: null },
  ];
  const doneCount = reqs.filter((r) => r.ok).length;

  return (
    <div className="vet-fe-board">
      {/* Tarjeta principal */}
      <div className={'vet-fe-readycard' + (state.activated ? ' ready' : '')}>
        <div className="vet-fe-readycard-ic">
          {state.activated ? <VetIcons.ShieldCheck size={26} strokeWidth={1.8} /> : <VetIcons.FileText size={26} strokeWidth={1.8} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vet-fe-readycard-title">{state.activated ? 'Facturación activa' : st.readyToActivate ? 'Lista para activar' : 'Habilitación en curso'}</div>
          <div className="vet-fe-readycard-sub">
            {state.activated ? 'La clínica está emitiendo documentos electrónicos.' : `${doneCount} de 3 requisitos completos.`}
          </div>
        </div>
        <button type="button" className="vet-shop-cta" onClick={onOpenWizard}>
          {state.activated ? 'Revisar configuración' : st.readyToActivate ? 'Activar facturación' : 'Continuar habilitación'}
          <VetIcons.ArrowRight size={15} strokeWidth={1.9} />
        </button>
      </div>

      {/* Alertas de resoluciones */}
      {st.resAlerts.map((a, i) => (
        <div key={i} className="vet-fe-alertrow">
          <VetIcons.Bell size={14} strokeWidth={1.9} />
          <span>
            {a.kind === 'agotar' && <>La resolución <strong>{a.res.prefix}</strong> ({VET_FE_DOC_TYPE[a.res.documentType].label}) está por agotarse · quedan {(a.res.rangeTo - a.res.currentNumber).toLocaleString('es')} consecutivos.</>}
            {a.kind === 'vencida' && <>La resolución <strong>{a.res.prefix}</strong> está <strong>vencida</strong> desde {a.res.validTo}. Solicita una nueva ante la DIAN.</>}
            {a.kind === 'porvencer' && <>La resolución <strong>{a.res.prefix}</strong> vence el {a.res.validTo}. Gestiona la renovación con tiempo.</>}
          </span>
          <button type="button" className="vet-fe-alertcta" onClick={() => onEditStep(3)}>Revisar</button>
        </div>
      ))}

      {/* Checklist */}
      <div className="vet-fe-checklist">
        {reqs.map((r) => (
          <div key={r.key} className="vet-fe-checkrow static">
            <div className={'vet-fe-check-ic' + (r.ok ? ' ok' : r.attention ? ' att' : ' pend')}>
              {r.ok ? <VetIcons.Check size={16} strokeWidth={2.4} /> : r.attention ? <VetIcons.Bell size={15} strokeWidth={1.9} /> : <VetIcons.FileText size={15} strokeWidth={1.8} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="vet-fe-check-title">
                {r.title}
                <span className={'vet-fe-reqbadge ' + (r.ok ? 'ok' : r.attention ? 'att' : 'pend')}>
                  {r.ok ? 'Listo' : r.attention ? 'Atención' : 'Pendiente'}
                </span>
              </div>
              <div className="vet-fe-check-sub">{r.desc}{r.verified && <span className="vet-fe-check-verified"> · verificado {r.verified.slice(5, 16)}</span>}</div>
            </div>
            <button type="button" className="vet-fe-check-cta" onClick={() => onEditStep(r.step)}>
              {r.ok ? 'Editar' : r.attention ? 'Re-verificar' : 'Completar'} <VetIcons.ChevronRight size={14} strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { useVetFeEnablement, vetFeReqStatus, vetCalcDV, VET_FE_RESPONSIBILITY_DESC, VetFeStatusPanel });
