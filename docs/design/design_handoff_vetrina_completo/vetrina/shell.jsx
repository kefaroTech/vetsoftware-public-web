/* global React, VetIcons, useVetRoute, useVetRouter, VetRouterLink, VET_MOCK_USER */

// ===== SidebarBrand =====
function VetSidebarBrand({ appName, clinic }) {
  return (
    <div style={vetShellStyles.brand}>
      <div style={vetShellStyles.brandMark}>V</div>
      <div style={vetShellStyles.brandText}>
        <div style={vetShellStyles.brandName}>{appName}</div>
        <div style={vetShellStyles.brandClinic}>{clinic}</div>
      </div>
    </div>
  );
}

// ===== SidebarNavItem =====
function VetSidebarNavItem({ label, Icon, active, disabled, expandable, expanded, badge, onClick }) {
  const cls = ['vet-nav-item', active && 'active', disabled && 'disabled']
    .filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls}
      disabled={disabled}
      onClick={() => !disabled && onClick?.()}
    >
      <Icon size={17} strokeWidth={1.5} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span className="vet-nav-badge">{badge}</span>}
      {!badge && expandable && (
        <VetIcons.ChevronDown
          size={14}
          strokeWidth={1.5}
          style={{
            transition: 'transform 0.2s ease',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      )}
    </button>
  );
}

// ===== SidebarSubItem =====
function VetSidebarSubItem({ label, Icon, to, active }) {
  return (
    <VetRouterLink
      to={to}
      className={'vet-sub-item' + (active ? ' active' : '')}
    >
      <Icon size={14} strokeWidth={1.5} />
      <span>{label}</span>
    </VetRouterLink>
  );
}

// ===== SidebarUserCard =====
function VetSidebarUserCard({ firstName, lastName, role }) {
  const initials = (firstName[0] + lastName[0]).toUpperCase();
  return (
    <button type="button" style={vetShellStyles.userCard} className="vet-user-card">
      <div style={vetShellStyles.userAvatar}>{initials}</div>
      <div style={vetShellStyles.userInfo}>
        <div style={vetShellStyles.userName}>{firstName} {lastName}</div>
        <div style={vetShellStyles.userRole}>{role}</div>
      </div>
      <VetIcons.ChevronRight size={14} strokeWidth={1.5} style={{ opacity: 0.5, flexShrink: 0 }} />
    </button>
  );
}

// ===== AppSidebar =====
function VetAppSidebar() {
  const route = useVetRoute();
  const router = useVetRouter();

  const consultaSubRoutes = [
    'consulta-nueva', 'consulta-historial', 'consulta-historial-pet',
    'consulta-historial-detail', 'consulta-vacunacion', 'consulta-hospital',
  ];
  const isConsultaActive = consultaSubRoutes.includes(route.name);

  const accionesSubRoutes = [
    'acciones-laboratorio', 'acciones-imagen', 'acciones-vacunacion',
    'acciones-hospitalizacion', 'acciones-desparasitacion', 'acciones-cirugia',
  ];
  const isAccionesActive = accionesSubRoutes.includes(route.name);

  const [consultaOpen, setConsultaOpen] = React.useState(isConsultaActive);
  const [accionesOpen, setAccionesOpen] = React.useState(isAccionesActive);

  React.useEffect(() => { if (isConsultaActive) setConsultaOpen(true); }, [isConsultaActive]);
  React.useEffect(() => { if (isAccionesActive) setAccionesOpen(true); }, [isAccionesActive]);

  const historialActiveRoutes = ['consulta-historial', 'consulta-historial-pet', 'consulta-historial-detail'];

  const accionesItems = [
    { label: 'Laboratorio',         Icon: VetIcons.Beaker,    name: 'acciones-laboratorio' },
    { label: 'Imagen diagnóstica',  Icon: VetIcons.ScanLine,  name: 'acciones-imagen' },
    { label: 'Vacunación',          Icon: VetIcons.Syringe,   name: 'acciones-vacunacion' },
    { label: 'Hospitalización',     Icon: VetIcons.BedDouble, name: 'acciones-hospitalizacion' },
    { label: 'Desparasitación',     Icon: VetIcons.Bug,       name: 'acciones-desparasitacion' },
    { label: 'Cirugía',             Icon: VetIcons.Scissors,  name: 'acciones-cirugia' },
    { label: 'Spa',                 Icon: VetIcons.Sparkles,  name: 'acciones-spa' },
  ];

  const upcomingItems = [
    { label: 'Pacientes',   Icon: VetIcons.User },
    { label: 'Inventario',  Icon: VetIcons.Package },
    { label: 'Facturación', Icon: VetIcons.Receipt },
    { label: 'Reportes',    Icon: VetIcons.BarChart3 },
  ];

  return (
    <aside style={vetShellStyles.sidebar}>
      <VetSidebarBrand appName="Vetrina" clinic={VET_MOCK_USER.clinic} />

      <div style={vetShellStyles.sectionLabel}>TRABAJO</div>
      <VetSidebarNavItem
        label="Agenda"
        Icon={VetIcons.Calendar}
        active={route.name === 'agenda'}
        onClick={() => router.push({ name: 'agenda' })}
      />
      <VetSidebarNavItem
        label="Consulta"
        Icon={VetIcons.FileText}
        active={isConsultaActive}
        expandable
        expanded={consultaOpen}
        onClick={() => setConsultaOpen((v) => !v)}
      />
      {consultaOpen && (
        <div style={vetShellStyles.subList}>
          <button
            type="button"
            className={'vet-sub-item-btn' + (route.name === 'consulta-nueva' ? ' active' : '')}
            onClick={() => router.push({ name: 'consulta-nueva' })}
          >
            <VetIcons.FilePlus size={14} strokeWidth={1.5} />
            <span>Nueva consulta</span>
          </button>
          <VetSidebarSubItem
            label="Historial clínico"
            Icon={VetIcons.History}
            to={{ name: 'consulta-historial' }}
            active={historialActiveRoutes.includes(route.name)}
          />
        </div>
      )}

      <div style={vetShellStyles.sectionLabel}>ACCIONES CLÍNICAS</div>
      <VetSidebarNavItem
        label="Procedimientos"
        Icon={VetIcons.Stethoscope}
        active={isAccionesActive}
        expandable
        expanded={accionesOpen}
        onClick={() => setAccionesOpen((v) => !v)}
      />
      {accionesOpen && (
        <div style={vetShellStyles.subList}>
          {accionesItems.map((item) => (
            <VetSidebarSubItem
              key={item.name}
              label={item.label}
              Icon={item.Icon}
              to={{ name: item.name }}
              active={route.name === item.name}
            />
          ))}
        </div>
      )}

      <div style={vetShellStyles.sectionLabel}>LABORATORIO</div>
      <VetSidebarNavItem
        label="Bandeja de muestras"
        Icon={VetIcons.Beaker}
        active={route.name === 'laboratorio-interno'}
        onClick={() => router.push({ name: 'laboratorio-interno' })}
      />

      <div style={vetShellStyles.sectionLabel}>HOSPITALIZACIÓN</div>
      <VetSidebarNavItem
        label="Pacientes internados"
        Icon={VetIcons.BedDouble}
        active={route.name === 'hospital-ward'}
        onClick={() => router.push({ name: 'hospital-ward' })}
      />

      <div style={vetShellStyles.sectionLabel}>ADMINISTRACIÓN</div>
      <VetSidebarNavItem
        label="Empleados"
        Icon={VetIcons.Users}
        active={route.name === 'empleados'}
        onClick={() => router.push({ name: 'empleados' })}
      />
      <VetSidebarNavItem
        label="Roles y permisos"
        Icon={VetIcons.ShieldCheck}
        active={route.name === 'roles'}
        onClick={() => router.push({ name: 'roles' })}
      />

      <div style={vetShellStyles.sectionLabel}>PRÓXIMAMENTE</div>
      {upcomingItems.map((item) => (
        <VetSidebarNavItem
          key={item.label}
          label={item.label}
          Icon={item.Icon}
          disabled
          badge="Pronto"
        />
      ))}

      <VetSidebarUserCard
        firstName={VET_MOCK_USER.firstName}
        lastName={VET_MOCK_USER.lastName}
        role={VET_MOCK_USER.role}
      />
    </aside>
  );
}

// ===== AppTopbar =====
function VetAppTopbar() {
  return (
    <header style={vetShellStyles.topbar}>
      <VetSearchBox />
      <div style={vetShellStyles.topbarActions}>
        <button type="button" style={vetShellStyles.iconBtn} aria-label="Notificaciones" className="vet-icon-btn">
          <VetIcons.Bell size={16} strokeWidth={1.5} />
        </button>
        <button type="button" style={vetShellStyles.iconBtn} aria-label="Ajustes" className="vet-icon-btn">
          <VetIcons.Settings size={16} strokeWidth={1.5} />
        </button>
        <div style={vetShellStyles.topbarDivider} />
        <VetUserMenu firstName={VET_MOCK_USER.firstName} lastName={VET_MOCK_USER.lastName} />
      </div>
    </header>
  );
}

function VetSearchBox() {
  return (
    <div style={vetShellStyles.searchBox}>
      <VetIcons.Search size={15} strokeWidth={1.5} style={{ color: 'var(--warm-500)' }} />
      <input
        type="search"
        placeholder="Buscar paciente, dueño, consulta..."
        style={vetShellStyles.searchInput}
      />
      <kbd style={vetShellStyles.searchKbd}>⌘K</kbd>
    </div>
  );
}

function VetUserMenu({ firstName, lastName }) {
  const initials = (firstName[0] + lastName[0]).toUpperCase();
  return (
    <button type="button" style={vetShellStyles.userMenu} className="vet-user-menu">
      <div style={vetShellStyles.userMenuAvatar}>{initials}</div>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--warm-800)' }}>{firstName}</span>
      <VetIcons.ChevronDown size={13} strokeWidth={1.5} style={{ color: 'var(--warm-500)' }} />
    </button>
  );
}

// ===== AppLayout =====
function VetAppLayout({ children }) {
  const route = useVetRoute();
  const fullBleed = Boolean(route?.meta?.fullBleed);
  const hideTopbar = Boolean(route?.meta?.hideTopbar);
  return (
    <div style={vetShellStyles.appShell}>
      <VetAppSidebar />
      <div style={vetShellStyles.appMain}>
        {!hideTopbar && <VetAppTopbar />}
        <main
          style={{
            ...vetShellStyles.appContent,
            ...(fullBleed ? vetShellStyles.appContentFullBleed : {}),
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

// ===== Styles =====
const vetShellStyles = {
  appShell: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    background: 'var(--warm-100)',
    color: 'var(--warm-900)',
    fontFamily: 'var(--font-sans)',
    overflow: 'hidden',
  },
  appMain: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  appContent: { flex: 1, padding: '36px 48px', overflow: 'auto' },
  appContentFullBleed: { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  sidebar: {
    width: 248,
    height: '100vh',
    flexShrink: 0,
    padding: '20px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    background: 'linear-gradient(180deg, oklch(28% 0.10 var(--hue)) 0%, oklch(22% 0.08 var(--hue)) 100%)',
    color: 'oklch(94% 0.02 var(--hue))',
    fontFamily: 'var(--font-sans)',
    overflow: 'hidden',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px 22px' },
  brandMark: {
    width: 30, height: 30, borderRadius: 8,
    background: 'oklch(72% 0.16 var(--hue))',
    color: 'oklch(20% 0.05 var(--hue))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 700, fontSize: 15,
  },
  brandText: { display: 'flex', flexDirection: 'column', lineHeight: 1.1 },
  brandName: { fontSize: 14, fontWeight: 500, color: 'oklch(96% 0.02 var(--hue))' },
  brandClinic: { fontSize: 11.5, color: 'oklch(80% 0.04 var(--hue) / 0.7)', marginTop: 2 },
  sectionLabel: {
    fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'oklch(75% 0.04 var(--hue) / 0.55)',
    padding: '14px 10px 8px', fontWeight: 500,
  },
  subList: { display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 28, marginTop: 2 },
  userCard: {
    marginTop: 'auto',
    display: 'flex', alignItems: 'center', gap: 10,
    padding: 10, border: 'none', borderRadius: 10,
    background: 'oklch(35% 0.10 var(--hue) / 0.4)',
    color: 'oklch(94% 0.02 var(--hue))',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
  },
  userAvatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))',
    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600, flexShrink: 0,
  },
  userInfo: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  userName: { fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { fontSize: 11, opacity: 0.6, marginTop: 1 },
  topbar: {
    height: 60, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 16,
    background: 'var(--warm-50)', borderBottom: '1px solid var(--warm-200)', flexShrink: 0,
  },
  topbarActions: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, border: '1px solid var(--warm-200)',
    background: 'var(--warm-50)', color: 'var(--warm-600)', cursor: 'pointer',
  },
  topbarDivider: { width: 1, height: 22, background: 'var(--warm-200)', margin: '0 4px' },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 9,
    width: 340, padding: '8px 12px',
    background: 'var(--warm-50)', border: '1px solid var(--warm-200)',
    borderRadius: 8,
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    fontFamily: 'inherit', fontSize: 13, color: 'var(--warm-800)',
  },
  searchKbd: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    padding: '2px 6px', borderRadius: 4,
    background: 'var(--warm-150)', color: 'var(--warm-600)',
    border: '1px solid var(--warm-200)',
  },
  userMenu: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px 6px 6px',
    background: 'var(--warm-50)', border: '1px solid var(--warm-200)',
    borderRadius: 8, cursor: 'pointer',
  },
  userMenuAvatar: {
    width: 24, height: 24, borderRadius: '50%',
    background: 'linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))',
    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10.5, fontWeight: 600,
  },
};

Object.assign(window, {
  VetAppLayout, VetAppSidebar, VetAppTopbar,
});
