/* global React, VetIcons, VetModalShell,
   VetBaseField, VetBaseInput, VetBaseTextarea, VetBaseSelect, VetDateInput,
   VET_MOCK_OWNERS, VET_MOCK_PETS,
   VET_VACCINATION_TYPES, VET_LAB_TYPES, VET_IMAGING_TYPES, VET_SURGERY_TYPES,
   VET_ACCIONES_LAB, VET_ACCIONES_IMAGING, VET_ACCIONES_VAC,
   VET_ACCIONES_HOSP, VET_ACCIONES_DEWORM, VET_ACCIONES_SURG,
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

  React.useEffect(() => {
    const q = ownerQuery.trim();
    if (!q) { setOwnerResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      const ql = q.toLowerCase();
      setOwnerResults(VET_MOCK_OWNERS.filter((o) =>
        o.name.toLowerCase().includes(ql)
        || o.document.toLowerCase().includes(ql)
        || o.phone.toLowerCase().includes(ql)
      ));
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [ownerQuery]);

  function pickOwner(o) {
    setSelectedOwner(o);
    setOwnerQuery('');
    setSelectedAnimal(null);
  }
  function clearOwner() {
    setSelectedOwner(null); setSelectedAnimal(null);
  }
  function pickAnimal(a) {
    setSelectedAnimal(a);
    onSelect({ owner: selectedOwner, animal: a });
  }

  const animals = selectedOwner ? (VET_MOCK_PETS[selectedOwner.id] || []) : [];

  return (
    <div className="vet-picker">
      {!selectedOwner ? (
        <div className="vet-picker-step">
          <label className="vet-picker-hint">Propietario</label>
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
            <div className="vet-picker-state">Sin resultados</div>
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
          {animals.length === 0 ? (
            <div className="vet-picker-state">
              Este propietario no tiene mascotas registradas
            </div>
          ) : (
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

function VetAccionesListView({ kicker, title, lead, items, addRecord, removeRecord, columns, renderRow, searchFn, placeholder, emptyText, ModalForm }) {
  const [selection, setSelection] = React.useState(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  const filtered = selection
    ? items.filter((it) => it.animalId === selection.animal.id)
    : [];

  function onSaved(record) {
    if (editing) {
      removeRecord(editing.id);
      addRecord({ ...record, id: editing.id });
    } else {
      addRecord(record);
    }
    setModalOpen(false);
    setEditing(null);
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
              onEdit: () => { setEditing(item); setModalOpen(true); },
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
    </div>
  );
}

// ============================================================================
// Helper: row action buttons
// ============================================================================

function VetRowActions({ onEdit, onDelete }) {
  return (
    <td style={{ textAlign: 'right' }}>
      <div className="vet-row-actions">
        <button type="button" className="vet-row-icon-btn" onClick={onEdit} title="Editar">
          <VetIcons.Edit size={15} strokeWidth={1.7} />
        </button>
        <button type="button" className="vet-row-icon-btn danger" onClick={onDelete} title="Eliminar">
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
  const [d, setD] = React.useState({ date: vetTodayISO(), testTypeId: '', quantity: 1, diagnosis: '' });
  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      const tt = VET_LAB_TYPES.find((t) => t.name === initial.testType?.name);
      setD({ date: initial.date, testTypeId: tt?.id ?? '', quantity: initial.quantity, diagnosis: initial.diagnosis });
    } else {
      setD({ date: vetTodayISO(), testTypeId: '', quantity: 1, diagnosis: '' });
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
        return { ...d, quantity: Number(d.quantity) || 1, testType: { name: tt?.name ?? '—' }, animalId: animal?.id };
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

function VetLabListViewC() {
  const s = useVetAccionesState(VET_ACCIONES_LAB, "Examen");
  return (
    <VetAccionesListView
      kicker="Acciones clínicas"
      title="Solicitudes de laboratorio"
      lead="Crea y consulta solicitudes de examen sin pasar por una consulta."
      items={s.items} addRecord={s.add} removeRecord={s.remove}
      columns={[
        { label: 'Fecha' }, { label: 'Tipo' }, { label: 'Cantidad' }, { label: 'Diagnóstico' },
      ]}
      renderRow={(item, actions) => (
        <tr key={item.id}>
          <td>{vetFormatDateShort(item.date)}</td>
          <td>{item.testType.name}</td>
          <td>{item.quantity}</td>
          <td className="vet-cell-ellipsis">{item.diagnosis}</td>
          <VetRowActions {...actions} />
        </tr>
      )}
      searchFn={(item, q) => item.testType.name.toLowerCase().includes(q) || (item.diagnosis ?? '').toLowerCase().includes(q)}
      placeholder="Buscar tipo o diagnóstico…"
      emptyText="Este paciente aún no tiene solicitudes de laboratorio."
      ModalForm={VetLabFormModal}
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
        <tr key={item.id}>
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
        <tr key={item.id}>
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
        <tr key={item.id}>
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
        <tr key={item.id}>
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
        <tr key={item.id}>
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
    />
  );
}

Object.assign(window, {
  VetLabListViewC, VetImagingListViewC, VetVaccineListViewC,
  VetHospListViewC, VetDewormListViewC, VetSurgeryListViewC,
});
