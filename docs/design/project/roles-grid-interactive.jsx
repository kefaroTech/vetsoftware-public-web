// Roles · Variación C interactiva: grid de tarjetas + modal de editar permisos

const { useState: useS, useMemo: useM } = React;

function RolePill({ role, size = 'md' }) {
  const c = ROLE_COLORS[role.color] || ROLE_COLORS.gray;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: size === 'lg' ? '5px 12px' : '3px 10px',
      borderRadius: 999, background: c.bg, color: c.fg,
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

function Switch({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      width: 32, height: 18, borderRadius: 999, padding: 2,
      background: checked ? 'var(--amatista-600)' : 'var(--warm-300)',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background .15s',
    }}>
      <span style={{
        display: 'block', width: 14, height: 14, borderRadius: '50%',
        background: 'white', transform: checked ? 'translateX(14px)' : 'translateX(0)',
        transition: 'transform .15s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

// ─── Shell ────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--warm-100)', color: 'var(--warm-900)',
      fontFamily: 'Geist, sans-serif', overflow: 'hidden',
    }}>
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'linear-gradient(180deg, oklch(28% 0.10 var(--hue)) 0%, oklch(22% 0.08 var(--hue)) 100%)',
        color: 'oklch(94% 0.02 var(--hue))', padding: '18px 12px',
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
      </aside>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────────
function RolesGridApp() {
  const [roles, setRoles] = useS(ROLES_DATA);
  const [editingId, setEditingId] = useS(null);
  const editing = roles.find(r => r.id === editingId);

  const updateRole = (id, patch) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  return (
    <Shell>
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <div>
            <div style={{
              fontSize: 11.5, color: 'var(--warm-500)', letterSpacing: '0.06em',
              textTransform: 'uppercase', marginBottom: 6, fontWeight: 500,
            }}>Administración · Acceso</div>
            <h1 style={titleStyle}>Roles y permisos</h1>
            <div style={{ fontSize: 13.5, color: 'var(--warm-600)', marginTop: 6, maxWidth: 540 }}>
              Define qué puede hacer cada rol en la clínica. Las acciones se agrupan por sub-módulo.
            </div>
          </div>
          <button style={primaryBtnLg}>+ Crear rol</button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 14,
        }}>
          {roles.map(r => (
            <RoleCard
              key={r.id} role={r}
              onEdit={() => setEditingId(r.id)}
              onToggleActive={() => updateRole(r.id, { active: !r.active })}
            />
          ))}
          <button style={addCardStyle}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--amatista-100)', color: 'var(--amatista-700)',
              display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 300,
            }}>+</div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--warm-700)' }}>Crear nuevo rol</div>
            <div style={{ fontSize: 11.5, color: 'var(--warm-500)', textAlign: 'center', maxWidth: 200 }}>
              Define un nuevo perfil y asígnale los permisos que necesite.
            </div>
          </button>
        </div>
      </div>

      {editing && (
        <EditPermissionsModal
          role={editing}
          onClose={() => setEditingId(null)}
          onSave={(patch) => { updateRole(editing.id, patch); setEditingId(null); }}
        />
      )}
    </Shell>
  );
}

// ─── Card de rol ─────────────────────────────────────────────────
function RoleCard({ role, onEdit, onToggleActive }) {
  const c = ROLE_COLORS[role.color];
  const subs = subModulesUsed(role.permissionIds);
  const isAdmin = role.permissionIds.length === PERMISSIONS.length;

  return (
    <div style={{
      border: `1px solid ${role.active ? 'var(--warm-200)' : 'var(--warm-150)'}`,
      borderRadius: 14,
      background: 'var(--warm-50)',
      padding: 18,
      display: 'flex', flexDirection: 'column', gap: 12,
      opacity: role.active ? 1 : 0.65,
      transition: 'opacity .15s',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 11,
            background: c.bg, color: c.fg,
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 500, color: 'var(--warm-900)' }}>{role.name}</div>
            <div style={{ marginTop: 4 }}><StatusPill active={role.active} /></div>
          </div>
        </div>
        <Switch checked={role.active} onChange={onToggleActive} />
      </div>

      {isAdmin && (
        <div style={{
          padding: '6px 10px',
          background: 'var(--amatista-50)',
          border: '1px solid var(--amatista-200)',
          borderRadius: 7,
          fontSize: 11.5, color: 'var(--amatista-700)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          alignSelf: 'flex-start',
        }}>
          <span style={{ fontSize: 13 }}>✦</span> Acceso total al sistema
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 18,
        padding: '8px 0',
        borderTop: '1px solid var(--warm-150)',
        borderBottom: '1px solid var(--warm-150)',
      }}>
        <div>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, color: 'var(--warm-900)', lineHeight: 1 }}>
            {role.permissionIds.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--warm-500)', marginTop: 2 }}>permisos</div>
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--warm-200)' }} />
        <div>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, color: 'var(--warm-900)', lineHeight: 1 }}>
            {subs.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--warm-500)', marginTop: 2 }}>sub-módulos</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {subs.slice(0, 4).map(smid => {
          const sm = SUB_MODULES.find(x => x.id === smid);
          return (
            <span key={smid} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 6,
              background: 'var(--warm-150)', color: 'var(--warm-700)',
            }}>{sm?.name}</span>
          );
        })}
        {subs.length > 4 && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 6,
            background: 'var(--warm-200)', color: 'var(--warm-700)', fontWeight: 500,
          }}>+{subs.length - 4}</span>
        )}
      </div>

      <button onClick={onEdit} style={editLinkBtn}>
        Editar permisos
        <span style={{ marginLeft: 4 }}>→</span>
      </button>
    </div>
  );
}

// ─── Modal "Editar permisos" ─────────────────────────────────────
function EditPermissionsModal({ role, onClose, onSave }) {
  const c = ROLE_COLORS[role.color];
  const [name, setName] = useS(role.name);
  const [active, setActive] = useS(role.active);
  const [draft, setDraft] = useS(new Set(role.permissionIds));
  const [expanded, setExpanded] = useS(new Set(subModulesUsed(role.permissionIds)));
  const [filter, setFilter] = useS('');

  const toggle = (id) => {
    setDraft(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSub = (sm) => {
    const perms = PERMISSIONS.filter(p => p.subModuleId === sm.id);
    const allOn = perms.every(p => draft.has(p.id));
    setDraft(prev => {
      const next = new Set(prev);
      if (allOn) perms.forEach(p => next.delete(p.id));
      else perms.forEach(p => next.add(p.id));
      return next;
    });
  };

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(SUB_MODULES.map(s => s.id)));
  const collapseAll = () => setExpanded(new Set());

  const grouped = useM(() => {
    const out = MODULES.map(mod => ({
      module: mod,
      subs: SUB_MODULES.filter(s => s.moduleId === mod.id).map(sub => ({
        sub,
        perms: PERMISSIONS.filter(p => p.subModuleId === sub.id),
      })),
    }));
    if (!filter.trim()) return out;
    const q = filter.toLowerCase();
    return out.map(m => ({
      module: m.module,
      subs: m.subs.map(s => ({
        sub: s.sub,
        perms: s.perms.filter(p => p.name.toLowerCase().includes(q) || s.sub.name.toLowerCase().includes(q)),
      })).filter(s => s.perms.length > 0),
    })).filter(m => m.subs.length > 0);
  }, [filter]);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'oklch(15% 0.05 var(--hue) / 0.45)',
        backdropFilter: 'blur(2px)', zIndex: 5,
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'grid', placeItems: 'center', zIndex: 6,
        padding: '4vh 4vw', pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', height: '100%',
          maxWidth: 1100,
          background: 'var(--warm-50)',
          borderRadius: 16,
          boxShadow: '0 30px 80px oklch(15% 0.05 var(--hue) / 0.25)',
          display: 'flex', flexDirection: 'column',
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '22px 26px 18px',
            background: `linear-gradient(180deg, ${c.bg} 0%, var(--warm-50) 100%)`,
            borderBottom: '1px solid var(--warm-200)',
            position: 'relative',
          }}>
            <button onClick={onClose} style={{
              position: 'absolute', top: 16, right: 16,
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--warm-50)', border: '1px solid var(--warm-200)',
              cursor: 'pointer', fontSize: 16, color: 'var(--warm-600)',
              fontFamily: 'inherit',
            }}>×</button>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <span style={{
                width: 56, height: 56, borderRadius: 14,
                background: c.bg, color: c.fg,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </span>
              <div style={{ flex: 1, paddingTop: 2 }}>
                <div style={{ fontSize: 11.5, color: 'var(--warm-500)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
                  Editar rol
                </div>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  style={{
                    fontFamily: 'Instrument Serif, serif',
                    fontSize: 28, fontWeight: 400, letterSpacing: '-0.015em',
                    color: 'var(--warm-900)', border: 'none', outline: 'none',
                    background: 'transparent', width: '100%',
                    padding: '2px 0',
                    borderBottom: '1.5px dashed transparent',
                  }}
                  onFocus={e => e.target.style.borderBottomColor = 'var(--amatista-300)'}
                  onBlur={e => e.target.style.borderBottomColor = 'transparent'}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <RolePill role={{ ...role, name }} size="lg" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--warm-600)' }}>
                    <Switch checked={active} onChange={setActive} />
                    {active ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div style={{
            padding: '12px 26px',
            borderBottom: '1px solid var(--warm-200)',
            background: 'var(--warm-50)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px',
              background: 'var(--warm-100)', borderRadius: 7,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warm-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={filter} onChange={e => setFilter(e.target.value)}
                placeholder="Buscar permiso o sub-módulo…"
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 13, fontFamily: 'inherit', color: 'var(--warm-900)',
                }}
              />
            </div>
            <button onClick={expandAll} style={ghostBtnSm}>Expandir todo</button>
            <button onClick={collapseAll} style={ghostBtnSm}>Colapsar todo</button>
            <div style={{ width: 1, height: 22, background: 'var(--warm-200)' }} />
            <div style={{
              padding: '5px 11px', borderRadius: 999,
              background: 'var(--amatista-100)', color: 'var(--amatista-700)',
              fontSize: 12, fontWeight: 500,
            }}>
              {draft.size} de {PERMISSIONS.length} permisos
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'auto', padding: '18px 26px' }}>
            {grouped.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--warm-500)' }}>
                No hay permisos que coincidan con "<strong>{filter}</strong>"
              </div>
            )}
            {grouped.map(({ module, subs }) => (
              <div key={module.id} style={{ marginBottom: 18 }}>
                <div style={{
                  fontSize: 11, color: 'var(--warm-500)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', fontWeight: 500, marginBottom: 8, paddingLeft: 2,
                }}>{module.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {subs.map(({ sub, perms }) => {
                    const allPerms = PERMISSIONS.filter(p => p.subModuleId === sub.id);
                    const grantedCount = allPerms.filter(p => draft.has(p.id)).length;
                    const total = allPerms.length;
                    const allOn = grantedCount === total;
                    const someOn = grantedCount > 0 && grantedCount < total;
                    const isOpen = expanded.has(sub.id);
                    return (
                      <div key={sub.id} style={{
                        border: '1px solid var(--warm-200)',
                        borderRadius: 10,
                        background: 'var(--warm-50)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px',
                          cursor: 'pointer',
                          background: grantedCount > 0 ? 'var(--amatista-50)' : 'var(--warm-50)',
                          borderBottom: isOpen ? '1px solid var(--warm-200)' : 'none',
                        }}>
                          <div onClick={() => toggleExpand(sub.id)} style={{
                            color: 'var(--warm-500)', fontSize: 10,
                            transition: 'transform .15s',
                            transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
                          }}>▶</div>
                          <Tristate
                            checked={allOn}
                            indeterminate={someOn}
                            onChange={() => toggleSub(sub)}
                          />
                          <div onClick={() => toggleExpand(sub.id)} style={{ flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--warm-900)' }}>
                              {sub.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--warm-500)', marginTop: 2 }}>
                              {grantedCount} de {total} permisos
                            </div>
                          </div>
                          <div style={{
                            padding: '3px 8px', borderRadius: 999,
                            background: grantedCount === 0 ? 'var(--warm-200)' : allOn ? 'var(--amatista-200)' : 'var(--amatista-100)',
                            color: grantedCount === 0 ? 'var(--warm-600)' : 'var(--amatista-700)',
                            fontSize: 11, fontWeight: 500,
                          }}>
                            {grantedCount === 0 ? 'Sin acceso' : allOn ? 'Acceso total' : `Parcial · ${grantedCount}/${total}`}
                          </div>
                        </div>
                        {isOpen && (
                          <div style={{ padding: '4px 16px 10px 44px' }}>
                            {perms.map((p, i) => {
                              const checked = draft.has(p.id);
                              return (
                                <label key={p.id} style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '7px 0', cursor: 'pointer',
                                  borderBottom: i < perms.length - 1 ? '1px solid var(--warm-150)' : 'none',
                                }}>
                                  <input type="checkbox" checked={checked}
                                    onChange={() => toggle(p.id)}
                                    style={{ accentColor: 'var(--amatista-600)', width: 14, height: 14, cursor: 'pointer' }} />
                                  <span style={{
                                    fontSize: 13,
                                    color: checked ? 'var(--warm-900)' : 'var(--warm-600)',
                                  }}>{p.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 26px',
            borderTop: '1px solid var(--warm-200)',
            background: 'var(--warm-100)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 12.5, color: 'var(--warm-600)' }}>
              <strong style={{ color: 'var(--warm-900)' }}>{draft.size}</strong> permisos seleccionados
              · <strong style={{ color: 'var(--warm-900)' }}>{subModulesUsed([...draft]).length}</strong> sub-módulos
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={onClose} style={ghostBtn}>Cancelar</button>
            <button
              onClick={() => onSave({ name, active, permissionIds: [...draft] })}
              style={primaryBtn}
            >Guardar cambios</button>
          </div>
        </div>
      </div>
    </>
  );
}

function Tristate({ checked, indeterminate, onChange }) {
  return (
    <button onClick={onChange} style={{
      width: 16, height: 16, borderRadius: 4,
      background: (checked || indeterminate) ? 'var(--amatista-600)' : 'var(--warm-50)',
      border: `1.5px solid ${(checked || indeterminate) ? 'var(--amatista-600)' : 'var(--warm-400)'}`,
      cursor: 'pointer', padding: 0,
      display: 'grid', placeItems: 'center',
      color: 'white', fontSize: 10, fontWeight: 700,
      fontFamily: 'inherit', flexShrink: 0,
    }}>
      {checked && '✓'}
      {indeterminate && '—'}
    </button>
  );
}

// ─── styles ──────────────────────────────────────────────────────
const titleStyle = {
  fontFamily: 'Instrument Serif, serif',
  fontSize: 36, fontWeight: 400, letterSpacing: '-0.015em',
  color: 'var(--warm-900)', margin: 0, lineHeight: 1.05,
};
const primaryBtn = {
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
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
  padding: '8px 14px', fontSize: 13,
  background: 'var(--warm-50)', color: 'var(--warm-700)',
  border: '1px solid var(--warm-200)', borderRadius: 7,
  cursor: 'pointer', fontFamily: 'inherit',
};
const ghostBtnSm = {
  padding: '5px 10px', fontSize: 11.5,
  background: 'var(--warm-50)', color: 'var(--warm-700)',
  border: '1px solid var(--warm-200)', borderRadius: 6,
  cursor: 'pointer', fontFamily: 'inherit',
};
const editLinkBtn = {
  alignSelf: 'flex-start',
  padding: '6px 12px', fontSize: 12.5, fontWeight: 500,
  background: 'var(--amatista-50)', color: 'var(--amatista-700)',
  border: '1px solid var(--amatista-200)', borderRadius: 7,
  cursor: 'pointer', fontFamily: 'inherit',
};
const addCardStyle = {
  border: '1.5px dashed var(--warm-300)',
  borderRadius: 14, padding: 24,
  background: 'transparent',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  gap: 10, minHeight: 240,
  color: 'var(--warm-500)', fontFamily: 'inherit', cursor: 'pointer',
};

ReactDOM.createRoot(document.getElementById('root')).render(<RolesGridApp />);
