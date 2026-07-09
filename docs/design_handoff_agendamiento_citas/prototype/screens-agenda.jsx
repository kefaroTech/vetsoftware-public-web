/* global React, VetIcons, useVetToast,
   APPT_TYPES, APPT_STATUS, APPT_TRANSITIONS, APPT_TERMINAL, APPT_VETS,
   VET_TYPE_COLORS, apptPet, apptOwner, apptVet, apptFmtTime, apptHour,
   apptFmtDayLong, apptISOfromDate, apptClashes,
   ApptStatusPill, ApptTypeChip, ApptVetBadge, ApptForm, ApptDetail */

// ============================================================================
// Agenda de citas (Appointment) — vistas mes / semana / día + CRUD + estados
// ============================================================================

const AGENDA_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const AGENDA_WD_SHORT = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

const APPT_FOCUS_DAY = '2026-07-10';
let APPT_NEXT_ID = 200;

// Semilla de citas (día foco 10-jul + dispersas en el mes para mes/semana)
const APPT_SEED = [
  { id: 88, startAt: '2026-07-10T08:30', type: 'CONSULTATION', status: 'COMPLETED', animalId: '1001', ownerId: '101', clientName: null, clientPhone: null, employeeId: 1, notes: 'Control post-vacunación anual.', cancellationReason: null },
  { id: 89, startAt: '2026-07-10T09:00', type: 'VACCINATION', status: 'COMPLETED', animalId: '1009', ownerId: '106', clientName: null, clientPhone: null, employeeId: 2, notes: 'Refuerzo triple felina.', cancellationReason: null },
  { id: 90, startAt: '2026-07-10T09:30', type: 'CONSULTATION', status: 'IN_PROGRESS', animalId: '1003', ownerId: '102', clientName: null, clientPhone: null, employeeId: 1, notes: 'Cojera pata posterior derecha.', cancellationReason: null },
  { id: 91, startAt: '2026-07-10T09:30', type: 'CONTROL', status: 'ARRIVED', animalId: '1007', ownerId: '105', clientName: null, clientPhone: null, employeeId: 2, notes: 'Control de peso trimestral.', cancellationReason: null },
  { id: 92, startAt: '2026-07-10T10:00', type: 'SURGERY', status: 'CONFIRMED', animalId: '1004', ownerId: '103', clientName: null, clientPhone: null, employeeId: 9, notes: 'OVH electiva. Ayuno confirmado.', cancellationReason: null },
  { id: 93, startAt: '2026-07-10T11:00', type: 'CONSULTATION', status: 'REQUESTED', animalId: null, ownerId: null, clientName: 'Patricia Gómez', clientPhone: '+57 300 555 1290', employeeId: 1, notes: 'Llamó pidiendo cita para su perro nuevo. Confirmar mascota al llegar.', cancellationReason: null },
  { id: 94, startAt: '2026-07-10T11:00', type: 'LABORATORY', status: 'CONFIRMED', animalId: '1005', ownerId: '104', clientName: null, clientPhone: null, employeeId: 1, notes: 'Panel geriátrico + uroanálisis.', cancellationReason: null },
  { id: 95, startAt: '2026-07-10T11:30', type: 'GROOMING', status: 'CONFIRMED', animalId: '1008', ownerId: '106', clientName: null, clientPhone: null, employeeId: 2, notes: 'Baño medicado + corte.', cancellationReason: null },
  { id: 96, startAt: '2026-07-10T12:00', type: 'DEWORMING', status: 'REQUESTED', animalId: '1006', ownerId: '104', clientName: null, clientPhone: null, employeeId: 2, notes: 'Desparasitación interna.', cancellationReason: null },
  { id: 97, startAt: '2026-07-10T15:00', type: 'CONTROL', status: 'CANCELLED', animalId: '1002', ownerId: '101', clientName: null, clientPhone: null, employeeId: 1, notes: 'Control de mantenimiento.', cancellationReason: 'La tutora reprogramará la próxima semana.' },
  { id: 98, startAt: '2026-07-10T16:00', type: 'CONSULTATION', status: 'NO_SHOW', animalId: null, ownerId: null, clientName: 'Ricardo Truque', clientPhone: null, employeeId: 9, notes: 'Primera consulta.', cancellationReason: null },
  { id: 99, startAt: '2026-07-10T16:30', type: 'IMAGING', status: 'CONFIRMED', animalId: '1007', ownerId: '105', clientName: null, clientPhone: null, employeeId: 9, notes: 'Radiografía de tórax de control.', cancellationReason: null },
  // dispersas
  { id: 70, startAt: '2026-07-06T09:00', type: 'CONSULTATION', status: 'COMPLETED', animalId: '1001', ownerId: '101', clientName: null, clientPhone: null, employeeId: 1, notes: 'Chequeo general.', cancellationReason: null },
  { id: 71, startAt: '2026-07-06T10:30', type: 'VACCINATION', status: 'COMPLETED', animalId: '1006', ownerId: '104', clientName: null, clientPhone: null, employeeId: 2, notes: 'Refuerzo óctuple.', cancellationReason: null },
  { id: 72, startAt: '2026-07-07T08:30', type: 'CONTROL', status: 'COMPLETED', animalId: '1007', ownerId: '105', clientName: null, clientPhone: null, employeeId: 2, notes: 'Control de peso.', cancellationReason: null },
  { id: 73, startAt: '2026-07-07T11:00', type: 'SURGERY', status: 'COMPLETED', animalId: '1003', ownerId: '102', clientName: null, clientPhone: null, employeeId: 9, notes: 'Limpieza dental.', cancellationReason: null },
  { id: 74, startAt: '2026-07-08T09:30', type: 'CONSULTATION', status: 'CONFIRMED', animalId: '1008', ownerId: '106', clientName: null, clientPhone: null, employeeId: 1, notes: 'Otitis, control.', cancellationReason: null },
  { id: 75, startAt: '2026-07-09T10:00', type: 'IMAGING', status: 'CONFIRMED', animalId: '1003', ownerId: '102', clientName: null, clientPhone: null, employeeId: 9, notes: 'Radiografía cadera.', cancellationReason: null },
  { id: 76, startAt: '2026-07-09T16:00', type: 'DEWORMING', status: 'CONFIRMED', animalId: '1009', ownerId: '106', clientName: null, clientPhone: null, employeeId: 2, notes: 'Desparasitación.', cancellationReason: null },
  { id: 77, startAt: '2026-07-11T09:00', type: 'GROOMING', status: 'CONFIRMED', animalId: '1002', ownerId: '101', clientName: null, clientPhone: null, employeeId: 2, notes: 'Baño + corte.', cancellationReason: null },
  { id: 78, startAt: '2026-07-11T11:30', type: 'CONSULTATION', status: 'REQUESTED', animalId: null, ownerId: null, clientName: 'Andrés Botero', clientPhone: '+57 311 222 3344', employeeId: 1, notes: 'Primera visita.', cancellationReason: null },
  { id: 79, startAt: '2026-07-14T10:00', type: 'CONTROL', status: 'REQUESTED', animalId: '1004', ownerId: '103', clientName: null, clientPhone: null, employeeId: 9, notes: 'Control post-op.', cancellationReason: null },
];

// ---- date helpers ----
function agStartOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function agStartOfWeek(d) { const day = (d.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day); }
function agAddDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function agSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

// ---- chips ----
function ApptMonthChip({ appt, onClick }) {
  const tm = APPT_TYPES[appt.type];
  const tc = VET_TYPE_COLORS[tm.color];
  const sm = APPT_STATUS[appt.status];
  const pet = apptPet(appt.animalId);
  const term = APPT_TERMINAL.has(appt.status);
  return (
    <button type="button" className="vet-agenda-chip-dense"
      style={{ background: tc.bg, color: tc.fg, borderLeft: `3px solid ${tc.dot}`, opacity: term ? 0.6 : 1 }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <span className="vet-agenda-chip-icon">{apptFmtTime(appt.startAt)}</span>
      <span className="vet-agenda-chip-title">{pet ? pet.name : (appt.clientName || 'Sin asignar')}</span>
      <span className="appt-chip-status-dot" style={{ background: sm.dot, marginLeft: 'auto', flexShrink: 0 }} />
    </button>
  );
}

function ApptWeekChip({ appt, onClick }) {
  const tm = APPT_TYPES[appt.type];
  const tc = VET_TYPE_COLORS[tm.color];
  const pet = apptPet(appt.animalId);
  const term = APPT_TERMINAL.has(appt.status);
  return (
    <button type="button" className="vet-agenda-chip"
      style={{ background: tc.bg, color: tc.fg, borderLeft: `4px solid ${tc.dot}`, opacity: term ? 0.62 : 1 }}
      onClick={() => onClick()}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{apptFmtTime(appt.startAt)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="vet-agenda-chip-line"><strong>{tm.icon} {pet ? pet.name : (appt.clientName || 'Sin asignar')}</strong></div>
        <div className="vet-agenda-chip-sub">{tm.label}</div>
      </div>
    </button>
  );
}

// ---- Month view ----
function ApptMonthView({ cursor, events, onDayClick, onEventClick }) {
  const startCell = agStartOfWeek(agStartOfMonth(cursor));
  const today = new Date();
  const cells = Array.from({ length: 42 }, (_, i) => agAddDays(startCell, i));
  const eventsOn = (day) => { const iso = apptISOfromDate(day); return events.filter((e) => e.startAt.slice(0,10) === iso); };
  return (
    <div className="vet-agenda-month">
      <div className="vet-agenda-month-head">
        {AGENDA_WD_SHORT.map((d) => <div key={d} className="vet-agenda-month-weekday">{d}</div>)}
      </div>
      <div className="vet-agenda-month-grid">
        {cells.map((day, i) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = agSameDay(day, today);
          const de = eventsOn(day).sort((a,b) => a.startAt.localeCompare(b.startAt));
          const vis = de.slice(0, 3);
          const overflow = de.length - vis.length;
          return (
            <div key={i} role="button" tabIndex={0}
              className={'vet-agenda-month-cell' + (inMonth ? '' : ' other-month') + (isToday ? ' today' : '') + (de.length ? ' has-events' : '')}
              onClick={() => onDayClick(day)}>
              <div className="vet-agenda-month-cell-num">
                <span className={isToday ? 'today-marker' : ''}>{day.getDate()}</span>
                {de.length > 0 && <span className="vet-agenda-month-cell-count">{de.length}</span>}
              </div>
              <div className="vet-agenda-month-cell-events">
                {vis.map((ev) => <ApptMonthChip key={ev.id} appt={ev} onClick={() => onEventClick(ev)} />)}
                {overflow > 0 && <div className="vet-agenda-month-cell-more">+{overflow} más</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Week view ----
function ApptWeekView({ cursor, events, onDayClick, onEventClick }) {
  const weekStart = agStartOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => agAddDays(weekStart, i));
  const today = new Date();
  const eventsOn = (day) => { const iso = apptISOfromDate(day); return events.filter((e) => e.startAt.slice(0,10) === iso).sort((a,b) => a.startAt.localeCompare(b.startAt)); };
  return (
    <div className="vet-agenda-week">
      {days.map((day, i) => {
        const isToday = agSameDay(day, today);
        const de = eventsOn(day);
        return (
          <div key={i} className={'vet-agenda-week-col' + (isToday ? ' today' : '')}>
            <button type="button" className="vet-agenda-week-head" onClick={() => onDayClick(day)}>
              <div className="vet-agenda-week-day-name">{AGENDA_WD_SHORT[i]}</div>
              <div className={'vet-agenda-week-day-num' + (isToday ? ' today' : '')}>{day.getDate()}</div>
              <div className="vet-agenda-week-day-count">{de.length === 0 ? 'Sin citas' : de.length === 1 ? '1 cita' : `${de.length} citas`}</div>
            </button>
            <div className="vet-agenda-week-events">
              {de.length === 0 ? <div className="vet-agenda-week-empty">—</div> : de.map((ev) => <ApptWeekChip key={ev.id} appt={ev} onClick={() => onEventClick(ev)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Day view (timeline) ----
function ApptDayView({ dayISO, events, allForDay, list, onEventClick, onNew }) {
  const dayList = events.filter((e) => e.startAt.slice(0,10) === dayISO).sort((a,b) => a.startAt.localeCompare(b.startAt));
  const groups = React.useMemo(() => {
    const map = new Map();
    for (const a of dayList) { const h = apptHour(a.startAt); if (!map.has(h)) map.set(h, []); map.get(h).push(a); }
    return [...map.entries()].sort((a,b) => a[0] - b[0]);
  }, [dayList]);

  if (dayList.length === 0) {
    return (
      <div className="appt-day-empty">
        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
        <div style={{ fontSize: 14 }}>No hay citas para este día.</div>
        <button className="appt-btn appt-btn-primary" style={{ marginTop: 16 }} onClick={onNew}><VetIcons.Plus size={15} /> Agendar una cita</button>
      </div>
    );
  }

  return (
    <div className="appt-timeline">
      {groups.map(([hour, items]) => (
        <div className="appt-hour-group" key={hour}>
          <div className="appt-hour-rail">
            <div className="appt-hour-num">{String(hour).padStart(2, '0')}:00</div>
            <div className="appt-hour-line" />
          </div>
          <div className="appt-hour-cards">
            {items.map((a) => {
              const tm = APPT_TYPES[a.type];
              const tc = VET_TYPE_COLORS[tm.color];
              const pet = apptPet(a.animalId);
              const owner = apptOwner(a.ownerId);
              const clashing = apptClashes(list, a);
              const term = APPT_TERMINAL.has(a.status);
              return (
                <button key={a.id}
                  className={'appt-card' + (term ? ' is-terminal' : '') + (a.status === 'CANCELLED' ? ' is-cancelled' : '')}
                  style={{ borderLeftColor: tc.dot }} onClick={() => onEventClick(a)}>
                  <div className="appt-card-time">
                    <span className="appt-card-hh">{apptFmtTime(a.startAt)}</span>
                    <span className="appt-card-type-ic">{tm.icon}</span>
                  </div>
                  <div className="appt-card-main">
                    <div className="appt-card-line1">
                      <span className="appt-card-title">{pet ? pet.name : (a.clientName || 'Sin asignar')}</span>
                      <ApptTypeChip type={a.type} />
                      {clashing.length > 0 && <span className="appt-clash-flag"><VetIcons.AlertTriangle size={11} /> Choque</span>}
                    </div>
                    <div className="appt-card-line2">
                      {pet
                        ? <span className="appt-card-owner">{owner ? owner.name : 'Dueño s/registro'}</span>
                        : <span className="appt-freewalk"><VetIcons.User size={11} /> {a.clientPhone || 'Contacto libre'}</span>}
                      {a.notes && <><span style={{ color: 'var(--warm-300)' }}>·</span><span style={{ color: 'var(--warm-500)' }}>{a.notes}</span></>}
                    </div>
                  </div>
                  <div className="appt-card-right">
                    <ApptStatusPill status={a.status} />
                    <ApptVetBadge employeeId={a.employeeId} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main view
// ============================================================================
function VetAgendaView() {
  const toast = useVetToast();
  const [list, setList] = React.useState(() => APPT_SEED.map((a) => ({ ...a, enabled: true })));
  const [view, setView] = React.useState('day');
  const [cursor, setCursor] = React.useState(() => new Date(2026, 6, 10));
  const [vetFilter, setVetFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [selected, setSelected] = React.useState(null);
  const [form, setForm] = React.useState(null);

  const activeList = list.filter((a) => a.enabled !== false);
  const filtered = React.useMemo(() => activeList
    .filter((a) => vetFilter === 'ALL' || a.employeeId === Number(vetFilter))
    .filter((a) => statusFilter === 'ALL' || a.status === statusFilter),
    [activeList, vetFilter, statusFilter]);

  const dayISO = apptISOfromDate(cursor);
  const selectedAppt = selected != null ? list.find((a) => a.id === selected) : null;

  function nav(dir) {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  }
  function goToDay(day) { setCursor(day); setView('day'); }

  function saveAppt(data) {
    if (data.id != null) {
      setList((l) => l.map((a) => a.id === data.id ? { ...a, ...data } : a));
      toast.success('Cita actualizada', `Cita #${data.id} guardada.`);
    } else {
      const id = APPT_NEXT_ID++;
      setList((l) => [...l, { ...data, id, status: 'REQUESTED', cancellationReason: null, enabled: true }]);
      toast.success('Cita agendada', `Cita #${id} creada como Solicitada.`);
      setCursor(new Date(...data.startAt.slice(0,10).split('-').map((n,i) => i===1 ? Number(n)-1 : Number(n))));
      setView('day');
    }
    setForm(null);
  }
  function transition(appt, next) {
    setList((l) => l.map((a) => a.id === appt.id ? { ...a, status: next } : a));
    toast.success('Estado actualizado', `Cita #${appt.id} → ${APPT_STATUS[next].label}.`);
  }
  function cancelAppt(appt, reason) {
    setList((l) => l.map((a) => a.id === appt.id ? { ...a, status: 'CANCELLED', cancellationReason: reason || null } : a));
    toast.info('Cita cancelada', `Cita #${appt.id} cancelada.`);
  }
  function deleteAppt(appt) {
    setList((l) => l.map((a) => a.id === appt.id ? { ...a, enabled: false } : a));
    toast.info('Cita eliminada', `Cita #${appt.id} eliminada.`);
    setSelected(null);
  }

  // stats del día en foco
  const dayAll = activeList.filter((a) => a.startAt.slice(0,10) === dayISO);
  const cnt = (fn) => dayAll.filter(fn).length;
  const stats = [
    { label: 'Citas del día', value: dayAll.length, sub: 'agendadas' },
    { label: 'Pendientes', value: cnt((a) => ['REQUESTED','CONFIRMED','ARRIVED'].includes(a.status)), sub: 'por atender' },
    { label: 'En curso', value: cnt((a) => a.status === 'IN_PROGRESS'), sub: 'en consultorio' },
    { label: 'Cerradas', value: cnt((a) => APPT_TERMINAL.has(a.status)), sub: 'completadas / canceladas' },
  ];

  const cursorLabel = (() => {
    if (view === 'month') return `${AGENDA_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === 'week') {
      const s = agStartOfWeek(cursor), e = agAddDays(s, 6);
      return `${s.getDate()} ${AGENDA_MONTHS[s.getMonth()].slice(0,3).toLowerCase()} – ${e.getDate()} ${AGENDA_MONTHS[e.getMonth()].slice(0,3).toLowerCase()} ${e.getFullYear()}`;
    }
    return apptFmtDayLong(dayISO);
  })();

  return (
    <div className="vet-agenda-page">
      <header className="vet-agenda-header">
        <div>
          <div className="vet-agenda-kicker">Trabajo · Citas</div>
          <h1 className="vet-agenda-title">Agenda</h1>
          <div className="vet-agenda-lead">
            Reserva, confirma, atiende, reprograma y cancela citas. Cada cita es un punto en el tiempo con veterinario asignado; el choque de horario avisa pero nunca bloquea.
          </div>
        </div>
        <button type="button" className="vet-agenda-cta" onClick={() => setForm({ mode: 'create' })}>
          <VetIcons.Plus size={16} strokeWidth={1.8} /> Nueva cita
        </button>
      </header>

      <div className="vet-agenda-toolbar">
        <div className="vet-agenda-nav">
          <button type="button" className="vet-agenda-today-btn" onClick={() => { setCursor(new Date(2026,6,10)); }}>Hoy</button>
          <div className="vet-agenda-nav-arrows">
            <button type="button" className="vet-agenda-arrow-btn" onClick={() => nav(-1)} aria-label="Anterior"><VetIcons.ChevronLeft size={16} strokeWidth={1.8} /></button>
            <button type="button" className="vet-agenda-arrow-btn" onClick={() => nav(1)} aria-label="Siguiente"><VetIcons.ChevronRight size={16} strokeWidth={1.8} /></button>
          </div>
          <div className="vet-agenda-cursor-label">{cursorLabel}</div>
        </div>
        <div className="vet-agenda-view-toggle">
          {['month','week','day'].map((v) => (
            <button key={v} type="button" className={'vet-agenda-view-btn' + (view === v ? ' active' : '')} onClick={() => setView(v)}>
              {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
            </button>
          ))}
        </div>
      </div>

      <div className="appt-filterbar">
        <VetIcons.Filter size={15} style={{ color: 'var(--warm-500)' }} />
        <select className="appt-select" value={vetFilter} onChange={(e) => setVetFilter(e.target.value)}>
          <option value="ALL">Todos los vets</option>
          {APPT_VETS.map((v) => <option key={v.id} value={v.id}>{v.short}</option>)}
        </select>
        <select className="appt-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">Todos los estados</option>
          {Object.entries(APPT_STATUS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
      </div>

      {view === 'day' && (
        <div className="appt-summary">
          {stats.map((s) => (
            <div className="appt-stat" key={s.label}>
              <div className="appt-stat-label">{s.label}</div>
              <div className="appt-stat-value">{s.value}</div>
              <div className="appt-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="vet-agenda-body">
        {view === 'month' && <ApptMonthView cursor={cursor} events={filtered} onDayClick={goToDay} onEventClick={(a) => setSelected(a.id)} />}
        {view === 'week' && <ApptWeekView cursor={cursor} events={filtered} onDayClick={goToDay} onEventClick={(a) => setSelected(a.id)} />}
        {view === 'day' && <ApptDayView dayISO={dayISO} events={filtered} list={list} onEventClick={(a) => setSelected(a.id)} onNew={() => setForm({ mode: 'create' })} />}
      </div>

      {form && (
        <ApptForm initial={form.mode === 'edit' ? form.appt : null} list={list} focusDay={dayISO}
          onClose={() => setForm(null)} onSave={saveAppt} />
      )}
      {selectedAppt && !form && (
        <ApptDetail appt={selectedAppt} list={list}
          onClose={() => setSelected(null)}
          onEdit={(a) => setForm({ mode: 'edit', appt: a })}
          onReschedule={(a) => setForm({ mode: 'edit', appt: a })}
          onTransition={transition} onCancelAppt={cancelAppt} onDelete={deleteAppt} />
      )}
    </div>
  );
}

Object.assign(window, { VetAgendaView });
