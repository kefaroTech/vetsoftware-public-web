// Empleados — Lista (tabla) con search, filtros y stats

const ROLE_COLORS = {
  amatista: { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)', dot: 'var(--amatista-600)' },
  green:    { bg: 'var(--green-bg)',    fg: 'var(--green-fg)',    dot: 'oklch(55% 0.16 150)' },
  blue:     { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)', dot: 'oklch(55% 0.16 240)' },
  amber:    { bg: 'var(--amber-bg)',    fg: 'var(--amber-fg)',    dot: 'oklch(65% 0.13 75)' },
  gray:     { bg: 'var(--warm-200)',    fg: 'var(--warm-700)',    dot: 'var(--warm-500)' },
};

function RolePill({ roleId, size = 'md' }) {
  const role = ROLES.find(r => r.id === roleId) || ROLES[ROLES.length - 1];
  const c = ROLE_COLORS[role.color];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: size === 'lg' ? '5px 12px' : '3px 10px',
      borderRadius: 999,
      background: c.bg, color: c.fg,
      fontSize: size === 'lg' ? 13 : 12, fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
      {role.name}
    </span>
  );
}

function StatusPill({ active, size = 'md' }) {
  const bg = active ? 'var(--green-bg)' : 'var(--warm-200)';
  const fg = active ? 'var(--green-fg)' : 'var(--warm-600)';
  const dot = active ? 'oklch(55% 0.16 150)' : 'var(--warm-500)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: size === 'lg' ? '5px 12px' : '3px 9px',
      borderRadius: 999,
      background: bg, color: fg,
      fontSize: size === 'lg' ? 13 : 12, fontWeight: 500,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function Avatar({ initials, size = 36, active = true, roleColor = 'amatista' }) {
  const c = ROLE_COLORS[roleColor] || ROLE_COLORS.amatista;
  return (
    <div style={{
      position: 'relative',
      width: size, height: size, borderRadius: '50%',
      background: active ? c.bg : 'var(--warm-200)',
      color: active ? c.fg : 'var(--warm-500)',
      display: 'grid', placeItems: 'center',
      fontWeight: 600, fontSize: size * 0.34,
      letterSpacing: '0.01em',
      flexShrink: 0,
    }}>
      {initials}
      {!active && (
        <span style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 11, height: 11, borderRadius: '50%',
          background: 'var(--warm-400)', border: '2px solid var(--warm-100)',
        }} />
      )}
    </div>
  );
}

Object.assign(window, { RolePill, StatusPill, Avatar, ROLE_COLORS });

// ─── Stats cards ───
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      flex: 1,
      padding: '16px 20px',
      background: 'var(--warm-50)',
      border: '1px solid var(--warm-200)',
      borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--warm-500)' }}>{label}</div>
      <div style={{
        fontFamily: 'Instrument Serif, serif',
        fontSize: 32, lineHeight: 1.05, color: accent ? 'var(--amatista-700)' : 'var(--warm-900)',
        fontWeight: 400,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--warm-500)' }}>{sub}</div>}
    </div>
  );
}

// ─── Lista principal ───
function EmpleadosList({ employees, selectedId, onSelect, onNewEmployee }) {
  const [query, setQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');

  const filtered = employees.filter(e => {
    if (roleFilter !== 'all' && e.role !== roleFilter) return false;
    if (statusFilter === 'active' && !e.active) return false;
    if (statusFilter === 'inactive' && e.active) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!e.fullName.toLowerCase().includes(q)
        && !e.document.toLowerCase().includes(q)
        && !e.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totals = {
    total: employees.length,
    active: employees.filter(e => e.active).length,
    vets: employees.filter(e => e.role === 'vet' && e.active).length,
    inactive: employees.filter(e => !e.active).length,
  };

  return (
    <div style={{ flex: 1, padding: '28px 40px 40px', overflow: 'auto', minWidth: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--warm-500)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Administración · Equipo
          </div>
          <h1 style={{
            margin: 0,
            fontFamily: 'Instrument Serif, serif',
            fontSize: 38, lineHeight: 1.05, fontWeight: 400, letterSpacing: '-0.015em',
            color: 'var(--warm-900)',
          }}>
            Empleados
          </h1>
          <div style={{ fontSize: 14, color: 'var(--warm-600)', marginTop: 6 }}>
            Gestiona el equipo de la clínica, sus roles y accesos.
          </div>
        </div>

        <button onClick={onNewEmployee} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', fontSize: 13.5, fontWeight: 500,
          background: 'linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)))',
          color: 'white', border: 'none', borderRadius: 9,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 1px 2px rgba(50,20,80,0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5)',
        }}>
          <IconPlus size={16} />
          Nuevo empleado
        </button>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: '10px 12px', marginBottom: 14,
        background: 'var(--warm-50)',
        border: '1px solid var(--warm-200)',
        borderRadius: 10,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', flex: 1,
          background: 'var(--warm-100)', borderRadius: 7,
        }}>
          <IconSearch size={15} style={{ color: 'var(--warm-500)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, documento o correo…"
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: 13.5, color: 'var(--warm-900)', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Tabla */}
      <div style={{
        background: 'var(--warm-50)',
        border: '1px solid var(--warm-200)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={tableHeader}>
          <div style={{ flex: '0 0 36px' }} />
          <div style={{ flex: 2, minWidth: 0 }}>Empleado</div>
          <div style={{ flex: 1.4, minWidth: 0 }}>Rol</div>
          <div style={{ flex: 1.6, minWidth: 0 }}>Contacto</div>
          <div style={{ flex: '0 0 100px' }}>Estado</div>
          <div style={{ flex: '0 0 28px' }} />
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--warm-500)', fontSize: 14 }}>
            No hay empleados que coincidan con los filtros.
          </div>
        )}

        {filtered.map((emp, i) => {
          const primaryRole = ROLES.find(r => r.id === emp.roles[0]) || ROLES[0];
          const isSelected = selectedId === emp.id;
          return (
            <div
              key={emp.id}
              onClick={() => onSelect(emp.id)}
              style={{
                ...tableRow,
                background: isSelected ? 'var(--amatista-50)' : i % 2 === 0 ? 'transparent' : 'oklch(98% 0.005 60)',
                borderLeft: isSelected ? '3px solid var(--amatista-600)' : '3px solid transparent',
                opacity: emp.active ? 1 : 0.7,
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--warm-100)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'oklch(98% 0.005 60)'; }}
            >
              <div style={{ flex: '0 0 36px' }}>
                <Avatar initials={emp.initials} size={36} active={emp.active} roleColor={primaryRole.color} />
              </div>
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--warm-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {emp.fullName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--warm-500)', marginTop: 2 }}>
                  {emp.document}
                </div>
              </div>
              <div style={{ flex: 1.4, minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {emp.roles.slice(0, 2).map(r => <RolePill key={r} roleId={r} />)}
                {emp.roles.length > 2 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 8px', borderRadius: 999,
                    background: 'var(--warm-200)', color: 'var(--warm-700)',
                    fontSize: 12, fontWeight: 500,
                  }}>+{emp.roles.length - 2}</span>
                )}
              </div>
              <div style={{ flex: 1.6, minWidth: 0, fontSize: 12.5, color: 'var(--warm-600)' }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</div>
                <div style={{ color: 'var(--warm-500)', marginTop: 2 }}>{emp.phone}</div>
              </div>
              <div style={{ flex: '0 0 100px' }}>
                <StatusPill active={emp.active} />
              </div>
              <div style={{ flex: '0 0 28px', display: 'grid', placeItems: 'center', color: 'var(--warm-400)' }}>
                <IconChevronRight size={16} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const selectStyle = {
  padding: '6px 10px', fontSize: 13,
  background: 'var(--warm-100)', color: 'var(--warm-800)',
  border: '1px solid var(--warm-200)', borderRadius: 7,
  cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
};

const tableHeader = {
  display: 'flex', alignItems: 'center', gap: 16,
  padding: '12px 18px',
  background: 'var(--warm-100)',
  borderBottom: '1px solid var(--warm-200)',
  fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--warm-500)', fontWeight: 500,
};

const tableRow = {
  display: 'flex', alignItems: 'center', gap: 16,
  padding: '12px 15px 12px 18px',
  borderBottom: '1px solid var(--warm-150)',
  cursor: 'pointer',
  transition: 'background .12s ease, border-color .12s ease',
};

Object.assign(window, { EmpleadosList });
