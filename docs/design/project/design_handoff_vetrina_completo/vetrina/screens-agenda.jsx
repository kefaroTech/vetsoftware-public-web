/* global React, VetIcons, useVetRouter,
   VET_MOCK_OWNERS, VET_MOCK_PETS, VET_MOCK_EVENTS,
   VET_ACCIONES_LAB, VET_ACCIONES_IMAGING, VET_ACCIONES_VAC,
   VET_ACCIONES_HOSP, VET_ACCIONES_DEWORM, VET_ACCIONES_SURG, VET_ACCIONES_SPA,
   VET_EVENT_TYPES, VET_TYPE_COLORS, vetFormatDateShort */

// ============================================================================
// Agenda — Calendar view aggregating all clinical activities
// ============================================================================

const VET_AGENDA_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const VET_AGENDA_WEEKDAYS_SHORT = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const VET_AGENDA_WEEKDAYS_FULL  = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

function vetIsoFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function vetParseISO(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function vetStartOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function vetStartOfWeek(d) {
  const day = (d.getDay() + 6) % 7; // Mon = 0
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return start;
}
function vetAddDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function vetSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function vetIsBetween(target, start, end) {
  const t = vetIsoFromDate(target);
  return t >= vetIsoFromDate(start) && t <= vetIsoFromDate(end);
}

// ============================================================================
// Aggregate all clinical events into a unified shape
// ============================================================================

function vetFindPetAndOwner(animalId) {
  for (const ownerId of Object.keys(VET_MOCK_PETS)) {
    const p = VET_MOCK_PETS[ownerId].find((x) => x.id === animalId);
    if (p) {
      const owner = VET_MOCK_OWNERS.find((o) => o.id === ownerId);
      return { pet: p, owner };
    }
  }
  return { pet: null, owner: null };
}

function vetBuildAgendaEvents() {
  const all = [];

  // From historia events (CONSULTATION/VACCINATION/SURGERY/etc — already typed)
  for (const animalId of Object.keys(VET_MOCK_EVENTS)) {
    const ctx = vetFindPetAndOwner(animalId);
    for (const ev of VET_MOCK_EVENTS[animalId]) {
      all.push({
        id: `hist-${ev.sourceId}`,
        type: ev.eventType,
        date: ev.eventDate,
        endDate: null,
        title: VET_EVENT_TYPES[ev.eventType]?.label ?? ev.eventType,
        subtitle: ev.summary || '',
        pet: ctx.pet,
        owner: ctx.owner,
      });
    }
  }

  // Standalone Acciones (some may overlap with historia but it's OK — keyed by unique id)
  const accionesSources = [
    { items: VET_ACCIONES_LAB,     type: 'LABORATORY_TEST',    titleFn: (it) => it.testType?.name },
    { items: VET_ACCIONES_IMAGING, type: 'DIAGNOSTIC_IMAGING', titleFn: (it) => it.diagnosticImagingType?.name },
    { items: VET_ACCIONES_VAC,     type: 'VACCINATION',        titleFn: (it) => it.vaccinationType?.name },
    { items: VET_ACCIONES_DEWORM,  type: 'DEWORMING',          titleFn: (it) => `${it.product} (${it.type})` },
    { items: VET_ACCIONES_SURG,    type: 'SURGERY',            titleFn: (it) => it.surgeryType?.name },
    { items: VET_ACCIONES_SPA,     type: 'SPA',                titleFn: (it) => it.spaType?.name },
  ];
  for (const src of accionesSources) {
    for (const it of src.items) {
      const ctx = vetFindPetAndOwner(it.animalId);
      all.push({
        id: `${src.type.toLowerCase()}-${it.id}`,
        type: src.type,
        date: it.date,
        endDate: null,
        title: src.titleFn(it) ?? VET_EVENT_TYPES[src.type]?.label,
        subtitle: it.diagnosis || it.reason || it.notes || it.description || '',
        pet: ctx.pet,
        owner: ctx.owner,
      });
    }
  }

  // Hospitalization (multi-day)
  for (const h of VET_ACCIONES_HOSP) {
    const ctx = vetFindPetAndOwner(h.animalId);
    all.push({
      id: `hosp-${h.id}`,
      type: 'HOSPITALIZATION',
      date: h.startDate,
      endDate: h.endDate || h.startDate,
      title: h.type === 'HOSPITALIZATION' ? 'Hospitalización' : 'Ambulatoria',
      subtitle: h.reason || '',
      pet: ctx.pet,
      owner: ctx.owner,
    });
  }

  // Sort by date
  all.sort((a, b) => a.date.localeCompare(b.date));
  return all;
}

// ============================================================================
// Filter pills
// ============================================================================

function VetAgendaFilters({ allEvents, filter, onChange }) {
  const counts = React.useMemo(() => {
    const c = {};
    for (const ev of allEvents) c[ev.type] = (c[ev.type] || 0) + 1;
    return c;
  }, [allEvents]);
  const orderedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  return (
    <div className="vet-agenda-filters">
      <button
        type="button"
        className={'vet-agenda-filter-chip' + (filter === 'ALL' ? ' active' : '')}
        onClick={() => onChange('ALL')}
      >
        Todos · {allEvents.length}
      </button>
      {orderedTypes.map((type) => {
        const meta = VET_EVENT_TYPES[type];
        const tokens = VET_TYPE_COLORS[meta.color];
        const isActive = filter === type;
        return (
          <button
            key={type}
            type="button"
            className={'vet-agenda-filter-chip' + (isActive ? ' active' : '')}
            style={isActive ? { background: tokens.bg, color: tokens.fg, borderColor: tokens.dot } : null}
            onClick={() => onChange(type)}
          >
            <span style={{ fontSize: 13 }}>{meta.icon}</span>
            {meta.label} · {counts[type]}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Event card (used in month cells + day list)
// ============================================================================

function VetAgendaEventChip({ event, onClick, dense }) {
  const meta = VET_EVENT_TYPES[event.type];
  const tokens = VET_TYPE_COLORS[meta?.color || 'gray'];
  if (dense) {
    return (
      <button type="button" className="vet-agenda-chip-dense"
        style={{ background: tokens.bg, color: tokens.fg, borderLeft: `3px solid ${tokens.dot}` }}
        onClick={onClick}>
        <span className="vet-agenda-chip-icon">{meta?.icon}</span>
        <span className="vet-agenda-chip-title">{event.pet?.name || event.title}</span>
      </button>
    );
  }
  return (
    <button type="button" className="vet-agenda-chip"
      style={{ background: tokens.bg, color: tokens.fg, borderLeft: `4px solid ${tokens.dot}` }}
      onClick={onClick}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{meta?.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="vet-agenda-chip-line">
          <strong>{event.title}</strong>
          {event.pet && <span className="vet-agenda-chip-pet"> · {event.pet.name}</span>}
        </div>
        {event.subtitle && <div className="vet-agenda-chip-sub">{event.subtitle}</div>}
        {event.owner && <div className="vet-agenda-chip-owner">{event.owner.name}</div>}
      </div>
    </button>
  );
}

// ============================================================================
// Month view
// ============================================================================

function VetAgendaMonthView({ cursor, events, onDayClick, onEventClick }) {
  const firstOfMonth = vetStartOfMonth(cursor);
  const startCell = vetStartOfWeek(firstOfMonth);
  const today = new Date();

  // 6 rows × 7 days = 42 cells
  const cells = Array.from({ length: 42 }, (_, i) => vetAddDays(startCell, i));

  function eventsOn(day) {
    const iso = vetIsoFromDate(day);
    return events.filter((ev) => {
      if (ev.endDate && ev.endDate !== ev.date) {
        return iso >= ev.date && iso <= ev.endDate;
      }
      return ev.date === iso;
    });
  }

  return (
    <div className="vet-agenda-month">
      <div className="vet-agenda-month-head">
        {VET_AGENDA_WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="vet-agenda-month-weekday">{d}</div>
        ))}
      </div>
      <div className="vet-agenda-month-grid">
        {cells.map((day, i) => {
          const isCurrentMonth = day.getMonth() === cursor.getMonth();
          const isToday = vetSameDay(day, today);
          const dayEvents = eventsOn(day);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;
          return (
            <button
              key={i}
              type="button"
              className={'vet-agenda-month-cell'
                + (isCurrentMonth ? '' : ' other-month')
                + (isToday ? ' today' : '')
                + (dayEvents.length > 0 ? ' has-events' : '')}
              onClick={() => onDayClick(day)}
            >
              <div className="vet-agenda-month-cell-num">
                <span className={isToday ? 'today-marker' : ''}>{day.getDate()}</span>
                {dayEvents.length > 0 && <span className="vet-agenda-month-cell-count">{dayEvents.length}</span>}
              </div>
              <div className="vet-agenda-month-cell-events">
                {visible.map((ev) => (
                  <VetAgendaEventChip
                    key={ev.id}
                    event={ev}
                    dense
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                  />
                ))}
                {overflow > 0 && (
                  <div className="vet-agenda-month-cell-more">+{overflow} más</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Week view — column per day
// ============================================================================

function VetAgendaWeekView({ cursor, events, onEventClick, onDayClick }) {
  const weekStart = vetStartOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => vetAddDays(weekStart, i));
  const today = new Date();

  function eventsOn(day) {
    const iso = vetIsoFromDate(day);
    return events.filter((ev) => {
      if (ev.endDate && ev.endDate !== ev.date) {
        return iso >= ev.date && iso <= ev.endDate;
      }
      return ev.date === iso;
    });
  }

  return (
    <div className="vet-agenda-week">
      {days.map((day, i) => {
        const isToday = vetSameDay(day, today);
        const dayEvents = eventsOn(day);
        return (
          <div key={i} className={'vet-agenda-week-col' + (isToday ? ' today' : '')}>
            <button
              type="button"
              className="vet-agenda-week-head"
              onClick={() => onDayClick(day)}
            >
              <div className="vet-agenda-week-day-name">{VET_AGENDA_WEEKDAYS_SHORT[i]}</div>
              <div className={'vet-agenda-week-day-num' + (isToday ? ' today' : '')}>{day.getDate()}</div>
              <div className="vet-agenda-week-day-count">
                {dayEvents.length === 0 ? 'Sin eventos' :
                 dayEvents.length === 1 ? '1 evento' : `${dayEvents.length} eventos`}
              </div>
            </button>
            <div className="vet-agenda-week-events">
              {dayEvents.length === 0 ? (
                <div className="vet-agenda-week-empty">—</div>
              ) : (
                dayEvents.map((ev) => (
                  <VetAgendaEventChip
                    key={ev.id}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Day view — full list
// ============================================================================

function VetAgendaDayView({ cursor, events, onEventClick }) {
  const iso = vetIsoFromDate(cursor);
  const dayEvents = events.filter((ev) => {
    if (ev.endDate && ev.endDate !== ev.date) {
      return iso >= ev.date && iso <= ev.endDate;
    }
    return ev.date === iso;
  });

  // Group by type for summary
  const byType = {};
  for (const ev of dayEvents) byType[ev.type] = (byType[ev.type] || 0) + 1;

  return (
    <div className="vet-agenda-day">
      <div className="vet-agenda-day-summary">
        <div>
          <div className="vet-agenda-day-title">
            {VET_AGENDA_WEEKDAYS_FULL[(cursor.getDay() + 6) % 7]}{' '}
            {cursor.getDate()} de {VET_AGENDA_MONTHS[cursor.getMonth()].toLowerCase()}
          </div>
          <div className="vet-agenda-day-count">
            {dayEvents.length === 0 ? 'Sin eventos programados' :
             dayEvents.length === 1 ? '1 evento programado' : `${dayEvents.length} eventos programados`}
          </div>
        </div>
        {Object.keys(byType).length > 0 && (
          <div className="vet-agenda-day-types">
            {Object.entries(byType).map(([type, count]) => {
              const meta = VET_EVENT_TYPES[type];
              const tokens = VET_TYPE_COLORS[meta.color];
              return (
                <span key={type} className="vet-agenda-day-type-chip"
                  style={{ background: tokens.bg, color: tokens.fg }}>
                  {meta.icon} {meta.label} × {count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {dayEvents.length === 0 ? (
        <div className="vet-agenda-day-empty">
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 14, color: 'var(--warm-500)' }}>
            No hay eventos agendados para este día.
          </div>
        </div>
      ) : (
        <div className="vet-agenda-day-list">
          {dayEvents.map((ev) => (
            <VetAgendaEventChip
              key={ev.id}
              event={ev}
              onClick={() => onEventClick(ev)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Event detail popover (small modal)
// ============================================================================

function VetAgendaEventModal({ event, onClose }) {
  if (!event) return null;
  const meta = VET_EVENT_TYPES[event.type];
  const tokens = VET_TYPE_COLORS[meta.color];

  return (
    <div className="vet-agenda-event-overlay">
      <div className="vet-agenda-event-card">
        <header className="vet-agenda-event-head" style={{ background: tokens.bg, color: tokens.fg }}>
          <div className="vet-agenda-event-icon" style={{ background: tokens.dot, color: 'white' }}>
            {meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="vet-agenda-event-type">{meta.label}</div>
            <div className="vet-agenda-event-date">
              {vetFormatDateShort(event.date)}
              {event.endDate && event.endDate !== event.date && <> → {vetFormatDateShort(event.endDate)}</>}
            </div>
          </div>
          <button type="button" className="vet-agenda-event-close" onClick={onClose} aria-label="Cerrar">
            <VetIcons.X size={16} strokeWidth={1.8} />
          </button>
        </header>
        <div className="vet-agenda-event-body">
          {event.pet && (
            <div className="vet-agenda-event-field">
              <div className="vet-agenda-event-label">Paciente</div>
              <div className="vet-agenda-event-value">
                {event.pet.name} <span style={{ color: 'var(--warm-500)' }}>· {event.pet.specie.name}, {event.pet.breed.name}</span>
              </div>
            </div>
          )}
          {event.owner && (
            <div className="vet-agenda-event-field">
              <div className="vet-agenda-event-label">Propietario</div>
              <div className="vet-agenda-event-value">
                {event.owner.name} <span style={{ color: 'var(--warm-500)' }}>· {event.owner.phone}</span>
              </div>
            </div>
          )}
          <div className="vet-agenda-event-field">
            <div className="vet-agenda-event-label">{event.type === 'LABORATORY_TEST' || event.type === 'DIAGNOSTIC_IMAGING' || event.type === 'SURGERY' ? 'Tipo' : 'Descripción'}</div>
            <div className="vet-agenda-event-value">{event.title}</div>
          </div>
          {event.subtitle && (
            <div className="vet-agenda-event-field">
              <div className="vet-agenda-event-label">Notas</div>
              <div className="vet-agenda-event-value">{event.subtitle}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main AgendaView
// ============================================================================

function VetAgendaView() {
  const allEvents = React.useMemo(() => vetBuildAgendaEvents(), []);
  const [view, setView] = React.useState('month'); // 'month' | 'week' | 'day'
  const [previousView, setPreviousView] = React.useState(null); // remembered for "back"
  const [cursor, setCursor] = React.useState(() => {
    // Default cursor: today; if no events near today, jump to nearest
    return new Date(2026, 4, 22); // May 22, 2026 — center of the mock data
  });
  const [filter, setFilter] = React.useState('ALL');
  const [selectedEvent, setSelectedEvent] = React.useState(null);

  const filteredEvents = React.useMemo(() => {
    if (filter === 'ALL') return allEvents;
    return allEvents.filter((ev) => ev.type === filter);
  }, [allEvents, filter]);

  function nav(direction) {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + direction);
    else if (view === 'week') d.setDate(d.getDate() + 7 * direction);
    else d.setDate(d.getDate() + direction);
    setCursor(d);
  }
  function goToday() { setCursor(new Date()); }

  function goToDay(day) {
    setCursor(day);
    setPreviousView(view); // remember where we came from
    setView('day');
  }

  function setViewDirect(v) {
    if (v !== 'day') setPreviousView(null);
    setView(v);
  }

  function goBack() {
    if (previousView) {
      setView(previousView);
      setPreviousView(null);
    }
  }

  const previousViewLabel = previousView === 'month' ? 'Volver al mes'
    : previousView === 'week' ? 'Volver a la semana'
    : 'Volver';

  const cursorLabel = (() => {
    if (view === 'month') return `${VET_AGENDA_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === 'week') {
      const start = vetStartOfWeek(cursor);
      const end = vetAddDays(start, 6);
      const sameMonth = start.getMonth() === end.getMonth();
      const startStr = `${start.getDate()} ${VET_AGENDA_MONTHS[start.getMonth()].slice(0,3).toLowerCase()}`;
      const endStr = sameMonth
        ? `${end.getDate()} ${VET_AGENDA_MONTHS[end.getMonth()].slice(0,3).toLowerCase()}`
        : `${end.getDate()} ${VET_AGENDA_MONTHS[end.getMonth()].slice(0,3).toLowerCase()}`;
      return `${startStr} – ${endStr} ${end.getFullYear()}`;
    }
    return `${cursor.getDate()} de ${VET_AGENDA_MONTHS[cursor.getMonth()].toLowerCase()} ${cursor.getFullYear()}`;
  })();

  return (
    <div className="vet-agenda-page">
      <header className="vet-agenda-header">
        <div>
          <div className="vet-agenda-kicker">Calendario · Equipo</div>
          <h1 className="vet-agenda-title">Agenda</h1>
          <div className="vet-agenda-lead">
            Vista cronológica de consultas, cirugías, hospitalizaciones, vacunaciones, exámenes y spa.
          </div>
        </div>
        <button type="button" className="vet-agenda-cta">
          <VetIcons.Plus size={16} strokeWidth={1.8} />
          Nuevo evento
        </button>
      </header>

      <div className="vet-agenda-toolbar">
        <div className="vet-agenda-nav">
          <button type="button" className="vet-agenda-today-btn" onClick={goToday}>Hoy</button>
          <div className="vet-agenda-nav-arrows">
            <button type="button" className="vet-agenda-arrow-btn" onClick={() => nav(-1)} aria-label="Anterior">
              <VetIcons.ChevronLeft size={16} strokeWidth={1.8} />
            </button>
            <button type="button" className="vet-agenda-arrow-btn" onClick={() => nav(1)} aria-label="Siguiente">
              <VetIcons.ChevronRight size={16} strokeWidth={1.8} />
            </button>
          </div>
          <div className="vet-agenda-cursor-label">{cursorLabel}</div>
        </div>

        <div className="vet-agenda-view-toggle">
          {['month','week','day'].map((v) => (
            <button
              key={v}
              type="button"
              className={'vet-agenda-view-btn' + (view === v ? ' active' : '')}
              onClick={() => setViewDirect(v)}
            >
              {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
            </button>
          ))}
        </div>
      </div>

      <VetAgendaFilters allEvents={allEvents} filter={filter} onChange={setFilter} />

      {view === 'day' && previousView && (
        <button type="button" className="vet-agenda-back-btn" onClick={goBack}>
          <VetIcons.ArrowLeft size={14} strokeWidth={1.8} />
          {previousViewLabel}
        </button>
      )}

      <div className="vet-agenda-body">
        {view === 'month' && (
          <VetAgendaMonthView
            cursor={cursor} events={filteredEvents}
            onDayClick={goToDay} onEventClick={setSelectedEvent}
          />
        )}
        {view === 'week' && (
          <VetAgendaWeekView
            cursor={cursor} events={filteredEvents}
            onDayClick={goToDay} onEventClick={setSelectedEvent}
          />
        )}
        {view === 'day' && (
          <VetAgendaDayView
            cursor={cursor} events={filteredEvents}
            onEventClick={setSelectedEvent}
          />
        )}
      </div>

      <VetAgendaEventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}

Object.assign(window, { VetAgendaView });
