/* global React, VetIcons,
   useVetDraft,
   VetChip, VetSectionCard, VetPageHeading, VetContentWrap,
   VetBaseField, VetBaseInput, VetBaseTextarea, VetBaseSelect, VetDateInput,
   VetOwnerHeaderC, VetContextHeader, VetSummaryRow,
   VetOwnerSearchInput, VetOwnerResultRow, VetOwnerSummaryCard,
   VetOwnerForm, VetPetForm, VetPetCardC, VetQuickActionsCard,
   VET_MOCK_OWNERS, VET_MOCK_PETS,
   VET_CONSULTATION_TYPES,
   vetCalcAge, vetGenderLabel, vetReproductiveLabel, vetWeightUnitLabel,
   vetFormatDateLong */

// ============================================================================
// PASO 1 — PasoPropietario.vue
// ============================================================================

function VetPasoPropietario() {
  const draft = useVetDraft();
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState([]);

  React.useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      const ql = q.toLowerCase();
      setResults(VET_MOCK_OWNERS.filter((o) =>
        o.name.toLowerCase().includes(ql)
        || o.document.toLowerCase().includes(ql)
        || o.phone.toLowerCase().includes(ql)
        || o.email.toLowerCase().includes(ql)
      ));
      setLoading(false);
    }, 260);
    return () => clearTimeout(t);
  }, [query]);

  const ownerCreating = draft.state.ownerCreating;
  const owner = draft.state.owner;
  const mode = ownerCreating ? 'creating'
    : draft.state.petCreating ? 'petCreating'
    : owner ? 'selected' : 'search';
  const pets = owner ? (VET_MOCK_PETS[owner.id] || []) : [];
  const selectedPet = draft.state.pet;

  function pick(o) { draft.setOwner(o); }
  function startCreate() { draft.startCreatingOwner({ name: query.trim() }); }
  function changeOwner() { draft.setOwner(null); setQuery(''); }

  return (
    <VetContentWrap>
      {mode === 'search' && (
        <>
          <VetPageHeading
            title="¿Quién es el propietario?"
            subtitle="Busca por nombre, documento, teléfono o email. Si es nuevo, regístralo."
          />
          <VetSectionCard padded={false}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--warm-200)' }}>
              <VetOwnerSearchInput
                value={query} onChange={setQuery}
                resultsCount={results.length}
                onEnter={() => results.length === 1 && pick(results[0])}
                autoFocus
              />
            </div>

            {!query ? (
              <div className="vet-paso1-empty">
                <div className="vet-paso1-empty-ic">
                  <VetIcons.User size={26} strokeWidth={1.6} />
                </div>
                <div className="vet-paso1-empty-title">Empieza buscando un propietario</div>
                <p className="vet-paso1-empty-desc">
                  Escribe el nombre, documento o teléfono. Si no existe, podrás crearlo desde aquí mismo.
                </p>
                <button type="button" className="vet-btn-create" onClick={startCreate}>
                  <VetIcons.Plus size={14} strokeWidth={1.6} />
                  <span>Registrar nuevo propietario</span>
                </button>
              </div>
            ) : loading ? (
              <div className="vet-paso1-loading">Buscando…</div>
            ) : results.length > 0 ? (
              <div>
                {results.map((o) => (
                  <VetOwnerResultRow
                    key={o.id} owner={o} petCount={(VET_MOCK_PETS[o.id] || []).length}
                    onSelect={() => pick(o)}
                  />
                ))}
                <button type="button" className="vet-paso1-notfound" onClick={startCreate}>
                  <div className="vet-paso1-nf-ic">
                    <VetIcons.Plus size={15} strokeWidth={1.6} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="vet-paso1-nf-title">¿No encuentras a "{query}"?</div>
                    <div className="vet-paso1-nf-sub">Registra un propietario nuevo</div>
                  </div>
                  <VetIcons.ArrowRight size={14} strokeWidth={1.6} style={{ color: 'var(--warm-500)' }} />
                </button>
              </div>
            ) : (
              <div className="vet-paso1-empty">
                <div style={{ fontSize: 13.5, color: 'var(--warm-600)', marginBottom: 14 }}>
                  Sin resultados para "<strong>{query}</strong>"
                </div>
                <button type="button" className="vet-btn-create" onClick={startCreate}>
                  <VetIcons.Plus size={14} strokeWidth={1.6} />
                  <span>Registrar a "{query}"</span>
                </button>
              </div>
            )}
          </VetSectionCard>
        </>
      )}

      {mode === 'selected' && owner && (
        <>
          <VetPageHeading
            title="¿Quién es el propietario?"
            subtitle="Confirma el propietario y selecciona la mascota a atender."
          />
          <VetOwnerSummaryCard owner={owner} petCount={(VET_MOCK_PETS[owner.id] || []).length} onChange={changeOwner} />

          <div style={{ marginTop: 22 }}>
            <div className="vet-paso1-pethead">
              <h3 className="vet-paso1-pettitle">Mascota a atender</h3>
              <span className="vet-paso1-petsub">
                {pets.length === 0 ? 'Sin mascotas registradas' : `${pets.length} ${pets.length === 1 ? 'mascota' : 'mascotas'}`}
              </span>
            </div>

            {pets.length === 0 ? (
              <div className="vet-paso1-petempty">
                <VetIcons.PawPrint size={22} strokeWidth={1.6} />
                <span style={{ flex: 1 }}>{owner.name.split(' ')[0]} aún no tiene mascotas registradas.</span>
                <button type="button" className="vet-btn-create" onClick={() => draft.startCreatingPet()}>
                  <VetIcons.Plus size={14} strokeWidth={1.6} />
                  <span>Registrar mascota</span>
                </button>
              </div>
            ) : (
              <div className="vet-pet-grid-c">
                {pets.map((p) => (
                  <VetPetCardC
                    key={p.id} pet={p}
                    selected={selectedPet?.id === p.id}
                    onSelect={() => draft.setPet(p)}
                  />
                ))}
                <button type="button" className="vet-add-pet" onClick={() => draft.startCreatingPet()}>
                  <VetIcons.Plus size={20} strokeWidth={1.6} />
                  <span>Registrar nueva mascota</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {mode === 'creating' && ownerCreating && (
        <>
          <VetPageHeading
            title="Registrar nuevo propietario"
            subtitle="Completa los datos. Podrás editarlos después desde su ficha."
          />
          <VetOwnerForm data={ownerCreating} onUpdate={draft.updateOwnerCreating} />
        </>
      )}

      {mode === 'petCreating' && draft.state.petCreating && (
        <>
          <div className="vet-paso2-create-head">
            <VetPageHeading
              title="Registrar nueva mascota"
              subtitle="Datos básicos para crear el expediente. Los detalles clínicos se agregan en cada consulta."
            />
            {pets.length > 0 && (
              <button type="button" className="vet-back-list" onClick={() => draft.cancelCreatingPet()}>
                ← Ver mascotas existentes
              </button>
            )}
          </div>
          <VetPetForm data={draft.state.petCreating} onUpdate={draft.updatePetCreating} />
        </>
      )}
    </VetContentWrap>
  );
}

// ============================================================================
// PASO 2 — PasoMascota.vue
// ============================================================================

function VetPasoMascota() {
  const draft = useVetDraft();
  const owner = draft.state.owner;
  const pets = owner ? (VET_MOCK_PETS[owner.id] || []) : [];
  const petCreating = draft.state.petCreating;
  const selectedPet = draft.state.pet;
  const mode = petCreating ? 'creating' : pets.length === 0 ? 'empty' : 'list';

  function pick(p) { draft.setPet(p); }
  function startCreate() { draft.startCreatingPet(); }
  function backToList() { draft.cancelCreatingPet(); }
  function editOwner() { draft.setStep(1); }

  return (
    <VetContentWrap>
      {owner && (
        <VetOwnerHeaderC owner={owner} petCount={pets.length} onEdit={editOwner} />
      )}

      {mode === 'list' && (
        <>
          <VetPageHeading
            title="Selecciona la mascota"
            subtitle="Elige la mascota que será atendida en esta consulta, o registra una nueva."
          />
          <div className="vet-pet-grid-c">
            {pets.map((p) => (
              <VetPetCardC
                key={p.id} pet={p}
                selected={selectedPet?.id === p.id}
                onSelect={() => pick(p)}
              />
            ))}
            <button type="button" className="vet-add-pet" onClick={startCreate}>
              <div className="vet-add-pet-ic">
                <VetIcons.Plus size={18} strokeWidth={1.6} />
              </div>
              <div className="vet-add-pet-title">Nueva mascota</div>
              <div className="vet-add-pet-sub">
                Registrar mascota a nombre de {owner?.name.split(' ')[0]}
              </div>
            </button>
          </div>
        </>
      )}

      {mode === 'empty' && (
        <>
          <VetPageHeading
            title="Selecciona la mascota"
            subtitle="Este propietario aún no tiene mascotas registradas."
          />
          <VetSectionCard padded={false}>
            <div className="vet-paso2-empty">
              <div className="vet-paso2-empty-ic">
                <VetIcons.PawPrint size={30} strokeWidth={1.5} />
              </div>
              <div className="vet-paso2-empty-title">Sin mascotas registradas</div>
              <p className="vet-paso2-empty-desc">
                Registra la primera mascota de {owner?.name.split(' ')[0]} para poder iniciar la consulta.
              </p>
              <button type="button" className="vet-btn-create-primary" onClick={startCreate}>
                <VetIcons.Plus size={14} strokeWidth={1.6} />
                <span>Registrar primera mascota</span>
              </button>
            </div>
          </VetSectionCard>
        </>
      )}

      {mode === 'creating' && petCreating && (
        <>
          <div className="vet-paso2-create-head">
            <VetPageHeading
              title="Registrar nueva mascota"
              subtitle="Datos básicos para crear el expediente. Los detalles clínicos se agregan en cada consulta."
            />
            {pets.length > 0 && (
              <button type="button" className="vet-back-list" onClick={backToList}>
                ← Ver mascotas existentes
              </button>
            )}
          </div>
          <VetPetForm data={petCreating} onUpdate={draft.updatePetCreating} />
        </>
      )}
    </VetContentWrap>
  );
}

// ============================================================================
// PASO 3 — PasoConsulta.vue
// ============================================================================

function VetPasoConsulta({ onOpenModal }) {
  const draft = useVetDraft();
  const c = draft.state.consultation;
  const u = (p) => draft.updateConsultation(p);

  React.useEffect(() => {
    if (!c.typeId) { draft.setConsultationType(null); return; }
    const found = VET_CONSULTATION_TYPES.find((t) => t.id === c.typeId);
    if (found) draft.setConsultationType(found);
  }, [c.typeId]); // eslint-disable-line

  const counts = {
    receta: draft.state.prescriptions.length,
    lab: draft.state.laboratoryTests.length,
    imaging: draft.state.diagnosticImagings.length,
    vaccination: draft.state.vaccinations.length,
    hospitalization: draft.state.hospitalizations.length,
    deworming: draft.state.dewormings.length,
    surgery: draft.state.surgeries.length,
  };
  const total = draft.actionsCount;

  return (
    <VetContentWrap>
      {draft.state.owner && draft.state.pet && (
        <VetContextHeader owner={draft.state.owner} pet={draft.state.pet} />
      )}
      <VetPageHeading
        title="Datos de la consulta"
        subtitle="Solo el tipo y la anamnesis son obligatorios. Lo demás puedes completarlo durante la atención."
      />

      <div className="vet-paso3-stack">
        <VetSectionCard accent Icon={VetIcons.FileText} title="Información general">
          <div className="vet-grid-1-2">
            <VetBaseField label="Fecha" required>
              {({ id }) => <VetDateInput id={id} value={c.date} onChange={(v) => u({ date: v })} />}
            </VetBaseField>
            <VetBaseField label="Tipo de consulta" required>
              {({ id }) => (
                <VetBaseSelect id={id} value={c.typeId}
                  onChange={(v) => u({ typeId: v })}
                  options={VET_CONSULTATION_TYPES}
                  placeholder="Selecciona un tipo" />
              )}
            </VetBaseField>
          </div>
        </VetSectionCard>

        <VetSectionCard Icon={VetIcons.FileText} title="Anamnesis" subtitle="Lo que reporta el dueño · Antecedentes">
          <VetBaseTextarea value={c.anamnesis} onChange={(v) => u({ anamnesis: v })}
            rows={4} placeholder="Motivo de consulta, signos observados, antecedentes relevantes…" />
        </VetSectionCard>

        <VetSectionCard Icon={VetIcons.FileText} title="Diagnóstico" subtitle="Presuntivo o definitivo · Diferenciales">
          <VetBaseTextarea value={c.diagnosis} onChange={(v) => u({ diagnosis: v })}
            rows={3} placeholder="Diagnóstico presuntivo, diferenciales considerados…" />
        </VetSectionCard>

        <div className="vet-grid-1-1">
          <VetSectionCard Icon={VetIcons.Beaker} title="Plan diagnóstico" subtitle="Exámenes complementarios">
            <VetBaseTextarea value={c.diagnosticPlan} onChange={(v) => u({ diagnosticPlan: v })}
              rows={4} placeholder="Hemograma, bioquímica, ecografía abdominal…" />
          </VetSectionCard>
          <VetSectionCard Icon={VetIcons.Syringe} title="Plan terapéutico" subtitle="Tratamiento e indicaciones">
            <VetBaseTextarea value={c.therapeuticPlan} onChange={(v) => u({ therapeuticPlan: v })}
              rows={4} placeholder="Medicación, indicaciones para el dueño, dieta…" />
          </VetSectionCard>
        </div>

        <VetSectionCard Icon={VetIcons.Calendar} title="Próximo control" subtitle="Opcional">
          <div className="vet-grid-1-2">
            <VetBaseField label="Fecha sugerida">
              {({ id }) => <VetDateInput id={id} value={c.nextControlDate} onChange={(v) => u({ nextControlDate: v })} />}
            </VetBaseField>
            <VetBaseField label="Notas para el control">
              {({ id }) => (
                <VetBaseInput id={id} value={c.nextControlNotes}
                  onChange={(v) => u({ nextControlNotes: v })}
                  placeholder="Ej. revisar evolución del apetito, control de peso" />
              )}
            </VetBaseField>
          </div>
        </VetSectionCard>

        <VetQuickActionsCard counts={counts} onSelect={onOpenModal} />

        {total > 0 && (
          <div className="vet-actions-banner">
            ✦
            <span>
              <strong>{total}</strong> acción{total === 1 ? '' : 'es'} generada{total === 1 ? '' : 's'} · se guardarán al confirmar la consulta.
            </span>
          </div>
        )}
      </div>
    </VetContentWrap>
  );
}

// ============================================================================
// PASO 4 — PasoResumen.vue
// ============================================================================

function VetPasoResumen({ onEditStep }) {
  const draft = useVetDraft();
  const { owner, pet, consultation: c, consultationType } = draft.state;
  const optionalEmpty = !c.diagnosis.trim() || !c.diagnosticPlan.trim() || !c.therapeuticPlan.trim();

  const petData = pet
    ? `${vetGenderLabel(pet.gender)} · ${vetCalcAge(pet.bod)} · ${pet.weight} ${vetWeightUnitLabel(pet.weightType)} · ${vetReproductiveLabel(pet.reproductiveState)}`
    : '';

  const dateAndType = (() => {
    const d = vetFormatDateLong(c.date);
    const t = consultationType?.name;
    if (d && t) return `${d} · ${t}`;
    return d || t || '—';
  })();

  const EditBtn = ({ step }) => (
    <button type="button" className="vet-ghost-btn" onClick={() => onEditStep(step)}>
      <VetIcons.Edit size={12} strokeWidth={1.7} />
      <span>Editar</span>
    </button>
  );

  return (
    <VetContentWrap>
      <VetPageHeading
        title="Revisa antes de guardar"
        subtitle="Verifica que todo esté correcto. Puedes editar cualquier sección antes de confirmar."
      />
      <div className="vet-paso4-stack">
        <VetSectionCard accent Icon={VetIcons.User} title="Propietario" action={<EditBtn step={1} />}>
          <VetSummaryRow label="Nombre" value={owner?.name} />
          <VetSummaryRow label="Documento" value={owner?.document} />
          <VetSummaryRow label="Contacto" value={owner ? `${owner.phone}${owner.email ? ' · ' + owner.email : ''}` : ''} />
          <VetSummaryRow label="Dirección" value={owner?.address ?? ''} last />
        </VetSectionCard>

        <VetSectionCard Icon={VetIcons.PawPrint} title="Mascota" action={<EditBtn step={2} />}>
          <VetSummaryRow label="Nombre" value={pet ? `${pet.name} · ${pet.code}` : ''} />
          <VetSummaryRow label="Especie / Raza" value={pet ? `${pet.specie.name} · ${pet.breed.name}` : ''} />
          <VetSummaryRow label="Datos" value={petData} />
          <VetSummaryRow label="Color" value={pet?.color ?? ''} empty={!pet?.color} last />
        </VetSectionCard>

        <VetSectionCard Icon={VetIcons.FileText} title="Consulta" action={<EditBtn step={3} />}>
          <VetSummaryRow label="Fecha · Tipo" value={dateAndType} />
          <VetSummaryRow label="Anamnesis"        value={c.anamnesis}      empty={!c.anamnesis.trim()} />
          <VetSummaryRow label="Diagnóstico"      value={c.diagnosis}      empty={!c.diagnosis.trim()} />
          <VetSummaryRow label="Plan diagnóstico" value={c.diagnosticPlan} empty={!c.diagnosticPlan.trim()} />
          <VetSummaryRow label="Plan terapéutico" value={c.therapeuticPlan} empty={!c.therapeuticPlan.trim()} />
          <VetSummaryRow
            label="Próximo control"
            value={c.nextControlDate
              ? vetFormatDateLong(c.nextControlDate) + (c.nextControlNotes ? ' · ' + c.nextControlNotes : '')
              : ''}
            empty={!c.nextControlDate} last
          />
        </VetSectionCard>

        {draft.actionsCount > 0 && (
          <VetSectionCard Icon={VetIcons.Plus} title="Acciones generadas">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {draft.state.prescriptions.length > 0 && <VetChip variant="accent">💊 {draft.state.prescriptions.length} receta{draft.state.prescriptions.length === 1 ? '' : 's'}</VetChip>}
              {draft.state.laboratoryTests.length > 0 && <VetChip variant="accent">🧪 {draft.state.laboratoryTests.length} lab</VetChip>}
              {draft.state.diagnosticImagings.length > 0 && <VetChip variant="accent">🩻 {draft.state.diagnosticImagings.length} imagen</VetChip>}
              {draft.state.vaccinations.length > 0 && <VetChip variant="accent">💉 {draft.state.vaccinations.length} vacuna{draft.state.vaccinations.length === 1 ? '' : 's'}</VetChip>}
              {draft.state.hospitalizations.length > 0 && <VetChip variant="accent">🏥 {draft.state.hospitalizations.length} hosp</VetChip>}
              {draft.state.dewormings.length > 0 && <VetChip variant="accent">🪱 {draft.state.dewormings.length} desp</VetChip>}
              {draft.state.surgeries.length > 0 && <VetChip variant="accent">🔪 {draft.state.surgeries.length} cirugía{draft.state.surgeries.length === 1 ? '' : 's'}</VetChip>}
            </div>
          </VetSectionCard>
        )}

        {optionalEmpty && (
          <div className="vet-paso4-warn">
            ⚠
            <span>
              Diagnóstico y planes están vacíos. Puedes guardar la consulta así y completarlos durante la atención.
            </span>
          </div>
        )}
      </div>
    </VetContentWrap>
  );
}

Object.assign(window, {
  VetPasoPropietario, VetPasoMascota, VetPasoConsulta, VetPasoResumen,
});
