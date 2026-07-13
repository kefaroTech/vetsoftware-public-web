/* global React, VetIcons,
   VET_MODULES, VET_SUB_MODULES, VET_PERMISSIONS, vetPermsBySubModule,
   VET_ROLES_DATA_INITIAL, VET_ROLE_COLORS_FULL,
   useVetToast */

// ============================================================================
// State store
// ============================================================================

function useVetRolesState() {
  const toast = useVetToast();
  const [roles, setRoles] = React.useState(VET_ROLES_DATA_INITIAL);

  function setActive(id, value) {
    setRoles((arr) => arr.map((r) => r.id === id ? { ...r, active: value } : r));
    const r = roles.find((x) => x.id === id);
    if (r) {
      if (value) toast.success('Rol activado', `${r.name} está activo.`);
      else toast.info('Rol desactivado', `${r.name} ya no se podrá asignar.`);
    }
  }
  function update(id, patch) {
    setRoles((arr) => arr.map((r) => r.id === id ? { ...r, ...patch } : r));
    toast.success('Rol actualizado', `Los cambios se guardaron.`);
  }
  function create(role) {
    const id = Math.max(0, ...roles.map((r) => r.id)) + 1;
    setRoles((arr) => [...arr, { ...role, id, code: role.code ?? `CUSTOM_${id}` }]);
    toast.success('Rol creado', `${role.name} se añadió al sistema.`);
    return id;
  }
  return { roles, setActive, update, create };
}

// ============================================================================
// SwitchToggle
// ============================================================================

function VetSwitchToggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      className={'vet-switch' + (value ? ' on' : '') + (disabled ? ' disabled' : '')}
      role="switch" aria-checked={value} disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
    >
      <span className="vet-switch-dot" />
    </button>
  );
}

// ============================================================================
// TristateCheckbox
// ============================================================================

function VetTristateCheckbox({ value, disabled, onToggle }) {
  // value: 'empty' | 'partial' | 'full'
  return (
    <button
      type="button"
      className={`vet-tristate ${value}` + (disabled ? ' disabled' : '')}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(); }}
      aria-checked={value === 'full' ? 'true' : value === 'partial' ? 'mixed' : 'false'}
      role="checkbox" disabled={disabled}
    >
      {value === 'full'    && <VetIcons.Check size={11} strokeWidth={2.5} />}
      {value === 'partial' && <span className="vet-tristate-dash" />}
    </button>
  );
}

// ============================================================================
// RolePill (small, for header in modal)
// ============================================================================

function VetRolesRolePill({ label, color = 'amatista', size = 'md' }) {
  const t = VET_ROLE_COLORS_FULL[color];
  return (
    <span
      className={`vet-roles-pill size-${size}`}
      style={{ background: t.bg, color: t.fg, borderColor: t.border }}
    >
      <span className="vet-roles-pill-dot" style={{ background: t.dot }} />
      {label}
    </span>
  );
}

// ============================================================================
// StatusPill
// ============================================================================

function VetRolesStatusPill({ active }) {
  const t = active
    ? { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.15 150)' }
    : { bg: 'var(--warm-200)', fg: 'var(--warm-600)', dot: 'var(--warm-500)' };
  return (
    <span className="vet-roles-status-pill" style={{ background: t.bg, color: t.fg }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot }} />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// ============================================================================
// AddRoleCard
// ============================================================================

function VetAddRoleCard({ onClick }) {
  return (
    <button type="button" className="vet-add-role-card" onClick={onClick}>
      <div className="vet-add-role-ic">
        <VetIcons.Plus size={22} strokeWidth={1.6} />
      </div>
      <div className="vet-add-role-title">Crear rol</div>
      <div className="vet-add-role-sub">
        Define un rol personalizado para tu equipo.
      </div>
    </button>
  );
}

// ============================================================================
// RoleCard
// ============================================================================

function VetRoleCard({ role, totalCatalogPermissions, onToggleActive, onEdit }) {
  const tokens = VET_ROLE_COLORS_FULL[role.color || 'amatista'];
  const permissionCount = role.permissions.length;
  const isAdmin = totalCatalogPermissions > 0 && permissionCount === totalCatalogPermissions;
  const readOnly = role.code === 'ADMIN';

  // Calculate used submodules
  const subModulesUsed = React.useMemo(() => {
    const subIds = new Set();
    for (const rp of role.permissions) {
      const p = VET_PERMISSIONS.find((x) => x.id === rp.id);
      if (p) subIds.add(p.subModule.id);
    }
    return VET_SUB_MODULES.filter((s) => subIds.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [role.permissions]);

  const visibleChips = subModulesUsed.slice(0, 4);
  const overflowCount = Math.max(0, subModulesUsed.length - 4);

  return (
    <article className={'vet-role-card' + (!role.active ? ' inactive' : '')}>
      <div className="vet-role-head">
        <div className="vet-role-head-left">
          <div className="vet-role-avatar" style={{ background: tokens.avatarBg, color: tokens.avatarFg }}>
            <VetIcons.ShieldCheck size={18} strokeWidth={1.7} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <h3 className="vet-role-name">{role.name}</h3>
            <VetRolesStatusPill active={role.active} />
          </div>
        </div>
        <VetSwitchToggle value={role.active} onChange={onToggleActive} disabled={readOnly} />
      </div>

      {readOnly && (
        <div className="vet-role-readonly-badge">
          🔒 Rol del sistema · solo lectura
        </div>
      )}
      {isAdmin && !readOnly && (
        <div className="vet-role-admin-badge">
          ✦ Acceso total al sistema
        </div>
      )}

      <div className="vet-role-stats">
        <div className="vet-role-stat">
          <div className="vet-role-stat-num">{permissionCount}</div>
          <div className="vet-role-stat-label">permisos</div>
        </div>
        <div className="vet-role-divider" />
        <div className="vet-role-stat">
          <div className="vet-role-stat-num">{subModulesUsed.length}</div>
          <div className="vet-role-stat-label">sub-módulos</div>
        </div>
      </div>

      {subModulesUsed.length > 0 ? (
        <div className="vet-role-chips">
          {visibleChips.map((sm) => (
            <span key={sm.id} className="vet-role-chip">{sm.name}</span>
          ))}
          {overflowCount > 0 && (
            <span className="vet-role-chip more">+{overflowCount}</span>
          )}
        </div>
      ) : (
        <div className="vet-role-chips-empty">Sin permisos asignados</div>
      )}

      <button type="button" className="vet-role-edit-btn" onClick={onEdit}>
        <span>{readOnly ? 'Ver permisos' : 'Editar permisos'}</span>
        <VetIcons.ArrowRight size={14} strokeWidth={1.8} />
      </button>
    </article>
  );
}

// ============================================================================
// SubModuleAccordion
// ============================================================================

function VetSubModuleAccordion({ subModule, permissions, selected, expanded, highlight, readOnly, onToggleExpand, onToggleSub, onTogglePermission }) {
  const total = permissions.length;
  const selectedCount = permissions.filter((p) => selected.has(p.id)).length;
  const tristate = selectedCount === 0 ? 'empty'
    : selectedCount === total ? 'full' : 'partial';
  const statusLabel = tristate === 'empty' ? 'Sin acceso'
    : tristate === 'full' ? 'Acceso total'
    : `Parcial · ${selectedCount}/${total}`;

  function isHl(text) {
    return highlight && text.toLowerCase().includes(highlight.toLowerCase());
  }

  return (
    <div className={'vet-acc' + (expanded ? ' open' : '')}>
      <button type="button" className="vet-acc-row" onClick={onToggleExpand} aria-expanded={expanded}>
        <VetIcons.ChevronRight size={14} strokeWidth={1.7}
          style={{ color: 'var(--warm-500)', flexShrink: 0,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease' }} />
        <span style={{ display: 'inline-flex' }} onClick={(e) => e.stopPropagation()}>
          <VetTristateCheckbox value={tristate} disabled={readOnly} onToggle={onToggleSub} />
        </span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span className={'vet-acc-name' + (isHl(subModule.name) ? ' hl' : '')}>{subModule.name}</span>
          <span className="vet-acc-count">{selectedCount} de {total} permisos</span>
        </div>
        <span className={`vet-acc-status ${tristate}`}>{statusLabel}</span>
      </button>

      {expanded && (
        <ul className="vet-acc-perms">
          {permissions.map((p) => (
            <li key={p.id} className="vet-acc-perm-row">
              <label className="vet-acc-perm-label">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  disabled={readOnly}
                  onChange={() => onTogglePermission(p.id)}
                  className="vet-acc-perm-native"
                />
                <span className={'vet-acc-perm-name' + (isHl(p.name) ? ' hl' : '')}>{p.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// EditPermissionsModal
// ============================================================================

function VetEditPermissionsModal({ open, role, color = 'amatista', readOnly, onClose, onSave }) {
  const [draftName, setDraftName] = React.useState('');
  const [draftPerms, setDraftPerms] = React.useState(new Set());
  const [draftActive, setDraftActive] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [expanded, setExpanded] = React.useState(new Set());

  React.useEffect(() => {
    if (!open) return;
    setSearch('');
    if (role) {
      setDraftName(role.name);
      setDraftPerms(new Set(role.permissions.map((p) => p.id)));
      setDraftActive(role.active);
    } else {
      setDraftName(''); setDraftPerms(new Set()); setDraftActive(true);
    }
    setExpanded(new Set());
  }, [open, role]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Group permissions by module → submodule, applying search filter
  const groups = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = [];
    for (const mod of VET_MODULES) {
      const subs = VET_SUB_MODULES.filter((s) => s.module.id === mod.id);
      if (subs.length === 0) continue;
      const moduleMatches = q && mod.name.toLowerCase().includes(q);
      const subGroups = [];
      for (const sub of subs) {
        const perms = vetPermsBySubModule(sub.id);
        if (perms.length === 0) continue;
        const subMatches = q && sub.name.toLowerCase().includes(q);
        let visiblePerms;
        if (!q || moduleMatches || subMatches) {
          visiblePerms = perms;
        } else {
          visiblePerms = perms.filter((p) => p.name.toLowerCase().includes(q));
        }
        if (visiblePerms.length === 0) continue;
        subGroups.push({ subModule: sub, permissions: visiblePerms });
      }
      if (subGroups.length > 0) result.push({ module: mod, subGroups });
    }
    return result;
  }, [search]);

  const visibleSubIds = React.useMemo(() =>
    groups.flatMap((g) => g.subGroups.map((s) => s.subModule.id)),
    [groups]
  );

  React.useEffect(() => {
    if (search.trim().length > 0) setExpanded(new Set(visibleSubIds));
  }, [search, visibleSubIds]);

  function toggleSub(subId) {
    const permIds = vetPermsBySubModule(subId).map((p) => p.id);
    const allSelected = permIds.every((id) => draftPerms.has(id));
    const next = new Set(draftPerms);
    if (allSelected) { for (const id of permIds) next.delete(id); }
    else             { for (const id of permIds) next.add(id); }
    setDraftPerms(next);
  }
  function togglePermission(id) {
    const next = new Set(draftPerms);
    if (next.has(id)) next.delete(id); else next.add(id);
    setDraftPerms(next);
  }
  function toggleExpand(id) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  }
  function expandAll()   { setExpanded(new Set(visibleSubIds)); }
  function collapseAll() { setExpanded(new Set()); }

  function save() {
    if (!draftName.trim()) return;
    onSave({
      name: draftName.trim(),
      permissions: Array.from(draftPerms).map((id) => ({ id })),
      active: draftActive,
      color,
    });
  }

  if (!open) return null;
  const tokens = VET_ROLE_COLORS_FULL[color];
  const isCreate = role === null;

  return (
    <div className="vet-roles-overlay" role="dialog" aria-modal="true">
      <div className="vet-roles-card">
        <header className="vet-roles-head" style={{ background: tokens.headerGradient }}>
          <button type="button" className="vet-roles-close" aria-label="Cerrar" onClick={onClose}>
            <VetIcons.X size={18} strokeWidth={1.7} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div className="vet-roles-avatar" style={{ background: tokens.avatarBg, color: tokens.avatarFg }}>
              <VetIcons.ShieldCheck size={22} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="vet-roles-kicker">
                {readOnly ? 'Ver rol' : isCreate ? 'Crear rol' : 'Editar rol'}
              </div>
              <input
                type="text" value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Nombre del rol"
                className="vet-roles-name-input"
                readOnly={readOnly}
              />
              <div className="vet-roles-head-meta">
                <VetRolesRolePill label={draftName || 'Sin nombre'} color={color} size="lg" />
                <span className="vet-roles-head-sep" />
                <VetSwitchToggle value={draftActive} onChange={setDraftActive} disabled={readOnly} />
                <span className="vet-roles-head-active-text">
                  {draftActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {readOnly && (
          <div className="vet-roles-readonly-banner">
            🔒 Este es un rol del sistema. Sus permisos y datos pueden consultarse pero no modificarse.
          </div>
        )}

        <div className="vet-roles-toolbar">
          <div className="vet-roles-search">
            <VetIcons.Search size={14} strokeWidth={1.7} style={{ color: 'var(--warm-500)', flexShrink: 0 }} />
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar permiso o sub-módulo…"
            />
          </div>
          <button type="button" className="vet-roles-ghost-btn" onClick={expandAll}>Expandir todo</button>
          <button type="button" className="vet-roles-ghost-btn" onClick={collapseAll}>Colapsar todo</button>
          <span className="vet-roles-bar" />
          <span className="vet-roles-counter">
            {draftPerms.size} de {VET_PERMISSIONS.length} permisos
          </span>
        </div>

        <div className="vet-roles-body">
          {groups.length === 0 ? (
            <div className="vet-roles-empty">No se encontraron permisos para los filtros aplicados.</div>
          ) : (
            groups.map((g) => (
              <div key={g.module.id} className="vet-roles-module-group">
                <div className="vet-roles-module-label">{g.module.name}</div>
                <div className="vet-roles-subs">
                  {g.subGroups.map((s) => (
                    <VetSubModuleAccordion
                      key={s.subModule.id}
                      subModule={s.subModule}
                      permissions={s.permissions}
                      selected={draftPerms}
                      expanded={expanded.has(s.subModule.id)}
                      highlight={search.trim()}
                      readOnly={readOnly}
                      onToggleExpand={() => toggleExpand(s.subModule.id)}
                      onToggleSub={() => toggleSub(s.subModule.id)}
                      onTogglePermission={togglePermission}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="vet-roles-foot">
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--warm-600)' }}>
            <strong style={{ color: 'var(--warm-900)' }}>{draftPerms.size}</strong> permisos seleccionados
            {search.trim() && (
              <span style={{ color: 'var(--warm-500)', fontStyle: 'italic' }}>
                {' '}· mostrando {groups.reduce((acc, g) => acc + g.subGroups.reduce((a, s) => a + s.permissions.length, 0), 0)} permisos
              </span>
            )}
          </div>
          <button type="button" className="vet-roles-foot-ghost" onClick={onClose}>
            {readOnly ? 'Cerrar' : 'Cancelar'}
          </button>
          {!readOnly && (
            <button type="button" className="vet-roles-foot-primary" onClick={save}>
              Guardar cambios
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

// ============================================================================
// RolesView
// ============================================================================

function VetRolesView() {
  const { roles, setActive, update, create } = useVetRolesState();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const totalCatalog = VET_PERMISSIONS.length;

  const ordered = [...roles].sort((a, b) => a.name.localeCompare(b.name));

  function openCreate()  { setEditing(null); setModalOpen(true); }
  function openEdit(r)   { setEditing(r);    setModalOpen(true); }
  function close()       { setModalOpen(false); setEditing(null); }

  function handleSave(data) {
    if (editing) update(editing.id, data);
    else create({ ...data, code: 'CUSTOM' });
    close();
  }

  return (
    <section className="vet-roles-page">
      <header className="vet-roles-page-head">
        <div className="vet-roles-page-kicker">Administración · Acceso</div>
        <div className="vet-roles-title-row">
          <div>
            <h1 className="vet-roles-page-title">Roles y permisos</h1>
            <p className="vet-roles-page-subtitle">
              Define qué puede hacer cada miembro del equipo. Agrupa permisos por sub-módulo
              y mantén el control fino sobre quién accede a qué.
            </p>
          </div>
          <button type="button" className="vet-roles-create-btn" onClick={openCreate}>
            <VetIcons.Plus size={16} strokeWidth={1.8} />
            <span>Crear rol</span>
          </button>
        </div>
      </header>

      <div className="vet-roles-grid">
        <VetAddRoleCard onClick={openCreate} />
        {ordered.map((role) => (
          <VetRoleCard
            key={role.id}
            role={role}
            totalCatalogPermissions={totalCatalog}
            onToggleActive={(v) => role.code !== 'ADMIN' && setActive(role.id, v)}
            onEdit={() => openEdit(role)}
          />
        ))}
      </div>

      <VetEditPermissionsModal
        open={modalOpen}
        role={editing}
        color={editing?.color ?? 'amatista'}
        readOnly={editing?.code === 'ADMIN'}
        onClose={close}
        onSave={handleSave}
      />
    </section>
  );
}

Object.assign(window, { VetRolesView });
