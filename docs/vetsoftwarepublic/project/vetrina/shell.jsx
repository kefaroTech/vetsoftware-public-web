/* global React, VetIcons, useVetRoute, useVetRouter, VetRouterLink, VET_MOCK_USER, useVetToast */

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

// ===== BranchSelector (multi-sede) =====
// Espejo de features/branches/components/BranchSelector.vue. Solo visible con ≥2 sedes.
const VET_MOCK_BRANCHES = [
  { value: '', label: 'Todas las sedes', hint: 'Vista consolidada' },
  { value: '1', label: 'Sede Principal', hint: 'Cra 12 # 34-56' },
  { value: '2', label: 'Sede Norte', hint: 'Calle 140 # 18-20' },
  { value: '3', label: 'Sede Chapinero', hint: 'Cra 7 # 63-11' },
];
function VetBranchSelector() {
  const [value, setValue] = React.useState('1');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const current = VET_MOCK_BRANCHES.find((b) => b.value === value) || VET_MOCK_BRANCHES[0];

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="vet-branch" ref={ref}>
      <span className="vet-branch-label">Sede</span>
      <button
        type="button"
        className={'vet-branch-trigger' + (open ? ' open' : '')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <VetIcons.MapPin size={14} strokeWidth={1.7} className="vet-branch-ic" />
        <span className="vet-branch-name">{current.label}</span>
        <VetIcons.ChevronDown size={13} strokeWidth={1.8} className="vet-branch-chev" />
      </button>
      {open && (
        <div className="vet-branch-menu" role="listbox">
          {VET_MOCK_BRANCHES.map((b) => (
            <button
              key={b.value}
              type="button"
              role="option"
              aria-selected={b.value === value}
              className={'vet-branch-opt' + (b.value === value ? ' active' : '')}
              onClick={() => { setValue(b.value); setOpen(false); }}
            >
              <span className="vet-branch-opttext">
                <span className="vet-branch-optname">{b.label}</span>
                <span className="vet-branch-opthint">{b.hint}</span>
              </span>
              {b.value === value && <VetIcons.Check size={13} strokeWidth={2.6} className="vet-branch-optcheck" />}
            </button>
          ))}
        </div>
      )}
    </div>
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
  const toast = useVetToast();

  const consultaSubRoutes = [
    'consulta-nueva', 'consulta-historial', 'consulta-historial-pet',
    'consulta-historial-detail', 'consulta-vacunacion', 'consulta-hospital',
  ];
  const isConsultaActive = consultaSubRoutes.includes(route.name);

  const accionesSubRoutes = [
    'acciones-laboratorio', 'acciones-imagen', 'acciones-vacunacion',
    'acciones-hospitalizacion', 'acciones-desparasitacion', 'acciones-cirugia',
    'acciones-spa',
  ];
  const isAccionesActive = accionesSubRoutes.includes(route.name);

  const tiendaSubRoutes = [
    'tienda-pos', 'tienda-inventario', 'tienda-servicios',
    'tienda-promociones', 'tienda-impuestos',
  ];
  const isTiendaActive = tiendaSubRoutes.includes(route.name);

  // Acordeón: solo un desplegable abierto a la vez (espejo de openSection en Vue).
  const initialSection = isConsultaActive ? 'consulta'
    : isAccionesActive ? 'acciones'
    : isTiendaActive ? 'tienda' : null;
  const [openSection, setOpenSection] = React.useState(initialSection);
  const toggleSection = (s) => setOpenSection((cur) => (cur === s ? null : s));

  React.useEffect(() => { if (isConsultaActive) setOpenSection('consulta'); }, [isConsultaActive]);
  React.useEffect(() => { if (isAccionesActive) setOpenSection('acciones'); }, [isAccionesActive]);
  React.useEffect(() => { if (isTiendaActive) setOpenSection('tienda'); }, [isTiendaActive]);

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

  const tiendaItems = [
    { label: 'Punto de venta', Icon: VetIcons.ShoppingBag,  name: 'tienda-pos' },
    { label: 'Inventario',     Icon: VetIcons.Package,      name: 'tienda-inventario' },
    { label: 'Servicios',      Icon: VetIcons.Stethoscope,  name: 'tienda-servicios' },
    { label: 'Promociones',    Icon: VetIcons.BadgePercent, name: 'tienda-promociones' },
    { label: 'Impuestos',      Icon: VetIcons.BarChart3,    name: 'tienda-impuestos' },
  ];

  return (
    <aside style={vetShellStyles.sidebar}>
      <VetSidebarBrand appName="Vetrina" clinic={VET_MOCK_USER.clinic} />
      <VetBranchSelector />

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
        expanded={openSection === 'consulta'}
        onClick={() => toggleSection('consulta')}
      />
      {openSection === 'consulta' && (
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
        expanded={openSection === 'acciones'}
        onClick={() => toggleSection('acciones')}
      />
      {openSection === 'acciones' && (
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
        Icon={VetIcons.FlaskConical}
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

      <div style={vetShellStyles.sectionLabel}>TIENDA</div>
      <VetSidebarNavItem
        label="Tienda"
        Icon={VetIcons.ShoppingBag}
        active={isTiendaActive}
        expandable
        expanded={openSection === 'tienda'}
        onClick={() => toggleSection('tienda')}
      />
      {openSection === 'tienda' && (
        <div style={vetShellStyles.subList}>
          {tiendaItems.map((item) => (
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

      <div style={vetShellStyles.sectionLabel}>FACTURACIÓN</div>
      <VetSidebarNavItem
        label="Cuentas abiertas"
        Icon={VetIcons.Wallet}
        active={route.name === 'cuentas'}
        onClick={() => router.push({ name: 'cuentas' })}
      />
      <VetSidebarNavItem
        label="Facturación electrónica"
        Icon={VetIcons.ShieldCheck}
        active={route.name === 'facturacion-habilitacion'}
        onClick={() => router.push({ name: 'facturacion-habilitacion' })}
      />
      <VetSidebarNavItem
        label="Documentos"
        Icon={VetIcons.FileText}
        active={route.name === 'facturacion-documentos'}
        onClick={() => router.push({ name: 'facturacion-documentos' })}
      />
      <VetSidebarNavItem
        label="Reportes"
        Icon={VetIcons.BarChart3}
        active={route.name === 'facturacion-reportes'}
        onClick={() => router.push({ name: 'facturacion-reportes' })}
      />

      <div style={vetShellStyles.sectionLabel}>ADMINISTRACIÓN</div>
      <VetSidebarNavItem
        label="Empresa"
        Icon={VetIcons.Building2}
        active={route.name === 'empresa'}
        onClick={() => router.push({ name: 'empresa' })}
      />
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
      <VetSidebarNavItem
        label="Medicamentos"
        Icon={VetIcons.Pill}
        active={route.name === 'medicamentos'}
        onClick={() => router.push({ name: 'medicamentos' })}
      />

      <div style={{ marginTop: 'auto' }} />

      <button
        type="button"
        className="vet-nav-item"
        style={{ position: 'relative' }}
        onClick={() => toast.info('Notificaciones', 'No tienes notificaciones nuevas.')}
      >
        <VetIcons.Bell size={17} strokeWidth={1.6} />
        <span style={{ flex: 1 }}>Notificaciones</span>
      </button>

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
      <div style={{ flex: 1 }} />
      <div style={vetShellStyles.topbarActions}>
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
  appContent: { flex: 1, padding: '18px 24px', overflow: 'auto' },
  appContentFullBleed: { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  sidebar: {
    width: 248,
    height: '100vh',
    flexShrink: 0,
    padding: '20px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    background: 'linear-gradient(180deg, oklch(28% 0.10 var(--hue)) 0%, oklch(22% 0.08 var(--hue)) 100%)',
    color: 'oklch(94% 0.02 var(--hue))',
    fontFamily: 'var(--font-sans)',
    overflowY: 'auto',
    overflowX: 'hidden',
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
    padding: '10px 10px 5px', fontWeight: 500,
  },
  subList: { display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 28, marginTop: 2 },
  userCard: {
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
