/* global React, VetIcons,
   useVetDraft,
   VetChip, VetSectionCard, VetPageHeading, VetContentWrap,
   VetBaseField, VetBaseInput, VetBaseTextarea, VetBaseSelect, VetDateInput,
   VetOwnerHeaderC, VetContextHeader, VetSummaryRow,
   VET_MOCK_OWNERS, VET_MOCK_PETS,
   VET_CONSULTATION_TYPES, VET_SPECIES, VET_BREEDS_BY_SPECIE, VET_ANIMAL_COLORS,
   VET_COUNTRIES_C, VET_STATES_C, VET_CITIES_C,
   vetInitialsC, vetCalcAge, vetGenderLabel, vetReproductiveLabel, vetWeightUnitLabel,
   vetFormatDateLong */

// ============================================================================
// OwnerSearchInput — components/OwnerSearchInput.vue
// ============================================================================

function VetOwnerSearchInput({ value, onChange, resultsCount, onEnter, autoFocus }) {
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);
  const active = focused || (value && value.length > 0);
  return (
    <div className={'vet-owner-search-c' + (active ? ' active' : '')}>
      <VetIcons.Search size={17} strokeWidth={1.6} style={{ color: active ? 'var(--amatista-700)' : 'var(--warm-500)', flexShrink: 0 }} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter?.(); }}}
        placeholder="Buscar propietario por nombre, documento, teléfono…"
        autoComplete="off"
      />
      <span className={'vet-owner-search-count' + (!value ? ' muted' : '')}>
        {value ? `${resultsCount} resultado${resultsCount === 1 ? '' : 's'}` : '0 resultados'}
      </span>
    </div>
  );
}

// ============================================================================
// OwnerResultRow — components/OwnerResultRow.vue
// ============================================================================

function VetOwnerResultRow({ owner, petCount, onSelect }) {
  return (
    <button type="button" className="vet-owner-result-row" onClick={onSelect}>
      <div className="vet-owner-result-avatar">{vetInitialsC(owner.name)}</div>
      <div style={{ minWidth: 0 }}>
        <div className="vet-owner-result-name">{owner.name}</div>
        <div className="vet-owner-result-doc">{owner.document}</div>
      </div>
      <div className="vet-owner-result-phone">
        <VetIcons.User size={12} strokeWidth={1.7} />
        <span>{owner.phone}</span>
      </div>
      <div className="vet-owner-result-email">{owner.email}</div>
      <VetChip variant="accent">
        {petCount} mascota{petCount === 1 ? '' : 's'}
      </VetChip>
    </button>
  );
}

// ============================================================================
// OwnerSummaryCard — components/OwnerSummaryCard.vue
// ============================================================================

function VetOwnerSummaryCard({ owner, petCount, onChange }) {
  return (
    <VetSectionCard
      accent
      Icon={VetIcons.User}
      title={owner.name}
      subtitle={owner.document}
      action={
        <button type="button" className="vet-summary-change" onClick={onChange}>Cambiar</button>
      }
    >
      <div className="vet-owner-summary-grid">
        <SummaryItem Icon={VetIcons.User} label="Teléfono" value={owner.phone} />
        <SummaryItem Icon={VetIcons.User} label="Email" value={owner.email || '—'} />
        <SummaryItem Icon={VetIcons.User} label="Dirección" value={owner.address || '—'} />
        <SummaryItem Icon={VetIcons.User} label="Ciudad" value={owner.address?.split(',').pop()?.trim() || '—'} />
      </div>
    </VetSectionCard>
  );
}

function SummaryItem({ Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div className="vet-owner-summary-ic">
        <Icon size={13} strokeWidth={1.7} />
      </div>
      <div>
        <div className="vet-owner-summary-lab">{label}</div>
        <div className="vet-owner-summary-val">{value}</div>
      </div>
    </div>
  );
}

// ============================================================================
// OwnerForm — components/OwnerForm.vue (simplified)
// ============================================================================

function VetOwnerForm({ data, onUpdate }) {
  const states = data.countryId ? (VET_STATES_C[data.countryId] || []) : [];
  const cities = data.stateId   ? (VET_CITIES_C[data.stateId]   || []) : [];
  return (
    <VetSectionCard>
      <div className="vet-form-grid-2">
        <VetBaseField label="Nombre completo" required>
          {({ id }) => (
            <VetBaseInput id={id} value={data.name} onChange={(v) => onUpdate({ name: v })}
              placeholder="Ej. Carla Mendoza Salinas" maxLength={100} />
          )}
        </VetBaseField>
        <VetBaseField label="Documento" required>
          {({ id }) => (
            <VetBaseInput id={id} value={data.document} onChange={(v) => onUpdate({ document: v })}
              placeholder="Ej. CC 1.024.876.301" maxLength={50} />
          )}
        </VetBaseField>
        <VetBaseField label="Teléfono" required>
          {({ id }) => (
            <VetBaseInput id={id} value={data.phone} onChange={(v) => onUpdate({ phone: v })}
              placeholder="+57 312 445 7820" maxLength={30} />
          )}
        </VetBaseField>
        <VetBaseField label="Email">
          {({ id }) => (
            <VetBaseInput id={id} type="email" value={data.email} onChange={(v) => onUpdate({ email: v })}
              placeholder="carla@email.com" maxLength={100} />
          )}
        </VetBaseField>
        <div className="vet-form-span-2">
          <VetBaseField label="Dirección">
            {({ id }) => (
              <VetBaseInput id={id} value={data.address} onChange={(v) => onUpdate({ address: v })}
                placeholder="Cra 11 #93-45" maxLength={200} />
            )}
          </VetBaseField>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--warm-200)', margin: '20px 0' }} />

      <div className="vet-form-grid-3">
        <VetBaseField label="País" required>
          {({ id }) => (
            <VetBaseSelect id={id} value={data.countryId}
              onChange={(v) => onUpdate({ countryId: v, stateId: '', cityId: '' })}
              options={VET_COUNTRIES_C} />
          )}
        </VetBaseField>
        <VetBaseField label="Estado / Dep." required>
          {({ id }) => (
            <VetBaseSelect id={id} value={data.stateId}
              onChange={(v) => onUpdate({ stateId: v, cityId: '' })}
              options={states} disabled={!data.countryId} />
          )}
        </VetBaseField>
        <VetBaseField label="Ciudad" required>
          {({ id }) => (
            <VetBaseSelect id={id} value={data.cityId}
              onChange={(v) => onUpdate({ cityId: v })}
              options={cities} disabled={!data.stateId} />
          )}
        </VetBaseField>
      </div>
    </VetSectionCard>
  );
}

// ============================================================================
// PetForm — components/PetForm.vue (simplified)
// ============================================================================

function VetPetForm({ data, onUpdate }) {
  const breeds = data.specieId ? (VET_BREEDS_BY_SPECIE[data.specieId] || []) : [];
  return (
    <VetSectionCard>
      <div className="vet-form-grid-2">
        <VetBaseField label="Nombre" required>
          {({ id }) => (
            <VetBaseInput id={id} value={data.name} onChange={(v) => onUpdate({ name: v })}
              placeholder="Ej. Luna" maxLength={50} />
          )}
        </VetBaseField>
        <VetBaseField label="Fecha de nacimiento" required>
          {({ id }) => <VetDateInput id={id} value={data.bod} onChange={(v) => onUpdate({ bod: v })} />}
        </VetBaseField>
        <VetBaseField label="Especie" required>
          {({ id }) => (
            <VetBaseSelect id={id} value={data.specieId}
              onChange={(v) => onUpdate({ specieId: v, breedId: '' })}
              options={VET_SPECIES} />
          )}
        </VetBaseField>
        <VetBaseField label="Raza" required>
          {({ id }) => (
            <VetBaseSelect id={id} value={data.breedId}
              onChange={(v) => onUpdate({ breedId: v })}
              options={breeds} disabled={!data.specieId} />
          )}
        </VetBaseField>
        <VetBaseField label="Sexo" required>
          {({ id }) => (
            <VetBaseSelect id={id} value={data.gender}
              onChange={(v) => onUpdate({ gender: v })}
              options={[{ value: 'MALE', label: 'Macho' }, { value: 'FEMALE', label: 'Hembra' }]} />
          )}
        </VetBaseField>
        <VetBaseField label="Color" required>
          {({ id }) => (
            <VetBaseSelect id={id} value={data.colorId}
              onChange={(v) => onUpdate({ colorId: v })}
              options={VET_ANIMAL_COLORS} />
          )}
        </VetBaseField>
        <VetBaseField label="Peso" required>
          {({ id }) => (
            <div style={{ display: 'flex', gap: 6 }}>
              <VetBaseInput id={id} value={data.weight}
                onChange={(v) => onUpdate({ weight: v })}
                placeholder="4.2" />
              <div style={{ minWidth: 110 }}>
                <VetBaseSelect value={data.weightType}
                  onChange={(v) => onUpdate({ weightType: v })}
                  options={[
                    { value: 'KILOGRAMS', label: 'kg' },
                    { value: 'GRAMS', label: 'g' },
                    { value: 'POUNDS', label: 'lb' },
                  ]} />
              </div>
            </div>
          )}
        </VetBaseField>
        <VetBaseField label="Estado reproductivo" required>
          {({ id }) => (
            <VetBaseSelect id={id} value={data.reproductiveState}
              onChange={(v) => onUpdate({ reproductiveState: v })}
              options={[
                { value: 'STERILIZED', label: 'Esterilizada' },
                { value: 'NO_STERILIZED', label: 'No esterilizada' },
                { value: 'UNKNOWN', label: 'Desconocido' },
              ]} />
          )}
        </VetBaseField>
      </div>
    </VetSectionCard>
  );
}

// ============================================================================
// PetCard (consulta) — components/PetCard.vue
// ============================================================================

function VetPetCardC({ pet, selected, onSelect }) {
  const cls = ['vet-pet-card-c', selected && 'selected', pet.deceased && 'deceased'].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} onClick={onSelect}>
      {selected && (
        <span className="vet-pet-card-check">
          <VetIcons.Check size={12} strokeWidth={2} />
        </span>
      )}
      <div className="vet-pet-card-head">
        <div className="vet-pet-card-avatar">{vetInitialsC(pet.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vet-pet-card-name">
            <span>{pet.name}</span>
            {pet.deceased && <VetChip variant="neutral">Fallecido</VetChip>}
          </div>
          <div className="vet-pet-card-sub">{pet.specie.name} · {pet.breed.name}</div>
        </div>
      </div>
      <div className="vet-pet-card-grid">
        <PetCardCell label="Edad" value={vetCalcAge(pet.bod)} />
        <PetCardCell label="Género" value={vetGenderLabel(pet.gender)} />
        <PetCardCell label="Peso" value={`${pet.weight} ${vetWeightUnitLabel(pet.weightType)}`} />
        <PetCardCell label="Última consulta" value={pet.lastVisit ?? '—'} />
      </div>
    </button>
  );
}
function PetCardCell({ label, value }) {
  return (
    <div>
      <div className="vet-pet-card-lab">{label}</div>
      <div className="vet-pet-card-val">{value}</div>
    </div>
  );
}

// ============================================================================
// QuickActionsCard — components/QuickActionsCard.vue
// ============================================================================

const VET_QUICK_ACTIONS = [
  { kind: 'receta',           Icon: VetIcons.FileText, label: 'Receta',          sub: 'Medicamentos' },
  { kind: 'lab',              Icon: VetIcons.Beaker,   label: 'Examen lab.',     sub: 'Solicitud' },
  { kind: 'imaging',          Icon: VetIcons.ScanLine, label: 'Imagen Dx',       sub: 'Rayos X / Eco' },
  { kind: 'vaccination',      Icon: VetIcons.Syringe,  label: 'Vacunación',      sub: 'Aplicar dosis' },
  { kind: 'hospitalization',  Icon: VetIcons.BedDouble, label: 'Hospitalización', sub: 'Internar paciente' },
  { kind: 'deworming',        Icon: VetIcons.Bug,      label: 'Desparasitación', sub: 'Interna / externa' },
  { kind: 'surgery',          Icon: VetIcons.Scissors, label: 'Cirugía',         sub: 'Programar pabellón' },
  { kind: null,               Icon: VetIcons.Plus,     label: 'Más',             sub: 'Otras acciones', muted: true },
];

function VetQuickActionsCard({ counts, onSelect }) {
  return (
    <VetSectionCard
      accent
      Icon={VetIcons.Plus}
      title="Acciones rápidas"
      subtitle="Genera registros vinculados a esta consulta."
    >
      <div className="vet-qa-grid">
        {VET_QUICK_ACTIONS.map((a) => {
          const count = a.kind ? counts[a.kind] : 0;
          const highlighted = count > 0;
          const cls = ['vet-qa', a.muted && 'muted', highlighted && 'highlighted'].filter(Boolean).join(' ');
          return (
            <button
              key={a.label}
              type="button"
              className={cls}
              onClick={() => !a.muted && a.kind && onSelect(a.kind)}
            >
              <div className={'vet-qa-ic' + (highlighted ? ' filled' : '')}>
                <a.Icon size={17} strokeWidth={1.6} />
              </div>
              <div>
                <div className="vet-qa-lab">{a.label}</div>
                <div className="vet-qa-sub">
                  {a.kind && count > 0
                    ? `${count} generada${count === 1 ? '' : 's'} · click para añadir más`
                    : a.sub}
                </div>
              </div>
              {highlighted && (
                <div className="vet-qa-badge" aria-hidden>{count}</div>
              )}
            </button>
          );
        })}
      </div>
    </VetSectionCard>
  );
}

Object.assign(window, {
  VetOwnerSearchInput, VetOwnerResultRow, VetOwnerSummaryCard,
  VetOwnerForm, VetPetForm, VetPetCardC, VetQuickActionsCard,
});
