/* global React, VetIcons, VetModalShell,
   useVetDraft,
   VetBaseField, VetBaseInput, VetBaseTextarea, VetBaseSelect, VetDateInput,
   VET_VACCINATION_TYPES, VET_LAB_TYPES, VET_IMAGING_TYPES, VET_SURGERY_TYPES,
   vetTodayISO, vetFormatDateShort */

// Generic shell for "add item" modals
function VetActionModal({ open, onClose, title, icon: Icon, accent = 'amatista', children, existing = [], renderExisting, onSave, canSave }) {
  return (
    <VetModalShell
      open={open}
      onClose={onClose}
      title={title}
      icon={Icon}
      accent={accent}
      width={640}
      footerLeft={existing.length > 0 ? `${existing.length} agregada${existing.length === 1 ? '' : 's'} a esta consulta` : null}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal" onClick={onSave} disabled={!canSave}>
            Guardar
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        {children}
        {existing.length > 0 && (
          <div className="vet-existing-list">
            <div className="vet-existing-label">Ya agregadas</div>
            {existing.map((item, i) => renderExisting(item, i))}
          </div>
        )}
      </div>
    </VetModalShell>
  );
}

function VetExistingRow({ title, sub, onRemove }) {
  return (
    <div className="vet-existing-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="vet-existing-title">{title}</div>
        {sub && <div className="vet-existing-sub">{sub}</div>}
      </div>
      <button type="button" className="vet-existing-remove" onClick={onRemove} aria-label="Eliminar">
        <VetIcons.Trash size={14} strokeWidth={1.6} />
      </button>
    </div>
  );
}

// ============================================================================
// RecetaModal — most complex (has medicaments list)
// ============================================================================

function VetRecetaModal({ open, onClose }) {
  const draft = useVetDraft();
  const [diagnosis, setDiagnosis] = React.useState('');
  const [observations, setObservations] = React.useState('');
  const [meds, setMeds] = React.useState([
    { name: '', presentation: '', quantity: 1, posology: '' }
  ]);

  React.useEffect(() => {
    if (open) {
      setDiagnosis(''); setObservations('');
      setMeds([{ name: '', presentation: '', quantity: 1, posology: '' }]);
    }
  }, [open]);

  const canSave = meds.some((m) => m.name.trim() && m.posology.trim());

  function updateMed(i, p) { setMeds((arr) => arr.map((m, idx) => idx === i ? { ...m, ...p } : m)); }
  function addMed() { setMeds((arr) => [...arr, { name: '', presentation: '', quantity: 1, posology: '' }]); }
  function removeMed(i) { setMeds((arr) => arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr); }

  function save() {
    draft.addPrescription({
      date: vetTodayISO(),
      diagnosis: diagnosis.trim(),
      observations: observations.trim(),
      medicaments: meds.filter((m) => m.name.trim()).map((m) => ({ ...m, quantity: Number(m.quantity) || 1 })),
    });
    onClose();
  }

  return (
    <VetActionModal
      open={open} onClose={onClose}
      title="Nueva receta"
      icon={VetIcons.FileText}
      existing={draft.state.prescriptions}
      renderExisting={(p, i) => (
        <VetExistingRow
          key={i}
          title={p.medicaments.map((m) => m.name).join(', ') || 'Receta sin medicamentos'}
          sub={`${p.medicaments.length} medicamento${p.medicaments.length === 1 ? '' : 's'}${p.diagnosis ? ' · ' + p.diagnosis : ''}`}
          onRemove={() => draft.removePrescription(i)}
        />
      )}
      onSave={save} canSave={canSave}
    >
      <VetBaseField label="Diagnóstico">
        {({ id }) => <VetBaseInput id={id} value={diagnosis} onChange={setDiagnosis}
          placeholder="Ej. Dermatitis alérgica" />}
      </VetBaseField>
      <VetBaseField label="Observaciones">
        {({ id }) => <VetBaseTextarea id={id} value={observations} onChange={setObservations} rows={2}
          placeholder="Notas para el dueño…" />}
      </VetBaseField>

      <div className="vet-meds-section">
        <div className="vet-meds-section-head">
          <span>Medicamentos</span>
          <button type="button" className="vet-add-link" onClick={addMed}>
            <VetIcons.Plus size={12} /> Añadir medicamento
          </button>
        </div>
        {meds.map((m, i) => (
          <div key={i} className="vet-med-card">
            <div className="vet-med-card-head">
              <span className="vet-med-card-n">Medicamento {i + 1}</span>
              {meds.length > 1 && (
                <button type="button" className="vet-existing-remove" onClick={() => removeMed(i)}>
                  <VetIcons.Trash size={13} />
                </button>
              )}
            </div>
            <div className="vet-form-grid-2">
              <VetBaseField label="Nombre" required>
                {({ id }) => <VetBaseInput id={id} value={m.name} onChange={(v) => updateMed(i, { name: v })}
                  placeholder="Cetirizina" />}
              </VetBaseField>
              <VetBaseField label="Presentación">
                {({ id }) => <VetBaseInput id={id} value={m.presentation} onChange={(v) => updateMed(i, { presentation: v })}
                  placeholder="Tableta 5mg" />}
              </VetBaseField>
              <VetBaseField label="Cantidad">
                {({ id }) => <VetBaseInput id={id} type="number" value={m.quantity}
                  onChange={(v) => updateMed(i, { quantity: v })} />}
              </VetBaseField>
              <VetBaseField label="Posología" required>
                {({ id }) => <VetBaseInput id={id} value={m.posology} onChange={(v) => updateMed(i, { posology: v })}
                  placeholder="1 tableta c/24h x 30 días" />}
              </VetBaseField>
            </div>
          </div>
        ))}
      </div>
    </VetActionModal>
  );
}

// ============================================================================
// LabTestModal
// ============================================================================

function VetLabTestModal({ open, onClose }) {
  const draft = useVetDraft();
  const [testTypeId, setTestTypeId] = React.useState('');
  const [quantity, setQuantity] = React.useState(1);
  const [diagnosis, setDiagnosis] = React.useState('');

  React.useEffect(() => {
    if (open) { setTestTypeId(''); setQuantity(1); setDiagnosis(''); }
  }, [open]);

  function save() {
    draft.addLaboratoryTest({
      date: vetTodayISO(), testTypeId,
      quantity: Number(quantity) || 1, diagnosis: diagnosis.trim(),
    });
    onClose();
  }

  return (
    <VetActionModal
      open={open} onClose={onClose}
      title="Solicitar examen de laboratorio"
      icon={VetIcons.Beaker}
      existing={draft.state.laboratoryTests}
      renderExisting={(t, i) => {
        const tt = VET_LAB_TYPES.find((x) => x.id === t.testTypeId);
        return (
          <VetExistingRow
            key={i}
            title={tt?.name ?? 'Examen'}
            sub={`×${t.quantity}${t.diagnosis ? ' · ' + t.diagnosis : ''}`}
            onRemove={() => draft.removeLaboratoryTest(i)}
          />
        );
      }}
      onSave={save} canSave={!!testTypeId}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Tipo de examen" required>
          {({ id }) => <VetBaseSelect id={id} value={testTypeId} onChange={setTestTypeId} options={VET_LAB_TYPES} />}
        </VetBaseField>
        <VetBaseField label="Cantidad">
          {({ id }) => <VetBaseInput id={id} type="number" value={quantity} onChange={setQuantity} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Diagnóstico / motivo">
        {({ id }) => <VetBaseTextarea id={id} value={diagnosis} onChange={setDiagnosis} rows={2}
          placeholder="Motivo de la solicitud" />}
      </VetBaseField>
    </VetActionModal>
  );
}

// ============================================================================
// ImagingModal
// ============================================================================

function VetImagingModal({ open, onClose }) {
  const draft = useVetDraft();
  const [data, setData] = React.useState({
    diagnosticImagingTypeId: '', studyType: '', clinicalSigns: '',
    diagnosis: '', observations: '',
  });
  const u = (p) => setData((d) => ({ ...d, ...p }));

  React.useEffect(() => {
    if (open) setData({
      diagnosticImagingTypeId: '', studyType: '', clinicalSigns: '',
      diagnosis: '', observations: '',
    });
  }, [open]);

  function save() {
    draft.addDiagnosticImaging({ ...data, date: vetTodayISO() });
    onClose();
  }

  return (
    <VetActionModal
      open={open} onClose={onClose}
      title="Solicitar imagen diagnóstica"
      icon={VetIcons.ScanLine}
      existing={draft.state.diagnosticImagings}
      renderExisting={(t, i) => {
        const tt = VET_IMAGING_TYPES.find((x) => x.id === t.diagnosticImagingTypeId);
        return (
          <VetExistingRow
            key={i}
            title={tt?.name ?? 'Imagen'}
            sub={t.studyType || t.diagnosis || '—'}
            onRemove={() => draft.removeDiagnosticImaging(i)}
          />
        );
      }}
      onSave={save} canSave={!!data.diagnosticImagingTypeId}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Tipo de imagen" required>
          {({ id }) => <VetBaseSelect id={id} value={data.diagnosticImagingTypeId}
            onChange={(v) => u({ diagnosticImagingTypeId: v })} options={VET_IMAGING_TYPES} />}
        </VetBaseField>
        <VetBaseField label="Tipo de estudio">
          {({ id }) => <VetBaseInput id={id} value={data.studyType} onChange={(v) => u({ studyType: v })}
            placeholder="Cadera AP + LL" />}
        </VetBaseField>
      </div>
      <VetBaseField label="Signos clínicos">
        {({ id }) => <VetBaseTextarea id={id} value={data.clinicalSigns} onChange={(v) => u({ clinicalSigns: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Diagnóstico">
        {({ id }) => <VetBaseTextarea id={id} value={data.diagnosis} onChange={(v) => u({ diagnosis: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Observaciones">
        {({ id }) => <VetBaseTextarea id={id} value={data.observations} onChange={(v) => u({ observations: v })} rows={2} />}
      </VetBaseField>
    </VetActionModal>
  );
}

// ============================================================================
// VaccinationModal
// ============================================================================

function VetVaccinationModal({ open, onClose }) {
  const draft = useVetDraft();
  const [data, setData] = React.useState({
    vaccinationTypeId: '', lot: '', notes: '', nextVaccination: '',
  });
  const u = (p) => setData((d) => ({ ...d, ...p }));

  React.useEffect(() => {
    if (open) setData({ vaccinationTypeId: '', lot: '', notes: '', nextVaccination: '' });
  }, [open]);

  function save() {
    draft.addVaccination({ ...data, date: vetTodayISO() });
    onClose();
  }

  return (
    <VetActionModal
      open={open} onClose={onClose}
      title="Aplicar vacuna"
      icon={VetIcons.Syringe}
      existing={draft.state.vaccinations}
      renderExisting={(t, i) => {
        const tt = VET_VACCINATION_TYPES.find((x) => x.id === t.vaccinationTypeId);
        return (
          <VetExistingRow
            key={i}
            title={tt?.name ?? 'Vacuna'}
            sub={`Lote ${t.lot || '—'}${t.nextVaccination ? ' · próxima ' + vetFormatDateShort(t.nextVaccination) : ''}`}
            onRemove={() => draft.removeVaccination(i)}
          />
        );
      }}
      onSave={save} canSave={!!data.vaccinationTypeId}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Tipo de vacuna" required>
          {({ id }) => <VetBaseSelect id={id} value={data.vaccinationTypeId}
            onChange={(v) => u({ vaccinationTypeId: v })} options={VET_VACCINATION_TYPES} />}
        </VetBaseField>
        <VetBaseField label="Lote">
          {({ id }) => <VetBaseInput id={id} value={data.lot} onChange={(v) => u({ lot: v })}
            placeholder="VT-99221" />}
        </VetBaseField>
        <VetBaseField label="Próxima vacunación">
          {({ id }) => <VetDateInput id={id} value={data.nextVaccination}
            onChange={(v) => u({ nextVaccination: v })} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Notas">
        {({ id }) => <VetBaseTextarea id={id} value={data.notes} onChange={(v) => u({ notes: v })} rows={2} />}
      </VetBaseField>
    </VetActionModal>
  );
}

// ============================================================================
// HospitalizationModal
// ============================================================================

function VetHospitalizationModal({ open, onClose }) {
  const draft = useVetDraft();
  const [data, setData] = React.useState({
    type: 'HOSPITALIZATION', startDate: '', endDate: '',
    reasonLeaving: '', reason: '', observations: '',
  });
  const u = (p) => setData((d) => ({ ...d, ...p }));

  React.useEffect(() => {
    if (open) setData({
      type: 'HOSPITALIZATION', startDate: vetTodayISO(), endDate: '',
      reasonLeaving: '', reason: '', observations: '',
    });
  }, [open]);

  function save() {
    draft.addHospitalization({ ...data, date: data.startDate || vetTodayISO() });
    onClose();
  }

  return (
    <VetActionModal
      open={open} onClose={onClose}
      title="Ingresar a hospitalización"
      icon={VetIcons.BedDouble}
      accent="warn"
      existing={draft.state.hospitalizations}
      renderExisting={(t, i) => (
        <VetExistingRow
          key={i}
          title={t.type === 'HOSPITALIZATION' ? 'Hospitalización' : 'Ambulatoria'}
          sub={`${vetFormatDateShort(t.startDate)}${t.endDate ? ' → ' + vetFormatDateShort(t.endDate) : ''}`}
          onRemove={() => draft.removeHospitalization(i)}
        />
      )}
      onSave={save} canSave={!!data.startDate && !!data.reason.trim()}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Tipo" required>
          {({ id }) => <VetBaseSelect id={id} value={data.type} onChange={(v) => u({ type: v })}
            options={[
              { value: 'HOSPITALIZATION', label: 'Hospitalización' },
              { value: 'OUTPATIENT', label: 'Ambulatoria' },
            ]} />}
        </VetBaseField>
        <VetBaseField label="Inicio" required>
          {({ id }) => <VetDateInput id={id} value={data.startDate} onChange={(v) => u({ startDate: v })} />}
        </VetBaseField>
        <VetBaseField label="Fin estimado">
          {({ id }) => <VetDateInput id={id} value={data.endDate} onChange={(v) => u({ endDate: v })} />}
        </VetBaseField>
        <VetBaseField label="Motivo de egreso">
          {({ id }) => <VetBaseSelect id={id} value={data.reasonLeaving}
            onChange={(v) => u({ reasonLeaving: v })}
            options={[
              { value: 'MEDICAL_DISCHARGE', label: 'Alta médica' },
              { value: 'HOME_TREATMENT', label: 'Tratamiento en casa' },
              { value: 'TRANSFER', label: 'Traslado' },
              { value: 'TUTOR_WISH', label: 'Deseo del tutor' },
              { value: 'ADMIN', label: 'Administrativa' },
              { value: 'DEATH', label: 'Fallecimiento' },
              { value: 'EUTHANASIA', label: 'Eutanasia' },
            ]} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Motivo" required>
        {({ id }) => <VetBaseTextarea id={id} value={data.reason} onChange={(v) => u({ reason: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Observaciones">
        {({ id }) => <VetBaseTextarea id={id} value={data.observations} onChange={(v) => u({ observations: v })} rows={2} />}
      </VetBaseField>
    </VetActionModal>
  );
}

// ============================================================================
// DewormingModal
// ============================================================================

function VetDewormingModal({ open, onClose }) {
  const draft = useVetDraft();
  const [data, setData] = React.useState({
    type: 'INTERNAL', lastDeworming: '', product: '', dosage: '',
    nextControl: '', observations: '',
  });
  const u = (p) => setData((d) => ({ ...d, ...p }));

  React.useEffect(() => {
    if (open) setData({
      type: 'INTERNAL', lastDeworming: '', product: '', dosage: '',
      nextControl: '', observations: '',
    });
  }, [open]);

  function save() {
    draft.addDeworming({ ...data, date: vetTodayISO() });
    onClose();
  }

  const TYPE_LABEL = { INTERNAL: 'Interna', EXTERNAL: 'Externa', MIX: 'Mixta', OTHER: 'Otra' };

  return (
    <VetActionModal
      open={open} onClose={onClose}
      title="Registrar desparasitación"
      icon={VetIcons.Bug}
      existing={draft.state.dewormings}
      renderExisting={(t, i) => (
        <VetExistingRow
          key={i}
          title={`${TYPE_LABEL[t.type]} · ${t.product || '—'}`}
          sub={t.dosage}
          onRemove={() => draft.removeDeworming(i)}
        />
      )}
      onSave={save} canSave={!!data.product.trim()}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Tipo" required>
          {({ id }) => <VetBaseSelect id={id} value={data.type} onChange={(v) => u({ type: v })}
            options={[
              { value: 'INTERNAL', label: 'Interna' },
              { value: 'EXTERNAL', label: 'Externa' },
              { value: 'MIX', label: 'Mixta' },
              { value: 'OTHER', label: 'Otra' },
            ]} />}
        </VetBaseField>
        <VetBaseField label="Última desparasitación">
          {({ id }) => <VetDateInput id={id} value={data.lastDeworming}
            onChange={(v) => u({ lastDeworming: v })} />}
        </VetBaseField>
        <VetBaseField label="Producto" required>
          {({ id }) => <VetBaseInput id={id} value={data.product}
            onChange={(v) => u({ product: v })} placeholder="Drontal Cat" />}
        </VetBaseField>
        <VetBaseField label="Dosis">
          {({ id }) => <VetBaseInput id={id} value={data.dosage}
            onChange={(v) => u({ dosage: v })} placeholder="1 tableta" />}
        </VetBaseField>
        <VetBaseField label="Próximo control">
          {({ id }) => <VetDateInput id={id} value={data.nextControl}
            onChange={(v) => u({ nextControl: v })} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Observaciones">
        {({ id }) => <VetBaseTextarea id={id} value={data.observations}
          onChange={(v) => u({ observations: v })} rows={2} />}
      </VetBaseField>
    </VetActionModal>
  );
}

// ============================================================================
// SurgeryModal
// ============================================================================

function VetSurgeryModal({ open, onClose }) {
  const draft = useVetDraft();
  const [data, setData] = React.useState({
    surgeryTypeId: '', description: '', medicament: '',
    observations: '', complications: '',
  });
  const u = (p) => setData((d) => ({ ...d, ...p }));

  React.useEffect(() => {
    if (open) setData({
      surgeryTypeId: '', description: '', medicament: '',
      observations: '', complications: '',
    });
  }, [open]);

  function save() {
    draft.addSurgery({ ...data, date: vetTodayISO() });
    onClose();
  }

  return (
    <VetActionModal
      open={open} onClose={onClose}
      title="Programar cirugía"
      icon={VetIcons.Scissors}
      accent="danger"
      existing={draft.state.surgeries}
      renderExisting={(t, i) => {
        const tt = VET_SURGERY_TYPES.find((x) => x.id === t.surgeryTypeId);
        return (
          <VetExistingRow
            key={i}
            title={tt?.name ?? 'Cirugía'}
            sub={t.description}
            onRemove={() => draft.removeSurgery(i)}
          />
        );
      }}
      onSave={save} canSave={!!data.surgeryTypeId}
    >
      <div className="vet-form-grid-2">
        <VetBaseField label="Tipo de cirugía" required>
          {({ id }) => <VetBaseSelect id={id} value={data.surgeryTypeId}
            onChange={(v) => u({ surgeryTypeId: v })} options={VET_SURGERY_TYPES} />}
        </VetBaseField>
      </div>
      <VetBaseField label="Descripción">
        {({ id }) => <VetBaseTextarea id={id} value={data.description}
          onChange={(v) => u({ description: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Medicamento / anestesia">
        {({ id }) => <VetBaseTextarea id={id} value={data.medicament}
          onChange={(v) => u({ medicament: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Observaciones">
        {({ id }) => <VetBaseTextarea id={id} value={data.observations}
          onChange={(v) => u({ observations: v })} rows={2} />}
      </VetBaseField>
      <VetBaseField label="Complicaciones">
        {({ id }) => <VetBaseTextarea id={id} value={data.complications}
          onChange={(v) => u({ complications: v })} rows={2} />}
      </VetBaseField>
    </VetActionModal>
  );
}

// ============================================================================
// Modal dispatcher
// ============================================================================

function VetActionModals({ openKind, onClose }) {
  return (
    <>
      <VetRecetaModal           open={openKind === 'receta'}          onClose={onClose} />
      <VetLabTestModal          open={openKind === 'lab'}             onClose={onClose} />
      <VetImagingModal          open={openKind === 'imaging'}         onClose={onClose} />
      <VetVaccinationModal      open={openKind === 'vaccination'}     onClose={onClose} />
      <VetHospitalizationModal  open={openKind === 'hospitalization'} onClose={onClose} />
      <VetDewormingModal        open={openKind === 'deworming'}       onClose={onClose} />
      <VetSurgeryModal          open={openKind === 'surgery'}         onClose={onClose} />
    </>
  );
}

Object.assign(window, { VetActionModals });
