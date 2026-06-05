// Empleados — Drawer lateral de detalle con tabs, cambio de rol y toggle activo

function EmpleadoDrawer({ employee, onClose, onUpdate, onDeactivate, onDelete }) {
  const [tab, setTab] = React.useState('datos');
  const [roleEditOpen, setRoleEditOpen] = React.useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = React.useState(false);

  if (!employee) return null;
  const empRoles = employee.roles.map(rid => ROLES.find(r => r.id === rid)).filter(Boolean);
  const primary = empRoles[0] || ROLES[0];
  const c = ROLE_COLORS[primary.color];

  const tabBtn = (id, label) => ({
    padding: '10px 2px',
    fontSize: 13.5,
    background: 'transparent',
    border: 'none',
    borderBottom: tab === id ? '2px solid var(--amatista-700)' : '2px solid transparent',
    color: tab === id ? 'var(--warm-900)' : 'var(--warm-500)',
    fontWeight: tab === id ? 500 : 400,
    cursor: 'pointer', fontFamily: 'inherit',
    marginBottom: -1,
  });

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'oklch(20% 0.05 var(--hue) / 0.25)',
          animation: 'overlayIn .18s ease',
          zIndex: 5,
        }}
      />

      {/* Drawer */}
      <aside style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 480, background: 'var(--warm-50)',
        borderLeft: '1px solid var(--warm-200)',
        boxShadow: '-20px 0 60px -20px oklch(20% 0.05 var(--hue) / 0.2)',
        display: 'flex', flexDirection: 'column',
        animation: 'drawerIn .22s cubic-bezier(.2,.8,.2,1)',
        zIndex: 6,
        fontFamily: 'Geist, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 26px 18px',
          borderBottom: '1px solid var(--warm-200)',
          background: `linear-gradient(180deg, ${c.bg} 0%, var(--warm-50) 100%)`,
          position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--warm-50)', border: '1px solid var(--warm-200)',
            display: 'grid', placeItems: 'center',
            cursor: 'pointer', color: 'var(--warm-600)',
          }}>
            <IconClose size={15} />
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <Avatar initials={employee.initials} size={64} active={employee.active} roleColor={primary.color} />
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <h2 style={{
                margin: 0,
                fontFamily: 'Instrument Serif, serif',
                fontSize: 26, lineHeight: 1.1, fontWeight: 400, letterSpacing: '-0.01em',
                color: 'var(--warm-900)',
              }}>
                {employee.fullName}
              </h2>
              <div style={{ fontSize: 13, color: 'var(--warm-600)', marginTop: 4 }}>
                {employee.document}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {employee.roles.map(rid => <RolePill key={rid} roleId={rid} size="lg" />)}
                <StatusPill active={employee.active} size="lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 22,
          padding: '0 26px',
          borderBottom: '1px solid var(--warm-200)',
        }}>
          <button style={tabBtn('datos', 'Datos básicos')} onClick={() => setTab('datos')}>Datos básicos</button>
          <button style={tabBtn('rol', 'Rol')} onClick={() => setTab('rol')}>Rol</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '22px 26px 28px' }}>
          {tab === 'datos' && <TabDatos employee={employee} />}
          {tab === 'rol' && (
            <TabRol
              employee={employee}
              roleEditOpen={roleEditOpen}
              setRoleEditOpen={setRoleEditOpen}
              onChangeRoles={(newRoles) => {
                onUpdate(employee.id, { roles: newRoles });
                setRoleEditOpen(false);
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 26px',
          borderTop: '1px solid var(--warm-200)',
          background: 'var(--warm-100)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button style={ghostBtn}>
            <IconKey size={14} />
            Restablecer contraseña
          </button>
          <button style={ghostBtn}>
            <IconEdit size={14} />
            Editar
          </button>
          <div style={{ flex: 1 }} />
          {employee.active ? (
            <button onClick={() => setConfirmDeactivate(true)} style={dangerBtn}>
              <IconPower size={14} />
              Desactivar
            </button>
          ) : (
            <button onClick={() => onUpdate(employee.id, { active: true })} style={primaryBtn}>
              <IconCheck size={14} />
              Reactivar
            </button>
          )}
        </div>
      </aside>

      {/* Confirm deactivate dialog */}
      {confirmDeactivate && (
        <ConfirmDeactivate
          employee={employee}
          onCancel={() => setConfirmDeactivate(false)}
          onConfirm={() => {
            onDeactivate(employee.id);
            setConfirmDeactivate(false);
          }}
        />
      )}
    </>
  );
}

// ─── Tab: Datos básicos ───
function TabDatos({ employee }) {
  const fields = [
    { icon: IconMail, label: 'Correo', value: employee.email },
    { icon: IconPhone, label: 'Teléfono', value: employee.phone },
    { icon: IconCalendar, label: 'Fecha de ingreso', value: formatDate(employee.hireDate) },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {fields.map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 14,
          padding: '14px 0',
          borderBottom: i < fields.length - 1 ? '1px solid var(--warm-150)' : 'none',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--warm-100)', color: 'var(--warm-600)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <f.icon size={15} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: 'var(--warm-500)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 3 }}>
              {f.label}
            </div>
            <div style={{ fontSize: 14, color: 'var(--warm-900)' }}>{f.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Roles ───
function TabRol({ employee, roleEditOpen, setRoleEditOpen, onChangeRoles }) {
  const [draft, setDraft] = React.useState(employee.roles);

  React.useEffect(() => {
    if (roleEditOpen) setDraft(employee.roles);
  }, [roleEditOpen, employee.id]);

  const empRoles = employee.roles.map(rid => ROLES.find(r => r.id === rid)).filter(Boolean);

  if (roleEditOpen) {
    const toggle = (id) => {
      setDraft(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const dirty = draft.length !== employee.roles.length || draft.some(r => !employee.roles.includes(r));
    const valid = draft.length > 0;
    return (
      <div>
        <div style={{ fontSize: 13, color: 'var(--warm-600)', marginBottom: 14 }}>
          Selecciona uno o más roles para <strong style={{ color: 'var(--warm-900)' }}>{employee.fullName.split(' ')[0]}</strong>. Los permisos se acumulan.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ROLES.map(r => {
            const rc = ROLE_COLORS[r.color];
            const checked = draft.includes(r.id);
            return (
              <label key={r.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px',
                  background: checked ? rc.bg : 'var(--warm-50)',
                  border: checked ? `1.5px solid ${rc.dot}` : '1px solid var(--warm-200)',
                  borderRadius: 10, textAlign: 'left',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  marginTop: 1,
                  background: checked ? rc.dot : 'var(--warm-50)',
                  border: checked ? `1.5px solid ${rc.dot}` : '1.5px solid var(--warm-300)',
                  display: 'grid', placeItems: 'center',
                  color: 'white',
                }}>
                  {checked && <IconCheck size={12} strokeWidth={3} />}
                </div>
                <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => { e.preventDefault(); toggle(r.id); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--warm-900)' }}>{r.name}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--warm-600)', marginTop: 4, lineHeight: 1.45 }}>
                    {r.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        {!valid && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--red-fg)' }}>
            Debe tener al menos un rol asignado.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={() => setRoleEditOpen(false)} style={{
            padding: '8px 14px', fontSize: 13,
            background: 'transparent', color: 'var(--warm-600)',
            border: '1px solid var(--warm-200)', borderRadius: 7,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cancelar
          </button>
          <button
            disabled={!valid || !dirty}
            onClick={() => onChangeRoles(draft)}
            style={{
              padding: '8px 14px', fontSize: 13, fontWeight: 500,
              background: 'var(--amatista-700)', color: 'white',
              border: 'none', borderRadius: 7,
              cursor: valid && dirty ? 'pointer' : 'not-allowed',
              opacity: valid && dirty ? 1 : 0.45,
              fontFamily: 'inherit',
            }}>
            Guardar cambios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with edit action */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--warm-500)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Roles asignados
          </div>
          <div style={{ fontSize: 14, color: 'var(--warm-700)', marginTop: 4 }}>
            {empRoles.length} {empRoles.length === 1 ? 'rol' : 'roles'} · permisos acumulados
          </div>
        </div>
        <button onClick={() => setRoleEditOpen(true)} style={{
          padding: '7px 12px', fontSize: 12.5, fontWeight: 500,
          background: 'var(--warm-50)', color: 'var(--amatista-700)',
          border: '1px solid var(--amatista-300)', borderRadius: 7,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <IconEdit size={13} />
          Editar roles
        </button>
      </div>

      {/* Cards per role */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {empRoles.map(r => {
          const rc = ROLE_COLORS[r.color];
          return (
            <div key={r.id} style={{
              padding: '14px 16px',
              background: rc.bg,
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: 'var(--warm-50)', color: rc.fg,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <IconShield size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: rc.fg }}>{r.name}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Confirm deactivate ───
function ConfirmDeactivate({ employee, onCancel, onConfirm }) {
  return (
    <>
      <div onClick={onCancel} style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: 'oklch(15% 0.05 var(--hue) / 0.4)',
        animation: 'overlayIn .15s ease',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 11, width: 420,
        background: 'var(--warm-50)', borderRadius: 14,
        boxShadow: '0 20px 60px oklch(15% 0.05 var(--hue) / 0.25)',
        padding: '24px 26px',
        fontFamily: 'Geist, sans-serif',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--amber-bg)', color: 'var(--amber-fg)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <IconAlert size={18} />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontFamily: 'Instrument Serif, serif',
              fontSize: 22, fontWeight: 400, color: 'var(--warm-900)',
            }}>
              ¿Desactivar a {employee.fullName.split(' ')[0]}?
            </h3>
            <div style={{ fontSize: 13.5, color: 'var(--warm-600)', marginTop: 8, lineHeight: 1.5 }}>
              No podrá iniciar sesión hasta que vuelvas a activar su cuenta.
              Sus consultas y registros previos se mantienen intactos.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onCancel} style={ghostBtn}>Cancelar</button>
          <button onClick={onConfirm} style={dangerBtn}>
            <IconPower size={14} />
            Desactivar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Helpers ───
function formatDate(iso) {
  const d = new Date(iso);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const ghostBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 12px', fontSize: 13,
  background: 'var(--warm-50)', color: 'var(--warm-700)',
  border: '1px solid var(--warm-200)', borderRadius: 7,
  cursor: 'pointer', fontFamily: 'inherit',
};

const primaryBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', fontSize: 13, fontWeight: 500,
  background: 'var(--amatista-700)', color: 'white',
  border: 'none', borderRadius: 7,
  cursor: 'pointer', fontFamily: 'inherit',
};

const dangerBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', fontSize: 13, fontWeight: 500,
  background: 'var(--red-bg)', color: 'var(--red-fg)',
  border: `1px solid var(--red-fg)`, borderRadius: 7,
  cursor: 'pointer', fontFamily: 'inherit',
};

Object.assign(window, { EmpleadoDrawer });
