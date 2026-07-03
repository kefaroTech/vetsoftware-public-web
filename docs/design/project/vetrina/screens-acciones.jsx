/* global React, VetIcons, VetModalShell,
   VetBaseField, VetBaseInput, VetBaseTextarea, VetBaseSelect, VetDateInput,
   VET_MOCK_OWNERS, VET_MOCK_PETS,
   VET_VACCINATION_TYPES, VET_LAB_TYPES, VET_IMAGING_TYPES, VET_SURGERY_TYPES,
   VET_ACCIONES_LAB, VET_ACCIONES_IMAGING, VET_ACCIONES_VAC,
   VET_ACCIONES_HOSP, VET_ACCIONES_DEWORM, VET_ACCIONES_SURG,
   VET_ACCIONES_SPA, VET_SPA_TYPES,
   vetTodayISO, vetFormatDateShort,
   useVetToast */

// ============================================================================
// PatientCascadePicker
// ============================================================================

function VetPatientCascadePicker({ onSelect }) {
  const [ownerQuery, setOwnerQuery] = React.useState('');
  const [ownerResults, setOwnerResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [selectedOwner, setSelectedOwner] = React.useState(null);
  const [selectedAnimal, setSelectedAnimal] = React.useState(null);
  const [extraOwners, setExtraOwners] = React.useState([]);
  const [extraPets, setExtraPets] = React.useState([]);
  const [ownerForm, setOwnerForm] = React.useState(false);
  const [of, setOf] = React.useState({ name: '', document: '', phone: '', email: '', address: '', countryId: '', stateId: '', cityId: '' });
  const ofu = (p) => setOf((x) => ({ ...x, ...p }));
  const [petForm, setPetForm] = React.useState(false);
  const [pf, setPf] = React.useState({ name: '', specieId: '', breedId: '', colorId: '', gender: '', bod: '', weight: '', weightType: 'KILOGRAMS', reproductiveState: '' });
  const pfu = (p) => setPf((x) => ({ ...x, ...p }));

  React.useEffect(() => {
    const q = ownerQuery.trim();
    if (!q) { setOwnerResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      const ql = q.toLowerCase();
      const all = [...VET_MOCK_OWNERS, ...extraOwners];
      setOwnerResults(all.filter((o) =>
        o.name.toLowerCase().includes(ql)
        || (o.document || '').toLowerCase().includes(ql)
        || (o.phone || '').toLowerCase().includes(ql)
      ));
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [ownerQuery, extraOwners]);

  function pickOwner(o) {
    setSelectedOwner(o);
    setOwnerQuery('');
    setSelectedAnimal(null);
    setPetForm(false);
  }
  function clearOwner() {
    setSelectedOwner(null); setSelectedAnimal(null); setPetForm(false);
  }
  function pickAnimal(a) {
    setSelectedAnimal(a);
    onSelect({ owner: selectedOwner, animal: a });
  }
  function openOwnerForm() {
    setOf({ name: ownerQuery.trim(), document: '', phone: '', email: '', address: '', countryId: '', stateId: '', cityId: '' });
    setOwnerForm(true);
  }
  function saveOwner() {
    if (!of.name.trim() || !of.document.trim() || !of.phone.trim() || !of.countryId || !of.stateId || !of.cityId) return;
    const o = { id: 'newo-' + Date.now().toString(36), name: of.name.trim(), document: of.document.trim(), phone: of.phone.trim(), email: of.email.trim(), address: of.address.trim(), _new: true };
    setExtraOwners((a) => [...a, o]);
    setOwnerForm(false);
    pickOwner(o);
  }
  function openPetForm() {
    setPf({ name: '', specieId: '', breedId: '', colorId: '', gender: '', bod: '', weight: '', weightType: 'KILOGRAMS', reproductiveState: '' });
    setPetForm(true);
  }
  function petValid() {
    const p = pf;
    return p.name.trim() && p.specieId && p.breedId && p.colorId && p.gender && p.bod && p.weight.trim() && p.reproductiveState;
  }
  function savePet() {
    if (!petValid()) return;
    const specie = (VET_SPECIES.find((s) => s.id === pf.specieId) || {}).name || '—';
    const breed = ((VET_BREEDS_BY_SPECIE[pf.specieId] || []).find((b) => b.id === pf.breedId) || {}).name || '—';
    const a = { id: 'newp-' + Date.now().toString(36), name: pf.name.trim(), specie: { name: specie }, breed: { name: breed }, gender: pf.gender, bod: pf.bod, weight: pf.weight, weightType: pf.weightType, reproductiveState: pf.reproductiveState, _ownerId: selectedOwner?.id, _new: true };
    setExtraPets((arr) => [...arr, a]);
    setPetForm(false);
    pickAnimal(a);
  }

  const baseAnimals = selectedOwner ? (VET_MOCK_PETS[selectedOwner.id] || []) : [];
  const animals = selectedOwner ? [...baseAnimals, ...extraPets.filter((p) => p._ownerId === selectedOwner.id)] : [];

  return (
    <div className="vet-picker">
      {!selectedOwner ? (
        <div className="vet-picker-step">
          <label className="vet-picker-hint">Propietario</label>
          {ownerForm ? (
            <div className="vet-picker-form">
              <VetOwnerForm data={of} onUpdate={ofu} />
              <div className="vet-picker-form-actions">
                <button type="button" className="vet-btn-ghost-modal" onClick={() => setOwnerForm(false)}>Cancelar</button>
                <button type="button" className="vet-btn-primary-modal"
                  disabled={!of.name.trim() || !of.document.trim() || !of.phone.trim() || !of.countryId || !of.stateId || !of.cityId}
                  style={(!of.name.trim() || !of.document.trim() || !of.phone.trim() || !of.countryId || !of.stateId || !of.cityId) ? { opacity: 0.5, cursor: 'not-allowed' } : null}
                  onClick={saveOwner}>Crear y seleccionar</button>
              </div>
            </div>
          ) : (
            <>
              <div className="vet-picker-search">
                <VetIcons.Search size={14} strokeWidth={1.7} />
                <input
                  type="text"
                  value={ownerQuery}
                  onChange={(e) => setOwnerQuery(e.target.value)}
                  placeholder="Buscar por nombre o documento…"
                />
              </div>
              {searching && <div className="vet-picker-state">Buscando…</div>}
              {!searching && ownerQuery && ownerResults.length === 0 && (
                <div className="vet-picker-empty">
                  <span>Sin resultados para "<strong>{ownerQuery.trim()}</strong>"</span>
                  <button type="button" className="vet-cpk-newbtn" onClick={openOwnerForm}>
                    <VetIcons.Plus size={15} strokeWidth={2.2} /> Crear cliente nuevo
                  </button>
                </div>
              )}
              {ownerResults.length > 0 && (
                <div className="vet-picker-results">
                  {ownerResults.map((o) => (
                    <button key={o.id} type="button" className="vet-picker-result" onClick={() => pickOwner(o)}>
                      <div className="vet-picker-avatar">
                        <VetIcons.User size={14} strokeWidth={1.7} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="vet-picker-name">{o.name}</div>
                        <div className="vet-picker-meta">{o.document} · {o.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="vet-cpk-newbtn ghost" onClick={openOwnerForm}>
                <VetIcons.Plus size={15} strokeWidth={2.2} /> Crear cliente nuevo
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="vet-picker-step">
          <div className="vet-picker-picked">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="vet-picker-badge">
                <VetIcons.User size={13} strokeWidth={1.7} />
              </div>
              <div>
                <div className="vet-picker-picked-name">{selectedOwner.name}</div>
                <div className="vet-picker-picked-meta">{selectedOwner.document}</div>
              </div>
            </div>
            <button type="button" className="vet-picker-link" onClick={clearOwner}>
              <VetIcons.X size={12} strokeWidth={1.8} /> Cambiar
            </button>
          </div>
          <label className="vet-picker-hint">Mascota</label>
          {petForm ? (
            <div className="vet-picker-form">
              <VetPetForm data={pf} onUpdate={pfu} />
              <div className="vet-picker-form-actions">
                <button type="button" className="vet-btn-ghost-modal" onClick={() => setPetForm(false)}>Cancelar</button>
                <button type="button" className="vet-btn-primary-modal" disabled={!petValid()}
                  style={!petValid() ? { opacity: 0.5, cursor: 'not-allowed' } : null}
                  onClick={savePet}>Crear y seleccionar</button>
              </div>
            </div>
          ) : (
            <>
              {animals.length === 0 ? (
                <div className="vet-picker-empty">
                  <span>Este propietario no tiene mascotas registradas</span>
                  <button type="button" className="vet-cpk-newbtn" onClick={openPetForm}>
                    <VetIcons.Plus size={15} strokeWidth={2.2} /> Registrar mascota nueva
                  </button>
                </div>
              ) : (
                <>
                  <div className="vet-picker-animals-grid">
                    {animals.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={'vet-picker-animal-card' + (selectedAnimal?.id === a.id ? ' selected' : '')}
                        onClick={() => pickAnimal(a)}
                      >
                        <div className="vet-picker-paw">
                          <VetIcons.PawPrint size={14} strokeWidth={1.7} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="vet-picker-name">{a.name}</div>
                          <div className="vet-picker-meta">{a.specie.name} · {a.breed.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="vet-cpk-newbtn ghost" onClick={openPetForm}>
                    <VetIcons.Plus size={15} strokeWidth={2.2} /> Registrar mascota nueva
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// OwnerAnimalBreadcrumb
// ============================================================================

function VetOwnerAnimalBreadcrumb({ owner, animal, onReset }) {
  return (
    <div className="vet-acc-breadcrumb">
      <div className="vet-acc-crumb">
        <div className="vet-acc-badge">
          <VetIcons.User size={13} strokeWidth={1.7} />
        </div>
        <span className="vet-acc-crumb-name">{owner.name}</span>
        <span className="vet-acc-crumb-meta">{owner.document}</span>
      </div>
      <VetIcons.ChevronRight size={14} strokeWidth={1.6} style={{ color: 'var(--warm-400)' }} />
      <div className="vet-acc-crumb">
        <div className="vet-acc-badge paw">
          <VetIcons.PawPrint size={13} strokeWidth={1.7} />
        </div>
        <span className="vet-acc-crumb-name">{animal.name}</span>
        <span className="vet-acc-crumb-meta">{animal.specie.name} · {animal.breed.name}</span>
      </div>
      <button type="button" className="vet-acc-reset" onClick={onReset}>
        <VetIcons.X size={12} strokeWidth={1.8} />
        Cambiar
      </button>
    </div>
  );
}

// ============================================================================
// ListBody (with simple pagination)
// ============================================================================

function VetListBody({ items, columns, renderRow, emptyText = 'No hay registros aún', placeholder = 'Buscar…', searchFn, pageSize = 8 }) {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchFn) return items;
    return items.filter((it) => searchFn(it, q));
  }, [items, query, searchFn]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  React.useEffect(() => { setPage(1); }, [query, filtered.length]);
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="vet-list-body">
      <div className="vet-list-search-row">
        <div className="vet-list-search">
          <VetIcons.Search size={14} strokeWidth={1.7} style={{ color: 'var(--warm-500)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="vet-list-state">{emptyText}</div>
      ) : (
        <>
          <table className="vet-list-table">
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={i} style={c.style}>{c.label}</th>
                ))}
                <th style={{ width: 88, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((item, i) => renderRow(item, i))}
            </tbody>
          </table>

          {pageCount > 1 && (
            <div className="vet-pagination">
              <span className="vet-pag-info">
                {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'} · página {page} de {pageCount}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="vet-pag-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <VetIcons.ChevronLeft size={14} />
                </button>
                <button type="button" className="vet-pag-btn" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
                  <VetIcons.ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// Generic ActionsListView
// ============================================================================

function VetAccionesListView({ kicker, title, lead, items, addRecord, removeRecord, columns, renderRow, detailFields, detailTitle, detailIcon, searchFn, placeholder, emptyText, ModalForm }) {
  const [selection, setSelection] = React.useState(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [viewing, setViewing] = React.useState(null);
  const [billingFor, setBillingFor] = React.useState(null); // { owner, pet } tras crear

  const filtered = selection
    ? items.filter((it) => it.animalId === selection.animal.id)
    : [];

  function onSaved(record) {
    if (editing) {
      removeRecord(editing.id);
      addRecord({ ...record, id: editing.id });
      setModalOpen(false);
      setEditing(null);
    } else {
      addRecord(record);
      setModalOpen(false);
      setEditing(null);
      // Tras crear un procedimiento nuevo, ofrecer facturarlo a cuenta abierta
      if (selection) setBillingFor({ owner: selection.owner, pet: selection.animal });
    }
  }

  function reset() { setSelection(null); }

  return (
    <div className="vet-acciones-page">
      <div className="vet-acciones-header">
        <div>
          <div className="vet-acciones-kicker">{kicker}</div>
          <h1 className="vet-acciones-title">{title}</h1>
          <div className="vet-acciones-lead">{lead}</div>
        </div>
        {selection && (
          <button type="button" className="vet-acciones-cta"
            onClick={() => { setEditing(null); setModalOpen(true); }}>
            <VetIcons.Plus size={16} strokeWidth={1.8} /> Nueva solicitud
          </button>
        )}
      </div>

      {!selection ? (
        <VetPatientCascadePicker onSelect={setSelection} />
      ) : (
        <>
          <VetOwnerAnimalBreadcrumb owner={selection.owner} animal={selection.animal} onReset={reset} />
          <VetListBody
            items={filtered}
            columns={columns}
            renderRow={(item) => renderRow(item, {
              onView:   () => setViewing(item),
              onEdit:   () => { setEditing(item); setModalOpen(true); },
              onDelete: () => removeRecord(item.id),
            })}
            searchFn={searchFn}
            placeholder={placeholder}
            emptyText={emptyText}
          />
        </>
      )}

      <ModalForm
        open={modalOpen}
        initial={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={onSaved}
        animal={selection?.animal}
      />

      <VetAccionDetailModal
        open={!!viewing}
        item={viewing}
        title={detailTitle}
        icon={detailIcon}
        fields={viewing && detailFields ? detailFields(viewing) : []}
        animal={selection?.animal}
        onClose={() => setViewing(null)}
        onEdit={() => {
          setEditing(viewing);
          setViewing(null);
          setModalOpen(true);
        }}
      />

      <VetConsultaBillingModal
        open={!!billingFor}
        owner={billingFor?.owner}
        pet={billingFor?.pet}
        heading={`Facturación · ${title}`}
        subtitle={billingFor ? `${billingFor.pet?.name} · ${billingFor.owner?.name}` : ''}
        autoConsulta={false}
        onClose={() => setBillingFor(null)}
        onFinish={() => setBillingFor(null)}
      />
    </div>
  );
}

// ============================================================================
// VetAccionDetailModal — Read-only detail view
// ============================================================================

function VetAccionDetailModal({ open, item, title, icon, fields, animal, onClose, onEdit }) {
  if (!open || !item) return null;
  return (
    <VetModalShell
      open={open}
      onClose={onClose}
      title={title || 'Detalle'}
      subtitle={animal ? `Paciente: ${animal.name}` : null}
      icon={icon}
      width={640}
      footerLeft={item.date ? `Registrado el ${vetFormatDateShort(item.date)}` : null}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cerrar</button>
          {onEdit && (
            <button type="button" className="vet-btn-primary-modal" onClick={onEdit}>
              <VetIcons.Edit size={13} strokeWidth={1.8} style={{ marginRight: 6 }} />
              Editar
            </button>
          )}
        </>
      }
    >
      <div className="vet-action-detail-grid">
        {fields.map((f, i) => (
          <div key={i} className={`vet-action-detail-field vet-action-detail-span-${f.span || 1}`}>
            <div className="vet-action-detail-label">{f.label}</div>
            <div className="vet-action-detail-value">
              {f.value === null || f.value === undefined || f.value === ''
                ? <em style={{ color: 'var(--warm-400)', fontStyle: 'italic', fontWeight: 400 }}>Sin completar</em>
                : f.value}
            </div>
          </div>
        ))}
      </div>
    </VetModalShell>
  );
}

// ============================================================================
// Helper: row action buttons
// ============================================================================

function VetRowActions({ onEdit, onDelete }) {
  return (
    <td style={{ textAlign: 'right' }}>
      <div className="vet-row-actions">
        <button type="button" className="vet-row-icon-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar">
          <VetIcons.Edit size={15} strokeWidth={1.7} />
        </button>
        <button type="button" className="vet-row-icon-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Eliminar">
          <VetIcons.Trash size={15} strokeWidth={1.7} />
        </button>
      </div>
    </td>
  );
}

// ============================================================================
// Form modal (standalone, edit-capable)
// ============================================================================

function VetAccionFormModal({ open, onClose, onSave, title, icon, accent = 'amatista', initial, animal, children, canSave, makeRecord }) {
  return (
    <VetModalShell
      open={open}
      onClose={onClose}
      title={initial ? title.replace('Nueva', 'Editar').replace('Nuevo', 'Editar').replace('Nuevo', 'Editar') : title}
      icon={icon}
      accent={accent}
      width={640}
      footerLeft={animal ? `Paciente: ${animal.name}` : null}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" onClick={() => onSave(makeRecord())} disabled={!canSave}>
            {initial ? 'Guardar cambios' : 'Crear'}
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">{children}</div>
    </VetModalShell>
  );
}

// ============================================================================
// Individual form modals (kept simple, reusing layouts)
// ============================================================================

function VetLabFormModal({ open, initial, onClose, onSave, animal }) {
  const [d, setD] = React.useState({ date: vetTodayISO(), testTypeId: '', quantity: 1, diagnosis: '', sampleCollected: false });
  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      const tt = VET_LAB_TYPES.find((t) => t.name === initial.testType?.name);
      setD({
        date: initial.date,
        testTypeId: tt?.id ?? '',
        quantity: initial.quantity,
        diagnosis: initial.diagnosis,
        sampleCollected: initial.status === 'PENDIENTE_POR_PROCESAR' || initial.status === 'COMPLETADO',
      });
    } else {
      setD({ date: vetTodayISO(), testTypeId: '', quantity: 1, diagnosis: '', sampleCollected: false });
    }
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  return (
    <VetAccionFormModal
      open={open} onClose={onClose} onSave={onSave}
      title="Nueva solicitud de laboratorio"
      icon={VetIcons.Beaker} animal={animal} initial={initial}
      canSave={!!d.testTypeId}
      makeRecord={() => {
        const tt = VET_LAB_TYPES.find((t) => String(t.id) === String(d.testTypeId));
        const status = initial?.status === 'COMPLETADO' || initial?.status === 'CANCELADO'
          ? initial.status
          : (d.sampleCollected ? 'PENDIENTE_POR_PROCESAR' : 'PENDIENTE');
        const { sampleCollected, ...rest } = d;
        return {
          ...rest,
          quantity: Number(d.quantity) || 1,
          testType: { name: tt?.name ?? '—' },
          status,
          animalId: animal?.id,
        };
      }}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Fecha" required>
          {({ id }) => <VetDateInput id={id} value={d.date} onChange={(v) => u({ date: v })} />}
        </VetBaseField>
        <VetBaseField label="Tipo de examen" required>
          {({ id }) => <VetBaseSelect id={id} value={d.testTypeId} onChange={(v) => u({ testTypeId: v })} options={VET_LAB_TYPES} />}
        </VetBaseField>
        <VetBaseField label="Cantidad">
          {({ id }) => <VetBaseInput id={id} type="number" value={d.quantity} onChange={(v) => u({ quantity: v })} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Diagnóstico / motivo">
        {({ id }) => <VetBaseTextarea id={id} value={d.diagnosis} onChange={(v) => u({ diagnosis: v })} rows={2} />}
      </VetBaseField>

      <label className={'vet-sample-collected' + (d.sampleCollected ? ' checked' : '')}>
        <span className={'vet-sample-collected-box' + (d.sampleCollected ? ' checked' : '')}>
          {d.sampleCollected && <VetIcons.Check size={12} strokeWidth={3} />}
        </span>
        <input
          type="checkbox"
          checked={d.sampleCollected}
          onChange={(e) => u({ sampleCollected: e.target.checked })}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
        <div>
          <div className="vet-sample-collected-title">La muestra ya fue recolectada</div>
          <div className="vet-sample-collected-desc">
            Marca esta opción si la muestra está tomada y solo falta procesarla en laboratorio.
            El estado pasará a <strong>Pendiente por procesar</strong>.
          </div>
        </div>
      </label>
    </VetAccionFormModal>
  );
}

function VetImagingFormModal({ open, initial, onClose, onSave, animal }) {
  const [d, setD] = React.useState({ date: vetTodayISO(), diagnosticImagingTypeId: '', studyType: '', clinicalSigns: '', diagnosis: '', observations: '' });
  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      const tt = VET_IMAGING_TYPES.find((t) => t.name === initial.diagnosticImagingType?.name);
      setD({ date: initial.date, diagnosticImagingTypeId: tt?.id ?? '', studyType: initial.studyType, clinicalSigns: initial.clinicalSigns ?? '', diagnosis: initial.diagnosis, observations: initial.observations });
    } else {
      setD({ date: vetTodayISO(), diagnosticImagingTypeId: '', studyType: '', clinicalSigns: '', diagnosis: '', observations: '' });
    }
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  return (
    <VetAccionFormModal
      open={open} onClose={onClose} onSave={onSave}
      title="Nueva solicitud de imagen Dx"
      icon={VetIcons.ScanLine} animal={animal} initial={initial}
      canSave={!!d.diagnosticImagingTypeId}
      makeRecord={() => {
        const tt = VET_IMAGING_TYPES.find((t) => String(t.id) === String(d.diagnosticImagingTypeId));
        return { ...d, diagnosticImagingType: { name: tt?.name ?? '—' }, animalId: animal?.id };
      }}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Fecha" required>
          {({ id }) => <VetDateInput id={id} value={d.date} onChange={(v) => u({ date: v })} />}
        </VetBaseField>
        <VetBaseField label="Tipo de imagen" required>
          {({ id }) => <VetBaseSelect id={id} value={d.diagnosticImagingTypeId} onChange={(v) => u({ diagnosticImagingTypeId: v })} options={VET_IMAGING_TYPES} />}
        </VetBaseField>
        <VetBaseField label="Tipo de estudio">
          {({ id }) => <VetBaseInput id={id} value={d.studyType} onChange={(v) => u({ studyType: v })} placeholder="Cadera AP + LL" />}
        </VetBaseField>
      </div>
      <VetBaseField label="Signos clínicos">
        {({ id }) => <VetBaseTextarea id={id} value={d.clinicalSigns} onChange={(v) => u({ clinicalSigns: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Diagnóstico">
        {({ id }) => <VetBaseTextarea id={id} value={d.diagnosis} onChange={(v) => u({ diagnosis: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Observaciones">
        {({ id }) => <VetBaseTextarea id={id} value={d.observations} onChange={(v) => u({ observations: v })} rows={2} />}
      </VetBaseField>
    </VetAccionFormModal>
  );
}

function VetVaccineFormModal({ open, initial, onClose, onSave, animal }) {
  const [d, setD] = React.useState({ date: vetTodayISO(), vaccinationTypeId: '', lot: '', notes: '', nextVaccination: '' });
  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      const tt = VET_VACCINATION_TYPES.find((t) => t.name === initial.vaccinationType?.name);
      setD({ date: initial.date, vaccinationTypeId: tt?.id ?? '', lot: initial.lot, notes: initial.notes ?? '', nextVaccination: initial.nextVaccination ?? '' });
    } else {
      setD({ date: vetTodayISO(), vaccinationTypeId: '', lot: '', notes: '', nextVaccination: '' });
    }
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  return (
    <VetAccionFormModal
      open={open} onClose={onClose} onSave={onSave}
      title="Nueva vacunación"
      icon={VetIcons.Syringe} animal={animal} initial={initial}
      canSave={!!d.vaccinationTypeId}
      makeRecord={() => {
        const tt = VET_VACCINATION_TYPES.find((t) => String(t.id) === String(d.vaccinationTypeId));
        return { ...d, vaccinationType: { name: tt?.name ?? '—' }, animalId: animal?.id };
      }}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Fecha" required>
          {({ id }) => <VetDateInput id={id} value={d.date} onChange={(v) => u({ date: v })} />}
        </VetBaseField>
        <VetBaseField label="Tipo de vacuna" required>
          {({ id }) => <VetBaseSelect id={id} value={d.vaccinationTypeId} onChange={(v) => u({ vaccinationTypeId: v })} options={VET_VACCINATION_TYPES} />}
        </VetBaseField>
        <VetBaseField label="Lote">
          {({ id }) => <VetBaseInput id={id} value={d.lot} onChange={(v) => u({ lot: v })} placeholder="VT-99221" />}
        </VetBaseField>
        <VetBaseField label="Próxima vacunación">
          {({ id }) => <VetDateInput id={id} value={d.nextVaccination} onChange={(v) => u({ nextVaccination: v })} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Notas">
        {({ id }) => <VetBaseTextarea id={id} value={d.notes} onChange={(v) => u({ notes: v })} rows={2} />}
      </VetBaseField>
    </VetAccionFormModal>
  );
}

const VET_HOSP_TYPE_OPT = [
  { value: 'HOSPITALIZATION', label: 'Hospitalización' },
  { value: 'OUTPATIENT', label: 'Ambulatoria' },
];
const VET_REASON_LEAVING_OPT = [
  { value: 'MEDICAL_DISCHARGE', label: 'Alta médica' },
  { value: 'HOME_TREATMENT', label: 'Tratamiento en casa' },
  { value: 'TRANSFER', label: 'Traslado' },
  { value: 'TUTOR_WISH', label: 'Deseo del tutor' },
  { value: 'ADMIN', label: 'Administrativa' },
  { value: 'DEATH', label: 'Fallecimiento' },
  { value: 'EUTHANASIA', label: 'Eutanasia' },
];

function VetHospFormModal({ open, initial, onClose, onSave, animal }) {
  const [d, setD] = React.useState({ type: 'HOSPITALIZATION', startDate: '', endDate: '', reason: '', reasonLeaving: '', observations: '' });
  React.useEffect(() => {
    if (!open) return;
    if (initial) setD({ ...initial });
    else setD({ type: 'HOSPITALIZATION', startDate: vetTodayISO(), endDate: '', reason: '', reasonLeaving: '', observations: '' });
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  return (
    <VetAccionFormModal
      open={open} onClose={onClose} onSave={onSave}
      title="Nueva hospitalización"
      icon={VetIcons.BedDouble} accent="warn" animal={animal} initial={initial}
      canSave={!!d.startDate && !!d.reason.trim()}
      makeRecord={() => ({ ...d, date: d.startDate, animalId: animal?.id })}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Tipo" required>
          {({ id }) => <VetBaseSelect id={id} value={d.type} onChange={(v) => u({ type: v })} options={VET_HOSP_TYPE_OPT} />}
        </VetBaseField>
        <VetBaseField label="Inicio" required>
          {({ id }) => <VetDateInput id={id} value={d.startDate} onChange={(v) => u({ startDate: v })} />}
        </VetBaseField>
        <VetBaseField label="Fin">
          {({ id }) => <VetDateInput id={id} value={d.endDate} onChange={(v) => u({ endDate: v })} />}
        </VetBaseField>
        <VetBaseField label="Motivo de egreso">
          {({ id }) => <VetBaseSelect id={id} value={d.reasonLeaving} onChange={(v) => u({ reasonLeaving: v })} options={VET_REASON_LEAVING_OPT} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Motivo" required>
        {({ id }) => <VetBaseTextarea id={id} value={d.reason} onChange={(v) => u({ reason: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Observaciones">
        {({ id }) => <VetBaseTextarea id={id} value={d.observations} onChange={(v) => u({ observations: v })} rows={2} />}
      </VetBaseField>
    </VetAccionFormModal>
  );
}

const VET_DEWORM_OPT = [
  { value: 'INTERNAL', label: 'Interna' },
  { value: 'EXTERNAL', label: 'Externa' },
  { value: 'MIX', label: 'Mixta' },
  { value: 'OTHER', label: 'Otra' },
];

function VetDewormFormModal({ open, initial, onClose, onSave, animal }) {
  const [d, setD] = React.useState({ date: vetTodayISO(), type: 'INTERNAL', product: '', dosage: '', lastDeworming: '', nextControl: '', observations: '' });
  React.useEffect(() => {
    if (!open) return;
    if (initial) setD({ ...initial });
    else setD({ date: vetTodayISO(), type: 'INTERNAL', product: '', dosage: '', lastDeworming: '', nextControl: '', observations: '' });
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  return (
    <VetAccionFormModal
      open={open} onClose={onClose} onSave={onSave}
      title="Nueva desparasitación"
      icon={VetIcons.Bug} animal={animal} initial={initial}
      canSave={!!d.product.trim()}
      makeRecord={() => ({ ...d, animalId: animal?.id })}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Fecha" required>
          {({ id }) => <VetDateInput id={id} value={d.date} onChange={(v) => u({ date: v })} />}
        </VetBaseField>
        <VetBaseField label="Tipo" required>
          {({ id }) => <VetBaseSelect id={id} value={d.type} onChange={(v) => u({ type: v })} options={VET_DEWORM_OPT} />}
        </VetBaseField>
        <VetBaseField label="Producto" required>
          {({ id }) => <VetBaseInput id={id} value={d.product} onChange={(v) => u({ product: v })} placeholder="Drontal Cat" />}
        </VetBaseField>
        <VetBaseField label="Dosis">
          {({ id }) => <VetBaseInput id={id} value={d.dosage} onChange={(v) => u({ dosage: v })} placeholder="1 tableta" />}
        </VetBaseField>
        <VetBaseField label="Última desparasitación">
          {({ id }) => <VetDateInput id={id} value={d.lastDeworming} onChange={(v) => u({ lastDeworming: v })} />}
        </VetBaseField>
        <VetBaseField label="Próximo control">
          {({ id }) => <VetDateInput id={id} value={d.nextControl} onChange={(v) => u({ nextControl: v })} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Observaciones">
        {({ id }) => <VetBaseTextarea id={id} value={d.observations} onChange={(v) => u({ observations: v })} rows={2} />}
      </VetBaseField>
    </VetAccionFormModal>
  );
}

function VetSurgeryFormModal({ open, initial, onClose, onSave, animal }) {
  const [d, setD] = React.useState({ date: vetTodayISO(), surgeryTypeId: '', description: '', medicament: '', observations: '', complications: '' });
  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      const tt = VET_SURGERY_TYPES.find((t) => t.name === initial.surgeryType?.name);
      setD({ date: initial.date, surgeryTypeId: tt?.id ?? '', description: initial.description, medicament: initial.medicament, observations: initial.observations, complications: initial.complications });
    } else {
      setD({ date: vetTodayISO(), surgeryTypeId: '', description: '', medicament: '', observations: '', complications: '' });
    }
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  return (
    <VetAccionFormModal
      open={open} onClose={onClose} onSave={onSave}
      title="Nueva cirugía"
      icon={VetIcons.Scissors} accent="danger" animal={animal} initial={initial}
      canSave={!!d.surgeryTypeId}
      makeRecord={() => {
        const tt = VET_SURGERY_TYPES.find((t) => String(t.id) === String(d.surgeryTypeId));
        return { ...d, surgeryType: { name: tt?.name ?? '—' }, animalId: animal?.id };
      }}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Fecha" required>
          {({ id }) => <VetDateInput id={id} value={d.date} onChange={(v) => u({ date: v })} />}
        </VetBaseField>
        <VetBaseField label="Tipo de cirugía" required>
          {({ id }) => <VetBaseSelect id={id} value={d.surgeryTypeId} onChange={(v) => u({ surgeryTypeId: v })} options={VET_SURGERY_TYPES} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Descripción">
        {({ id }) => <VetBaseTextarea id={id} value={d.description} onChange={(v) => u({ description: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Medicamento / anestesia">
        {({ id }) => <VetBaseTextarea id={id} value={d.medicament} onChange={(v) => u({ medicament: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Observaciones">
        {({ id }) => <VetBaseTextarea id={id} value={d.observations} onChange={(v) => u({ observations: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Complicaciones">
        {({ id }) => <VetBaseTextarea id={id} value={d.complications} onChange={(v) => u({ complications: v })} rows={2} />}
      </VetBaseField>
    </VetAccionFormModal>
  );
}

function VetSpaFormModal({ open, initial, onClose, onSave, animal }) {
  const [d, setD] = React.useState({ date: vetTodayISO(), spaTypeId: '', reason: '', details: '', observations: '' });
  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      const tt = VET_SPA_TYPES.find((t) => t.name === initial.spaType?.name);
      setD({ date: initial.date, spaTypeId: tt?.id ?? '', reason: initial.reason, details: initial.details, observations: initial.observations });
    } else {
      setD({ date: vetTodayISO(), spaTypeId: '', reason: '', details: '', observations: '' });
    }
  }, [open, initial]);
  const u = (p) => setD((x) => ({ ...x, ...p }));
  return (
    <VetAccionFormModal
      open={open} onClose={onClose} onSave={onSave}
      title="Nuevo servicio de Spa"
      icon={VetIcons.Sparkles} animal={animal} initial={initial}
      canSave={!!d.spaTypeId}
      makeRecord={() => {
        const tt = VET_SPA_TYPES.find((t) => String(t.id) === String(d.spaTypeId));
        return { ...d, spaType: { name: tt?.name ?? '—' }, animalId: animal?.id };
      }}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Fecha" required>
          {({ id }) => <VetDateInput id={id} value={d.date} onChange={(v) => u({ date: v })} />}
        </VetBaseField>
        <VetBaseField label="Tipo de servicio" required>
          {({ id }) => <VetBaseSelect id={id} value={d.spaTypeId} onChange={(v) => u({ spaTypeId: v })} options={VET_SPA_TYPES} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Motivo">
        {({ id }) => <VetBaseInput id={id} value={d.reason} onChange={(v) => u({ reason: v })} placeholder="Ej. Mantenimiento mensual" />}
      </VetBaseField>
      <VetBaseField label="Detalles del servicio">
        {({ id }) => <VetBaseTextarea id={id} value={d.details} onChange={(v) => u({ details: v })} rows={2} placeholder="Productos usados, técnica, tiempos…" />}
      </VetBaseField>
      <VetBaseField label="Observaciones">
        {({ id }) => <VetBaseTextarea id={id} value={d.observations} onChange={(v) => u({ observations: v })} rows={2} placeholder="Comportamiento del paciente, recomendaciones…" />}
      </VetBaseField>
    </VetAccionFormModal>
  );
}

// ============================================================================
// 6 concrete list views — using the generic list view
// ============================================================================

const HOSP_TYPE_LABEL = { HOSPITALIZATION: 'Hospitalización', OUTPATIENT: 'Ambulatoria' };
const DEWORM_TYPE_LABEL = { INTERNAL: 'Interna', EXTERNAL: 'Externa', MIX: 'Mixta', OTHER: 'Otra' };

function useVetAccionesState(initial, label = 'Registro') {
  const toast = useVetToast();
  const [items, setItems] = React.useState(initial);
  const add    = (rec) => {
    setItems((arr) => [{ ...rec, id: rec.id ?? (Math.max(0, ...arr.map((x) => x.id)) + 1) }, ...arr]);
    toast.success(`${label} guardado`, 'Se añadió correctamente al paciente.');
  };
  const remove = (id)  => {
    setItems((arr) => arr.filter((x) => x.id !== id));
    toast.info(`${label} eliminado`, 'El registro fue removido.');
  };
  return { items, add, remove };
}

// Lab test status labels & colors
const VET_LAB_STATUS_LABEL = {
  PENDIENTE: 'Pendiente',
  PENDIENTE_POR_PROCESAR: 'Pendiente por procesar',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};
const VET_LAB_STATUS_TONE = {
  PENDIENTE:              { bg: 'var(--warm-200)',        fg: 'var(--warm-700)',     dot: 'var(--warm-500)' },
  PENDIENTE_POR_PROCESAR: { bg: 'oklch(94% 0.07 80)',     fg: 'oklch(45% 0.13 70)',  dot: 'oklch(65% 0.15 75)' },
  COMPLETADO:             { bg: 'oklch(94% 0.06 150)',    fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.15 150)' },
  CANCELADO:              { bg: 'oklch(94% 0.05 25)',     fg: 'oklch(48% 0.18 25)',  dot: 'oklch(60% 0.18 25)' },
};

function VetLabStatusPill({ status }) {
  const t = VET_LAB_STATUS_TONE[status] ?? VET_LAB_STATUS_TONE.PENDIENTE;
  return (
    <span className="vet-lab-status-pill" style={{ background: t.bg, color: t.fg }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
      {VET_LAB_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function VetLabListViewC() {
  const s = useVetAccionesState(VET_ACCIONES_LAB, "Examen");
  return (
    <VetAccionesListView
      kicker="Acciones clínicas"
      title="Solicitudes de laboratorio"
      lead="Crea y consulta solicitudes de examen sin pasar por una consulta."
      items={s.items} addRecord={s.add} removeRecord={s.remove}
      columns={[
        { label: 'Fecha' }, { label: 'Tipo' }, { label: 'Cantidad' }, { label: 'Diagnóstico' }, { label: 'Estado' },
      ]}
      renderRow={(item, actions) => (
        <tr key={item.id} className="vet-list-row-clickable" onClick={actions.onView}>
          <td>{vetFormatDateShort(item.date)}</td>
          <td>{item.testType.name}</td>
          <td>{item.quantity}</td>
          <td className="vet-cell-ellipsis">{item.diagnosis}</td>
          <td><VetLabStatusPill status={item.status || 'PENDIENTE'} /></td>
          <VetRowActions {...actions} />
        </tr>
      )}
      searchFn={(item, q) => item.testType.name.toLowerCase().includes(q) || (item.diagnosis ?? '').toLowerCase().includes(q)}
      placeholder="Buscar tipo o diagnóstico…"
      emptyText="Este paciente aún no tiene solicitudes de laboratorio."
      ModalForm={VetLabFormModal}
      detailTitle="Detalle del examen"
      detailIcon={VetIcons.Beaker}
      detailFields={(it) => [
        { label: 'Fecha', value: vetFormatDateShort(it.date) },
        { label: 'Tipo de examen', value: it.testType?.name },
        { label: 'Cantidad', value: it.quantity },
        { label: 'Estado', value: <VetLabStatusPill status={it.status || 'PENDIENTE'} /> },
        { label: 'Diagnóstico / motivo', value: it.diagnosis, span: 'full' },
      ]}
    />
  );
}

function VetImagingListViewC() {
  const s = useVetAccionesState(VET_ACCIONES_IMAGING, "Estudio de imagen");
  return (
    <VetAccionesListView
      kicker="Acciones clínicas"
      title="Imagen diagnóstica"
      lead="Solicita y registra estudios de imagen del paciente."
      items={s.items} addRecord={s.add} removeRecord={s.remove}
      columns={[{ label: 'Fecha' }, { label: 'Tipo' }, { label: 'Estudio' }, { label: 'Diagnóstico' }]}
      renderRow={(item, actions) => (
        <tr key={item.id} className="vet-list-row-clickable" onClick={actions.onView}>
          <td>{vetFormatDateShort(item.date)}</td>
          <td>{item.diagnosticImagingType.name}</td>
          <td>{item.studyType || '—'}</td>
          <td className="vet-cell-ellipsis">{item.diagnosis}</td>
          <VetRowActions {...actions} />
        </tr>
      )}
      searchFn={(item, q) => item.diagnosticImagingType.name.toLowerCase().includes(q) || (item.diagnosis ?? '').toLowerCase().includes(q)}
      placeholder="Buscar tipo o diagnóstico…"
      emptyText="Este paciente aún no tiene estudios de imagen."
      ModalForm={VetImagingFormModal}
      detailTitle="Detalle del estudio de imagen"
      detailIcon={VetIcons.ScanLine}
      detailFields={(it) => [
        { label: 'Fecha', value: vetFormatDateShort(it.date) },
        { label: 'Tipo de imagen', value: it.diagnosticImagingType?.name },
        { label: 'Tipo de estudio', value: it.studyType, span: 'full' },
        { label: 'Signos clínicos', value: it.clinicalSigns, span: 'full' },
        { label: 'Diagnóstico', value: it.diagnosis, span: 'full' },
        { label: 'Observaciones', value: it.observations, span: 'full' },
      ]}
    />
  );
}

function VetVaccineListViewC() {
  const s = useVetAccionesState(VET_ACCIONES_VAC, "Vacuna");
  return (
    <VetAccionesListView
      kicker="Acciones clínicas"
      title="Vacunaciones"
      lead="Registra aplicaciones de vacunas y refuerzos próximos."
      items={s.items} addRecord={s.add} removeRecord={s.remove}
      columns={[{ label: 'Fecha' }, { label: 'Tipo' }, { label: 'Lote' }, { label: 'Próxima' }]}
      renderRow={(item, actions) => (
        <tr key={item.id} className="vet-list-row-clickable" onClick={actions.onView}>
          <td>{vetFormatDateShort(item.date)}</td>
          <td>{item.vaccinationType.name}</td>
          <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{item.lot || '—'}</code></td>
          <td>{item.nextVaccination ? vetFormatDateShort(item.nextVaccination) : '—'}</td>
          <VetRowActions {...actions} />
        </tr>
      )}
      searchFn={(item, q) => item.vaccinationType.name.toLowerCase().includes(q) || (item.lot ?? '').toLowerCase().includes(q)}
      placeholder="Buscar tipo o lote…"
      emptyText="Este paciente aún no tiene vacunas registradas."
      ModalForm={VetVaccineFormModal}
      detailTitle="Detalle de la vacunación"
      detailIcon={VetIcons.Syringe}
      detailFields={(it) => [
        { label: 'Fecha', value: vetFormatDateShort(it.date) },
        { label: 'Tipo de vacuna', value: it.vaccinationType?.name },
        { label: 'Lote', value: it.lot },
        { label: 'Próxima vacunación', value: it.nextVaccination ? vetFormatDateShort(it.nextVaccination) : null },
        { label: 'Notas', value: it.notes, span: 'full' },
      ]}
    />
  );
}

function VetHospListViewC() {
  const s = useVetAccionesState(VET_ACCIONES_HOSP, "Hospitalización");
  return (
    <VetAccionesListView
      kicker="Acciones clínicas"
      title="Hospitalizaciones"
      lead="Ingreso y seguimiento de pacientes hospitalizados o ambulatorios."
      items={s.items} addRecord={s.add} removeRecord={s.remove}
      columns={[{ label: 'Inicio' }, { label: 'Fin' }, { label: 'Tipo' }, { label: 'Motivo' }]}
      renderRow={(item, actions) => (
        <tr key={item.id} className="vet-list-row-clickable" onClick={actions.onView}>
          <td>{vetFormatDateShort(item.startDate)}</td>
          <td>{item.endDate ? vetFormatDateShort(item.endDate) : <em style={{ color: 'var(--warm-400)' }}>en curso</em>}</td>
          <td>{HOSP_TYPE_LABEL[item.type]}</td>
          <td className="vet-cell-ellipsis">{item.reason}</td>
          <VetRowActions {...actions} />
        </tr>
      )}
      searchFn={(item, q) => (item.reason ?? '').toLowerCase().includes(q)}
      placeholder="Buscar motivo…"
      emptyText="Este paciente aún no ha sido hospitalizado."
      ModalForm={VetHospFormModal}
      detailTitle="Detalle de la hospitalización"
      detailIcon={VetIcons.BedDouble}
      detailFields={(it) => [
        { label: 'Tipo', value: HOSP_TYPE_LABEL[it.type] },
        { label: 'Inicio', value: vetFormatDateShort(it.startDate) },
        { label: 'Fin', value: it.endDate ? vetFormatDateShort(it.endDate) : null },
        { label: 'Motivo de egreso', value: it.reasonLeaving ? it.reasonLeaving.replace(/_/g, ' ').toLowerCase() : null },
        { label: 'Motivo', value: it.reason, span: 'full' },
        { label: 'Observaciones', value: it.observations, span: 'full' },
      ]}
    />
  );
}

function VetDewormListViewC() {
  const s = useVetAccionesState(VET_ACCIONES_DEWORM, "Desparasitación");
  return (
    <VetAccionesListView
      kicker="Acciones clínicas"
      title="Desparasitaciones"
      lead="Aplicaciones internas, externas y mixtas."
      items={s.items} addRecord={s.add} removeRecord={s.remove}
      columns={[{ label: 'Fecha' }, { label: 'Tipo' }, { label: 'Producto' }, { label: 'Próximo' }]}
      renderRow={(item, actions) => (
        <tr key={item.id} className="vet-list-row-clickable" onClick={actions.onView}>
          <td>{vetFormatDateShort(item.date)}</td>
          <td>{DEWORM_TYPE_LABEL[item.type]}</td>
          <td>{item.product}</td>
          <td>{item.nextControl ? vetFormatDateShort(item.nextControl) : '—'}</td>
          <VetRowActions {...actions} />
        </tr>
      )}
      searchFn={(item, q) => item.product.toLowerCase().includes(q)}
      placeholder="Buscar producto…"
      emptyText="Este paciente aún no tiene desparasitaciones registradas."
      ModalForm={VetDewormFormModal}
      detailTitle="Detalle de la desparasitación"
      detailIcon={VetIcons.Bug}
      detailFields={(it) => [
        { label: 'Fecha', value: vetFormatDateShort(it.date) },
        { label: 'Tipo', value: DEWORM_TYPE_LABEL[it.type] },
        { label: 'Producto', value: it.product },
        { label: 'Dosis', value: it.dosage },
        { label: 'Última desparasitación', value: it.lastDeworming ? vetFormatDateShort(it.lastDeworming) : null },
        { label: 'Próximo control', value: it.nextControl ? vetFormatDateShort(it.nextControl) : null },
        { label: 'Observaciones', value: it.observations, span: 'full' },
      ]}
    />
  );
}

function VetSurgeryListViewC() {
  const s = useVetAccionesState(VET_ACCIONES_SURG, "Cirugía");
  return (
    <VetAccionesListView
      kicker="Acciones clínicas"
      title="Cirugías"
      lead="Programación y registro de procedimientos quirúrgicos."
      items={s.items} addRecord={s.add} removeRecord={s.remove}
      columns={[{ label: 'Fecha' }, { label: 'Tipo' }, { label: 'Descripción' }]}
      renderRow={(item, actions) => (
        <tr key={item.id} className="vet-list-row-clickable" onClick={actions.onView}>
          <td>{vetFormatDateShort(item.date)}</td>
          <td>{item.surgeryType.name}</td>
          <td className="vet-cell-ellipsis">{item.description}</td>
          <VetRowActions {...actions} />
        </tr>
      )}
      searchFn={(item, q) => item.surgeryType.name.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q)}
      placeholder="Buscar tipo o descripción…"
      emptyText="Este paciente aún no tiene cirugías registradas."
      ModalForm={VetSurgeryFormModal}
      detailTitle="Detalle de la cirugía"
      detailIcon={VetIcons.Scissors}
      detailFields={(it) => [
        { label: 'Fecha', value: vetFormatDateShort(it.date) },
        { label: 'Tipo de cirugía', value: it.surgeryType?.name },
        { label: 'Descripción', value: it.description, span: 'full' },
        { label: 'Medicamento / anestesia', value: it.medicament, span: 'full' },
        { label: 'Observaciones', value: it.observations, span: 'full' },
        { label: 'Complicaciones', value: it.complications, span: 'full' },
      ]}
    />
  );
}

function VetSpaListViewC() {
  const s = useVetAccionesState(VET_ACCIONES_SPA, "Servicio de spa");
  return (
    <VetAccionesListView
      kicker="Acciones clínicas"
      title="Spa y estética"
      lead="Baños, cortes, limpieza de oídos y otros servicios de bienestar."
      items={s.items} addRecord={s.add} removeRecord={s.remove}
      columns={[{ label: 'Fecha' }, { label: 'Servicio' }, { label: 'Motivo' }, { label: 'Detalles' }]}
      renderRow={(item, actions) => (
        <tr key={item.id} className="vet-list-row-clickable" onClick={actions.onView}>
          <td>{vetFormatDateShort(item.date)}</td>
          <td>{item.spaType.name}</td>
          <td className="vet-cell-ellipsis">{item.reason || '—'}</td>
          <td className="vet-cell-ellipsis">{item.details || '—'}</td>
          <VetRowActions {...actions} />
        </tr>
      )}
      searchFn={(item, q) => item.spaType.name.toLowerCase().includes(q) || (item.reason ?? '').toLowerCase().includes(q) || (item.details ?? '').toLowerCase().includes(q)}
      placeholder="Buscar servicio, motivo o detalles…"
      emptyText="Este paciente aún no tiene servicios de spa registrados."
      ModalForm={VetSpaFormModal}
      detailTitle="Detalle del servicio de spa"
      detailIcon={VetIcons.Sparkles}
      detailFields={(it) => [
        { label: 'Fecha', value: vetFormatDateShort(it.date) },
        { label: 'Tipo de servicio', value: it.spaType?.name },
        { label: 'Motivo', value: it.reason, span: 'full' },
        { label: 'Detalles del servicio', value: it.details, span: 'full' },
        { label: 'Observaciones', value: it.observations, span: 'full' },
      ]}
    />
  );
}

Object.assign(window, {
  VetLabListViewC, VetImagingListViewC, VetVaccineListViewC,
  VetHospListViewC, VetDewormListViewC, VetSurgeryListViewC,
  VetPatientCascadePicker, VetOwnerAnimalBreadcrumb,
  VetSpaListViewC,
});
