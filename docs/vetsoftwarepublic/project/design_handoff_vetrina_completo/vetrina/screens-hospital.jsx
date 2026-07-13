/* global React, VetIcons, VetModalShell,
   VetBaseField, VetBaseInput, VetBaseTextarea, VetBaseSelect, VetDateInput,
   VET_HOSP_NOW, VET_HOSP_STATUS, VET_HOSP_ROUTE, VET_HOSP_DOSE_STATUS,
   VET_HOSP_PATIENTS, VET_HOSP_STAFF, vetHospPetCtx, vetDoseIsOverdue,
   useVetToast */

// ============================================================================
// State
// ============================================================================

function useVetHospState() {
  const toast = useVetToast();
  const [patients, setPatients] = React.useState(VET_HOSP_PATIENTS);

  function patch(id, updater) {
    setPatients((arr) => arr.map((p) => p.id === id ? updater(p) : p));
  }

  // Recalcula las tomas PENDIENTES posteriores cuando la pauta es por intervalo.
  // baseTime = hora real de la toma aplicada; appliedSchedItem = id de la toma aplicada.
  function recalcInterval(schedule, appliedId, baseTime, intervalH) {
    if (!intervalH) return schedule;
    const sorted = [...schedule].sort((a, b) => a.time.localeCompare(b.time));
    const idx = sorted.findIndex((d) => d.id === appliedId);
    if (idx < 0) return schedule;
    let next = baseTime;
    const shifts = {};
    for (let i = idx + 1; i < sorted.length; i++) {
      if (sorted[i].status === 'PENDIENTE') {
        next = vetShiftTime(next, intervalH);
        shifts[sorted[i].id] = next;
      }
    }
    return schedule.map((d) => shifts[d.id] ? { ...d, time: shifts[d.id] } : d);
  }

  function markDose(patientId, medId, doseId) {
    const staff = 'Mariana Rojas';
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    patch(patientId, (p) => ({
      ...p,
      medications: p.medications.map((m) => {
        if (m.id !== medId) return m;
        let schedule = m.schedule.map((d) => d.id !== doseId ? d : {
          ...d, status: 'APLICADA', givenBy: staff, givenAt: at,
        });
        if (m.pauta === 'INTERVALO') {
          schedule = recalcInterval(schedule, doseId, at, vetIntervalFromFreq(m.frequency));
        }
        return { ...m, schedule };
      }),
    }));
    const med = (patients.find((p) => p.id === patientId)?.medications ?? []).find((m) => m.id === medId);
    if (med?.pauta === 'INTERVALO') {
      toast.success('Dosis registrada', `Aplicada ${at}. Se recalcularon las tomas siguientes (cada ${vetIntervalFromFreq(med.frequency)}h).`);
    } else {
      toast.success('Dosis registrada', `Aplicada a las ${at}.`);
    }
  }

  function markProcedure(patientId, procId, doseId) {
    const staff = 'Mariana Rojas';
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    patch(patientId, (p) => ({
      ...p,
      procedures: p.procedures.map((pr) => {
        if (pr.id !== procId) return pr;
        let schedule = (pr.schedule ?? []).map((d) => d.id !== doseId ? d : {
          ...d, status: 'APLICADA', givenBy: staff, givenAt: at,
        });
        if (pr.pauta === 'INTERVALO') {
          schedule = recalcInterval(schedule, doseId, at, vetIntervalFromFreq(pr.frequency));
        }
        return { ...pr, schedule };
      }),
    }));
    toast.success('Procedimiento registrado', `Realizado a las ${at}.`);
  }

  // Drag override: mueve una toma PENDIENTE a otra hora.
  // mode: 'one' (solo esta) | 'cascade' (esta y las siguientes por intervalo)
  function moveDose(patientId, kind, orderId, doseId, newTime, mode) {
    const listKey = kind === 'proc' ? 'procedures' : 'medications';
    patch(patientId, (p) => ({
      ...p,
      [listKey]: p[listKey].map((o) => {
        if (o.id !== orderId) return o;
        let schedule = o.schedule.map((d) => d.id === doseId ? { ...d, time: newTime } : d);
        if (mode === 'cascade') {
          schedule = recalcInterval(schedule, doseId, newTime, vetIntervalFromFreq(o.frequency));
        }
        return { ...o, schedule };
      }),
    }));
    toast.success('Toma reprogramada', mode === 'cascade'
      ? `Movida a las ${newTime} y recalculadas las siguientes.`
      : `Movida a las ${newTime}.`);
  }

  function addMedication(patientId, med) {
    patch(patientId, (p) => ({
      ...p,
      medications: [...p.medications, { ...med, id: Math.max(0, ...p.medications.map((m) => m.id)) + 1, schedule: med.schedule ?? [] }],
    }));
    toast.success('Medicamento añadido', `${med.name} agregado al plan.`);
  }
  // Reconstruye el schedule conservando SIEMPRE las dosis aplicadas (registro histórico).
  // Solo recalcula/ajusta las pendientes según la nueva pauta/duración.
  function rebuildKeepingApplied(existing, data) {
    const applied = (existing || []).filter((d) => d.status === 'APLICADA');
    let pending = (existing || []).filter((d) => d.status !== 'APLICADA');
    // Duración por nº de tomas: el total no puede ser menor que lo ya aplicado
    if (data.durMode === 'TOMAS') {
      const target = Math.max(applied.length, Number(data.durValue) || 0);
      const need = target - applied.length;
      if (pending.length > need) pending = pending.slice(0, need);
      while (pending.length < need) {
        pending.push({ id: 'p' + Math.random().toString(36).slice(2, 7), time: '08:00', status: 'PENDIENTE', givenBy: null, givenAt: null });
      }
    }
    // Pauta por intervalo: re-cronometrar las pendientes desde la última aplicada (o inicio)
    const interval = vetIntervalFromFreq(data.frequency);
    if (data.pauta === 'INTERVALO' && interval) {
      let t = applied.length ? (applied[applied.length - 1].givenAt || applied[applied.length - 1].time) : (data.startTime || '08:00');
      pending = pending.map((d) => { t = vetShiftTime(t, interval); return { ...d, time: t }; });
    }
    return [...applied, ...pending];
  }

  function updateMedication(patientId, medId, med) {
    patch(patientId, (p) => ({
      ...p,
      medications: p.medications.map((m) => {
        if (m.id !== medId) return m;
        const hasApplied = (m.schedule || []).some((d) => d.status === 'APLICADA');
        // startDate es histórico: si hay aplicadas, se conserva el original
        const startDate = hasApplied ? m.startDate : med.startDate;
        return { ...m, ...med, startDate, schedule: rebuildKeepingApplied(m.schedule, { ...med, startTime: m.startTime }) };
      }),
    }));
    toast.success('Plan actualizado', `${med.name} modificado. Las dosis aplicadas se conservaron.`);
  }
  function suspendMedication(patientId, medId) {
    patch(patientId, (p) => ({
      ...p,
      medications: p.medications.map((m) => {
        if (m.id !== medId) return m;
        const applied = (m.schedule || []).filter((d) => d.status === 'APLICADA');
        return { ...m, suspended: true, schedule: applied };
      }),
    }));
    toast.info('Medicamento suspendido', 'Se quitaron las tomas pendientes; lo ya aplicado se conserva.');
  }

  function toggleProcedure(patientId, procId) {
    patch(patientId, (p) => ({
      ...p,
      procedures: p.procedures.map((pr) => pr.id === procId ? { ...pr, done: !pr.done } : pr),
    }));
  }
  function addProcedure(patientId, proc) {
    patch(patientId, (p) => ({
      ...p,
      procedures: [...p.procedures, { ...proc, id: Math.max(0, ...p.procedures.map((pr) => pr.id)) + 1, done: false, schedule: proc.schedule ?? [] }],
    }));
    toast.success('Procedimiento añadido', `${proc.name} agregado al plan.`);
  }
  function updateProcedure(patientId, procId, proc) {
    patch(patientId, (p) => ({
      ...p,
      procedures: p.procedures.map((pr) => {
        if (pr.id !== procId) return pr;
        const hasApplied = (pr.schedule || []).some((d) => d.status === 'APLICADA');
        const startDate = hasApplied ? pr.startDate : proc.startDate;
        return { ...pr, ...proc, startDate, schedule: rebuildKeepingApplied(pr.schedule, { ...proc, startTime: pr.startTime }) };
      }),
    }));
    toast.success('Plan actualizado', `${proc.name} modificado. Los registros previos se conservaron.`);
  }
  function suspendProcedure(patientId, procId) {
    patch(patientId, (p) => ({
      ...p,
      procedures: p.procedures.map((pr) => {
        if (pr.id !== procId) return pr;
        const applied = (pr.schedule || []).filter((d) => d.status === 'APLICADA');
        return { ...pr, suspended: true, schedule: applied };
      }),
    }));
    toast.info('Procedimiento suspendido', 'Se quitaron los controles pendientes; lo ya realizado se conserva.');
  }

  function addEvolution(patientId, note) {
    patch(patientId, (p) => ({
      ...p,
      evolution: [{ ...note, id: Math.max(0, ...p.evolution.map((e) => e.id)) + 1 }, ...p.evolution],
    }));
    toast.success('Nota registrada', 'Se añadió a la evolución.');
  }

  function addObservation(patientId, obs) {
    patch(patientId, (p) => ({
      ...p,
      observations: [{ ...obs, id: Math.max(0, ...(p.observations ?? []).map((o) => o.id), 0) + 1 }, ...(p.observations ?? [])],
    }));
    toast.success('Observación registrada', 'Se añadió al historial.');
  }

  function discharge(patientId) {
    setPatients((arr) => arr.filter((p) => p.id !== patientId));
    toast.success('Paciente dado de alta', 'Salió de hospitalización.');
  }

  return { patients, markDose, markProcedure, moveDose, addMedication, updateMedication, suspendMedication, toggleProcedure, addProcedure, updateProcedure, suspendProcedure, addEvolution, addObservation, discharge };
}

function vetDaysSince(iso) {
  const start = new Date(iso.slice(0, 10));
  const now = new Date('2026-05-23');
  const diff = Math.max(0, Math.round((now - start) / 86400000));
  return diff;
}

function vetEffectiveDoseStatus(d) {
  if (d.status === 'PENDIENTE' && vetDoseIsOverdue(d)) return 'ATRASADA';
  return d.status;
}

// ============================================================================
// Pills
// ============================================================================

function VetHospStatusPill({ status, size = 'md' }) {
  const cfg = VET_HOSP_STATUS[status] ?? VET_HOSP_STATUS.ESTABLE;
  return (
    <span className={'vet-hosp-status size-' + size} style={{ background: cfg.tone.bg, color: cfg.tone.fg }}>
      <span className="vet-hosp-status-dot" style={{ background: cfg.tone.dot }} />
      {cfg.label}
    </span>
  );
}

function VetDoseStatusPill({ status }) {
  const cfg = VET_HOSP_DOSE_STATUS[status] ?? VET_HOSP_DOSE_STATUS.PENDIENTE;
  return (
    <span className="vet-dose-pill" style={{ background: cfg.tone.bg, color: cfg.tone.fg }}>
      {cfg.label}
    </span>
  );
}

// ============================================================================
// Ward board — patient cards
// ============================================================================

function VetHospCard({ patient, onOpen }) {
  const ctx = vetHospPetCtx(patient.animalId);
  const days = vetDaysSince(patient.admittedAt);

  // contar dosis pendientes / atrasadas hoy
  let pending = 0, overdue = 0;
  for (const m of patient.medications) {
    for (const d of m.schedule) {
      const st = vetEffectiveDoseStatus(d);
      if (st === 'PENDIENTE') pending++;
      if (st === 'ATRASADA') overdue++;
    }
  }

  return (
    <button type="button" className="vet-hosp-card" onClick={() => onOpen(patient)}>
      <div className="vet-hosp-card-top">
        <span className="vet-hosp-kennel">{patient.kennel}</span>
        <VetHospStatusPill status={patient.status} />
      </div>
      <div className="vet-hosp-card-pet">
        <div className="vet-hosp-card-avatar">{ctx.pet?.name.slice(0, 2).toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div className="vet-hosp-card-name">{ctx.pet?.name ?? '—'}</div>
          <div className="vet-hosp-card-owner">{ctx.pet?.specie.name} · {ctx.owner?.name}</div>
        </div>
      </div>
      <div className="vet-hosp-card-reason">{patient.reason}</div>
      <div className="vet-hosp-card-foot">
        <span className="vet-hosp-card-days">
          <VetIcons.BedDouble size={13} strokeWidth={1.7} /> Día {days}
        </span>
        {overdue > 0 && <span className="vet-hosp-alert overdue">{overdue} atrasada{overdue === 1 ? '' : 's'}</span>}
        {overdue === 0 && pending > 0 && <span className="vet-hosp-alert pending">{pending} pendiente{pending === 1 ? '' : 's'}</span>}
        {overdue === 0 && pending === 0 && <span className="vet-hosp-alert ok">Al día</span>}
      </div>
    </button>
  );
}

function VetHospBoard({ patients, onOpen }) {
  if (patients.length === 0) {
    return (
      <div className="vet-hosp-empty">
        <div className="vet-hosp-empty-ic"><VetIcons.BedDouble size={28} strokeWidth={1.5} /></div>
        <div className="vet-hosp-empty-title">Sin pacientes internados</div>
        <p className="vet-hosp-empty-desc">No hay animales hospitalizados en este momento.</p>
      </div>
    );
  }
  return (
    <div className="vet-hosp-board">
      {patients.map((p) => <VetHospCard key={p.id} patient={p} onOpen={onOpen} />)}
    </div>
  );
}

// ============================================================================
// Medication form modal
// ============================================================================

function VetMedFormModal({ open, initial, onClose, onSave }) {
  const [d, setD] = React.useState({ name: '', dose: '', frequency: 'c/12h', pauta: 'FIJO', durMode: 'DIAS', durValue: '3', startDate: '', startTime: '', notes: '' });
  const [impact, setImpact] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setImpact(false);
    if (initial) setD({ pauta: 'FIJO', durMode: 'DIAS', durValue: '3', ...initial });
    else setD({ name: '', dose: '', frequency: 'c/12h', pauta: 'FIJO', durMode: 'DIAS', durValue: '3', startDate: '2026-05-23', startTime: '08:00', notes: '' });
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const freqOptions = ['Continua', 'c/4h', 'c/6h', 'c/8h', 'c/12h', 'c/24h', 'Única'];
  const appliedCount = (initial?.schedule || []).filter((x) => x.status === 'APLICADA').length;
  const tomasMin = d.durMode === 'TOMAS' && appliedCount > 0 && (Number(d.durValue) || 0) < appliedCount;
  const valid = d.name.trim() && d.dose.trim() && !tomasMin;
  function attemptSave() { if (appliedCount > 0) setImpact(true); else onSave(d); }

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title={initial ? 'Editar medicamento' : 'Añadir medicamento'}
      subtitle="Plan de tratamiento de hospitalización"
      icon={VetIcons.Syringe} accent="amatista" width={560}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal"
            disabled={!valid}
            style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={attemptSave}>
            {initial ? 'Guardar cambios' : 'Añadir al plan'}
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        {appliedCount > 0 && (
          <div className="vet-applied-banner">
            <VetIcons.Check size={14} strokeWidth={2} />
            <span>Este medicamento tiene <strong>{appliedCount} dosis aplicada{appliedCount === 1 ? '' : 's'}</strong>. Esas quedan intactas; los cambios solo afectan las tomas pendientes.</span>
          </div>
        )}
        <VetBaseField label="Medicamento" required>
          {({ id }) => <VetBaseInput id={id} value={d.name} onChange={(v) => u({ name: v })} placeholder="Ej. Cefazolina" />}
        </VetBaseField>
        <div className="vet-form-grid-2">
          <VetBaseField label="Dosis" required>
            {({ id }) => <VetBaseInput id={id} value={d.dose} onChange={(v) => u({ dose: v })} placeholder="22 mg/kg" />}
          </VetBaseField>
          <VetBaseField label="Frecuencia" required>
            {({ id }) => <VetBaseSelect id={id} value={d.frequency} onChange={(v) => u({ frequency: v })}
              options={freqOptions.map((f) => ({ value: f, label: f }))} />}
          </VetBaseField>
        </div>

        <VetBaseField label="Tipo de pauta" required>
          {({ id }) => <VetBaseSelect id={id} value={d.pauta} onChange={(v) => u({ pauta: v })}
            options={[
              { value: 'FIJO', label: 'Horario fijo (reloj)' },
              { value: 'INTERVALO', label: 'Por intervalo (desde última toma)' },
            ]} />}
        </VetBaseField>
        <p className="vet-pauta-help">
          {d.pauta === 'FIJO'
            ? 'Las tomas se mantienen en horas fijas del reloj (p. ej. 08:00 / 20:00). Si se aplica tarde, las siguientes NO se mueven.'
            : 'Cada toma se cuenta desde la administración real de la anterior. Si una se aplica tarde, las siguientes se recalculan (p. ej. cada 8 h desde la última).'}
        </p>

        <VetDurationField mode={d.durMode} value={d.durValue} onMode={(v) => u({ durMode: v })} onValue={(v) => u({ durValue: v })} />
        {tomasMin && (
          <p className="vet-pauta-help vet-pauta-err">Ya hay {appliedCount} tomas aplicadas: la duración no puede ser menor a {appliedCount}.</p>
        )}

        <div className="vet-hosp-range-col">
          <span className="vet-hosp-range-label">Inicio del tratamiento</span>
          {appliedCount > 0 ? (
            <div className="vet-locked-field">
              <VetIcons.ShieldCheck size={14} strokeWidth={1.7} />
              <span>{d.startDate} {d.startTime} · bloqueado (ya hay dosis aplicadas)</span>
            </div>
          ) : (
            <div className="vet-form-grid-2">
              <VetBaseField label="Fecha" required>
                {({ id }) => <VetDateInput id={id} value={d.startDate} onChange={(v) => u({ startDate: v })} />}
              </VetBaseField>
              <VetBaseField label="Hora" required>
                {({ id }) => <VetBaseInput id={id} type="time" value={d.startTime} onChange={(v) => u({ startTime: v })} />}
              </VetBaseField>
            </div>
          )}
        </div>

        <VetBaseField label="Notas">
          {({ id }) => <VetBaseTextarea id={id} value={d.notes} onChange={(v) => u({ notes: v })} rows={2} placeholder="Indicaciones, diluciones…" />}
        </VetBaseField>
      </div>

      <VetModalShell
        open={impact}
        title="Confirmar cambios"
        subtitle={d.name}
        icon={VetIcons.Check} accent="warn" width={440}
        onClose={() => setImpact(false)}
        footerActions={
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setImpact(false)}>Volver</button>
            <button type="button" className="vet-btn-primary-modal" onClick={() => { setImpact(false); onSave(d); }}>
              Aplicar a tomas pendientes
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.55 }}>
          Hay <strong>{appliedCount} dosis ya aplicada{appliedCount === 1 ? '' : 's'}</strong> que se conservan sin cambios.
          Los nuevos valores (pauta, frecuencia y duración) solo reprograman las <strong>tomas pendientes</strong> desde la última aplicación.
          La fecha de inicio no se modifica.
        </p>
      </VetModalShell>
    </VetModalShell>
  );
}

// Campo de duración: por días | por número de tomas | indefinido
function VetDurationField({ mode, value, onMode, onValue }) {
  return (
    <div className="vet-dur-field">
      <span className="vet-hosp-range-label">Duración del tratamiento</span>
      <div className="vet-dur-row">
        <div className="vet-dur-mode">
          <VetBaseSelect value={mode} onChange={onMode}
            options={[
              { value: 'DIAS', label: 'Por días' },
              { value: 'TOMAS', label: 'Por número de tomas' },
              { value: 'INDEF', label: 'Hasta nueva orden' },
            ]} />
        </div>
        {mode !== 'INDEF' && (
          <div className="vet-dur-value">
            <VetBaseInput type="number" value={value} onChange={onValue}
              placeholder={mode === 'DIAS' ? '3' : '15'} />
            <span className="vet-dur-suffix">{mode === 'DIAS' ? 'días' : 'tomas'}</span>
          </div>
        )}
      </div>
      <p className="vet-pauta-help">
        {mode === 'DIAS'
          ? 'Ej. "cada 6 h por 3 días". El tratamiento finaliza al cumplirse los días.'
          : mode === 'TOMAS'
            ? 'Ej. "cada 6 h hasta completar 15 tomas". Finaliza al alcanzar el número de dosis administradas.'
            : 'El tratamiento sigue activo hasta que un veterinario lo suspenda.'}
      </p>
    </div>
  );
}

function VetProcFormModal({ open, initial, onClose, onSave }) {
  const [d, setD] = React.useState({ name: '', frequency: 'c/8h', pauta: 'FIJO', durMode: 'DIAS', durValue: '3', startDate: '', startTime: '', notes: '' });
  React.useEffect(() => {
    if (!open) return;
    if (initial) setD({ frequency: 'c/8h', pauta: 'FIJO', durMode: 'DIAS', durValue: '3', ...initial });
    else setD({ name: '', frequency: 'c/8h', pauta: 'FIJO', durMode: 'DIAS', durValue: '3', startDate: '2026-05-23', startTime: '08:00', notes: '' });
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  const freqOptions = ['Continuo', 'c/2h', 'c/4h', 'c/6h', 'c/8h', 'c/12h', 'c/24h', 'Único'];
  const [impact, setImpact] = React.useState(false);
  React.useEffect(() => { if (!open) setImpact(false); }, [open]);
  const appliedCount = (initial?.schedule || []).filter((x) => x.status === 'APLICADA').length;
  const tomasMin = d.durMode === 'TOMAS' && appliedCount > 0 && (Number(d.durValue) || 0) < appliedCount;
  const valid = d.name.trim() && !tomasMin;
  function attemptSave() { if (appliedCount > 0) setImpact(true); else onSave(d); }

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title={initial ? 'Editar procedimiento' : 'Añadir procedimiento'}
      subtitle="Cuidados y controles de hospitalización"
      icon={VetIcons.Stethoscope} accent="amatista" width={560}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal"
            disabled={!valid}
            style={!valid ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={attemptSave}>
            {initial ? 'Guardar cambios' : 'Añadir al plan'}
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        {appliedCount > 0 && (
          <div className="vet-applied-banner">
            <VetIcons.Check size={14} strokeWidth={2} />
            <span>Este procedimiento tiene <strong>{appliedCount} registro{appliedCount === 1 ? '' : 's'}</strong>. Esos quedan intactos; los cambios solo afectan los controles pendientes.</span>
          </div>
        )}
        <VetBaseField label="Procedimiento / control" required>
          {({ id }) => <VetBaseInput id={id} value={d.name} onChange={(v) => u({ name: v })} placeholder="Ej. Toma de tensión arterial" />}
        </VetBaseField>
        <VetBaseField label="Frecuencia" required>
          {({ id }) => <VetBaseSelect id={id} value={d.frequency} onChange={(v) => u({ frequency: v })}
            options={freqOptions.map((f) => ({ value: f, label: f }))} />}
        </VetBaseField>

        <VetBaseField label="Tipo de pauta" required>
          {({ id }) => <VetBaseSelect id={id} value={d.pauta} onChange={(v) => u({ pauta: v })}
            options={[
              { value: 'FIJO', label: 'Horario fijo (reloj)' },
              { value: 'INTERVALO', label: 'Por intervalo (desde último control)' },
            ]} />}
        </VetBaseField>
        <p className="vet-pauta-help">
          {d.pauta === 'FIJO'
            ? 'Los controles se mantienen en horas fijas del reloj. Si se hace tarde, los siguientes NO se mueven.'
            : 'Cada control se cuenta desde la realización real del anterior. Si uno se hace tarde, los siguientes se recalculan.'}
        </p>

        <VetDurationField mode={d.durMode} value={d.durValue} onMode={(v) => u({ durMode: v })} onValue={(v) => u({ durValue: v })} />
        {tomasMin && (
          <p className="vet-pauta-help vet-pauta-err">Ya hay {appliedCount} controles registrados: la duración no puede ser menor a {appliedCount}.</p>
        )}

        <div className="vet-hosp-range-col">
          <span className="vet-hosp-range-label">Inicio</span>
          {appliedCount > 0 ? (
            <div className="vet-locked-field">
              <VetIcons.ShieldCheck size={14} strokeWidth={1.7} />
              <span>{d.startDate} {d.startTime} · bloqueado (ya hay registros)</span>
            </div>
          ) : (
            <div className="vet-form-grid-2">
              <VetBaseField label="Fecha" required>
                {({ id }) => <VetDateInput id={id} value={d.startDate} onChange={(v) => u({ startDate: v })} />}
              </VetBaseField>
              <VetBaseField label="Hora" required>
                {({ id }) => <VetBaseInput id={id} type="time" value={d.startTime} onChange={(v) => u({ startTime: v })} />}
              </VetBaseField>
            </div>
          )}
        </div>

        <VetBaseField label="Notas">
          {({ id }) => <VetBaseTextarea id={id} value={d.notes} onChange={(v) => u({ notes: v })} rows={2} placeholder="Indicaciones específicas…" />}
        </VetBaseField>
      </div>

      <VetModalShell
        open={impact}
        title="Confirmar cambios"
        subtitle={d.name}
        icon={VetIcons.Check} accent="warn" width={440}
        onClose={() => setImpact(false)}
        footerActions={
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setImpact(false)}>Volver</button>
            <button type="button" className="vet-btn-primary-modal" onClick={() => { setImpact(false); onSave(d); }}>
              Aplicar a controles pendientes
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.55 }}>
          Hay <strong>{appliedCount} control{appliedCount === 1 ? '' : 'es'} ya registrado{appliedCount === 1 ? '' : 's'}</strong> que se conservan.
          Los nuevos valores solo reprograman los controles <strong>pendientes</strong>. La fecha de inicio no cambia.
        </p>
      </VetModalShell>
    </VetModalShell>
  );
}

// ============================================================================
// Evolution note modal
// ============================================================================

function VetEvolutionModal({ open, onClose, onSave }) {
  const [d, setD] = React.useState({ notes: '' });
  React.useEffect(() => { if (open) setD({ notes: '' }); }, [open]);
  const u = (p) => setD((x) => ({ ...x, ...p }));

  function save() {
    const now = new Date();
    onSave({
      date: '2026-05-23',
      time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      author: 'Mariana Rojas',
      ...d,
    });
  }

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title="Nueva nota evolutiva"
      subtitle="Signos vitales y observación de turno"
      icon={VetIcons.FileText} accent="amatista" width={520}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal"
            disabled={!d.notes.trim()}
            style={!d.notes.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={save}>Registrar nota</button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        <VetBaseField label="Observación" required>
          {({ id }) => <VetBaseTextarea id={id} value={d.notes} onChange={(v) => u({ notes: v })} rows={4}
            placeholder="Estado general, evolución, incidencias del turno…" />}
        </VetBaseField>
      </div>
    </VetModalShell>
  );
}

function VetObservationModal({ open, onClose, onSave }) {
  const [text, setText] = React.useState('');
  React.useEffect(() => { if (open) { setText(''); } }, [open]);

  function save() {
    const now = new Date();
    onSave({
      date: '2026-05-23',
      time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      author: 'Mariana Rojas',
      text: text.trim(),
    });
  }

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title="Nueva observación"
      subtitle="Indicaciones y cuidados generales del paciente"
      icon={VetIcons.FileText} accent="amatista" width={520}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal"
            disabled={!text.trim()}
            style={!text.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={save}>Registrar observación</button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        <VetBaseField label="Observación" required>
          {({ id }) => <VetBaseTextarea id={id} value={text} onChange={setText} rows={4}
            placeholder="Ej. No dar comida sólida hasta nueva orden; vigilar signos de dolor." />}
        </VetBaseField>
      </div>
    </VetModalShell>
  );
}

Object.assign(window, {
  useVetHospState, vetDaysSince, vetEffectiveDoseStatus,
  VetHospStatusPill, VetDoseStatusPill, VetHospBoard,
  VetMedFormModal, VetProcFormModal, VetEvolutionModal, VetObservationModal,
});
