/* global React, VetIcons, VetModalShell,
   VET_MOCK_EMPLOYEES, VET_ROLES_CATALOG, vetColorsForCode,
   VetBaseField, VetBaseInput, VetBaseSelect,
   useVetToast */

// ============================================================================
// State store
// ============================================================================

function useVetEmployeesState() {
  const toast = useVetToast();
  const [employees, setEmployees] = React.useState(VET_MOCK_EMPLOYEES);
  const [selectedId, setSelectedId] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [formInitial, setFormInitial] = React.useState(null);
  const [deactivateTarget, setDeactivateTarget] = React.useState(null);
  const [roleChangeTarget, setRoleChangeTarget] = React.useState(null);

  function selectEmployee(id) { setSelectedId(id); }
  function closeDrawer() { setSelectedId(null); }

  function openCreate() { setFormInitial(null); setFormOpen(true); }
  function openEdit(emp) { setFormInitial(emp); setFormOpen(true); }
  function openChangeRole(emp) { setRoleChangeTarget(emp); }
  function closeChangeRole() { setRoleChangeTarget(null); }

  function changeRole(emp, newRoleIds) {
    const ids = Array.isArray(newRoleIds) ? newRoleIds : [newRoleIds];
    if (ids.length === 0) return; // safeguard: no employee without roles
    const newRoles = ids
      .map((id) => VET_ROLES_CATALOG.find((r) => r.id === Number(id)))
      .filter(Boolean)
      .map((r) => ({ id: r.id, name: r.name, code: r.code }));
    if (newRoles.length === 0) return;
    setEmployees((arr) => arr.map((e) =>
      e.id === emp.id ? { ...e, roles: newRoles } : e
    ));
    setRoleChangeTarget(null);
    const label = newRoles.length === 1
      ? `${emp.name} ahora es ${newRoles[0].name}.`
      : `${emp.name} ahora tiene ${newRoles.length} roles: ${newRoles.map((r) => r.name).join(', ')}.`;
    toast.success('Roles actualizados', label);
  }

  function saveEmployee(data) {
    if (formInitial) {
      setEmployees((arr) => arr.map((e) =>
        e.id === formInitial.id ? { ...e, ...data, initials: vetMakeInitials(data.name) } : e
      ));
      setSelectedId(formInitial.id);
      toast.success('Empleado actualizado', `Los cambios de ${data.name} se guardaron.`);
    } else {
      const role = VET_ROLES_CATALOG.find((r) => r.id === Number(data.roleId));
      const newEmp = {
        id: Math.max(0, ...employees.map((e) => e.id)) + 1,
        employeeCode: data.employeeCode,
        name: data.name,
        email: data.email,
        status: 'ACTIVE',
        createdDate: new Date().toISOString().slice(0, 10),
        roles: role ? [{ id: role.id, name: role.name, code: role.code }] : [],
        initials: vetMakeInitials(data.name),
      };
      setEmployees((arr) => [...arr, newEmp]);
      setSelectedId(newEmp.id);
      toast.success('Empleado creado', `${newEmp.name} se añadió al equipo.`);
    }
    setFormOpen(false);
  }

  function setStatus(emp, status) {
    setEmployees((arr) => arr.map((e) => e.id === emp.id ? { ...e, status } : e));
    setDeactivateTarget(null);
    if (status === 'ACTIVE') {
      toast.success('Empleado reactivado', `${emp.name} ya puede iniciar sesión.`);
    } else {
      toast.info('Empleado desactivado', `${emp.name} no podrá iniciar sesión hasta reactivarlo.`);
    }
  }

  const selected = employees.find((e) => e.id === selectedId) ?? null;

  return {
    employees, selected, selectedId, query, setQuery,
    selectEmployee, closeDrawer,
    formOpen, formInitial, openCreate, openEdit, saveEmployee, closeForm: () => setFormOpen(false),
    deactivateTarget, askDeactivate: setDeactivateTarget, cancelDeactivate: () => setDeactivateTarget(null),
    setStatus,
    roleChangeTarget, openChangeRole, closeChangeRole, changeRole,
  };
}

function vetMakeInitials(name) {
  return name.trim().split(/\s+/).map((p) => p[0] ?? '').slice(0, 2).join('').toUpperCase();
}

// ============================================================================
// EmployeeAvatar
// ============================================================================

function VetEmployeeAvatar({ initials, size = 36, active = true, roleCode = '' }) {
  const tokens = vetColorsForCode(roleCode);
  const bg = active ? tokens.bg : 'var(--warm-200)';
  const fg = active ? tokens.fg : 'var(--warm-500)';
  return (
    <div className="vet-emp-avatar" style={{
      width: size, height: size, background: bg, color: fg,
      fontSize: Math.round(size * 0.34),
    }}>
      {initials}
      {!active && <span className="vet-emp-avatar-dot" />}
    </div>
  );
}

// ============================================================================
// RolePill / StatusPill
// ============================================================================

function VetRolePill({ name, code, size = 'md' }) {
  const tokens = vetColorsForCode(code);
  return (
    <span className={`vet-role-pill size-${size}`}
      style={{ background: tokens.bg, color: tokens.fg }}>
      <span className="vet-role-pill-dot" style={{ background: tokens.dot }} />
      {name}
    </span>
  );
}

function VetEmpStatusPill({ active, size = 'md' }) {
  const tokens = active
    ? { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.16 150)' }
    : { bg: 'var(--warm-200)', fg: 'var(--warm-600)', dot: 'var(--warm-500)' };
  return (
    <span className={`vet-role-pill size-${size}`}
      style={{ background: tokens.bg, color: tokens.fg }}>
      <span className="vet-role-pill-dot" style={{ background: tokens.dot }} />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// ============================================================================
// SegmentedRadio
// ============================================================================

function VetSegmentedRadio({ value, onChange, options }) {
  return (
    <div className="vet-segmented">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={'vet-seg' + (value === opt.value ? ' active' : '')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// EmpleadosTable
// ============================================================================

function VetEmpleadosTable({ employees, selectedId, query, onQueryChange, onSelect }) {
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      e.name.toLowerCase().includes(q)
      || e.employeeCode.toLowerCase().includes(q)
      || e.email.toLowerCase().includes(q)
    );
  }, [employees, query]);

  return (
    <div>
      <div className="vet-emp-toolbar">
        <div className="vet-emp-search">
          <VetIcons.Search size={15} strokeWidth={1.7} style={{ color: 'var(--warm-500)' }} />
          <input
            type="search"
            placeholder="Buscar por nombre, código o correo…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>
      </div>

      <div className="vet-emp-table">
        <div className="vet-emp-head">
          <div className="vet-emp-cell vet-emp-avatar-cell" />
          <div className="vet-emp-cell vet-emp-name-cell">Empleado</div>
          <div className="vet-emp-cell vet-emp-role-cell">Rol</div>
          <div className="vet-emp-cell vet-emp-contact-cell">Correo</div>
          <div className="vet-emp-cell vet-emp-status-cell">Estado</div>
          <div className="vet-emp-cell vet-emp-chev-cell" />
        </div>

        {filtered.length === 0 ? (
          <div className="vet-emp-empty">
            {employees.length === 0
              ? 'Aún no hay empleados registrados en esta empresa.'
              : 'Sin resultados que coincidan con la búsqueda.'}
          </div>
        ) : (
          filtered.map((emp, i) => (
            <VetEmpleadoRow
              key={emp.id} employee={emp}
              selected={emp.id === selectedId} zebra={i % 2 !== 0}
              onSelect={() => onSelect(emp.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function VetEmpleadoRow({ employee, selected, zebra, onSelect }) {
  const cls = ['vet-emp-row',
    selected && 'selected',
    zebra && 'zebra',
    employee.status === 'INACTIVE' && 'inactive',
  ].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} onClick={onSelect}>
      <div className="vet-emp-cell vet-emp-avatar-cell">
        <VetEmployeeAvatar
          initials={employee.initials} size={36}
          active={employee.status === 'ACTIVE'}
          roleCode={employee.roles[0]?.code ?? ''}
        />
      </div>
      <div className="vet-emp-cell vet-emp-name-cell">
        <div className="vet-emp-row-name">{employee.name}</div>
        <div className="vet-emp-row-sub">{employee.employeeCode}</div>
      </div>
      <div className="vet-emp-cell vet-emp-role-cell">
        {employee.roles.length > 0 ? (
          <div className="vet-emp-row-pills">
            {employee.roles.map((r) => <VetRolePill key={r.id} name={r.name} code={r.code} />)}
          </div>
        ) : (
          <span className="vet-emp-no-role">Sin rol</span>
        )}
      </div>
      <div className="vet-emp-cell vet-emp-contact-cell">
        <div className="vet-emp-row-email">{employee.email}</div>
      </div>
      <div className="vet-emp-cell vet-emp-status-cell">
        <VetEmpStatusPill active={employee.status === 'ACTIVE'} />
      </div>
      <div className="vet-emp-cell vet-emp-chev-cell" style={{ display: 'grid', placeItems: 'center', color: 'var(--warm-400)' }}>
        <VetIcons.ChevronRight size={16} strokeWidth={1.6} />
      </div>
    </button>
  );
}

// ============================================================================
// EmpleadoDrawer
// ============================================================================

function VetEmpleadoDrawer({ employee, onClose, onEdit, onChangeRole, onDeactivate, onActivate }) {
  React.useEffect(() => {
    if (!employee) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [employee, onClose]);

  if (!employee) return null;
  const isAdmin = employee.roles.some((r) => r.code?.toUpperCase() === 'ADMIN');
  const tokens = vetColorsForCode(employee.roles[0]?.code ?? '');
  const headerStyle = {
    background: `linear-gradient(180deg, ${tokens.bg} 0%, var(--warm-50) 100%)`,
  };

  return (
    <div className="vet-drawer-root" role="dialog" aria-modal="true">
      <aside className="vet-drawer">
        <header className="vet-drawer-head" style={headerStyle}>
          <button type="button" className="vet-drawer-close" aria-label="Cerrar" onClick={onClose}>
            <VetIcons.X size={15} strokeWidth={1.8} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <VetEmployeeAvatar
              initials={employee.initials} size={64}
              active={employee.status === 'ACTIVE'}
              roleCode={employee.roles[0]?.code ?? ''}
            />
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <h2 className="vet-drawer-name">{employee.name}</h2>
              <div className="vet-drawer-code">{employee.employeeCode}</div>
              <div className="vet-drawer-pills">
                {employee.roles.length > 0
                  ? employee.roles.map((r) => <VetRolePill key={r.id} name={r.name} code={r.code} size="lg" />)
                  : <span className="vet-drawer-no-role">Sin rol asignado</span>}
                <VetEmpStatusPill active={employee.status === 'ACTIVE'} size="lg" />
              </div>
            </div>
          </div>
        </header>

        <div className="vet-drawer-body">
          <VetDrawerTabDatos employee={employee} />
        </div>

        <footer className="vet-drawer-foot">
          <button type="button" className="vet-drawer-ghost" disabled
            title="Próximamente — endpoint pendiente">
            <VetIcons.Settings size={14} strokeWidth={1.7} />
            Restablecer contraseña
          </button>
          <button type="button" className="vet-drawer-ghost" onClick={() => onEdit(employee)}>
            <VetIcons.Edit size={14} strokeWidth={1.7} />
            Editar
          </button>
          <button type="button" className="vet-drawer-ghost" onClick={() => onChangeRole(employee)}>
            <VetIcons.ShieldCheck size={14} strokeWidth={1.7} />
            Cambiar roles
          </button>
          <div style={{ flex: 1 }} />
          {employee.status === 'ACTIVE' && isAdmin ? (
            <span
              title="Los empleados con rol ADMIN no pueden ser desactivados"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', fontSize: 12, fontWeight: 500,
                background: 'var(--warm-100)', border: '1px solid var(--warm-300)',
                color: 'var(--warm-700)', borderRadius: 7,
              }}
            >
              <VetIcons.Lock size={12} strokeWidth={1.8} />
              ADMIN protegido
            </span>
          ) : employee.status === 'ACTIVE' ? (
            <button type="button" className="vet-drawer-danger" onClick={() => onDeactivate(employee)}>
              <VetIcons.X size={14} strokeWidth={1.7} />
              Desactivar
            </button>
          ) : (
            <button type="button" className="vet-drawer-primary" onClick={() => onActivate(employee)}>
              <VetIcons.Check size={14} strokeWidth={2} />
              Reactivar
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

// ============================================================================
// DrawerTabDatos
// ============================================================================

function VetDrawerTabDatos({ employee }) {
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function fmt(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  const fields = [
    { Icon: VetIcons.User,     label: 'Correo',             value: employee.email || '—' },
    { Icon: VetIcons.User,     label: 'Código de empleado', value: employee.employeeCode || '—' },
    { Icon: VetIcons.Calendar, label: 'Fecha de ingreso',   value: fmt(employee.createdDate) },
  ];
  return (
    <div className="vet-drawer-fields">
      {fields.map((f, i) => (
        <div key={i} className={'vet-drawer-row' + (i === 0 ? ' first' : '')}>
          <div className="vet-drawer-ic">
            <f.Icon size={15} strokeWidth={1.7} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="vet-drawer-row-label">{f.label}</div>
            <div className="vet-drawer-row-value">{f.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EmployeeFormModal
// ============================================================================

function VetEmployeeFormModal({ open, initial, onClose, onSubmit }) {
  const isEditing = !!initial;
  const [draft, setDraft] = React.useState({
    employeeCode: '', name: '', email: '', status: 'ACTIVE',
    password: '', roleId: '',
  });
  const [touched, setTouched] = React.useState({});
  const [banner, setBanner] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setBanner(false);
    setTouched({});
    if (initial) {
      setDraft({
        employeeCode: initial.employeeCode, name: initial.name, email: initial.email,
        status: initial.status, password: '', roleId: '',
      });
    } else {
      setDraft({ employeeCode: '', name: '', email: '', status: 'ACTIVE', password: '', roleId: '' });
    }
  }, [open, initial]);

  const errors = React.useMemo(() => {
    const e = {};
    const code = draft.employeeCode.trim();
    if (!code) e.employeeCode = 'El código es requerido';
    else if (code.length > 50) e.employeeCode = 'Máximo 50 caracteres';

    const name = draft.name.trim();
    if (!name) e.name = 'El nombre es requerido';
    else if (name.length < 2) e.name = 'Mínimo 2 caracteres';
    else if (name.length > 100) e.name = 'Máximo 100 caracteres';

    const email = draft.email.trim();
    if (!email) e.email = 'El correo es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'Correo inválido';

    if (!isEditing) {
      if (!draft.password) e.password = 'La contraseña es requerida';
      else if (draft.password.length < 8) e.password = 'Mínimo 8 caracteres';
      if (!draft.roleId) e.roleId = 'Selecciona un rol';
    }
    return e;
  }, [draft, isEditing]);

  function err(field) { return touched[field] && errors[field]; }
  function setField(f, v) { setDraft((d) => ({ ...d, [f]: v })); }
  function touch(f) { setTouched((t) => ({ ...t, [f]: true })); }

  function submit() {
    const all = ['employeeCode','name','email','password','roleId'];
    setTouched(Object.fromEntries(all.map((k) => [k, true])));
    if (Object.keys(errors).length > 0) {
      setBanner(true);
      return;
    }
    onSubmit({ ...draft });
  }

  const roleOptions = VET_ROLES_CATALOG.map((r) => ({ value: String(r.id), label: r.name }));

  return (
    <VetModalShell
      open={open}
      title={isEditing ? 'Editar empleado' : 'Nuevo empleado'}
      subtitle={isEditing
        ? 'Actualiza los datos del empleado.'
        : 'Crea una cuenta para un nuevo miembro del equipo.'}
      icon={isEditing ? VetIcons.Edit : VetIcons.Plus}
      accent="amatista"
      width={560}
      onClose={onClose}
      footerActions={
        <>
          <button type="button" className="vet-drawer-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-emp-modal-primary" onClick={submit}>
            {isEditing ? 'Guardar cambios' : 'Crear empleado'}
          </button>
        </>
      }
    >
      {banner && (
        <div className="vet-emp-banner-error">
          Revisa los campos marcados antes de continuar.
        </div>
      )}
      <div className="vet-emp-form">
        <VetBaseField label="Nombre completo" required error={err('name')}>
          {({ id }) => (
            <VetBaseInput id={id} value={draft.name} onChange={(v) => setField('name', v)}
              placeholder="Mariana Soto Quispe" autoComplete="name"
              onKeyDown={(e) => e.key === 'Enter' && submit()} />
          )}
        </VetBaseField>

        <div className="vet-form-grid-2">
          <VetBaseField label="Código de empleado" required error={err('employeeCode')}>
            {({ id }) => (
              <VetBaseInput id={id} value={draft.employeeCode}
                onChange={(v) => setField('employeeCode', v)} placeholder="VET-001" />
            )}
          </VetBaseField>
          <VetBaseField label="Correo" required error={err('email')}>
            {({ id }) => (
              <VetBaseInput id={id} type="email" value={draft.email}
                onChange={(v) => setField('email', v)} placeholder="mariana.soto@vetrina.com" />
            )}
          </VetBaseField>
        </div>

        {!isEditing && (
          <>
            <VetBaseField label="Contraseña inicial" required error={err('password')}>
              {({ id }) => (
                <VetBaseInput id={id} type="password" value={draft.password}
                  onChange={(v) => setField('password', v)} placeholder="••••••••" />
              )}
            </VetBaseField>
            <VetBaseField label="Rol" required error={err('roleId')}>
              {({ id }) => (
                <VetBaseSelect id={id} value={draft.roleId}
                  onChange={(v) => setField('roleId', v)}
                  options={roleOptions} placeholder="Selecciona un rol" />
              )}
            </VetBaseField>
          </>
        )}

        {isEditing && (
          <VetBaseField label="Estado" required>
            <VetSegmentedRadio
              value={draft.status} onChange={(v) => setField('status', v)}
              options={[
                { value: 'ACTIVE', label: 'Activo' },
                { value: 'INACTIVE', label: 'Inactivo' },
              ]}
            />
          </VetBaseField>
        )}
      </div>
    </VetModalShell>
  );
}

// ============================================================================
// ChangeRoleModal — dedicated modal for changing employee role
// ============================================================================

function VetChangeRoleModal({ open, employee, onClose, onConfirm }) {
  const [selectedRoleIds, setSelectedRoleIds] = React.useState(new Set());

  React.useEffect(() => {
    if (open && employee) {
      setSelectedRoleIds(new Set(employee.roles.map((r) => r.id)));
    }
  }, [open, employee]);

  if (!open || !employee) return null;

  const currentIds = new Set(employee.roles.map((r) => r.id));
  const hasChanges =
    selectedRoleIds.size !== currentIds.size ||
    [...selectedRoleIds].some((id) => !currentIds.has(id));
  const hasAtLeastOne = selectedRoleIds.size > 0;
  const canSave = hasAtLeastOne && hasChanges;

  function toggleRole(roleId) {
    const next = new Set(selectedRoleIds);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    setSelectedRoleIds(next);
  }

  function describeChanges() {
    const adds = [...selectedRoleIds].filter((id) => !currentIds.has(id));
    const removes = [...currentIds].filter((id) => !selectedRoleIds.has(id));
    const addNames = adds.map((id) => VET_ROLES_CATALOG.find((r) => r.id === id)?.name).filter(Boolean);
    const removeNames = removes.map((id) => VET_ROLES_CATALOG.find((r) => r.id === id)?.name).filter(Boolean);
    return { addNames, removeNames };
  }
  const { addNames, removeNames } = describeChanges();

  return (
    <VetModalShell
      open={open}
      onClose={onClose}
      title="Cambiar roles"
      subtitle={`Modificar los roles asignados a ${employee.name}`}
      icon={VetIcons.ShieldCheck}
      accent="amatista"
      width={560}
      footerActions={
        <>
          <button type="button" className="vet-drawer-ghost" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="vet-emp-modal-primary"
            disabled={!canSave}
            onClick={() => onConfirm(employee, Array.from(selectedRoleIds))}
            style={!canSave ? { opacity: 0.5, cursor: 'not-allowed' } : null}
          >
            Guardar cambios
          </button>
        </>
      }
    >
      <div className="vet-change-role-body">
        <div className="vet-change-role-employee">
          <VetEmployeeAvatar
            initials={employee.initials} size={48}
            active={employee.status === 'ACTIVE'}
            roleCode={employee.roles[0]?.code ?? ''}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="vet-change-role-name">{employee.name}</div>
            <div className="vet-change-role-code">{employee.employeeCode} · {employee.email}</div>
          </div>
        </div>

        <div className="vet-change-role-current">
          <div className="vet-change-role-label-line">
            <span className="vet-change-role-label">Roles actuales</span>
            <span className="vet-change-role-count">
              {employee.roles.length} {employee.roles.length === 1 ? 'rol' : 'roles'}
            </span>
          </div>
          {employee.roles.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {employee.roles.map((r) => (
                <VetRolePill key={r.id} name={r.name} code={r.code} size="lg" />
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--warm-500)', fontStyle: 'italic' }}>
              Sin rol asignado
            </span>
          )}
        </div>

        <div>
          <div className="vet-change-role-label-line">
            <span className="vet-change-role-label">Asignar roles</span>
            <span className="vet-change-role-count">
              {selectedRoleIds.size} {selectedRoleIds.size === 1 ? 'seleccionado' : 'seleccionados'}
            </span>
          </div>
          <div className="vet-change-role-hint">
            Un empleado puede tener varios roles. Debe tener al menos uno.
          </div>
          <div className="vet-change-role-options">
            {VET_ROLES_CATALOG.map((role) => {
              const tokens = vetColorsForCode(role.code);
              const isSelected = selectedRoleIds.has(role.id);
              const isCurrent = currentIds.has(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  className={'vet-change-role-option' + (isSelected ? ' selected' : '')}
                  onClick={() => toggleRole(role.id)}
                >
                  <span
                    className={'vet-change-role-checkbox' + (isSelected ? ' checked' : '')}
                  >
                    {isSelected && <VetIcons.Check size={11} strokeWidth={3} />}
                  </span>
                  <span
                    className="vet-change-role-option-dot"
                    style={{ background: tokens.dot }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="vet-change-role-option-name">
                      {role.name}
                      {isCurrent && (
                        <span className="vet-change-role-current-badge">actual</span>
                      )}
                    </div>
                    <div className="vet-change-role-option-desc">{role.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {!hasAtLeastOne && (
          <div className="vet-change-role-error">
            <VetIcons.X size={13} strokeWidth={2} />
            <span>Un empleado no puede quedarse sin rol. Selecciona al menos uno.</span>
          </div>
        )}

        {canSave && (addNames.length > 0 || removeNames.length > 0) && (
          <div className="vet-change-role-warning">
            <VetIcons.Bell size={13} strokeWidth={1.7} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Resumen de cambios</div>
              {addNames.length > 0 && (
                <div>
                  <span style={{ color: 'oklch(45% 0.13 145)', fontWeight: 600 }}>+ Añade:</span> {addNames.join(', ')}
                </div>
              )}
              {removeNames.length > 0 && (
                <div style={{ marginTop: 2 }}>
                  <span style={{ color: 'oklch(48% 0.18 25)', fontWeight: 600 }}>− Quita:</span> {removeNames.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </VetModalShell>
  );
}

// ============================================================================
// ConfirmDeactivateDialog
// ============================================================================

function VetConfirmDeactivateDialog({ open, employee, onCancel, onConfirm }) {
  const firstName = employee?.name.split(' ')[0] ?? '';
  return (
    <VetModalShell
      open={open}
      title={employee ? `¿Desactivar a ${firstName}?` : '¿Desactivar empleado?'}
      icon={VetIcons.X}
      accent="danger"
      width={440}
      onClose={onCancel}
      footerActions={
        <>
          <button type="button" className="vet-drawer-ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="vet-drawer-danger" onClick={onConfirm}>
            <VetIcons.X size={14} strokeWidth={1.7} />
            Desactivar
          </button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.55 }}>
        No podrá iniciar sesión hasta que vuelvas a activar su cuenta.
        Sus consultas y registros previos se mantienen intactos.
      </p>
    </VetModalShell>
  );
}

// ============================================================================
// EmpleadosView
// ============================================================================

function VetEmpleadosView() {
  const s = useVetEmployeesState();

  return (
    <div className="vet-emp-page">
      <div className="vet-emp-header">
        <div>
          <div className="vet-emp-kicker">Administración · Equipo</div>
          <h1 className="vet-emp-title">Empleados</h1>
          <div className="vet-emp-lead">
            Gestiona el equipo de la clínica, sus roles y accesos.
          </div>
        </div>
        <button type="button" className="vet-emp-cta" onClick={s.openCreate}>
          <VetIcons.Plus size={16} strokeWidth={1.8} />
          Nuevo empleado
        </button>
      </div>

      <VetEmpleadosTable
        employees={s.employees}
        selectedId={s.selectedId}
        query={s.query}
        onQueryChange={s.setQuery}
        onSelect={s.selectEmployee}
      />

      <VetEmpleadoDrawer
        employee={s.selected}
        onClose={s.closeDrawer}
        onEdit={s.openEdit}
        onChangeRole={s.openChangeRole}
        onDeactivate={(emp) => s.askDeactivate(emp)}
        onActivate={(emp) => s.setStatus(emp, 'ACTIVE')}
      />

      <VetChangeRoleModal
        open={!!s.roleChangeTarget}
        employee={s.roleChangeTarget}
        onClose={s.closeChangeRole}
        onConfirm={s.changeRole}
      />

      <VetEmployeeFormModal
        open={s.formOpen}
        initial={s.formInitial}
        onClose={s.closeForm}
        onSubmit={s.saveEmployee}
      />

      <VetConfirmDeactivateDialog
        open={s.deactivateTarget !== null}
        employee={s.deactivateTarget}
        onCancel={s.cancelDeactivate}
        onConfirm={() => s.setStatus(s.deactivateTarget, 'INACTIVE')}
      />
    </div>
  );
}

Object.assign(window, { VetEmpleadosView });
