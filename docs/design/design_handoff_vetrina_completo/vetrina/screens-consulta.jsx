/* global React, VetIcons,
   useVetRoute, useVetRouter,
   useVetDraft,
   VetPasoPropietario, VetPasoMascota, VetPasoConsulta, VetPasoResumen,
   VetActionModals, VetConsultaBillingModal,
   vetFormatDateLong */

// ============================================================================
// WizardStepper — components/WizardStepper.vue
// ============================================================================

function VetWizardStepper({ active, onNavigate }) {
  const steps = [
    { n: 1, label: 'Propietario' },
    { n: 2, label: 'Mascota' },
    { n: 3, label: 'Consulta' },
  ];
  return (
    <nav className="vet-stepper" role="progressbar" aria-valuenow={active} aria-valuemin={1} aria-valuemax={3}>
      {steps.map((s, i) => {
        const state = s.n < active ? 'done' : s.n === active ? 'current' : 'future';
        return (
          <React.Fragment key={s.n}>
            <button
              type="button"
              className={`vet-step-item ${state}`}
              disabled={s.n >= active}
              onClick={() => s.n < active && onNavigate(s.n)}
            >
              <span className="vet-step-bullet">
                {state === 'done' ? <VetIcons.Check size={13} strokeWidth={2} /> : s.n}
              </span>
              <span className="vet-step-label">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={'vet-step-sep' + (s.n < active ? ' done' : '')} />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ============================================================================
// WizardFooter — components/WizardFooter.vue
// ============================================================================

function VetWizardFooter({ showBack = true, nextLabel = 'Siguiente', nextVariant = 'primary', nextDisabled, nextLoading, onBack, onNext, extra, endExtra }) {
  return (
    <footer className="vet-wiz-footer">
      {showBack && (
        <button type="button" className="vet-wiz-ghost" onClick={onBack}>
          <VetIcons.ArrowLeft size={13} strokeWidth={1.8} />
          <span>Atrás</span>
        </button>
      )}
      <div className="vet-wiz-extra">{extra}</div>
      <div className="vet-wiz-end">
        {endExtra}
        <button
          type="button"
          className={'vet-wiz-next' + (nextVariant === 'success' ? ' success' : '')}
          disabled={nextDisabled || nextLoading}
          onClick={onNext}
        >
          <span>{nextLoading ? 'Guardando…' : nextLabel}</span>
          {!nextLoading && <VetIcons.ArrowRight size={13} strokeWidth={1.8} />}
        </button>
      </div>
    </footer>
  );
}

// ============================================================================
// DiscardConsultaDialog
// ============================================================================

function VetDiscardDialog({ open, petName, onCancel, onConfirm }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="vet-resume-overlay" role="alertdialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="vet-resume-card" style={{ width: 440 }}>
        <div className="vet-resume-ic" style={{ background: 'oklch(94% 0.06 25)', color: 'oklch(50% 0.18 25)' }}>
          <VetIcons.X size={22} strokeWidth={1.8} />
        </div>
        <h2 className="vet-resume-title" style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500 }}>
          ¿Descartar esta consulta?
        </h2>
        <p className="vet-resume-desc">
          Perderás todos los datos ingresados{petName && <> de <strong>{petName}</strong></>}. Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="vet-resume-ghost" onClick={onCancel}>Seguir editando</button>
          <button type="button" className="vet-resume-danger" onClick={onConfirm}>
            <VetIcons.Trash size={13} strokeWidth={1.8} />
            <span>Descartar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ResumeOrNewConsultaDialog
// ============================================================================

function VetResumeOrNewDialog({ open, ownerName, petName, step, onContinue, onCreateNew, onCancel }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const stepLabel = step === 2 ? 'paso 2 de 4 · Mascota'
    : step === 3 ? 'paso 3 de 4 · Consulta'
    : step === 4 ? 'paso 4 de 4 · Resumen'
    : 'paso 1 de 4 · Propietario';

  return (
    <div className="vet-resume-overlay" role="alertdialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="vet-resume-card">
        <div className="vet-resume-ic">
          <VetIcons.PawPrint size={22} strokeWidth={1.8} />
        </div>
        <h2 className="vet-resume-title">Tienes una consulta en marcha</h2>
        <p className="vet-resume-desc">
          Estás registrando una consulta
          {ownerName && <> para <strong>{ownerName}</strong></>}
          {petName && <> y su mascota <strong>{petName}</strong></>}.
          ¿Quieres retomarla donde la dejaste o empezar una nueva desde cero?
        </p>
        <div className="vet-resume-chip">{stepLabel}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 22 }}>
          <button type="button" className="vet-resume-ghost" onClick={onCreateNew}>
            ✨ <span>Crear una nueva</span>
          </button>
          <button type="button" className="vet-resume-primary" onClick={onContinue}>
            <span>Continuar consulta</span>
            <VetIcons.ArrowRight size={14} strokeWidth={1.8} />
          </button>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--warm-500)', lineHeight: 1.5, textAlign: 'right' }}>
          Si creas una nueva se borrarán los datos del propietario, mascota y consulta actuales.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// ConsultaActiveBanner — global banner
// ============================================================================

function VetConsultaActiveBanner() {
  const router = useVetRouter();
  const route = useVetRoute();
  const draft = useVetDraft();
  const [dismissed, setDismissed] = React.useState(false);

  const onConsultaNueva = route.name === 'consulta-nueva' || route.name === 'consulta-nueva-exito';
  const visible = !dismissed && !onConsultaNueva && (!!draft.state.owner || !!draft.state.pet);

  if (!visible) return null;
  return (
    <div className="vet-active-banner" role="status" aria-live="polite">
      <div className="vet-active-paw">
        <VetIcons.PawPrint size={18} strokeWidth={1.7} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <span className="vet-active-head">Consulta en curso</span>
        <span className="vet-active-who">
          {draft.state.pet?.name ?? 'Mascota pendiente'}
          {draft.state.owner && <> · {draft.state.owner.name}</>}
        </span>
      </div>
      <button type="button" className="vet-active-cta" onClick={() => router.push({ name: 'consulta-nueva', query: { paso: String(draft.state.step) } })}>
        <span>Volver a la consulta</span>
        <VetIcons.ArrowRight size={13} strokeWidth={1.8} />
      </button>
      <button type="button" className="vet-active-close" aria-label="Ocultar" onClick={() => setDismissed(true)}>
        <VetIcons.X size={14} strokeWidth={1.7} />
      </button>
    </div>
  );
}

// ============================================================================
// NuevaView — the wizard
// ============================================================================

function VetNuevaView() {
  const router = useVetRouter();
  const route = useVetRoute();
  const draft = useVetDraft();

  // Sync step from query param ?paso=N
  React.useEffect(() => {
    const raw = Number(route.query.paso ?? 1);
    const s = [1, 2].includes(raw) ? raw : 1;
    if (s !== draft.state.step) draft.setStep(s);
  }, [route.query.paso]); // eslint-disable-line

  React.useEffect(() => {
    if (Number(route.query.paso ?? 0) !== draft.state.step) {
      router.push({ name: 'consulta-nueva', query: { paso: String(draft.state.step) } });
    }
  }, [draft.state.step]); // eslint-disable-line

  const step = draft.state.step;
  const [openModal, setOpenModal] = React.useState(null);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [billingOpen, setBillingOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  function goStep(s) { draft.setStep(s); }

  const nextLabel = step === 1 && draft.state.ownerCreating ? 'Guardar y continuar'
    : step === 1 && draft.state.petCreating ? 'Guardar y continuar'
    : step === 2 ? 'Guardar consulta' : 'Continuar a la consulta';

  const nextVariant = step === 2 ? 'success' : 'primary';

  const nextDisabled = (() => {
    const s = draft.state;
    if (step === 1) {
      if (s.ownerCreating) {
        const o = s.ownerCreating;
        return !(o.name.trim() && o.document.trim() && o.phone.trim() && o.countryId && o.stateId && o.cityId);
      }
      if (s.petCreating) {
        const p = s.petCreating;
        return !(p.name.trim() && p.specieId && p.breedId && p.colorId && p.gender && p.bod && p.weight.trim() && p.reproductiveState);
      }
      return !s.owner || !s.pet;
    }
    if (step === 2) {
      return !(s.consultation.typeId && s.consultation.anamnesis.trim());
    }
    return false;
  })();

  // Paso 1 confirma owner/pet en creación; paso 2 abre facturación
  function handleNext() {
    const s = draft.state;
    if (step === 1 && s.ownerCreating) {
      const oc = s.ownerCreating;
      draft.setOwner({ id: 'new-' + Date.now().toString(36), name: oc.name, document: oc.document, phone: oc.phone, email: oc.email, address: oc.address, _new: true });
      return;
    }
    if (step === 1 && s.petCreating) {
      const pc = s.petCreating;
      draft.setPet({ id: 'newp-' + Date.now().toString(36), name: pc.name, specie: { name: '—' }, breed: { name: '—' }, gender: pc.gender, bod: pc.bod, weight: pc.weight, weightType: pc.weightType, reproductiveState: pc.reproductiveState, _new: true });
      return;
    }
    if (step < 2) { goStep(2); return; }
    setBillingOpen(true);
  }

  function finishSave() {
    setBillingOpen(false);
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      const { owner, pet, consultationType, consultation } = draft.state;
      window.__vetConsultaSuccess = {
        ownerName: owner?.name,
        petName: pet?.name,
        consultationType: consultationType?.name,
        date: consultation.date,
      };
      draft.reset();
      router.push({ name: 'consulta-nueva-exito' });
    }, 600);
  }

  function handleBack() {
    if (step > 1) goStep(step - 1);
  }

  function attemptCancel() {
    if (draft.isEmpty) {
      router.push({ name: 'home' });
      return;
    }
    setDiscardOpen(true);
  }
  function confirmDiscard() {
    setDiscardOpen(false);
    draft.reset();
    router.push({ name: 'home' });
  }

  return (
    <div className="vet-wizard">
      <header className="vet-wiz-topbar">
        <button type="button" className="vet-wiz-back" onClick={attemptCancel}>
          <VetIcons.ArrowLeft size={15} strokeWidth={1.7} />
          <span>Volver a inicio</span>
        </button>
        <span className="vet-wiz-divider" />
        <h1 className="vet-wiz-brand">Nueva consulta</h1>
        <span className="vet-wiz-badge">Borrador</span>
        <button type="button" className="vet-wiz-cancel" onClick={attemptCancel}>
          <VetIcons.X size={14} strokeWidth={1.7} />
          <span>Cancelar</span>
        </button>
      </header>

      <main className="vet-wiz-content">
        {step === 1 && <VetPasoPropietario />}
        {step === 2 && <VetPasoConsulta onOpenModal={setOpenModal} />}
      </main>

      <VetWizardFooter
        showBack={step > 1}
        nextLabel={nextLabel}
        nextVariant={nextVariant}
        nextDisabled={nextDisabled}
        nextLoading={saving && step === 2}
        onBack={handleBack}
        onNext={handleNext}
        extra={
          <>
            {step === 1 && draft.state.ownerCreating && (
              <button type="button" className="vet-wiz-discard-extra" onClick={draft.cancelCreatingOwner}>Descartar</button>
            )}
            {step === 1 && draft.state.petCreating && (
              <button type="button" className="vet-wiz-discard-extra" onClick={draft.cancelCreatingPet}>Descartar</button>
            )}
          </>
        }
      />

      <VetActionModals openKind={openModal} onClose={() => setOpenModal(null)} />

      <VetConsultaBillingModal
        open={billingOpen}
        owner={draft.state.owner}
        pet={draft.state.pet}
        consultationType={draft.state.consultationType}
        onClose={() => setBillingOpen(false)}
        onFinish={finishSave}
      />

      <VetDiscardDialog
        open={discardOpen}
        petName={draft.state.pet?.name}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={confirmDiscard}
      />
    </div>
  );
}

// ============================================================================
// ConsultaGuardada — exito/ConsultaGuardada.vue
// ============================================================================

function VetConsultaGuardadaView() {
  const router = useVetRouter();
  const success = window.__vetConsultaSuccess || {};
  const code = React.useMemo(() => {
    const n = String(Math.floor(Math.random() * 9000) + 1000);
    const y = new Date().getFullYear();
    return `#C-${y}-${n}`;
  }, []);

  return (
    <div className="vet-success">
      <div className="vet-success-inner">
        <div className="vet-success-badge">
          <VetIcons.Check size={34} strokeWidth={2} />
        </div>
        <h1 className="vet-success-title">Consulta guardada</h1>
        <p className="vet-success-who">
          {success.petName ?? '—'}{success.ownerName && <> · {success.ownerName}</>}
        </p>
        <p className="vet-success-meta">
          {success.date && <span>{vetFormatDateLong(success.date)}</span>}
          {success.consultationType && <span> · {success.consultationType}</span>}
          <span> · {code}</span>
        </p>
        <div className="vet-success-actions">
          <button type="button" className="vet-success-primary" onClick={() => router.push({ name: 'consulta-historial' })}>
            <span>Ver detalle</span>
            <VetIcons.ArrowRight size={13} strokeWidth={1.8} />
          </button>
          <button type="button" className="vet-success-ghost" onClick={() => router.push({ name: 'consulta-nueva' })}>
            <VetIcons.Plus size={13} strokeWidth={1.8} />
            <span>Crear otra consulta</span>
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  VetNuevaView, VetConsultaGuardadaView,
  VetConsultaActiveBanner, VetResumeOrNewDialog, VetDiscardDialog,
});
