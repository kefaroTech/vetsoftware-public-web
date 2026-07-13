/* global React, VetIcons, useVetRouter, VET_MOCK_USER, VET_MOCK_DAY_STATS, VET_MOCK_RECENT */

// ===== GreetingHeader =====
function VetGreetingHeader({ firstName, scheduledToday }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const today = (() => {
    const fmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const t = fmt.format(new Date());
    return t.charAt(0).toUpperCase() + t.slice(1);
  })();
  const subtitle = `${today} · ${scheduledToday} ${scheduledToday === 1 ? 'consulta prevista' : 'consultas previstas'} hoy`;

  return (
    <header style={{ marginBottom: 20 }}>
      <h1 style={vetHomeStyles.greetingTitle}>
        {greeting}, <em style={vetHomeStyles.greetingTitleEm}>{firstName}</em>.
      </h1>
      <p style={vetHomeStyles.greetingSubtitle}>{subtitle}</p>
    </header>
  );
}

// ===== StatCard =====
function VetStatCard({ label, value, sub, tone }) {
  const subColors = {
    ok: 'oklch(50% 0.13 145)',
    amatista: 'var(--amatista-700)',
    neutral: 'var(--warm-500)',
  };
  return (
    <div style={vetHomeStyles.statCard}>
      <div style={vetHomeStyles.statLabel}>{label}</div>
      <div style={vetHomeStyles.statValue}>{value}</div>
      <div style={{ fontSize: 11.5, marginTop: 4, color: subColors[tone] }}>{sub}</div>
    </div>
  );
}

// ===== StatsRow =====
function VetStatsRow({ stats }) {
  const cards = [
    { label: 'Consultas hoy', value: stats.total,      sub: '+2 vs ayer',  tone: 'ok' },
    { label: 'En curso',      value: stats.inProgress, sub: 'Luna · 09:30', tone: 'amatista' },
    { label: 'Pendientes',    value: stats.pending,    sub: 'Próxima 11:00', tone: 'neutral' },
    { label: 'Completadas',   value: stats.completed,  sub: 'esta mañana',  tone: 'neutral' },
  ];
  return (
    <div style={vetHomeStyles.statsRow}>
      {cards.map((c) => <VetStatCard key={c.label} {...c} />)}
    </div>
  );
}

// ===== CtaPrimary =====
function VetCtaPrimary() {
  const router = useVetRouter();
  return (
    <section style={vetHomeStyles.ctaPrimary} className="vet-cta-primary">
      <div style={vetHomeStyles.ctaPrimaryDecor} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={vetHomeStyles.ctaEyebrow}>ACCIÓN RÁPIDA</div>
        <h2 style={vetHomeStyles.ctaPrimaryTitle}>Iniciar una nueva consulta</h2>
        <p style={vetHomeStyles.ctaPrimaryDesc}>
          Registra el motivo, examen físico, diagnóstico y tratamiento del paciente en una sola pantalla.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          <button
            type="button"
            style={vetHomeStyles.ctaBtnPrimary}
            className="vet-cta-btn-primary"
            onClick={() => router.push({ name: 'consulta-nueva' })}
          >
            <VetIcons.Plus size={14} strokeWidth={1.5} />
            <span>Nueva consulta</span>
          </button>
          <button
            type="button"
            style={vetHomeStyles.ctaBtnGhost}
            className="vet-cta-btn-ghost"
            onClick={() => router.push({ name: 'consulta-historial' })}
          >
            Ver historial
          </button>
        </div>
      </div>
    </section>
  );
}

// ===== CtaSecondary =====
function VetCtaSecondary() {
  const router = useVetRouter();
  return (
    <a
      href="#/dashboard/consulta/historial"
      onClick={(e) => { e.preventDefault(); router.push({ name: 'consulta-historial' }); }}
      style={vetHomeStyles.ctaSecondary}
      className="vet-cta-secondary"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={vetHomeStyles.ctaSecondaryIcon}>
          <VetIcons.History size={18} strokeWidth={1.5} />
        </div>
        <div style={vetHomeStyles.ctaSecondaryTitle}>Historial clínico</div>
      </div>
      <p style={vetHomeStyles.ctaSecondaryDesc}>
        Busca consultas previas por paciente, dueño o fecha. Exporta resúmenes en PDF.
      </p>
      <div style={vetHomeStyles.ctaSecondaryLink}>
        Abrir historial
        <VetIcons.ArrowRight size={14} strokeWidth={1.5} />
      </div>
    </a>
  );
}

// ===== ConsultationStatusPill =====
function VetConsultationStatusPill({ status }) {
  const cfg = {
    en_curso:    { label: 'En curso',    bg: 'var(--amatista-100)', fg: 'var(--amatista-700)', dot: 'var(--amatista-500)' },
    programada:  { label: 'Programada',  bg: 'var(--warm-150)',     fg: 'var(--warm-700)',    dot: 'var(--warm-500)' },
    completada:  { label: 'Completada',  bg: 'var(--success-bg)',   fg: 'var(--success-fg)',  dot: 'var(--success-dot)' },
  }[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11.5, padding: '4px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.fg, fontWeight: 500,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ===== RecentConsultations =====
function VetRecentConsultations({ consultations }) {
  return (
    <section>
      <header style={vetHomeStyles.recentHeader}>
        <h3 style={vetHomeStyles.recentTitle}>Consultas recientes</h3>
        <a href="#" style={vetHomeStyles.recentLink}>Ver todas →</a>
      </header>
      <div style={vetHomeStyles.recentList}>
        {consultations.map((c, idx) => (
          <article
            key={c.id}
            style={{
              ...vetHomeStyles.recentRow,
              ...(idx === consultations.length - 1 ? { borderBottom: 'none' } : {}),
            }}
          >
            <div style={vetHomeStyles.recentAvatar}>
              <VetIcons.PawPrint size={16} strokeWidth={1.5} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 500, color: 'var(--warm-900)', fontSize: 13 }}>{c.patient.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--warm-500)', marginTop: 1 }}>
                {c.patient.species} · {c.patient.ageYears} a
              </div>
            </div>
            <div style={vetHomeStyles.recentCell}>{c.patient.ownerName}</div>
            <div style={vetHomeStyles.recentCell}>{c.reason}</div>
            <div style={vetHomeStyles.recentCell}>{c.dayLabel} · {c.timeLabel}</div>
            <VetConsultationStatusPill status={c.status} />
          </article>
        ))}
      </div>
    </section>
  );
}

// ===== HomeView =====
function VetHomeView() {
  return (
    <>
      <VetGreetingHeader firstName={VET_MOCK_USER.firstName} scheduledToday={VET_MOCK_DAY_STATS.total} />
      <VetStatsRow stats={VET_MOCK_DAY_STATS} />
      <div style={vetHomeStyles.ctaRow}>
        <VetCtaPrimary />
        <VetCtaSecondary />
      </div>
      <VetRecentConsultations consultations={VET_MOCK_RECENT} />
    </>
  );
}

const vetHomeStyles = {
  greetingTitle: {
    margin: 0,
    fontFamily: 'var(--font-serif)',
    fontSize: 32, lineHeight: 1.05, letterSpacing: '-0.015em',
    fontWeight: 400, color: 'var(--warm-900)',
  },
  greetingTitleEm: { fontStyle: 'italic', color: 'var(--amatista-700)' },
  greetingSubtitle: { margin: '4px 0 0', fontSize: 13.5, color: 'var(--warm-600)' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 },
  statCard: {
    background: 'var(--warm-50)', border: '1px solid var(--warm-200)',
    borderRadius: 12, padding: '12px 16px',
  },
  statLabel: { fontSize: 11.5, color: 'var(--warm-500)', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--warm-900)' },

  ctaRow: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 },
  ctaPrimary: {
    position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 295))',
    color: 'white', borderRadius: 16, padding: '20px 24px',
    boxShadow: '0 1px 2px rgba(50, 20, 80, 0.08), 0 8px 24px -8px oklch(40% 0.18 var(--hue) / 0.5)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  ctaPrimaryDecor: {
    position: 'absolute', top: -60, right: -60, width: 220, height: 220,
    background: 'radial-gradient(circle, oklch(70% 0.18 var(--hue) / 0.4), transparent 60%)',
    pointerEvents: 'none',
  },
  ctaEyebrow: { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7, fontWeight: 500 },
  ctaPrimaryTitle: { margin: '6px 0 8px', fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' },
  ctaPrimaryDesc: { margin: 0, fontSize: 12.5, opacity: 0.75, lineHeight: 1.45, maxWidth: 380 },
  ctaBtnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 16px', borderRadius: 8,
    fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    border: '1px solid transparent', background: 'white', color: 'var(--amatista-700)',
  },
  ctaBtnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 16px', borderRadius: 8,
    fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    border: '1px solid oklch(80% 0.06 var(--hue) / 0.3)',
    background: 'oklch(60% 0.10 var(--hue) / 0.25)', color: 'white',
  },

  ctaSecondary: {
    display: 'flex', flexDirection: 'column',
    background: 'var(--warm-50)', border: '1px solid var(--warm-200)',
    borderRadius: 16, padding: 24, color: 'inherit', textDecoration: 'none',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  ctaSecondaryIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: 'var(--amatista-100)', color: 'var(--amatista-700)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ctaSecondaryTitle: { fontSize: 15, fontWeight: 500, color: 'var(--warm-900)' },
  ctaSecondaryDesc: { margin: 0, fontSize: 12.5, color: 'var(--warm-600)', lineHeight: 1.5, flex: 1 },
  ctaSecondaryLink: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    marginTop: 14, fontSize: 12.5, fontWeight: 500, color: 'var(--amatista-700)',
  },

  recentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  recentTitle: { margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--warm-800)' },
  recentLink: { fontSize: 12, color: 'var(--amatista-700)', textDecoration: 'none' },
  recentList: {
    background: 'var(--warm-50)', border: '1px solid var(--warm-200)',
    borderRadius: 12, overflow: 'hidden',
  },
  recentRow: {
    display: 'grid', gridTemplateColumns: '32px 1.4fr 1fr 1fr 1fr auto',
    gap: 14, alignItems: 'center', padding: '12px 16px',
    fontSize: 13, borderBottom: '1px solid var(--warm-150)',
  },
  recentAvatar: {
    width: 32, height: 32, borderRadius: 8,
    background: 'var(--amatista-100)', color: 'var(--amatista-700)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  recentCell: { fontSize: 12.5, color: 'var(--warm-600)' },
};

Object.assign(window, {
  VetHomeView, VetConsultationStatusPill,
});
