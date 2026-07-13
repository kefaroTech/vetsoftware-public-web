/* global React, VetIcons, useVetRoute, useVetRouter,
   VET_MOCK_OWNERS, VET_MOCK_PETS, VET_MOCK_EVENTS, VET_MOCK_EVENT_DETAILS */

// ============================================================================
// CONSTANTES — eventTypes.ts
// ============================================================================

const VET_EVENT_TYPES = {
  CONSULTATION:       { label: 'Consulta',         color: 'amatista', icon: '🩺' },
  SURGERY:            { label: 'Cirugía',          color: 'red',      icon: '🔪' },
  VACCINATION:        { label: 'Vacunación',       color: 'green',    icon: '💉' },
  DEWORMING:          { label: 'Desparasitación',  color: 'teal',     icon: '🪱' },
  HOSPITALIZATION:    { label: 'Hospitalización',  color: 'amber',    icon: '🏥' },
  LABORATORY_TEST:    { label: 'Laboratorio',      color: 'blue',     icon: '🧪' },
  DIAGNOSTIC_IMAGING: { label: 'Imagen Dx',        color: 'indigo',   icon: '🩻' },
  PRESCRIPTION:       { label: 'Plan terapéutico',  color: 'pink',     icon: '💊' },
  SPA:                { label: 'Spa',              color: 'gray',     icon: '🛁' },
};

const VET_TYPE_COLORS = {
  amatista: { bg: 'var(--amatista-100)',      fg: 'var(--amatista-700)',  dot: 'var(--amatista-600)' },
  red:      { bg: 'oklch(94% 0.05 25)',       fg: 'oklch(48% 0.18 25)',   dot: 'oklch(60% 0.20 25)' },
  green:    { bg: 'oklch(94% 0.06 150)',      fg: 'oklch(40% 0.13 150)',  dot: 'oklch(55% 0.16 150)' },
  teal:     { bg: 'oklch(94% 0.05 200)',      fg: 'oklch(42% 0.12 200)',  dot: 'oklch(58% 0.14 200)' },
  amber:    { bg: 'oklch(94% 0.07 80)',       fg: 'oklch(45% 0.13 70)',   dot: 'oklch(65% 0.13 75)' },
  blue:     { bg: 'oklch(94% 0.04 240)',      fg: 'oklch(40% 0.15 240)',  dot: 'oklch(55% 0.16 240)' },
  indigo:   { bg: 'oklch(94% 0.05 280)',      fg: 'oklch(40% 0.16 280)',  dot: 'oklch(55% 0.18 280)' },
  pink:     { bg: 'oklch(94% 0.05 340)',      fg: 'oklch(42% 0.15 340)',  dot: 'oklch(60% 0.17 340)' },
  gray:     { bg: 'var(--warm-200)',          fg: 'var(--warm-700)',      dot: 'var(--warm-500)' },
};

const VET_EVENT_TYPE_DETAILABLE = new Set([
  'CONSULTATION', 'SURGERY', 'VACCINATION', 'DEWORMING',
  'HOSPITALIZATION', 'LABORATORY_TEST', 'DIAGNOSTIC_IMAGING', 'PRESCRIPTION',
]);

// ============================================================================
// FORMATTERS — composables/format.ts
// ============================================================================

const VET_MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const VET_MONTHS_LONG  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function vetParseISODate(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function vetFormatEventDate(iso) {
  if (!iso) return '—';
  const d = vetParseISODate(iso); if (!d) return iso;
  return `${d.getDate()} ${VET_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function vetFormatMonthLabel(key) {
  const d = vetParseISODate(`${key}-01`); if (!d) return key;
  return `${VET_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}
function vetInitialsFromName(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '').join('');
}

// ============================================================================
// SELECTION STORE — useHistoriaSelection
// ============================================================================

const VetHistoriaCtx = React.createContext(null);
function VetHistoriaProvider({ children }) {
  const [owner, setOwner] = React.useState(null);
  const [pet, setPet] = React.useState(null);
  const value = React.useMemo(() => ({
    owner, pet, setOwner, setPet,
    reset: () => { setOwner(null); setPet(null); },
  }), [owner, pet]);
  return <VetHistoriaCtx.Provider value={value}>{children}</VetHistoriaCtx.Provider>;
}
function useVetHistoriaSelection() { return React.useContext(VetHistoriaCtx); }

// ============================================================================
// ModalShell — components/ui/ModalShell.vue
// ============================================================================

function VetModalShell({ open, title, subtitle, icon: IconComp, width = 720, accent = 'amatista', z, onClose, children, footerLeft, footerActions }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const accentStyles = {
    amatista: { background: 'var(--amatista-100)', color: 'var(--amatista-700)' },
    danger:   { background: 'oklch(94% 0.06 25)',   color: 'oklch(50% 0.18 25)' },
    warn:     { background: 'oklch(95% 0.06 80)',   color: 'oklch(45% 0.13 80)' },
  }[accent];

  return (
    <div
      role="dialog" aria-modal="true"
      style={z ? { ...vetCoreStyles.overlay, zIndex: z } : vetCoreStyles.overlay}
    >
      <div style={{ ...vetCoreStyles.modalCard, width: `min(${width + 180}px, calc(100vw - 48px))`, maxWidth: 'calc(100vw - 48px)' }}>
        <header style={vetCoreStyles.modalHead}>
          {IconComp && (
            <div style={{ ...vetCoreStyles.modalIconBox, ...accentStyles }}>
              <IconComp size={20} strokeWidth={1.7} />
            </div>
          )}
          <div style={vetCoreStyles.modalHeadText}>
            <h2 style={vetCoreStyles.modalTitle}>{title}</h2>
            {subtitle && <p style={vetCoreStyles.modalSubtitle}>{subtitle}</p>}
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="vet-modal-close" style={vetCoreStyles.modalClose}>
            <VetIcons.X size={18} strokeWidth={1.7} />
          </button>
        </header>
        <div style={vetCoreStyles.modalBody}>
          {children}
        </div>
        {(footerLeft || footerActions) && (
          <footer style={vetCoreStyles.modalFoot}>
            <div style={vetCoreStyles.modalFootLeft}>{footerLeft}</div>
            <div style={vetCoreStyles.modalFootActions}>{footerActions}</div>
          </footer>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// BreadcrumbStep — components/BreadcrumbStep.vue
// ============================================================================

function VetBreadcrumbStep({ index, label, active, done, disabled, value, onClick }) {
  const cls = ['vet-crumb', active && 'active', done && 'done', disabled && 'disabled'].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} disabled={disabled} onClick={() => !disabled && onClick?.()}>
      <span className="vet-crumb-badge">{done ? '✓' : index}</span>
      <span className="vet-crumb-label">{label}</span>
      {value && <span className="vet-crumb-value">· {value}</span>}
    </button>
  );
}

// ============================================================================
// EventTypeChip — components/EventTypeChip.vue
// ============================================================================

function VetEventTypeChip({ type, showIcon = false }) {
  const meta = VET_EVENT_TYPES[type];
  const tokens = VET_TYPE_COLORS[meta.color];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 999,
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
      background: tokens.bg, color: tokens.fg,
    }}>
      {showIcon && <span style={{ fontSize: 12, lineHeight: 1 }}>{meta.icon}</span>}
      <span>{meta.label}</span>
    </span>
  );
}

// ============================================================================
// EventCard — components/EventCard.vue
// ============================================================================

function VetEventCard({ event, navigable, nested, onSelect }) {
  const meta = VET_EVENT_TYPES[event.eventType];
  const tokens = VET_TYPE_COLORS[meta.color];
  const dateLabel = vetFormatEventDate(event.eventDate);
  const cls = ['vet-event-row', nested && 'nested'].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div className="vet-event-bullet" style={{ background: tokens.bg, color: tokens.fg }} aria-label={meta.label}>
        {meta.icon}
      </div>
      <button
        type="button"
        className={'vet-event-card' + (navigable ? ' navigable' : '')}
        style={{ '--vet-hover-border': tokens.dot }}
        disabled={!navigable}
        onClick={() => navigable && onSelect?.(event)}
      >
        <div className="vet-event-content">
          <div className="vet-event-head">
            <VetEventTypeChip type={event.eventType} />
            <span className="vet-event-date">{dateLabel}</span>
            <span className="vet-event-source">#{event.sourceId}</span>
          </div>
          <div className="vet-event-summary">{event.summary || 'Sin descripción'}</div>
        </div>
        {navigable && <VetIcons.ChevronRight size={16} strokeWidth={1.6} style={{ color: 'var(--warm-400)', alignSelf: 'center', flexShrink: 0 }} />}
      </button>
    </div>
  );
}

// ============================================================================
// MonthTimelineGroup — components/MonthTimelineGroup.vue
// ============================================================================

function VetMonthTimelineGroup({ monthKey, events, onSelect }) {
  const monthLabel = vetFormatMonthLabel(monthKey);
  const countLabel = events.length === 1 ? '1 evento' : `${events.length} eventos`;

  const nodes = React.useMemo(() => {
    const consultationIds = new Set();
    for (const ev of events) if (ev.eventType === 'CONSULTATION') consultationIds.add(ev.sourceId);
    const childrenByParent = new Map();
    for (const ev of events) {
      if (ev.eventType !== 'CONSULTATION' && ev.consultationId != null && consultationIds.has(ev.consultationId)) {
        const arr = childrenByParent.get(ev.consultationId) ?? [];
        arr.push(ev);
        childrenByParent.set(ev.consultationId, arr);
      }
    }
    const out = [];
    for (const ev of events) {
      if (ev.eventType === 'CONSULTATION') {
        out.push({ parent: ev, children: childrenByParent.get(ev.sourceId) ?? [] });
      } else if (ev.consultationId != null && consultationIds.has(ev.consultationId)) {
        // skip — nested under its consultation
      } else {
        out.push({ parent: ev, children: [] });
      }
    }
    return out;
  }, [events]);

  function isNavigable(t) { return VET_EVENT_TYPE_DETAILABLE.has(t); }

  return (
    <section style={{ marginBottom: 24 }}>
      <header style={vetCoreStyles.monthHead}>
        <span style={vetCoreStyles.monthHeadLabel}>{monthLabel}</span>
        <span style={vetCoreStyles.monthHeadDivider} />
        <span style={vetCoreStyles.monthHeadCount}>{countLabel}</span>
      </header>
      <div style={{ position: 'relative', paddingLeft: 38 }}>
        <div aria-hidden style={vetCoreStyles.timelineRail} />
        {nodes.map((node, idx) => (
          <React.Fragment key={`${node.parent.eventType}-${node.parent.sourceId}-${idx}`}>
            <VetEventCard
              event={node.parent}
              navigable={isNavigable(node.parent.eventType)}
              onSelect={onSelect}
            />
            {node.children.length > 0 && (
              <div style={vetCoreStyles.children}>
                {node.children.map((child) => (
                  <VetEventCard
                    key={`${child.eventType}-${child.sourceId}`}
                    event={child}
                    navigable={isNavigable(child.eventType)}
                    nested
                    onSelect={onSelect}
                  />
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

const vetCoreStyles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(20, 15, 30, 0.55)',
    backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
    display: 'grid', placeItems: 'center', zIndex: 1500,
    fontFamily: 'var(--font-sans)',
  },
  modalCard: {
    background: 'var(--warm-50)',
    borderRadius: 16,
    boxShadow: '0 30px 80px rgba(20, 15, 30, 0.35)',
    display: 'flex', flexDirection: 'column',
    maxHeight: 'calc(100vh - 48px)', overflow: 'hidden',
  },
  modalHead: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
    padding: '22px 30px 18px',
    borderBottom: '1px solid var(--warm-200)',
    background: 'var(--warm-50)',
    position: 'sticky', top: 0, zIndex: 1,
  },
  modalIconBox: { width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0 },
  modalHeadText: { flex: 1, minWidth: 0 },
  modalTitle: {
    margin: 0, fontFamily: 'var(--font-serif)',
    fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em',
    color: 'var(--warm-900)', lineHeight: 1.15,
  },
  modalSubtitle: { margin: '4px 0 0', fontSize: 12.5, color: 'var(--warm-500)', lineHeight: 1.4 },
  modalClose: {
    background: 'transparent', border: 'none', color: 'var(--warm-500)',
    width: 30, height: 30, borderRadius: 8,
    display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
  },
  modalBody: { flex: 1, overflow: 'auto', padding: '24px 30px' },
  modalFoot: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 30px',
    borderTop: '1px solid var(--warm-200)',
    background: 'var(--warm-50)',
    position: 'sticky', bottom: 0,
  },
  modalFootLeft: { flex: 1, fontSize: 12.5, color: 'var(--warm-500)' },
  modalFootActions: { display: 'flex', gap: 8 },

  monthHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  monthHeadLabel: {
    fontSize: 12, color: 'var(--warm-500)',
    letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500,
  },
  monthHeadDivider: { flex: 1, height: 1, background: 'var(--warm-200)' },
  monthHeadCount: { fontSize: 12, color: 'var(--warm-500)', whiteSpace: 'nowrap' },
  timelineRail: {
    position: 'absolute', left: 14, top: 8, bottom: 8,
    width: 2, background: 'var(--warm-200)', borderRadius: 1,
  },
  children: {
    position: 'relative', margin: '-4px 0 14px 32px',
    paddingTop: 4, paddingLeft: 18,
    borderLeft: '2px solid var(--warm-200)',
  },
};

Object.assign(window, {
  VET_EVENT_TYPES, VET_TYPE_COLORS, VET_EVENT_TYPE_DETAILABLE,
  vetFormatEventDate, vetFormatMonthLabel, vetInitialsFromName, vetParseISODate,
  VetHistoriaProvider, useVetHistoriaSelection,
  VetModalShell, VetBreadcrumbStep, VetEventTypeChip, VetEventCard, VetMonthTimelineGroup,
});
