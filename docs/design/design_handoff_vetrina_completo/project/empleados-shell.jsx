// Empleados — sidebar shell (mismo lenguaje que Pantalla Principal) + iconos extra

const IconUsers = (p) => (
  <Icon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </Icon>
);
const IconShield = (p) => (
  <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>
);
const IconMail = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></Icon>
);
const IconPhone = (p) => (
  <Icon {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></Icon>
);
const IconCalendar = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4"/><path d="M16 3v4"/></Icon>
);
const IconBriefcase = (p) => (
  <Icon {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2 13h20"/></Icon>
);
const IconClose = (p) => (
  <Icon {...p}><path d="M18 6L6 18"/><path d="M6 6l12 12"/></Icon>
);
const IconCheck = (p) => <Icon {...p}><path d="M5 13l4 4L19 7"/></Icon>;
const IconMore = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></Icon>
);
const IconEdit = (p) => (
  <Icon {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>
);
const IconPower = (p) => (
  <Icon {...p}><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><path d="M12 2v10"/></Icon>
);
const IconKey = (p) => (
  <Icon {...p}><circle cx="7.5" cy="15.5" r="4.5"/><path d="M11 12L21 2"/><path d="M16 7l3 3"/><path d="M18 5l3 3"/></Icon>
);
const IconFilter = (p) => (
  <Icon {...p}><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/></Icon>
);
const IconAlert = (p) => (
  <Icon {...p}><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><circle cx="12" cy="17" r=".7" fill="currentColor"/></Icon>
);

Object.assign(window, {
  IconUsers, IconShield, IconMail, IconPhone, IconCalendar, IconBriefcase,
  IconClose, IconCheck, IconMore, IconEdit, IconPower, IconKey, IconFilter, IconAlert,
});

// ─── Sidebar ───
function EmpleadosSidebar({ activeId = 'empleados' }) {
  const sidebarBg = 'linear-gradient(180deg, oklch(28% 0.10 var(--hue)) 0%, oklch(22% 0.08 var(--hue)) 100%)';
  const sidebarColor = 'oklch(94% 0.02 var(--hue))';

  const navItem = (active, disabled) => ({
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '9px 10px',
    borderRadius: 8,
    fontSize: 13.5,
    color: active ? 'oklch(98% 0.01 var(--hue))' : disabled ? 'oklch(70% 0.03 var(--hue) / 0.4)' : 'oklch(88% 0.03 var(--hue) / 0.85)',
    background: active ? 'oklch(45% 0.16 var(--hue) / 0.4)' : 'transparent',
    boxShadow: active ? '0 0 0 1px oklch(70% 0.14 var(--hue) / 0.3) inset' : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? 500 : 400,
  });

  const navLabel = {
    fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'oklch(75% 0.04 var(--hue) / 0.55)',
    padding: '14px 10px 8px',
  };

  const badge = {
    marginLeft: 'auto',
    fontSize: 9.5, padding: '2px 6px',
    background: 'oklch(70% 0.04 var(--hue) / 0.18)',
    color: 'oklch(78% 0.04 var(--hue) / 0.7)',
    borderRadius: 4, letterSpacing: '0.04em', textTransform: 'uppercase',
    fontWeight: 500,
  };

  return (
    <aside style={{
      width: 248, flexShrink: 0,
      background: sidebarBg, color: sidebarColor,
      display: 'flex', flexDirection: 'column',
      padding: '20px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 22px 8px' }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'oklch(72% 0.16 var(--hue))',
          display: 'grid', placeItems: 'center',
          color: 'oklch(20% 0.05 var(--hue))', fontWeight: 700, fontSize: 15,
          fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
        }}>V</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Vetrina</div>
          <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>Clínica Norte</div>
        </div>
      </div>

      <div style={navLabel}>Trabajo</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={navItem(false, false)}>
          <IconConsulta size={17} />
          <span>Consulta</span>
        </div>
      </div>

      <div style={navLabel}>Administración</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={navItem(activeId === 'empleados', false)}>
          <IconUsers size={17} />
          <span>Empleados</span>
        </div>
        <div style={navItem(false, true)}>
          <IconShield size={17} />
          <span>Roles & permisos</span>
          <span style={badge}>Pronto</span>
        </div>
        <div style={navItem(false, true)}>
          <IconAjustes size={17} />
          <span>Configuración</span>
          <span style={badge}>Pronto</span>
        </div>
      </div>

      <div style={navLabel}>Próximamente</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[['Pacientes', IconPaciente], ['Agenda', IconAgenda], ['Inventario', IconInventario], ['Facturación', IconFacturacion], ['Reportes', IconReportes]].map(([label, Ico]) => (
          <div key={label} style={navItem(false, true)}>
            <Ico size={17} />
            <span>{label}</span>
            <span style={badge}>Pronto</span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 'auto',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 10, borderRadius: 10,
        background: 'oklch(35% 0.10 var(--hue) / 0.4)',
        cursor: 'pointer',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'oklch(72% 0.16 var(--hue))',
          color: 'oklch(20% 0.05 var(--hue))',
          display: 'grid', placeItems: 'center',
          fontWeight: 600, fontSize: 12,
        }}>MS</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Mariana</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Veterinaria</div>
        </div>
      </div>
    </aside>
  );
}

// ─── Banner consulta activa (persistente) ───
function ConsultaBanner({ onResume, onDismiss }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 28px',
      background: 'linear-gradient(90deg, var(--amatista-50) 0%, var(--warm-50) 60%)',
      borderBottom: '1px solid var(--amatista-200)',
      fontSize: 13,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'var(--amatista-100)',
        display: 'grid', placeItems: 'center',
        color: 'var(--amatista-700)',
        animation: 'pawBeat 1.4s ease-in-out infinite',
      }}>
        <svg width="14" height="14" viewBox="0 0 64 64" fill="currentColor">
          <ellipse cx="20" cy="20" rx="6" ry="8"/><ellipse cx="44" cy="20" rx="6" ry="8"/>
          <ellipse cx="10" cy="34" rx="5.5" ry="7" transform="rotate(-25 10 34)"/>
          <ellipse cx="54" cy="34" rx="5.5" ry="7" transform="rotate(25 54 34)"/>
          <path d="M32 30 c-9 0-16 6-16 14 c0 6 5 10 10 10 c2 0 4-1 6-1 s4 1 6 1 c5 0 10-4 10-10 c0-8-7-14-16-14 z"/>
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warm-700)' }}>
        <span style={{ fontWeight: 500, color: 'var(--warm-900)' }}>Consulta en curso</span>
        <span style={{ color: 'var(--warm-400)' }}>·</span>
        <span>Luna · Carla Mendoza</span>
        <span style={{ color: 'var(--warm-400)' }}>·</span>
        <span style={{ color: 'var(--warm-500)' }}>iniciada hace 12 min</span>
      </div>
      <button onClick={onResume} style={{
        marginLeft: 'auto',
        padding: '6px 14px', fontSize: 12.5, fontWeight: 500,
        background: 'var(--amatista-700)', color: 'white',
        border: 'none', borderRadius: 7, cursor: 'pointer',
        fontFamily: 'inherit',
      }}>Volver a la consulta</button>
      <button onClick={onDismiss} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--warm-500)', display: 'grid', placeItems: 'center',
        padding: 4, borderRadius: 6,
      }}>
        <IconClose size={14} />
      </button>
    </div>
  );
}

Object.assign(window, { EmpleadosSidebar, ConsultaBanner });
