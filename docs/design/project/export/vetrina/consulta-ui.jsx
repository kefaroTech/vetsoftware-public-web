/* global React, VetIcons, vetInitialsC, vetCalcAge */

// ============================================================================
// BaseChip — components/ui/BaseChip.vue
// ============================================================================

function VetChip({ variant = 'neutral', children }) {
  const styleMap = {
    neutral: { background: 'var(--warm-150)', color: 'var(--warm-700)' },
    accent:  { background: 'var(--amatista-100)', color: 'var(--amatista-700)' },
    success: { background: 'var(--success-bg)', color: 'var(--success-fg)' },
    warn:    { background: 'oklch(94% 0.06 80)', color: 'oklch(45% 0.13 70)' },
    danger:  { background: 'oklch(94% 0.05 25)', color: 'oklch(48% 0.18 25)' },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 500,
      ...styleMap[variant],
    }}>
      {children}
    </span>
  );
}

// ============================================================================
// SectionCard
// ============================================================================

function VetSectionCard({ title, subtitle, Icon, accent, action, padded = true, children }) {
  const hasHead = title || subtitle || Icon || action;
  return (
    <section className="vet-section-card">
      {hasHead && (
        <header className="vet-section-head">
          {Icon && (
            <div className={'vet-section-icon' + (accent ? ' accent' : '')}>
              <Icon size={16} strokeWidth={1.6} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <h2 className="vet-section-title">{title}</h2>}
            {subtitle && <p className="vet-section-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="vet-section-action">{action}</div>}
        </header>
      )}
      <div className={'vet-section-body' + (padded ? ' padded' : '')}>
        {children}
      </div>
    </section>
  );
}

// ============================================================================
// PageHeading
// ============================================================================

function VetPageHeading({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{
        margin: 0, fontSize: 22, fontWeight: 500,
        letterSpacing: '-0.015em', color: 'var(--warm-900)',
      }}>{title}</h1>
      {subtitle && (
        <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--warm-600)', lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// ContentWrap
// ============================================================================

function VetContentWrap({ maxWidth = 1280, children }) {
  return (
    <div style={{ flex: 1, padding: 'clamp(16px, 1.5vw + 8px, 32px) clamp(16px, 2vw + 12px, 48px)' }}>
      <div style={{ margin: '0 auto', width: '100%', maxWidth, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// BaseField / BaseInput / BaseTextarea / BaseSelect / DateInput
// ============================================================================

let vetFieldIdCounter = 0;
function useVetFieldId() {
  const [id] = React.useState(() => 'vet-field-' + (++vetFieldIdCounter));
  return id;
}

function VetBaseField({ label, required, error, children }) {
  const id = useVetFieldId();
  return (
    <div className="vet-base-field">
      <label htmlFor={id} className="vet-base-label">
        {label}
        {required && <span className="vet-required-star"> *</span>}
      </label>
      {typeof children === 'function' ? children({ id }) : React.cloneElement(children, { id })}
      {error && <div className="vet-base-error">{error}</div>}
    </div>
  );
}

function VetBaseInput({ id, value, onChange, placeholder, type = 'text', maxLength, autoFocus, disabled, onKeyDown }) {
  return (
    <input
      id={id}
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      autoFocus={autoFocus}
      disabled={disabled}
      onKeyDown={onKeyDown}
      className="vet-base-input"
    />
  );
}

function VetBaseTextarea({ id, value, onChange, placeholder, rows = 3, maxLength }) {
  return (
    <textarea
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className="vet-base-textarea"
    />
  );
}

function VetBaseSelect({ id, value, onChange, options, placeholder, disabled }) {
  return (
    <div className="vet-base-select-wrap">
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="vet-base-select"
      >
        <option value="">{placeholder ?? 'Selecciona…'}</option>
        {options.map((opt) => (
          <option key={opt.value ?? opt.id} value={opt.value ?? opt.id}>
            {opt.label ?? opt.name}
          </option>
        ))}
      </select>
      <VetIcons.ChevronDown size={15} style={{ color: 'var(--warm-500)', pointerEvents: 'none' }} />
    </div>
  );
}

function VetDateInput({ id, value, onChange }) {
  return (
    <input
      id={id}
      type="date"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="vet-base-input"
    />
  );
}

// ============================================================================
// OwnerHeader / ContextHeader / SummaryRow
// ============================================================================

function VetOwnerHeaderC({ owner, petCount, onEdit }) {
  return (
    <div className="vet-owner-header-c">
      <div className="vet-owner-header-avatar">{vetInitialsC(owner.name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="vet-owner-header-name">{owner.name}</div>
        <div className="vet-owner-header-sub">
          {owner.document} · {petCount} mascota{petCount === 1 ? '' : 's'}
        </div>
      </div>
      <span className="vet-step-chip">Paso 1 ✓</span>
      <button type="button" className="vet-owner-header-edit" onClick={onEdit}>Editar</button>
    </div>
  );
}

function VetContextHeader({ owner, pet }) {
  return (
    <div className="vet-context-header">
      <div className="vet-context-avatar">
        <VetIcons.PawPrint size={18} strokeWidth={1.7} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="vet-context-name">
          <span>{pet.name}</span>
          <span className="vet-context-dim">
            · {pet.specie.name} · {pet.breed.name} · {vetCalcAge(pet.bod)}
          </span>
        </div>
        <div className="vet-context-owner">
          Propietario: {owner.name} · {owner.document}
        </div>
      </div>
      <VetChip variant="success">Pasos 1-2 ✓</VetChip>
    </div>
  );
}

function VetSummaryRow({ label, value, empty, last, children }) {
  return (
    <div className={'vet-sum-row' + (last ? ' last' : '')}>
      <div className="vet-sum-lab">{label}</div>
      <div className={'vet-sum-val' + (empty ? ' muted' : '')}>
        {children !== undefined ? children
          : empty ? <em>Sin completar</em>
          : <span>{value || '—'}</span>}
      </div>
    </div>
  );
}

Object.assign(window, {
  VetChip, VetSectionCard, VetPageHeading, VetContentWrap,
  VetBaseField, VetBaseInput, VetBaseTextarea, VetBaseSelect, VetDateInput,
  VetOwnerHeaderC, VetContextHeader, VetSummaryRow,
});
