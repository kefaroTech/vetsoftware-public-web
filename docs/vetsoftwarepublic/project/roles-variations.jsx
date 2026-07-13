// 4 variaciones de layout para gestión de roles
// Comparten datos y filosofía visual, cambian el shell de la página.

const { useState, useMemo } = React;

// ─── primitives ─────────────────────────────────────────────────────
function RolePill({ role, size = 'md' }) {
  const c = ROLE_COLORS[role.color] || ROLE_COLORS.gray;
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

function StatusPill({ active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 999,
      background: active ? 'oklch(94% 0.06 150)' : 'var(--warm-200)',
      color: active ? 'oklch(40% 0.13 150)' : 'var(--warm-600)',
      fontSize: 11, fontWeight: 500,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%',
        background: active ? 'oklch(55% 0.16 150)' : 'var(--warm-500)' }} />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11.5, color: 'var(--warm-500)',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      fontWeight: 500, marginBottom: 8,
    }}>{children}</div>
  );
}

// Permission group (used by sub-module accordion / display)
function PermissionGroup({ subModule, permissions, allPermsOfSubModule, selectedIds, onToggle, readOnly }) {
  const total = allPermsOfSubModule.length;
  const granted = permissions.length;
  const all = granted === total;
  const some = granted > 0 && granted < total;

  return (
    <div style={{
      border: '1px solid var(--warm-200)',
      borderRadius: 10, background: 'var(--warm-50)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: granted > 0 ? 'var(--amatista-50)' : 'var(--warm-50)',
        borderBottom: '1px solid var(--warm-200)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--warm-900)' }}>
            {subModule.name}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--warm-500)', marginTop: 2 }}>
            {granted} de {total} {granted === 1 ? 'permiso' : 'permisos'}
          </div>
        </div>
        {!readOnly && (
          <button onClick={() => {
            if (all) allPermsOfSubModule.forEach(p => onToggle(p.id, false));
            else allPermsOfSubModule.forEach(p => onToggle(p.id, true));
          }} style={{
            padding: '5px 10px', fontSize: 11.5,
            background: 'var(--warm-50)', color: 'var(--amatista-700)',
            border: '1px solid var(--warm-200)', borderRadius: 6,
            fontFamily: 'inherit', cursor: 'pointer',
          }}>
            {all ? 'Quitar todos' : 'Seleccionar todos'}
          </button>
        )}
      </div>
      <div style={{ padding: '8px 14px 12px' }}>
        {allPermsOfSubModule.map((p, i) => {
          const checked = selectedIds.includes(p.id);
          return (
            <label key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 0',
              borderBottom: i < allPermsOfSubModule.length - 1 ? '1px solid var(--warm-150)' : 'none',
              cursor: readOnly ? 'default' : 'pointer',
            }}>
              {!readOnly && (
                <input type="checkbox" checked={checked}
                  onChange={() => onToggle(p.id, !checked)}
                  style={{ accentColor: 'var(--amatista-600)', width: 14, height: 14, cursor: 'pointer' }} />
              )}
              {readOnly && (
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  background: checked ? 'var(--amatista-600)' : 'var(--warm-200)',
                  display: 'grid', placeItems: 'center', color: 'white',
                  fontSize: 10,
                }}>{checked ? '✓' : ''}</span>
              )}
              <span style={{
                fontSize: 13,
                color: checked ? 'var(--warm-900)' : 'var(--warm-600)',
              }}>
                {p.name}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── VARIATION A · List + Drawer (espejo Empleados) ─────────────────
function VariationA() {
  const [selectedId, setSelectedId] = useState(2);
  const [editing, setEditing] = useState(false);
  const selected = ROLES_DATA.find(r => r.id === selectedId);
  return (
    <Shell title="A · Lista + Drawer">
      <RolesTable
        roles={ROLES_DATA}
        selectedId={selectedId}
        onSelect={(id) => { setSelectedId(id); setEditing(false); }}
      />
      {selected && (
        <RoleDrawer
          role={selected}
          editing={editing}
          onEdit={() => setEditing(true)}
          onCancelEdit={() => setEditing(false)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </Shell>
  );
}

// ─── VARIATION B · Master-Detail siempre visible ────────────────────
function VariationB() {
  const [selectedId, setSelectedId] = useState(2);
  const selected = ROLES_DATA.find(r => r.id === selectedId);
  return (
    <Shell title="B · Master-Detail">
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside style={{
          width: 320, flexShrink: 0,
          borderRight: '1px solid var(--warm-200)',
          background: 'var(--warm-50)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--warm-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <h1 style={titleStyle}>Roles</h1>
              <div style={{ fontSize: 12.5, color: 'var(--warm-500)', marginTop: 2 }}>
                {ROLES_DATA.length} configurados
              </div>
            </div>
            <button style={primaryBtn}>+ Nuevo</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
            {ROLES_DATA.map(r => {
              const c = ROLE_COLORS[r.color];
              const isSel = r.id === selectedId;
              return (
                <button key={r.id} onClick={() => setSelectedId(r.id)} style={{
                  width: '100%', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', marginBottom: 4,
                  borderRadius: 8,
                  background: isSel ? c.bg : 'transparent',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  opacity: r.active ? 1 : 0.6,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: isSel ? 500 : 400, color: 'var(--warm-900)' }}>{r.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--warm-500)', marginTop: 2 }}>
                      {r.permissionIds.length} permisos
                    </div>
                  </div>
                  {!r.active && <StatusPill active={false} />}
                </button>
              );
            })}
          </div>
        </aside>
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px', minWidth: 0 }}>
          {selected ? <RoleDetail role={selected} /> : null}
        </main>
      </div>
    </Shell>
  );
}

// ─── VARIATION C · Grid de tarjetas ────────────────────────────────
function VariationC() {
  return (
    <Shell title="C · Tarjetas en grid">
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <SectionLabel>Administración · Acceso</SectionLabel>
            <h1 style={titleStyle}>Roles y permisos</h1>
            <div style={{ fontSize: 13.5, color: 'var(--warm-600)', marginTop: 6 }}>
              Define qué puede hacer cada rol en la clínica.
            </div>
          </div>
          <button style={primaryBtnLg}>+ Crear rol</button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}>
          {ROLES_DATA.map(r => <RoleCard key={r.id} role={r} />)}

          <button style={{
            border: '1.5px dashed var(--warm-300)',
            borderRadius: 14,
            padding: 24,
            background: 'transparent',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10, minHeight: 200,
            color: 'var(--warm-500)', fontFamily: 'inherit', cursor: 'pointer',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--amatista-100)', color: 'var(--amatista-700)',
              display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 300,
            }}>+</div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--warm-700)' }}>Crear nuevo rol</div>
          </button>
        </div>
      </div>
    </Shell>
  );
}

function RoleCard({ role }) {
  const c = ROLE_COLORS[role.color];
  const subMods = subModulesUsed(role.permissionIds);
  return (
    <div style={{
      border: '1px solid var(--warm-200)',
      borderRadius: 14,
      background: 'var(--warm-50)',
      padding: 18,
      display: 'flex', flexDirection: 'column', gap: 12,
      opacity: role.active ? 1 : 0.7,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            background: c.bg, color: c.fg,
            display: 'grid', placeItems: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--warm-900)' }}>{role.name}</div>
            <StatusPill active={role.active} />
          </div>
        </div>
        <button style={iconBtn}>⋯</button>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--warm-600)' }}>
        <span style={{ color: 'var(--warm-900)', fontWeight: 500 }}>{role.permissionIds.length}</span> permisos
        en <span style={{ color: 'var(--warm-900)', fontWeight: 500 }}>{subMods.length}</span> sub-módulos
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {subMods.slice(0, 3).map(smid => {
          const sm = SUB_MODULES.find(x => x.id === smid);
          return (
            <span key={smid} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 6,
              background: 'var(--warm-150)', color: 'var(--warm-700)',
            }}>{sm?.name}</span>
          );
        })}
        {subMods.length > 3 && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 6,
            background: 'var(--warm-200)', color: 'var(--warm-700)', fontWeight: 500,
          }}>+{subMods.length - 3}</span>
        )}
      </div>
      <button style={{ ...ghostBtn, marginTop: 4, alignSelf: 'flex-start' }}>Editar permisos →</button>
    </div>
  );
}

// ─── VARIATION D · Matriz roles × permisos ──────────────────────────
function VariationD() {
  const subs = SUB_MODULES.slice(0, 6);
  const perms = PERMISSIONS.filter(p => subs.some(s => s.id === p.subModuleId));
  return (
    <Shell title="D · Matriz roles × permisos">
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <SectionLabel>Administración · Acceso</SectionLabel>
            <h1 style={titleStyle}>Matriz de permisos</h1>
            <div style={{ fontSize: 13.5, color: 'var(--warm-600)', marginTop: 6 }}>
              Vista comparativa de todos los roles. Edita celdas para asignar permisos.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={ghostBtn}>Exportar</button>
            <button style={primaryBtn}>+ Nuevo rol</button>
          </div>
        </div>

        <div style={{
          border: '1px solid var(--warm-200)',
          borderRadius: 12,
          background: 'var(--warm-50)',
          overflow: 'auto',
        }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--warm-100)' }}>
                <th style={{ ...thSticky, textAlign: 'left' }}>Permiso</th>
                {ROLES_DATA.map(r => {
                  const c = ROLE_COLORS[r.color];
                  return (
                    <th key={r.id} style={{
                      padding: '14px 12px',
                      borderBottom: '1px solid var(--warm-200)',
                      minWidth: 120, textAlign: 'center',
                      fontWeight: 500,
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: c.dot,
                        }} />
                        <span style={{ fontSize: 12.5, color: 'var(--warm-900)' }}>{r.name}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--warm-500)' }}>
                          {r.permissionIds.length} permisos
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {subs.map(sub => {
                const subPerms = perms.filter(p => p.subModuleId === sub.id);
                return (
                  <React.Fragment key={sub.id}>
                    <tr>
                      <td colSpan={ROLES_DATA.length + 1} style={{
                        padding: '10px 16px',
                        background: 'var(--amatista-50)',
                        fontSize: 11.5, fontWeight: 500,
                        color: 'var(--amatista-700)',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>
                        {sub.name}
                      </td>
                    </tr>
                    {subPerms.map((p, i) => (
                      <tr key={p.id} style={{
                        background: i % 2 === 0 ? 'var(--warm-50)' : 'oklch(98.5% 0.005 60)',
                      }}>
                        <td style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--warm-150)',
                          color: 'var(--warm-800)',
                        }}>{p.name}</td>
                        {ROLES_DATA.map(r => {
                          const has = r.permissionIds.includes(p.id);
                          return (
                            <td key={r.id} style={{
                              padding: 0,
                              borderBottom: '1px solid var(--warm-150)',
                              textAlign: 'center',
                            }}>
                              <button style={{
                                width: '100%', height: 38,
                                background: has ? 'var(--amatista-100)' : 'transparent',
                                border: 'none', cursor: 'pointer',
                                color: has ? 'var(--amatista-700)' : 'var(--warm-300)',
                                fontFamily: 'inherit',
                              }}>
                                {has ? '✓' : '·'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--warm-500)' }}>
          Mostrando los primeros {subs.length} sub-módulos · Tip: scroll horizontal para ver todos los roles.
        </div>
      </div>
    </Shell>
  );
}

// ─── Tabla (compartida por A) ───────────────────────────────────────
function RolesTable({ roles, selectedId, onSelect }) {
  const [query, setQuery] = useState('');
  const filtered = roles.filter(r => !query || r.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={{ flex: 1, padding: '28px 40px', overflow: 'auto', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <SectionLabel>Administración · Acceso</SectionLabel>
          <h1 style={titleStyle}>Roles y permisos</h1>
          <div style={{ fontSize: 13.5, color: 'var(--warm-600)', marginTop: 6 }}>
            Configura los accesos del equipo.
          </div>
        </div>
        <button style={primaryBtnLg}>+ Crear rol</button>
      </div>

      <div style={{
        padding: '10px 12px', marginBottom: 14,
        background: 'var(--warm-50)', border: '1px solid var(--warm-200)',
        borderRadius: 10,
      }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar rol por nombre…"
          style={{
            width: '100%', border: 'none', outline: 'none',
            background: 'var(--warm-100)', borderRadius: 7,
            padding: '7px 12px', fontSize: 13.5, fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ background: 'var(--warm-50)', border: '1px solid var(--warm-200)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={tableHead}>
          <div style={{ flex: 2 }}>Rol</div>
          <div style={{ flex: 1 }}>Permisos</div>
          <div style={{ flex: 1 }}>Sub-módulos</div>
          <div style={{ flex: '0 0 100px' }}>Estado</div>
          <div style={{ flex: '0 0 28px' }} />
        </div>
        {filtered.map((r, i) => {
          const c = ROLE_COLORS[r.color];
          const isSel = r.id === selectedId;
          const subs = subModulesUsed(r.permissionIds);
          return (
            <div key={r.id} onClick={() => onSelect(r.id)} style={{
              ...tableRow,
              background: isSel ? 'var(--amatista-50)' : i % 2 === 0 ? 'transparent' : 'oklch(98% 0.005 60)',
              borderLeft: isSel ? '3px solid var(--amatista-600)' : '3px solid transparent',
              opacity: r.active ? 1 : 0.6,
            }}>
              <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: c.bg, color: c.fg,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </span>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--warm-900)' }}>{r.name}</div>
              </div>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--warm-700)' }}>{r.permissionIds.length}</div>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--warm-700)' }}>{subs.length}</div>
              <div style={{ flex: '0 0 100px' }}><StatusPill active={r.active} /></div>
              <div style={{ flex: '0 0 28px', color: 'var(--warm-400)' }}>›</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Drawer (Variación A) ───────────────────────────────────────────
function RoleDrawer({ role, editing, onEdit, onCancelEdit, onClose }) {
  const c = ROLE_COLORS[role.color];
  const [draftPerms, setDraftPerms] = useState(role.permissionIds);
  React.useEffect(() => { setDraftPerms(role.permissionIds); }, [role.id, editing]);
  const toggle = (id, val) => {
    setDraftPerms(prev => val ? [...new Set([...prev, id])] : prev.filter(x => x !== id));
  };
  const subs = subModulesUsed(editing ? draftPerms : role.permissionIds);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'oklch(20% 0.05 var(--hue) / 0.25)', zIndex: 5,
      }} />
      <aside style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 540, background: 'var(--warm-50)',
        borderLeft: '1px solid var(--warm-200)',
        boxShadow: '-20px 0 60px -20px oklch(20% 0.05 var(--hue) / 0.2)',
        display: 'flex', flexDirection: 'column', zIndex: 6,
      }}>
        <div style={{
          padding: '22px 26px 18px',
          borderBottom: '1px solid var(--warm-200)',
          background: `linear-gradient(180deg, ${c.bg} 0%, var(--warm-50) 100%)`,
          position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--warm-50)', border: '1px solid var(--warm-200)',
            cursor: 'pointer',
          }}>×</button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={{
              width: 56, height: 56, borderRadius: 14,
              background: c.bg, color: c.fg,
              display: 'grid', placeItems: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <div style={{ flex: 1 }}>
              <h2 style={{ ...titleStyle, fontSize: 24, margin: 0 }}>{role.name}</h2>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <RolePill role={role} size="lg" />
                <StatusPill active={role.active} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionLabel>{editing ? 'Editar permisos' : 'Permisos asignados'}</SectionLabel>
            {!editing && (
              <button onClick={onEdit} style={ghostBtn}>Editar permisos</button>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--warm-600)', marginBottom: 14 }}>
            {(editing ? draftPerms : role.permissionIds).length} permisos en {subs.length} sub-módulos
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SUB_MODULES
              .filter(sm => editing || subModulesUsed(role.permissionIds).includes(sm.id))
              .map(sm => {
                const allPerms = PERMISSIONS.filter(p => p.subModuleId === sm.id);
                const granted = allPerms.filter(p => (editing ? draftPerms : role.permissionIds).includes(p.id));
                if (!editing && granted.length === 0) return null;
                return (
                  <PermissionGroup
                    key={sm.id}
                    subModule={sm}
                    permissions={granted}
                    allPermsOfSubModule={allPerms}
                    selectedIds={editing ? draftPerms : role.permissionIds}
                    onToggle={toggle}
                    readOnly={!editing}
                  />
                );
              })}
          </div>
        </div>

        {editing && (
          <div style={{
            padding: '12px 26px',
            borderTop: '1px solid var(--warm-200)',
            background: 'var(--warm-100)',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            <button onClick={onCancelEdit} style={ghostBtn}>Cancelar</button>
            <button onClick={onCancelEdit} style={primaryBtn}>Guardar cambios</button>
          </div>
        )}
      </aside>
    </>
  );
}

// ─── Detalle inline (Variación B) ───────────────────────────────────
function RoleDetail({ role }) {
  const c = ROLE_COLORS[role.color];
  const subs = subModulesUsed(role.permissionIds);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <span style={{
          width: 48, height: 48, borderRadius: 12,
          background: c.bg, color: c.fg,
          display: 'grid', placeItems: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </span>
        <div style={{ flex: 1 }}>
          <h2 style={{ ...titleStyle, margin: 0, fontSize: 28 }}>{role.name}</h2>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <RolePill role={role} size="lg" />
            <StatusPill active={role.active} />
          </div>
        </div>
        <button style={ghostBtn}>Más acciones</button>
        <button style={primaryBtn}>Editar permisos</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <StatCard label="Permisos" value={role.permissionIds.length} />
        <StatCard label="Sub-módulos" value={subs.length} />
        <StatCard label="Estado" value={role.active ? 'Activo' : 'Inactivo'} />
      </div>

      <SectionLabel>Permisos asignados</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SUB_MODULES.filter(sm => subs.includes(sm.id)).map(sm => {
          const allPerms = PERMISSIONS.filter(p => p.subModuleId === sm.id);
          const granted = allPerms.filter(p => role.permissionIds.includes(p.id));
          return (
            <PermissionGroup
              key={sm.id}
              subModule={sm}
              permissions={granted}
              allPermsOfSubModule={allPerms}
              selectedIds={role.permissionIds}
              onToggle={() => {}}
              readOnly
            />
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      flex: 1, padding: '14px 18px',
      background: 'var(--warm-50)',
      border: '1px solid var(--warm-200)',
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 11.5, color: 'var(--warm-500)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, color: 'var(--warm-900)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

// ─── Shell común con sidebar (versión simplificada) ─────────────────
function Shell({ title, children }) {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--warm-100)', color: 'var(--warm-900)',
      fontFamily: 'Geist, sans-serif', overflow: 'hidden',
    }}>
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'linear-gradient(180deg, oklch(28% 0.10 var(--hue)) 0%, oklch(22% 0.08 var(--hue)) 100%)',
        color: 'oklch(94% 0.02 var(--hue))',
        padding: '18px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 18px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'oklch(72% 0.16 var(--hue))', color: 'oklch(20% 0.05 var(--hue))',
            display: 'grid', placeItems: 'center', fontWeight: 700,
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
          }}>V</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Vetrina</div>
        </div>
        <div style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55, padding: '10px 10px 6px' }}>
          Administración
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ padding: '8px 10px', fontSize: 13, opacity: 0.7, cursor: 'pointer' }}>Empleados</div>
          <div style={{
            padding: '8px 10px', fontSize: 13, borderRadius: 7,
            background: 'oklch(45% 0.16 var(--hue) / 0.4)', fontWeight: 500,
            boxShadow: '0 0 0 1px oklch(70% 0.14 var(--hue) / 0.3) inset',
          }}>Roles y permisos</div>
        </div>
        <div style={{
          position: 'fixed', bottom: 16, left: 16,
          fontSize: 10, opacity: 0.55, letterSpacing: '0.06em',
        }}>{title}</div>
      </aside>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}

// ─── styles ─────────────────────────────────────────────────────────
const titleStyle = {
  fontFamily: 'Instrument Serif, serif',
  fontSize: 36, fontWeight: 400, letterSpacing: '-0.015em',
  color: 'var(--warm-900)', margin: 0, lineHeight: 1.05,
};
const primaryBtn = {
  padding: '7px 14px', fontSize: 12.5, fontWeight: 500,
  background: 'var(--amatista-700)', color: 'white',
  border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
};
const primaryBtnLg = {
  padding: '10px 16px', fontSize: 13.5, fontWeight: 500,
  background: 'linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)))',
  color: 'white', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 1px 2px rgba(50,20,80,0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5)',
};
const ghostBtn = {
  padding: '7px 12px', fontSize: 12.5,
  background: 'var(--warm-50)', color: 'var(--warm-700)',
  border: '1px solid var(--warm-200)', borderRadius: 7,
  cursor: 'pointer', fontFamily: 'inherit',
};
const iconBtn = {
  width: 28, height: 28, borderRadius: 7,
  background: 'transparent', color: 'var(--warm-500)',
  border: 'none', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit',
};
const tableHead = {
  display: 'flex', alignItems: 'center', gap: 16,
  padding: '12px 18px',
  background: 'var(--warm-100)',
  borderBottom: '1px solid var(--warm-200)',
  fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--warm-500)', fontWeight: 500,
};
const tableRow = {
  display: 'flex', alignItems: 'center', gap: 16,
  padding: '14px 15px 14px 18px',
  borderBottom: '1px solid var(--warm-150)',
  cursor: 'pointer',
};
const thSticky = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--warm-200)',
  fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--warm-500)', fontWeight: 500,
  position: 'sticky', left: 0, background: 'var(--warm-100)', zIndex: 1,
};

Object.assign(window, { VariationA, VariationB, VariationC, VariationD });
