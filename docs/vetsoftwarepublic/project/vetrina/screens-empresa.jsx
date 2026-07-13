/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseInput, VetBaseTextarea, VetBaseSelect, useVetToast */

// ============================================================================
// Empresa — datos fiscales de la empresa + gestión de sedes (sucursales).
// Sección ADMINISTRACIÓN. Modelo: registration (empresa) + branches (sedes).
// ============================================================================

const VET_EMPRESA_INITIAL = {
  legalName: 'Clínica Veterinaria Patitas S.A.S.',
  documentType: 'NIT',
  documentTypeLabel: 'NIT (31)',
  identifier: '900123456',
  dv: '7',
  taxRegime: 'RESPONSABLE_IVA',
  taxRegimeLabel: 'Responsable de IVA',
  personType: 'Jurídica',
  fiscalEmail: 'facturacion@patitas.com',
  phone: '+57 601 234 5678',
  address: 'Cra 12 # 34-56',
  country: 'Colombia',
  state: 'Cundinamarca',
  city: 'Bogotá',
  createdDate: '2024-11-02',
};

const VET_EMPRESA_BRANCHES = [
  { id: 1, name: 'Sede Principal', code: 'PRIN', city: 'Bogotá', address: 'Cra 12 # 34-56', phone: '+57 601 234 5678', principal: true, active: true },
  { id: 2, name: 'Sede Norte', code: 'NORT', city: 'Bogotá', address: 'Calle 140 # 18-20', phone: '+57 601 555 1212', principal: false, active: true },
  { id: 3, name: 'Sede Chapinero', code: 'CHAP', city: 'Bogotá', address: 'Cra 7 # 63-11', phone: '', principal: false, active: false },
];

const VET_EMPRESA_CITIES = [
  { value: 'Bogotá', label: 'Bogotá' },
  { value: 'Medellín', label: 'Medellín' },
  { value: 'Cali', label: 'Cali' },
  { value: 'Barranquilla', label: 'Barranquilla' },
  { value: 'Bucaramanga', label: 'Bucaramanga' },
  { value: 'Cartagena', label: 'Cartagena' },
];
const VET_DOCTYPE_LABELS = {
  NIT: 'NIT (31)', CEDULA_CIUDADANIA: 'Cédula (13)',
  CEDULA_EXTRANJERIA: 'C. extranjería (22)', PASAPORTE: 'Pasaporte (41)',
};
const VET_REGIME_LABELS = { RESPONSABLE_IVA: 'Responsable de IVA', NO_RESPONSABLE_IVA: 'No responsable de IVA' };

// ---------- Info row (label + value) ----------
function VetInfoRow({ label, value, mono }) {
  return (
    <div className="vet-co-row">
      <span className="vet-co-row-label">{label}</span>
      <span className={'vet-co-row-value' + (mono ? ' mono' : '')}>{value || <span className="vet-co-empty">—</span>}</span>
    </div>
  );
}

// ---------- Branch card ----------
function VetBranchCard({ branch, onEdit }) {
  return (
    <div className={'vet-branchcard' + (branch.active ? '' : ' inactive')}>
      <div className="vet-branchcard-top">
        <span className="vet-branchcard-ic"><VetIcons.MapPin size={17} strokeWidth={1.7} /></span>
        <div className="vet-branchcard-head">
          <div className="vet-branchcard-name">{branch.name}</div>
          <div className="vet-branchcard-code">{branch.code}</div>
        </div>
        <div className="vet-branchcard-badges">
          {branch.principal && <span className="vet-branchcard-badge principal">Principal</span>}
          <span className={'vet-branchcard-badge ' + (branch.active ? 'active' : 'off')}>
            {branch.active ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      </div>
      <div className="vet-branchcard-meta">
        <div className="vet-branchcard-line"><VetIcons.MapPin size={13} strokeWidth={1.6} /> {branch.city}{branch.address ? ` · ${branch.address}` : ''}</div>
        <div className="vet-branchcard-line"><VetIcons.Phone size={13} strokeWidth={1.6} /> {branch.phone || 'Sin teléfono'}</div>
      </div>
      <div className="vet-branchcard-foot">
        <button type="button" className="vet-branchcard-edit" onClick={() => onEdit(branch)}>
          <VetIcons.Edit size={13} strokeWidth={1.7} /> Editar
        </button>
      </div>
    </div>
  );
}

// ---------- Sede form modal ----------
function VetSedeFormModal({ open, initial, onClose, onSave }) {
  const isEditing = !!initial;
  const [draft, setDraft] = React.useState(null);
  const [touched, setTouched] = React.useState({});
  const [banner, setBanner] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDraft(initial
      ? { ...initial }
      : { name: '', code: '', city: '', address: '', phone: '', principal: false, active: true });
    setTouched({});
    setBanner(false);
  }, [open, initial]);

  if (!open || !draft) return null;
  const set = (f, v) => setDraft((d) => ({ ...d, [f]: v }));
  const touch = (f) => setTouched((t) => ({ ...t, [f]: true }));
  const errors = {};
  if (!draft.name.trim() || draft.name.trim().length < 2) errors.name = 'Ingresa el nombre de la sede (mín. 2).';
  if (!draft.code.trim()) errors.code = 'Ingresa un código.';
  if (!draft.city) errors.city = 'Selecciona la ciudad.';
  const err = (f) => touched[f] && errors[f];

  function submit() {
    setTouched({ name: true, code: true, city: true });
    if (Object.keys(errors).length) { setBanner(true); return; }
    onSave({ ...draft, code: draft.code.trim().toUpperCase() });
  }

  return (
    <VetModalShell
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar sede' : 'Nueva sede'}
      subtitle={isEditing ? 'Actualiza los datos de la sucursal.' : 'Registra una nueva sucursal de la empresa.'}
      icon={isEditing ? VetIcons.Edit : VetIcons.MapPin}
      accent="amatista"
      width={520}
      footerActions={
        <>
          <button type="button" className="vet-drawer-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-emp-modal-primary" onClick={submit}>
            {isEditing ? 'Guardar cambios' : 'Crear sede'}
          </button>
        </>
      }
    >
      {banner && <div className="vet-emp-banner-error">Revisa los campos marcados antes de continuar.</div>}
      <div className="vet-emp-form">
        <div className="vet-form-grid-2">
          <VetBaseField label="Nombre de la sede" required error={err('name')}>
            {({ id }) => (
              <VetBaseInput id={id} value={draft.name} onChange={(v) => set('name', v)}
                placeholder="Sede Sur" onKeyDown={(e) => e.key === 'Enter' && submit()} />
            )}
          </VetBaseField>
          <VetBaseField label="Código" required error={err('code')}>
            {({ id }) => (
              <VetBaseInput id={id} value={draft.code} onChange={(v) => set('code', v.replace(/[^A-Za-z0-9]/g, ''))}
                placeholder="SUR" maxLength={10} />
            )}
          </VetBaseField>
        </div>

        <VetBaseField label="Ciudad" required error={err('city')}>
          {({ id }) => (
            <VetBaseSelect id={id} value={draft.city} onChange={(v) => set('city', v)}
              options={VET_EMPRESA_CITIES} placeholder="Selecciona la ciudad" />
          )}
        </VetBaseField>

        <VetBaseField label="Dirección">
          {({ id }) => (
            <VetBaseInput id={id} value={draft.address} onChange={(v) => set('address', v)}
              placeholder="Cra 00 # 00-00" />
          )}
        </VetBaseField>

        <VetBaseField label="Teléfono">
          {({ id }) => (
            <VetBaseInput id={id} value={draft.phone} onChange={(v) => set('phone', v.replace(/[^+\d\s\-()]/g, ''))}
              placeholder="+57 601 000 0000" />
          )}
        </VetBaseField>

        <div className="vet-sede-toggles">
          <label className={'vet-sede-toggle' + (draft.principal ? ' on' : '')}>
            <span className="vet-sede-tgl-box">{draft.principal && <VetIcons.Check size={12} strokeWidth={3} />}</span>
            <input type="checkbox" checked={draft.principal} onChange={(e) => set('principal', e.target.checked)} style={{ display: 'none' }} />
            <span className="vet-sede-tgl-text">
              <span className="vet-sede-tgl-title">Sede principal</span>
              <span className="vet-sede-tgl-desc">Es la casa matriz de la empresa.</span>
            </span>
          </label>
          <label className={'vet-sede-toggle' + (draft.active ? ' on' : '')}>
            <span className="vet-sede-tgl-box">{draft.active && <VetIcons.Check size={12} strokeWidth={3} />}</span>
            <input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} style={{ display: 'none' }} />
            <span className="vet-sede-tgl-text">
              <span className="vet-sede-tgl-title">Activa</span>
              <span className="vet-sede-tgl-desc">Disponible para operar y facturar.</span>
            </span>
          </label>
        </div>
      </div>
    </VetModalShell>
  );
}

// ---------- Empresa edit modal ----------
function VetEmpresaEditModal({ open, initial, onClose, onSave }) {
  const [draft, setDraft] = React.useState(null);
  React.useEffect(() => { if (open) setDraft({ ...initial }); }, [open, initial]);
  if (!open || !draft) return null;
  const set = (f, v) => setDraft((d) => ({ ...d, [f]: v }));
  const isNit = draft.documentType === 'NIT';

  function submit() {
    onSave({
      ...draft,
      documentTypeLabel: VET_DOCTYPE_LABELS[draft.documentType],
      taxRegimeLabel: VET_REGIME_LABELS[draft.taxRegime],
      personType: draft.documentType === 'NIT' ? 'Jurídica' : 'Natural',
    });
  }

  return (
    <VetModalShell
      open={open}
      onClose={onClose}
      title="Editar datos de la empresa"
      subtitle="Identidad fiscal, contacto y ubicación."
      icon={VetIcons.Building2}
      accent="amatista"
      width={640}
      footerActions={
        <>
          <button type="button" className="vet-drawer-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-emp-modal-primary" onClick={submit}>Guardar cambios</button>
        </>
      }
    >
      <div className="vet-emp-form">
        <VetBaseField label="Razón social" required>
          {({ id }) => <VetBaseInput id={id} value={draft.legalName} onChange={(v) => set('legalName', v)} placeholder="Razón social" />}
        </VetBaseField>
        <div className="vet-form-grid-2">
          <VetBaseField label="Tipo de documento" required>
            {({ id }) => (
              <VetBaseSelect id={id} value={draft.documentType} onChange={(v) => set('documentType', v)}
                options={Object.entries(VET_DOCTYPE_LABELS).map(([value, label]) => ({ value, label }))} />
            )}
          </VetBaseField>
          <VetBaseField label="Número de documento" required>
            {({ id }) => <VetBaseInput id={id} value={draft.identifier} onChange={(v) => set('identifier', v.replace(/[^A-Za-z0-9]/g, ''))} placeholder="900123456" />}
          </VetBaseField>
        </div>
        {isNit && (
          <div className="vet-co-hint"><VetIcons.ShieldCheck size={13} strokeWidth={1.7} /> El dígito de verificación (DV) se calcula automáticamente.</div>
        )}
        <div className="vet-form-grid-2">
          <VetBaseField label="Régimen tributario" required>
            {({ id }) => (
              <VetBaseSelect id={id} value={draft.taxRegime} onChange={(v) => set('taxRegime', v)}
                options={Object.entries(VET_REGIME_LABELS).map(([value, label]) => ({ value, label }))} />
            )}
          </VetBaseField>
          <VetBaseField label="Correo fiscal" required>
            {({ id }) => <VetBaseInput id={id} type="email" value={draft.fiscalEmail} onChange={(v) => set('fiscalEmail', v)} placeholder="facturacion@empresa.com" />}
          </VetBaseField>
        </div>
        <div className="vet-form-grid-2">
          <VetBaseField label="Teléfono">
            {({ id }) => <VetBaseInput id={id} value={draft.phone} onChange={(v) => set('phone', v)} placeholder="+57 601 000 0000" />}
          </VetBaseField>
          <VetBaseField label="Dirección">
            {({ id }) => <VetBaseInput id={id} value={draft.address} onChange={(v) => set('address', v)} placeholder="Cra 00 # 00-00" />}
          </VetBaseField>
        </div>
        <div className="vet-form-grid-3">
          <VetBaseField label="País"><VetBaseInput value={draft.country} onChange={(v) => set('country', v)} /></VetBaseField>
          <VetBaseField label="Departamento"><VetBaseInput value={draft.state} onChange={(v) => set('state', v)} /></VetBaseField>
          <VetBaseField label="Ciudad">
            {({ id }) => <VetBaseSelect id={id} value={draft.city} onChange={(v) => set('city', v)} options={VET_EMPRESA_CITIES} />}
          </VetBaseField>
        </div>
      </div>
    </VetModalShell>
  );
}

// ---------- Empresa view ----------
function VetEmpresaView() {
  const toast = useVetToast();
  const [company, setCompany] = React.useState(VET_EMPRESA_INITIAL);
  const [branches, setBranches] = React.useState(VET_EMPRESA_BRANCHES);
  const [sedeModal, setSedeModal] = React.useState(null); // { initial } | null
  const [editOpen, setEditOpen] = React.useState(false);

  const idDisplay = company.documentType === 'NIT' && company.dv
    ? `${company.identifier}-${company.dv}`
    : company.identifier;
  const activeCount = branches.filter((b) => b.active).length;

  function saveSede(data) {
    setBranches((arr) => {
      let next;
      if (data.id) {
        next = arr.map((b) => (b.id === data.id ? { ...b, ...data } : b));
      } else {
        const id = Math.max(0, ...arr.map((b) => b.id)) + 1;
        next = [...arr, { ...data, id }];
      }
      // Solo una principal
      if (data.principal) next = next.map((b) => (b.id === (data.id ?? Math.max(...next.map((x) => x.id))) ? b : { ...b, principal: false }));
      return next;
    });
    toast.success(data.id ? 'Sede actualizada' : 'Sede creada',
      data.id ? `Los cambios de ${data.name} se guardaron.` : `${data.name} se añadió a la empresa.`);
    setSedeModal(null);
  }

  function saveCompany(data) {
    setCompany(data);
    toast.success('Empresa actualizada', 'Los datos de la empresa se guardaron.');
    setEditOpen(false);
  }

  const initial = company.legalName.trim()[0] || 'E';

  return (
    <div className="vet-emp-page">
      <div className="vet-emp-header">
        <div>
          <div className="vet-emp-kicker">Administración · Empresa</div>
          <h1 className="vet-emp-title">Empresa</h1>
          <div className="vet-emp-lead">Datos fiscales, ubicación y sedes de tu empresa.</div>
        </div>
        <button type="button" className="vet-co-editbtn" onClick={() => setEditOpen(true)}>
          <VetIcons.Edit size={15} strokeWidth={1.8} /> Editar datos
        </button>
      </div>

      {/* Hero */}
      <div className="vet-co-hero">
        <div className="vet-co-mark">{initial}</div>
        <div className="vet-co-heroinfo">
          <div className="vet-co-heroname">{company.legalName}</div>
          <div className="vet-co-herotags">
            <span className="vet-co-tag mono">{company.documentTypeLabel} · {idDisplay}</span>
            <span className="vet-co-tag amatista">{company.taxRegimeLabel}</span>
            <span className="vet-co-tag">{company.personType}</span>
          </div>
        </div>
        <div className="vet-co-herometa">
          <span className="vet-co-herometa-label">Activa desde</span>
          <span className="vet-co-herometa-value">{company.createdDate}</span>
        </div>
      </div>

      {/* Info cards */}
      <div className="vet-co-grid">
        <section className="vet-co-card">
          <header className="vet-co-cardhead">
            <span className="vet-co-cardic"><VetIcons.ShieldCheck size={16} strokeWidth={1.7} /></span>
            <h3>Identidad fiscal</h3>
          </header>
          <div className="vet-co-rows">
            <VetInfoRow label="Razón social" value={company.legalName} />
            <VetInfoRow label="Tipo de documento" value={company.documentTypeLabel} />
            <VetInfoRow label="Número de documento" value={idDisplay} mono />
            <VetInfoRow label="Régimen tributario" value={company.taxRegimeLabel} />
            <VetInfoRow label="Tipo de persona" value={company.personType} />
          </div>
        </section>

        <section className="vet-co-card">
          <header className="vet-co-cardhead">
            <span className="vet-co-cardic"><VetIcons.MapPin size={16} strokeWidth={1.7} /></span>
            <h3>Contacto y ubicación</h3>
          </header>
          <div className="vet-co-rows">
            <VetInfoRow label="Correo fiscal" value={company.fiscalEmail} />
            <VetInfoRow label="Teléfono" value={company.phone} />
            <VetInfoRow label="Dirección" value={company.address} />
            <VetInfoRow label="País" value={company.country} />
            <VetInfoRow label="Departamento / Ciudad" value={`${company.state} · ${company.city}`} />
          </div>
        </section>
      </div>

      {/* Sedes */}
      <div className="vet-co-sedes">
        <div className="vet-co-sedeshead">
          <div className="vet-co-sedestitle">
            <h3>Sedes</h3>
            <span className="vet-co-sedescount">{branches.length} {branches.length === 1 ? 'sede' : 'sedes'} · {activeCount} {activeCount === 1 ? 'activa' : 'activas'}</span>
          </div>
          <button type="button" className="vet-emp-cta" onClick={() => setSedeModal({ initial: null })}>
            <VetIcons.Plus size={16} strokeWidth={1.8} /> Nueva sede
          </button>
        </div>
        <div className="vet-co-sedesgrid">
          {branches.map((b) => (
            <VetBranchCard key={b.id} branch={b} onEdit={(br) => setSedeModal({ initial: br })} />
          ))}
        </div>
      </div>

      <VetSedeFormModal
        open={!!sedeModal}
        initial={sedeModal?.initial}
        onClose={() => setSedeModal(null)}
        onSave={saveSede}
      />
      <VetEmpresaEditModal
        open={editOpen}
        initial={company}
        onClose={() => setEditOpen(false)}
        onSave={saveCompany}
      />
    </div>
  );
}

Object.assign(window, { VetEmpresaView });
