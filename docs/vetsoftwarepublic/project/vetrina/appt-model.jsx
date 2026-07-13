/* ============================================================================
   Citas (Appointment) — modelo + piezas compartidas para la Agenda.
   Reutiliza VET_TYPE_COLORS, VET_MOCK_OWNERS y VET_MOCK_PETS del app.
   ============================================================================ */
/* global React, VetIcons, VET_TYPE_COLORS, VET_MOCK_OWNERS, VET_MOCK_PETS */

// AppointmentType (enum)
const APPT_TYPES = {
  CONSULTATION: { label: 'Consulta',        icon: '🩺', color: 'amatista' },
  CONTROL:      { label: 'Control',         icon: '📋', color: 'pink'     },
  VACCINATION:  { label: 'Vacunación',      icon: '💉', color: 'green'    },
  DEWORMING:    { label: 'Desparasitación', icon: '🪱', color: 'teal'     },
  SURGERY:      { label: 'Cirugía',         icon: '🔪', color: 'red'      },
  IMAGING:      { label: 'Imagen Dx',       icon: '🩻', color: 'indigo'   },
  LABORATORY:   { label: 'Laboratorio',     icon: '🧪', color: 'blue'     },
  GROOMING:     { label: 'Spa / Estética',  icon: '🛁', color: 'amber'    },
  OTHER:        { label: 'Otro',            icon: '✳️', color: 'gray'     },
};

// AppointmentStatus (enum) + colores
const APPT_STATUS = {
  REQUESTED:   { label: 'Solicitada', dot: 'oklch(65% 0.13 75)',  bg: 'oklch(95% 0.06 80)',  fg: 'oklch(45% 0.13 70)' },
  CONFIRMED:   { label: 'Confirmada', dot: 'oklch(55% 0.16 240)', bg: 'oklch(95% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  ARRIVED:     { label: 'Llegó',      dot: 'oklch(58% 0.14 200)', bg: 'oklch(95% 0.05 200)', fg: 'oklch(42% 0.12 200)' },
  IN_PROGRESS: { label: 'En curso',   dot: 'var(--amatista-600)', bg: 'var(--amatista-100)', fg: 'var(--amatista-700)' },
  COMPLETED:   { label: 'Completada', dot: 'oklch(55% 0.16 150)', bg: 'oklch(95% 0.06 150)', fg: 'oklch(40% 0.13 150)' },
  NO_SHOW:     { label: 'No asistió', dot: 'oklch(62% 0.14 40)',  bg: 'oklch(95% 0.04 40)',  fg: 'oklch(48% 0.15 40)' },
  CANCELLED:   { label: 'Cancelada',  dot: 'var(--warm-500)',     bg: 'var(--warm-200)',     fg: 'var(--warm-600)' },
};

// Transiciones válidas (máquina de estados)
const APPT_TRANSITIONS = {
  REQUESTED:   ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED:   ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
  ARRIVED:     ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED:   [],
  NO_SHOW:     [],
  CANCELLED:   [],
};
const APPT_TERMINAL = new Set(['COMPLETED', 'NO_SHOW', 'CANCELLED']);

// Veterinarios asignables
const APPT_VETS = [
  { id: 1, name: 'Dra. Mariana Rojas',  short: 'M. Rojas',    initials: 'MR', hue: 300 },
  { id: 2, name: 'Dr. Andrés Mejía',    short: 'A. Mejía',    initials: 'AM', hue: 200 },
  { id: 9, name: 'Dra. Sofía Cárdenas', short: 'S. Cárdenas', initials: 'SC', hue: 25 },
];

// ---- lookups + formatters ----
function apptPet(animalId) {
  if (!animalId) return null;
  for (const ownerId of Object.keys(VET_MOCK_PETS)) {
    const p = VET_MOCK_PETS[ownerId].find((x) => x.id === animalId);
    if (p) return p;
  }
  return null;
}
function apptOwner(ownerId) { return ownerId ? (VET_MOCK_OWNERS.find((o) => o.id === ownerId) || null) : null; }
function apptVet(id) { return APPT_VETS.find((v) => v.id === id) || null; }
function apptFmtTime(iso) { return iso ? iso.slice(11, 16) : ''; }
function apptHour(iso) { return iso ? Number(iso.slice(11, 13)) : 0; }

const APPT_WEEKDAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const APPT_MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function apptFmtDayLong(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${APPT_WEEKDAYS[dt.getDay()]} ${d} de ${APPT_MONTHS[m - 1]}`;
}
function apptISOfromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// solape: mismo vet, misma hora de inicio, ambos activos y no-terminales (§4.3)
function apptClashes(list, appt) {
  if (APPT_TERMINAL.has(appt.status)) return [];
  return list.filter((o) =>
    o.id !== appt.id && o.enabled !== false &&
    o.employeeId === appt.employeeId &&
    o.startAt === appt.startAt &&
    !APPT_TERMINAL.has(o.status)
  );
}

// ---- componentes de presentación ----
function ApptStatusPill({ status }) {
  const m = APPT_STATUS[status];
  return (
    <span className="appt-pill" style={{ background: m.bg, color: m.fg }}>
      <span className="appt-pill-dot" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function ApptTypeChip({ type }) {
  const m = APPT_TYPES[type];
  const c = VET_TYPE_COLORS[m.color];
  return (
    <span className="appt-type-chip" style={{ background: c.bg, color: c.fg }}>
      <span>{m.icon}</span>{m.label}
    </span>
  );
}

function ApptVetBadge({ employeeId }) {
  const v = apptVet(employeeId);
  if (!v) return null;
  return (
    <span className="appt-vet-badge">
      <span className="appt-vet-dot" style={{ background: `oklch(58% 0.16 ${v.hue})` }}>{v.initials}</span>
      {v.short}
    </span>
  );
}

Object.assign(window, {
  APPT_TYPES, APPT_STATUS, APPT_TRANSITIONS, APPT_TERMINAL, APPT_VETS,
  apptPet, apptOwner, apptVet, apptFmtTime, apptHour, apptFmtDayLong,
  apptISOfromDate, apptClashes,
  ApptStatusPill, ApptTypeChip, ApptVetBadge,
});
