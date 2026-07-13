/* global React, VetIcons, VetModalShell,
   useVetHospState, vetDaysSince, vetEffectiveDoseStatus,
   VetHospStatusPill, VetDoseStatusPill, VetHospBoard,
   VetMedFormModal, VetProcFormModal, VetEvolutionModal, VetObservationModal,
   VET_HOSP_NOW, VET_HOSP_TODAY, vetHospWeekDays, VET_HOSP_ROUTE, vetHospPetCtx */

// ============================================================================
// Weekly MAR — calendario semanal de administración de dosis
// ============================================================================

function vetFmtDuration(o) {
  if (!o) return '';
  if (o.durMode === 'DIAS' && o.durValue) return ` · por ${o.durValue} día${o.durValue === '1' ? '' : 's'}`;
  if (o.durMode === 'TOMAS' && o.durValue) return ` · hasta ${o.durValue} tomas`;
  if (o.durMode === 'INDEF') return ' · hasta nueva orden';
  return '';
}

function VetWeekMedChip({ order, status, onApply, draggable, onDragStart }) {
  const isProc = order.kind === 'proc';
  const label = order.name.length > 14 ? order.name.slice(0, 13) + '…' : order.name;
  const kindCls = isProc ? ' proc' : '';
  if (status === 'APLICADA') {
    return (
      <span className={'vet-wk-chip applied' + kindCls} title={`${order.name} · ${isProc ? 'realizado' : 'aplicada'}`}>
        <VetIcons.Check size={10} strokeWidth={2.6} />{label}
      </span>
    );
  }
  if (status === 'PROGRAMADA') {
    return <span className={'vet-wk-chip future' + kindCls} title={`${order.name} · programado`}>{label}</span>;
  }
  return (
    <button
      type="button"
      className={'vet-wk-chip draggable ' + (status === 'ATRASADA' ? 'overdue' : 'pending') + kindCls}
      onClick={onApply}
      draggable={draggable}
      onDragStart={onDragStart}
      title={`${order.name} · clic para ${isProc ? 'registrar' : 'aplicar'} · arrastra para reprogramar`}
    >
      <VetIcons.MoreVertical size={9} strokeWidth={2} className="vet-wk-grip" />
      {label}
    </button>
  );
}

function VetWeeklyMAR({ patient, hosp }) {
  /* global vetIntervalFromFreq */
  const week = React.useMemo(() => vetHospWeekDays(), []);
  const [drag, setDrag] = React.useState(null);      // { kind, orderId, doseId }
  const [dropTo, setDropTo] = React.useState(null);  // hora destino sobre la que se suelta
  const [moveModal, setMoveModal] = React.useState(null); // { order, doseId, newTime }
  const [applyModal, setApplyModal] = React.useState(null); // { order, dose }

  const orders = React.useMemo(() => [
    ...patient.medications.map((m) => ({ ...m, kind: 'med' })),
    ...patient.procedures.filter((p) => (p.schedule ?? []).length > 0).map((p) => ({ ...p, kind: 'proc' })),
  ], [patient]);

  const hours = React.useMemo(() => {
    const set = new Set();
    for (const o of orders) for (const d of (o.schedule ?? [])) set.add(d.time);
    return [...set].sort();
  }, [orders]);

  function cellOrders(time, day) {
    const out = [];
    for (const o of orders) {
      const dose = (o.schedule ?? []).find((d) => d.time === time);
      if (!dose) continue;
      if (o.kind === 'med') {
        const inRange = day.iso >= o.startDate && (!o.endDate || day.iso <= o.endDate);
        if (!inRange) continue;
      }
      let status;
      if (day.isToday) status = vetEffectiveDoseStatus(dose);
      else if (day.isPast) status = 'APLICADA';
      else status = 'PROGRAMADA';
      out.push({ order: o, status, dose });
    }
    return out;
  }

  function apply(order, doseId) {
    if (order.kind === 'proc') hosp.markProcedure(patient.id, order.id, doseId);
    else hosp.markDose(patient.id, order.id, doseId);
  }

  function handleDrop(targetTime) {
    setDropTo(null);
    if (!drag || targetTime === drag.fromTime) { setDrag(null); return; }
    const order = orders.find((o) => o.kind === drag.kind && o.id === drag.orderId);
    if (!order) { setDrag(null); return; }
    // Siempre confirmar en un modal explicando qué pasará según la pauta
    setMoveModal({ order, doseId: drag.doseId, newTime: targetTime, fromTime: drag.fromTime });
    setDrag(null);
  }

  return (
    <div className="vet-wk-wrap">
      <div className="vet-wk-hint">
        <VetIcons.MoreVertical size={12} strokeWidth={2} /> Arrastra una toma pendiente a otra hora para reprogramarla
      </div>
      <div className="vet-wk-grid" style={{ gridTemplateColumns: '64px repeat(7, minmax(96px, 1fr))' }}>
        <div className="vet-wk-corner">Hora</div>
        {week.map((d) => (
          <div key={d.iso} className={'vet-wk-dayhead' + (d.isToday ? ' today' : '')}>
            <span className="vet-wk-dow">{d.dow}</span>
            <span className="vet-wk-dom">{d.dom}</span>
          </div>
        ))}

        {hours.map((time) => (
          <React.Fragment key={time}>
            <div className="vet-wk-hourcell">{time}</div>
            {week.map((day) => {
              const items = cellOrders(time, day);
              const isDropTarget = drag && day.isToday;
              return (
                <div
                  key={day.iso}
                  className={'vet-wk-cell' + (day.isToday ? ' today' : '') + (day.isFuture ? ' future' : '')
                    + (isDropTarget ? ' droppable' : '') + (dropTo === time && isDropTarget ? ' dropover' : '')}
                  onDragOver={isDropTarget ? (e) => { e.preventDefault(); setDropTo(time); } : undefined}
                  onDragLeave={isDropTarget ? () => setDropTo((t) => t === time ? null : t) : undefined}
                  onDrop={isDropTarget ? () => handleDrop(time) : undefined}
                >
                  {items.length === 0
                    ? <span className="vet-wk-na">·</span>
                    : items.map((it) => (
                        <VetWeekMedChip key={it.order.kind + it.order.id} order={it.order} status={it.status}
                          onApply={() => setApplyModal({ order: it.order, dose: it.dose })}
                          draggable={day.isToday && (it.status === 'PENDIENTE' || it.status === 'ATRASADA')}
                          onDragStart={() => setDrag({ kind: it.order.kind, orderId: it.order.id, doseId: it.dose.id, fromTime: time })}
                        />
                      ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {hours.length === 0 && (
        <div className="vet-hosp-mini-empty">Sin tomas programadas. Añade un medicamento o procedimiento.</div>
      )}

      <div className="vet-wk-legend">
        <span className="vet-wk-leg"><span className="vet-wk-chip applied"><VetIcons.Check size={10} strokeWidth={2.6} /></span> Aplicada</span>
        <span className="vet-wk-leg"><span className="vet-wk-chip pending">··</span> Pendiente</span>
        <span className="vet-wk-leg"><span className="vet-wk-chip overdue">··</span> Atrasada</span>
        <span className="vet-wk-leg"><span className="vet-wk-chip future">··</span> Programada</span>
        <span className="vet-wk-leg"><span className="vet-wk-chip applied proc"><VetIcons.Check size={10} strokeWidth={2.6} /></span> Procedimiento</span>
      </div>

      {/* Confirmación de reprogramación — mensaje según la pauta */}
      <VetModalShell
        open={!!applyModal}
        title={applyModal?.order.kind === 'proc' ? '¿Registrar procedimiento?' : '¿Registrar dosis aplicada?'}
        subtitle={applyModal ? `${applyModal.order.name} · ${applyModal.dose.time}` : ''}
        icon={VetIcons.Check} accent="amatista" width={440}
        onClose={() => setApplyModal(null)}
        footerActions={
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setApplyModal(null)}>Cancelar</button>
            <button type="button" className="vet-btn-primary-modal"
              onClick={() => { apply(applyModal.order, applyModal.dose.id); setApplyModal(null); }}>
              <VetIcons.Check size={14} strokeWidth={2} /> Confirmar {applyModal?.order.kind === 'proc' ? 'realizado' : 'aplicación'}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.55 }}>
          {applyModal?.order.kind === 'proc'
            ? <>Vas a marcar <strong>{applyModal?.order.name}</strong> como realizado a las {applyModal?.dose.time}. Quedará registrado con tu nombre y la hora actual.</>
            : <>Vas a registrar la aplicación de <strong>{applyModal?.order.name}</strong> ({applyModal?.order.dose}) programada para las {applyModal?.dose.time}. Quedará registrada con tu nombre y la hora actual.</>}
        </p>
      </VetModalShell>

      {/* Confirmación de reprogramación — mensaje según la pauta */}
      <VetModalShell
        open={!!moveModal}
        title="Reprogramar toma"
        subtitle={moveModal ? `${moveModal.order.name} · ${moveModal.fromTime} → ${moveModal.newTime}` : ''}
        icon={VetIcons.Calendar}
        accent={moveModal?.order.pauta === 'INTERVALO' ? 'warn' : 'amatista'}
        width={460}
        onClose={() => setMoveModal(null)}
        footerActions={moveModal && moveModal.order.pauta === 'INTERVALO' ? (
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setMoveModal(null)}>Cancelar</button>
            <button type="button" className="vet-btn-ghost-modal"
              onClick={() => { hosp.moveDose(patient.id, moveModal.order.kind, moveModal.order.id, moveModal.doseId, moveModal.newTime, 'one'); setMoveModal(null); }}>
              Solo esta toma
            </button>
            <button type="button" className="vet-btn-primary-modal"
              onClick={() => { hosp.moveDose(patient.id, moveModal.order.kind, moveModal.order.id, moveModal.doseId, moveModal.newTime, 'cascade'); setMoveModal(null); }}>
              Esta y las siguientes
            </button>
          </>
        ) : (
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setMoveModal(null)}>Cancelar</button>
            <button type="button" className="vet-btn-primary-modal"
              onClick={() => { hosp.moveDose(patient.id, moveModal.order.kind, moveModal.order.id, moveModal.doseId, moveModal.newTime, 'one'); setMoveModal(null); }}>
              Mover esta toma
            </button>
          </>
        )}
      >
        {moveModal && moveModal.order.pauta === 'INTERVALO' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-700)', lineHeight: 1.55 }}>
              <strong>{moveModal.order.name}</strong> tiene pauta <b>por intervalo</b> ({moveModal.order.frequency}).
            </p>
            <div className="vet-move-help">
              <div className="vet-move-opt">
                <b>Solo esta toma:</b> mueve únicamente la toma de las {moveModal.fromTime} a las {moveModal.newTime}. Las siguientes quedan en su hora actual.
              </div>
              <div className="vet-move-opt warn">
                <b>Esta y las siguientes:</b> mueve esta a las {moveModal.newTime} y <b>recalcula la cadena</b> sumando {vetIntervalFromFreq(moveModal.order.frequency)} h a cada toma pendiente posterior.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-700)', lineHeight: 1.55 }}>
              <strong>{moveModal?.order.name}</strong> tiene pauta de <b>horario fijo</b>.
            </p>
            <div className="vet-move-help">
              <div className="vet-move-opt">
                Se moverá <b>solo esta toma</b> de las {moveModal?.fromTime} a las {moveModal?.newTime}. Las demás tomas del cronograma <b>no cambian</b>.
              </div>
            </div>
          </div>
        )}
      </VetModalShell>
    </div>
  );
}

// ============================================================================
// Pantalla aparte — Tratamiento y administración semanal
// ============================================================================

function VetTreatmentScreen({ patient, hosp, onBack }) {
  const ctx = vetHospPetCtx(patient.animalId);
  const [medModal, setMedModal] = React.useState(null);
  const [procModal, setProcModal] = React.useState(null);
  const [suspendMed, setSuspendMed] = React.useState(null);
  const [suspendProc, setSuspendProc] = React.useState(null);

  function saveMed(data) {
    if (medModal?.initial) hosp.updateMedication(patient.id, medModal.initial.id, data);
    else hosp.addMedication(patient.id, data);
    setMedModal(null);
  }
  function saveProc(data) {
    if (procModal?.initial) hosp.updateProcedure(patient.id, procModal.initial.id, data);
    else hosp.addProcedure(patient.id, data);
    setProcModal(null);
  }

  return (
    <div className="vet-hosp-detail">
      <button type="button" className="vet-hosp-back" onClick={onBack}>
        <VetIcons.ArrowLeft size={15} strokeWidth={1.7} /> Volver al paciente
      </button>

      <div className="vet-treat-screen-head">
        <div>
          <div className="vet-hosp-kicker">Tratamiento · Administración semanal</div>
          <h1 className="vet-hosp-title" style={{ fontSize: 28 }}>{ctx.pet?.name}</h1>
          <div className="vet-hosp-detail-meta">Jaula {patient.kennel} · {ctx.owner?.name} · {patient.attendingVet}</div>
        </div>
      </div>

      <section className="vet-hosp-section">
        <header className="vet-hosp-section-head">
          <div className="vet-hosp-section-title">
            <VetIcons.Calendar size={16} strokeWidth={1.7} />
            <span>Semana · 18 – 24 may 2026</span>
          </div>
          <span className="vet-hosp-now-chip">Ahora Sáb 23 · {VET_HOSP_NOW}</span>
        </header>
        <VetWeeklyMAR patient={patient} hosp={hosp} />
      </section>

      <section className="vet-hosp-section">
        <header className="vet-hosp-section-head">
          <div className="vet-hosp-section-title">
            <VetIcons.Syringe size={16} strokeWidth={1.7} />
            <span>Plan de medicamentos</span>
          </div>
          <button type="button" className="vet-treat-add-btn" onClick={() => setMedModal({ initial: null })}>
            <VetIcons.Plus size={14} strokeWidth={1.8} /> Añadir medicamento
          </button>
        </header>
        <div className="vet-plan-list">
          {patient.medications.map((m) => (
            <div key={m.id} className={'vet-plan-row' + (m.suspended ? ' suspended' : '')}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="vet-plan-name">{m.name}{m.suspended && <span className="vet-plan-susp-tag">Suspendido</span>}</div>
                <div className="vet-plan-detail">{m.dose} · {m.frequency}{vetFmtDuration(m)}</div>
                {m.notes && <div className="vet-plan-notes">{m.notes}</div>}
              </div>
              <div className="vet-plan-actions">
                <button type="button" className="vet-plan-icon" onClick={() => setMedModal({ initial: m })} aria-label="Editar">
                  <VetIcons.Edit size={14} strokeWidth={1.7} />
                </button>
                {!m.suspended && (
                  <button type="button" className="vet-plan-suspend" onClick={() => setSuspendMed(m)}>
                    Suspender
                  </button>
                )}
              </div>
            </div>
          ))}
          {patient.medications.length === 0 && (
            <div className="vet-hosp-mini-empty">Sin medicamentos. Añade el primero.</div>
          )}
        </div>
      </section>

      <section className="vet-hosp-section">
        <header className="vet-hosp-section-head">
          <div className="vet-hosp-section-title">
            <VetIcons.Stethoscope size={16} strokeWidth={1.7} />
            <span>Plan de procedimientos</span>
          </div>
          <button type="button" className="vet-treat-add-btn" onClick={() => setProcModal({ initial: null })}>
            <VetIcons.Plus size={14} strokeWidth={1.8} /> Añadir procedimiento
          </button>
        </header>
        <div className="vet-plan-list">
          {patient.procedures.map((pr) => (
            <div key={pr.id} className={'vet-plan-row' + (pr.suspended ? ' suspended' : '')}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="vet-plan-name">{pr.name}{pr.suspended && <span className="vet-plan-susp-tag">Suspendido</span>}</div>
                <div className="vet-plan-detail">{pr.frequency}{(pr.schedule ?? []).length > 0 ? ` · ${pr.schedule.length} toma${pr.schedule.length === 1 ? '' : 's'}/día` : ''}</div>
                {pr.notes && <div className="vet-plan-notes">{pr.notes}</div>}
              </div>
              <div className="vet-plan-actions">
                <button type="button" className="vet-plan-icon" onClick={() => setProcModal({ initial: pr })} aria-label="Editar">
                  <VetIcons.Edit size={14} strokeWidth={1.7} />
                </button>
                {!pr.suspended && (
                  <button type="button" className="vet-plan-suspend" onClick={() => setSuspendProc(pr)}>
                    Suspender
                  </button>
                )}
              </div>
            </div>
          ))}
          {patient.procedures.length === 0 && (
            <div className="vet-hosp-mini-empty">Sin procedimientos. Añade el primero.</div>
          )}
        </div>
      </section>

      <VetMedFormModal open={!!medModal} initial={medModal?.initial} onClose={() => setMedModal(null)} onSave={saveMed} />
      <VetProcFormModal open={!!procModal} initial={procModal?.initial} onClose={() => setProcModal(null)} onSave={saveProc} />

      <VetModalShell
        open={!!suspendMed}
        title={`¿Suspender ${suspendMed?.name}?`}
        icon={VetIcons.X} accent="warn" width={440}
        onClose={() => setSuspendMed(null)}
        footerActions={
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setSuspendMed(null)}>Cancelar</button>
            <button type="button" className="vet-btn-primary-modal" onClick={() => { hosp.suspendMedication(patient.id, suspendMed.id); setSuspendMed(null); }}>
              Suspender medicamento
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.55 }}>
          Se eliminarán del calendario las <strong>tomas pendientes</strong> de {suspendMed?.name}.
          Las dosis <strong>ya aplicadas</strong> se conservan en el registro. El medicamento quedará marcado como suspendido.
        </p>
      </VetModalShell>

      <VetModalShell
        open={!!suspendProc}
        title={`¿Suspender ${suspendProc?.name}?`}
        icon={VetIcons.X} accent="warn" width={440}
        onClose={() => setSuspendProc(null)}
        footerActions={
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setSuspendProc(null)}>Cancelar</button>
            <button type="button" className="vet-btn-primary-modal" onClick={() => { hosp.suspendProcedure(patient.id, suspendProc.id); setSuspendProc(null); }}>
              Suspender procedimiento
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.55 }}>
          Se eliminarán del calendario los <strong>controles pendientes</strong> de {suspendProc?.name}.
          Los <strong>ya realizados</strong> se conservan en el registro.
        </p>
      </VetModalShell>
    </div>
  );
}

// ============================================================================
// Detail overview — sin KPIs; acceso al tratamiento + procedimientos + evolución
// ============================================================================

function VetHospDetail({ patient, onBack, hosp }) {
  const ctx = vetHospPetCtx(patient.animalId);
  const days = vetDaysSince(patient.admittedAt);
  const [subview, setSubview] = React.useState('overview');
  const [evoOpen, setEvoOpen] = React.useState(false);
  const [obsOpen, setObsOpen] = React.useState(false);
  const [dischargeOpen, setDischargeOpen] = React.useState(false);

  const doseStats = React.useMemo(() => {
    let total = 0, applied = 0, overdue = 0;
    for (const m of patient.medications) {
      for (const d of m.schedule) {
        total++;
        const st = vetEffectiveDoseStatus(d);
        if (st === 'APLICADA') applied++;
        else if (st === 'ATRASADA') overdue++;
      }
    }
    return { total, applied, overdue };
  }, [patient]);

  if (subview === 'treatment') {
    return <VetTreatmentScreen patient={patient} hosp={hosp} onBack={() => setSubview('overview')} />;
  }

  return (
    <div className="vet-hosp-detail">
      <button type="button" className="vet-hosp-back" onClick={onBack}>
        <VetIcons.ArrowLeft size={15} strokeWidth={1.7} /> Volver a internados
      </button>

      <div className="vet-hosp-detail-head">
        <div className="vet-hosp-detail-avatar">{ctx.pet?.name.slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vet-hosp-detail-name-row">
            <h1 className="vet-hosp-detail-name">{ctx.pet?.name}</h1>
            <VetHospStatusPill status={patient.status} size="lg" />
            <span className="vet-hosp-detail-kennel">Jaula {patient.kennel}</span>
          </div>
          <div className="vet-hosp-detail-meta">
            {ctx.pet?.specie.name} · {ctx.pet?.breed.name} · {ctx.owner?.name} · {patient.attendingVet}
          </div>
          <div className="vet-hosp-detail-sub">
            <span><VetIcons.BedDouble size={13} strokeWidth={1.7} /> Día {days} de internación</span>
            <span>· Ingreso {patient.admittedAt}</span>
          </div>
        </div>
        <button type="button" className="vet-hosp-discharge-btn" onClick={() => setDischargeOpen(true)}>
          <VetIcons.Check size={14} strokeWidth={2} /> Dar de alta
        </button>
      </div>

      <div className="vet-hosp-diagnosis">
        <span className="vet-hosp-diagnosis-label">Motivo / diagnóstico</span>
        <span>{patient.reason} — {patient.diagnosis}</span>
      </div>

      {/* Tarjeta de acceso al tratamiento */}
      <div className={'vet-treat-cta' + (doseStats.overdue > 0 ? ' alert' : '')}>
        <div className="vet-treat-cta-ic">
          <VetIcons.Calendar size={22} strokeWidth={1.7} />
        </div>
        <div className="vet-treat-cta-body">
          <div className="vet-treat-cta-title">Tratamiento y administración de dosis</div>
          <div className="vet-treat-cta-sub">
            {patient.medications.length} medicamento{patient.medications.length === 1 ? '' : 's'} ·{' '}
            {doseStats.applied}/{doseStats.total} dosis aplicadas hoy
            {doseStats.overdue > 0 && <span className="vet-treat-cta-alert"> · {doseStats.overdue} atrasada{doseStats.overdue === 1 ? '' : 's'}</span>}
          </div>
        </div>
        <button type="button" className="vet-treat-cta-btn" onClick={() => setSubview('treatment')}>
          <VetIcons.Syringe size={15} strokeWidth={1.8} />
          <span>Administrar</span>
          <VetIcons.ArrowRight size={15} strokeWidth={1.8} />
        </button>
      </div>

      <div className="vet-hosp-bottom">
        <section className="vet-hosp-section">
          <header className="vet-hosp-section-head">
            <div className="vet-hosp-section-title">
              <VetIcons.FileText size={16} strokeWidth={1.7} />
              <span>Observaciones</span>
            </div>
            <button type="button" className="vet-hosp-add-link" onClick={() => setObsOpen(true)}>
              <VetIcons.Plus size={13} strokeWidth={1.8} /> Observación
            </button>
          </header>
          <div className="vet-obs-list">
            {(patient.observations ?? []).length === 0 ? (
              <div className="vet-hosp-mini-empty">Sin observaciones registradas.</div>
            ) : (
              (patient.observations ?? []).map((o) => (
                <div key={o.id} className="vet-obs-row">
                  <div className="vet-obs-when">
                    <span className="vet-evo-date">{o.date.slice(5)}</span>
                    <span className="vet-evo-time">{o.time}</span>
                  </div>
                  <div className="vet-obs-body">
                    <div className="vet-obs-text">{o.text}</div>
                    <div className="vet-evo-author">{o.author}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="vet-hosp-section">
          <header className="vet-hosp-section-head">
            <div className="vet-hosp-section-title">
              <VetIcons.FileText size={16} strokeWidth={1.7} />
              <span>Notas evolutivas</span>
            </div>
            <button type="button" className="vet-hosp-add-link" onClick={() => setEvoOpen(true)}>
              <VetIcons.Plus size={13} strokeWidth={1.8} /> Nota
            </button>
          </header>
          <div className="vet-evo-list">
            {patient.evolution.map((e) => (
              <div key={e.id} className="vet-evo-row">
                <div className="vet-evo-when">
                  <span className="vet-evo-date">{e.date.slice(5)}</span>
                  <span className="vet-evo-time">{e.time}</span>
                </div>
                <div className="vet-evo-body">
                  {(e.temp || e.hr || e.rr) && (
                    <div className="vet-evo-vitals">
                      {e.temp && <span><b>T</b> {e.temp}°</span>}
                      {e.hr && <span><b>FC</b> {e.hr}</span>}
                      {e.rr && <span><b>FR</b> {e.rr}</span>}
                    </div>
                  )}
                  <div className="vet-evo-notes">{e.notes}</div>
                  <div className="vet-evo-author">{e.author}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <VetEvolutionModal
        open={evoOpen}
        onClose={() => setEvoOpen(false)}
        onSave={(note) => { hosp.addEvolution(patient.id, note); setEvoOpen(false); }}
      />
      <VetObservationModal
        open={obsOpen}
        onClose={() => setObsOpen(false)}
        onSave={(obs) => { hosp.addObservation(patient.id, obs); setObsOpen(false); }}
      />
      <VetModalShell
        open={dischargeOpen}
        title={`¿Dar de alta a ${ctx.pet?.name}?`}
        icon={VetIcons.Check} accent="amatista" width={420}
        onClose={() => setDischargeOpen(false)}
        footerActions={
          <>
            <button type="button" className="vet-btn-ghost-modal" onClick={() => setDischargeOpen(false)}>Cancelar</button>
            <button type="button" className="vet-btn-primary-modal" onClick={() => { hosp.discharge(patient.id); setDischargeOpen(false); onBack(); }}>
              Confirmar alta
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.55 }}>
          El paciente saldrá de hospitalización. El historial de internación, dosis aplicadas y
          notas evolutivas quedarán guardados en su historia clínica.
        </p>
      </VetModalShell>
    </div>
  );
}

// ============================================================================
// Main view
// ============================================================================

function VetHospitalView() {
  const hosp = useVetHospState();
  const [openId, setOpenId] = React.useState(null);
  const current = openId ? hosp.patients.find((p) => p.id === openId) : null;

  return (
    <div className="vet-hosp-page">
      {!current ? (
        <>
          <header className="vet-hosp-header">
            <div>
              <div className="vet-hosp-kicker">Hospitalización</div>
              <h1 className="vet-hosp-title">Pacientes internados</h1>
              <div className="vet-hosp-lead">
                Animales hospitalizados: plan de tratamiento, administración de dosis y evolución.
              </div>
            </div>
          </header>
          <VetHospBoard patients={hosp.patients} onOpen={(p) => setOpenId(p.id)} />
        </>
      ) : (
        <VetHospDetail patient={current} hosp={hosp} onBack={() => setOpenId(null)} />
      )}
    </div>
  );
}

Object.assign(window, { VetHospitalView });
