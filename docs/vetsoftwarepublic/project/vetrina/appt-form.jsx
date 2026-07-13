/* ============================================================================
   Citas (Appointment) — modales: formulario (crear/editar) y detalle.
   Usan VetModalShell (centrado, como el resto del app).
   ============================================================================ */
/* global React, VetIcons, VetModalShell, VET_MOCK_OWNERS, VET_MOCK_PETS, VET_TYPE_COLORS,
   APPT_TYPES, APPT_STATUS, APPT_TRANSITIONS, APPT_TERMINAL, APPT_VETS,
   apptPet, apptOwner, apptVet, apptFmtTime, apptFmtDayLong, apptClashes,
   ApptStatusPill, ApptVetBadge */

const APPT_NOTES_MAX = 1000;
const APPT_REASON_MAX = 300;

function apptInitials(name) {
  return name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
}

/* Buscador de propietario: por nombre, ID o documento */
function ApptOwnerSearch({ value, onChange }) {
  const selected = value ? VET_MOCK_OWNERS.find((o) => o.id === value) : null;
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef(null);

  React.useEffect(() => {
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return VET_MOCK_OWNERS.slice(0, 6);
    return VET_MOCK_OWNERS.filter((o) =>
      o.name.toLowerCase().includes(q) ||
      String(o.id).toLowerCase().includes(q) ||
      (o.document || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  if (selected) {
    return (
      <div className="appt-owner-selected">
        <div className="appt-owner-avatar">{apptInitials(selected.name)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="appt-owner-name">{selected.name}</div>
          <div className="appt-owner-meta">ID {selected.id} · {selected.document}</div>
        </div>
        <button type="button" className="appt-owner-change" onClick={() => { onChange(''); setQuery(''); setOpen(true); }}>Cambiar</button>
      </div>
    );
  }

  return (
    <div className="appt-combo" ref={boxRef}>
      <div className="appt-combo-input">
        <VetIcons.Search size={15} style={{ color: 'var(--warm-500)', flexShrink: 0 }} />
        <input type="text" placeholder="Buscar por nombre, ID o documento…" value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      </div>
      {open && (
        <div className="appt-combo-list">
          {results.length === 0 ? (
            <div className="appt-combo-empty">Sin resultados para “{query}”.</div>
          ) : results.map((o) => (
            <button key={o.id} type="button" className="appt-combo-item" onClick={() => { onChange(o.id); setOpen(false); }}>
              <div className="appt-owner-avatar sm">{apptInitials(o.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="appt-owner-name">{o.name}</div>
                <div className="appt-owner-meta">ID {o.id} · {o.document} · {o.phone}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- Formulario crear / editar -------------------- */
function ApptForm({ initial, list, focusDay, onClose, onSave }) {
  const isEdit = !!initial;
  const [date, setDate] = React.useState(initial ? initial.startAt.slice(0, 10) : focusDay);
  const [time, setTime] = React.useState(initial ? initial.startAt.slice(11, 16) : '09:00');
  const [type, setType] = React.useState(initial ? initial.type : 'CONSULTATION');
  const [employeeId, setEmployeeId] = React.useState(initial ? initial.employeeId : APPT_VETS[0].id);
  const startFree = initial ? (!initial.ownerId && !!initial.clientName) : false;
  const [mode, setMode] = React.useState(startFree ? 'free' : 'registered');
  const [ownerId, setOwnerId] = React.useState(initial ? (initial.ownerId || '') : '');
  const [animalId, setAnimalId] = React.useState(initial ? (initial.animalId || '') : '');
  const [clientName, setClientName] = React.useState(initial ? (initial.clientName || '') : '');
  const [clientPhone, setClientPhone] = React.useState(initial ? (initial.clientPhone || '') : '');
  const [notes, setNotes] = React.useState(initial ? (initial.notes || '') : '');
  const [touched, setTouched] = React.useState(false);

  const petsOfOwner = ownerId ? (VET_MOCK_PETS[ownerId] || []) : [];
  const hasSubject = mode === 'registered' ? (!!ownerId || !!animalId) : (clientName.trim().length > 0);
  const startAt = `${date}T${time}`;
  const clashing = React.useMemo(() => {
    const tentative = { id: initial ? initial.id : -1, employeeId, startAt, status: initial ? initial.status : 'REQUESTED', enabled: true };
    return apptClashes(list, tentative);
  }, [list, employeeId, startAt, initial]);
  const valid = date && time && type && employeeId && hasSubject;

  function submit() {
    setTouched(true);
    if (!valid) return;
    onSave({
      id: initial ? initial.id : undefined,
      startAt, type, employeeId,
      ownerId: mode === 'registered' ? (ownerId || null) : null,
      animalId: mode === 'registered' ? (animalId || null) : null,
      clientName: mode === 'free' ? (clientName.trim() || null) : null,
      clientPhone: mode === 'free' ? (clientPhone.trim() || null) : null,
      notes: notes.trim() || null,
    });
  }

  const typeMeta = APPT_TYPES[type];

  return (
    <VetModalShell
      open
      onClose={onClose}
      icon={VetIcons.Calendar}
      width={620}
      title={isEdit ? `Editar cita #${initial.id}` : 'Agendar cita'}
      subtitle={isEdit ? 'Modifica los datos de la cita.' : 'Registra una nueva cita en la agenda.'}
      footerLeft={<span>Los campos con <span style={{ color: 'oklch(60% 0.20 25)' }}>*</span> son obligatorios.</span>}
      footerActions={<>
        <button className="appt-btn appt-btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="appt-btn appt-btn-primary" onClick={submit} disabled={touched && !valid}>
          <VetIcons.Check size={16} /> {isEdit ? 'Guardar cambios' : 'Agendar cita'}
        </button>
      </>}
    >
      <div className="appt-mform">
        {/* Cuándo + vet */}
        <div className="appt-mform-cols">
          <div className="appt-mform-col">
            <div className="appt-field-row">
              <div className="appt-field">
                <label className="appt-field-label">Fecha <span className="appt-field-req">*</span></label>
                <input className="appt-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="appt-field">
                <label className="appt-field-label">Hora de inicio <span className="appt-field-req">*</span></label>
                <input className="appt-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="appt-mform-col">
            <div className="appt-field">
              <label className="appt-field-label">Veterinario/a asignado <span className="appt-field-req">*</span></label>
              <select value={employeeId} onChange={(e) => setEmployeeId(Number(e.target.value))}>
                {APPT_VETS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tipo — banda a todo lo ancho */}
        <div className="appt-field">
          <label className="appt-field-label">Tipo de cita <span className="appt-field-req">*</span></label>
          <div className="appt-typegrid appt-typegrid-wide">
            {Object.entries(APPT_TYPES).map(([key, m]) => (
              <button key={key} type="button" className={'appt-typebtn' + (type === key ? ' sel' : '')} onClick={() => setType(key)}>
                <span className="appt-typebtn-ic">{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </div>

        {clashing.length > 0 && (
          <div className="appt-banner warn">
            <span style={{ flexShrink: 0, marginTop: 1 }}><VetIcons.AlertTriangle size={16} /></span>
            <span><b>Choque de horario.</b> {apptVet(employeeId)?.short} ya tiene {clashing.length === 1 ? 'otra cita' : `${clashing.length} citas`} a las {time}. Se puede agendar igual — sólo es una advertencia.</span>
          </div>
        )}

        <div className="appt-divider" />

        {/* Sujeto + notas — dos columnas */}
        <div className="appt-mform-cols">
          <div className="appt-mform-col">
            <div className="appt-field">
              <label className="appt-field-label">¿A quién es la cita?</label>
              <div className="appt-subject-toggle" style={{ marginBottom: 2 }}>
                <button type="button" className={mode === 'registered' ? 'active' : ''} onClick={() => setMode('registered')}>Cliente registrado</button>
                <button type="button" className={mode === 'free' ? 'active' : ''} onClick={() => setMode('free')}>Contacto libre</button>
              </div>
              <div className="appt-field-hint">
                {mode === 'registered'
                  ? 'Busca el dueño por nombre, ID o documento; luego elige su mascota.'
                  : 'Para quien aún no está registrado. Basta con el nombre.'}
              </div>
            </div>

            {mode === 'registered' ? (
              <>
                <div className="appt-field">
                  <label className="appt-field-label">Propietario</label>
                  <ApptOwnerSearch value={ownerId} onChange={(id) => { setOwnerId(id); setAnimalId(''); }} />
                </div>
                <div className="appt-field">
                  <label className="appt-field-label">Mascota</label>
                  <select value={animalId} onChange={(e) => setAnimalId(e.target.value)} disabled={!ownerId}>
                    <option value="">{ownerId ? '— Por confirmar —' : 'Elige un dueño primero'}</option>
                    {petsOfOwner.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.specie.name}, {p.breed.name}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="appt-field">
                  <label className="appt-field-label">Nombre del contacto</label>
                  <input className="appt-input" type="text" maxLength={120} placeholder="Ej. María Pérez" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div className="appt-field">
                  <label className="appt-field-label">Teléfono</label>
                  <input className="appt-input" type="text" maxLength={30} placeholder="Ej. 300 123 4567" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                </div>
              </>
            )}

            {touched && !hasSubject && (
              <div className="appt-banner err">
                <span style={{ flexShrink: 0, marginTop: 1 }}><VetIcons.AlertTriangle size={16} /></span>
                <span>Indica al menos <b>mascota, propietario o nombre de contacto</b>.</span>
              </div>
            )}
          </div>

          <div className="appt-mform-col">
            <div className="appt-field" style={{ flex: 1 }}>
              <label className="appt-field-label">Motivo / notas de recepción</label>
              <textarea className="appt-textarea" style={{ flex: 1, minHeight: 150 }} maxLength={APPT_NOTES_MAX} placeholder="Ej. Control post-cirugía" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="appt-charcount">{notes.length}/{APPT_NOTES_MAX}</div>
            </div>
          </div>
        </div>
      </div>
    </VetModalShell>
  );
}

/* -------------------- Detalle -------------------- */
function ApptDetail({ appt, list, onClose, onEdit, onReschedule, onTransition, onCancelAppt, onDelete }) {
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const typeMeta = APPT_TYPES[appt.type];
  const pet = apptPet(appt.animalId);
  const owner = apptOwner(appt.ownerId);
  const nexts = APPT_TRANSITIONS[appt.status] || [];
  const isTerminal = APPT_TERMINAL.has(appt.status);
  const clashing = apptClashes(list, appt);
  const statusNexts = nexts.filter((s) => s !== 'CANCELLED');
  const canCancel = nexts.includes('CANCELLED');

  return (
    <VetModalShell
      open
      onClose={onClose}
      icon={VetIcons.Calendar}
      width={640}
      title={`Cita #${appt.id} · ${typeMeta.label}`}
      subtitle={`${apptFmtDayLong(appt.startAt.slice(0,10))}, ${apptFmtTime(appt.startAt)}`}
      footerLeft={
        !isTerminal ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="appt-btn appt-btn-ghost" onClick={() => onReschedule(appt)}><VetIcons.Move size={15} /> Reprogramar</button>
            <button className="appt-btn appt-btn-ghost" onClick={() => onEdit(appt)}><VetIcons.Edit size={15} /> Editar</button>
          </div>
        ) : null
      }
      footerActions={
        !confirmDelete ? (
          <button className="appt-btn appt-btn-danger" onClick={() => setConfirmDelete(true)}><VetIcons.Trash size={15} /> Eliminar</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--warm-600)' }}>¿Eliminar?</span>
            <button className="appt-btn appt-btn-ghost" onClick={() => setConfirmDelete(false)}>No</button>
            <button className="appt-btn appt-btn-danger" onClick={() => onDelete(appt)}>Sí, eliminar</button>
          </div>
        )
      }
    >
      <div className="appt-detail-cols">
        {/* Columna de datos */}
        <div className="appt-detail-col">
          <div className="appt-status-hero">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{apptFmtTime(appt.startAt)}</span>
            <ApptStatusPill status={appt.status} />
          </div>

          {clashing.length > 0 && (
            <div className="appt-banner warn">
              <span style={{ flexShrink: 0, marginTop: 1 }}><VetIcons.AlertTriangle size={16} /></span>
              <span><b>Choque de horario:</b> comparte las {apptFmtTime(appt.startAt)} con {clashing.map((c) => '#' + c.id).join(', ')} de {apptVet(appt.employeeId)?.short}.</span>
            </div>
          )}

          <div className="appt-detail-field">
            <div className="appt-detail-label">Veterinario/a</div>
            <div className="appt-detail-value"><ApptVetBadge employeeId={appt.employeeId} /></div>
          </div>

          <div className="appt-detail-field">
            <div className="appt-detail-label">Paciente</div>
            <div className="appt-detail-value">
              {pet
                ? <>{pet.name} <span style={{ color: 'var(--warm-500)' }}>· {pet.specie.name}, {pet.breed.name} · {pet.code}</span></>
                : <span style={{ color: 'var(--warm-500)' }}>Por confirmar</span>}
            </div>
          </div>

          <div className="appt-detail-field">
            <div className="appt-detail-label">{owner ? 'Propietario' : 'Contacto'}</div>
            <div className="appt-detail-value">
              {owner
                ? <>{owner.name} <span style={{ color: 'var(--warm-500)' }}>· {owner.phone}</span></>
                : appt.clientName
                  ? <>{appt.clientName} {appt.clientPhone && <span style={{ color: 'var(--warm-500)' }}>· {appt.clientPhone}</span>}
                      <span className="appt-freewalk" style={{ marginLeft: 8 }}><VetIcons.User size={11} /> Sin registrar</span></>
                  : <span style={{ color: 'var(--warm-500)' }}>—</span>}
            </div>
          </div>

          {appt.notes && (
            <div className="appt-detail-field">
              <div className="appt-detail-label">Notas</div>
              <div className="appt-detail-value">{appt.notes}</div>
            </div>
          )}

          {appt.status === 'CANCELLED' && appt.cancellationReason && (
            <div className="appt-banner" style={{ background: 'var(--warm-100)', color: 'var(--warm-700)', border: '1px solid var(--warm-300)' }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}><VetIcons.Ban size={15} /></span>
              <span><b>Motivo de cancelación:</b> {appt.cancellationReason}</span>
            </div>
          )}
        </div>

        {/* Columna de acciones de estado */}
        <div className="appt-detail-col">
          <div className="appt-section-title">{isTerminal ? 'Estado' : 'Siguiente paso'}</div>
          {isTerminal ? (
            <div className="appt-terminal-note">
              Cita en estado <b>{APPT_STATUS[appt.status].label}</b>. No admite más cambios de estado.
            </div>
          ) : (
            <div className="appt-transitions">
              {statusNexts.map((st) => {
                const m = APPT_STATUS[st];
                return (
                  <button key={st} className="appt-trans-btn" onClick={() => onTransition(appt, st)}>
                    <span className="appt-trans-dot" style={{ background: m.dot }} />
                    Marcar como&nbsp;<b style={{ fontWeight: 600 }}>{m.label}</b>
                    <span className="appt-trans-arrow"><VetIcons.ArrowRight size={15} /></span>
                  </button>
                );
              })}
              {canCancel && (
                !cancelOpen ? (
                  <button className="appt-trans-btn danger" onClick={() => setCancelOpen(true)}>
                    <span className="appt-trans-dot" style={{ background: 'var(--warm-500)' }} />
                    Cancelar la cita
                    <span className="appt-trans-arrow"><VetIcons.Ban size={15} /></span>
                  </button>
                ) : (
                  <div className="appt-field" style={{ background: 'var(--warm-100)', border: '1px solid var(--warm-200)', borderRadius: 10, padding: 12, gap: 8 }}>
                    <label className="appt-field-label">Motivo de cancelación (opcional)</label>
                    <textarea className="appt-textarea" maxLength={APPT_REASON_MAX} style={{ minHeight: 54 }} placeholder="Ej. El dueño reprogramará" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="appt-btn appt-btn-ghost" onClick={() => { setCancelOpen(false); setReason(''); }}>Volver</button>
                      <button className="appt-btn appt-btn-danger appt-btn-full" onClick={() => onCancelAppt(appt, reason.trim())}>
                        <VetIcons.Ban size={15} /> Confirmar
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </VetModalShell>
  );
}

Object.assign(window, { ApptForm, ApptDetail });
