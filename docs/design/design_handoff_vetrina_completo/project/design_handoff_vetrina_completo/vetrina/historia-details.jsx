/* global React, VetIcons, VetModalShell, VetEventTypeChip,
   VET_EVENT_TYPES, VET_MOCK_EVENT_DETAILS, vetFormatEventDate */

// ============================================================================
// DetailField — components/DetailField.vue
// ============================================================================

function VetDetailField({ label, value, span = 1, children }) {
  const content = children !== undefined && children !== null && children !== '' ? children
                 : (value === null || value === undefined || value === '' ? '—' : value);
  return (
    <div className={`vet-field vet-field-span-${span}`}>
      <div className="vet-field-label">{label}</div>
      <div className="vet-field-value">{content}</div>
    </div>
  );
}

function VetLinkedConsultation({ consultation }) {
  if (!consultation) return null;
  return (
    <VetDetailField label="Consulta vinculada" span="full">
      #{consultation.id} · {vetFormatEventDate(consultation.date)}
    </VetDetailField>
  );
}

// ============================================================================
// Detail components — features/historia-clinica/components/detail/*
// ============================================================================

function VetConsultationDetail({ data, children = [] }) {
  const clean = (v) => {
    if (!v) return null;
    const t = v.trim();
    if (t === '' || t === '-') return null;
    return v;
  };
  const childrenSorted = [...children].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const childrenCount = children.length === 1 ? '1 ítem' : `${children.length} ítems`;

  return (
    <div className="vet-detail-grid">
      <VetDetailField label="Tipo de consulta" value={data.consultationType?.name} />
      <VetDetailField label="Fecha" value={vetFormatEventDate(data.date)} />
      <VetDetailField label="Próximo control" value={data.nextControl ? vetFormatEventDate(data.nextControl) : null} />
      <VetDetailField label="Anamnesis"        value={clean(data.anamnesis)}     span="full" />
      <VetDetailField label="Diagnóstico"      value={clean(data.diagnosis)}     span="full" />
      <VetDetailField label="Plan diagnóstico" value={clean(data.diagnosisPlan)} span="full" />
      <VetDetailField label="Plan terapéutico" value={clean(data.therapeuticPlan)} span="full" />

      <div className="vet-children-section">
        <div className="vet-children-head">
          <span className="vet-children-label">Procedimientos asociados</span>
          <span className="vet-children-count">{childrenCount}</span>
        </div>
        {children.length === 0 ? (
          <div className="vet-children-empty">Esta consulta no tiene procedimientos asociados.</div>
        ) : (
          <ul className="vet-children-list">
            {childrenSorted.map((c) => (
              <li key={`${c.eventType}-${c.sourceId}`} className="vet-child">
                <span className="vet-child-icon" aria-label={VET_EVENT_TYPES[c.eventType].label}>
                  {VET_EVENT_TYPES[c.eventType].icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="vet-child-head">
                    <VetEventTypeChip type={c.eventType} />
                    <span className="vet-child-date">{vetFormatEventDate(c.eventDate)}</span>
                    <span className="vet-child-id">#{c.sourceId}</span>
                  </div>
                  <div className="vet-child-summary">{c.summary || 'Sin descripción'}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function VetVaccinationDetail({ data }) {
  return (
    <div className="vet-detail-grid">
      <VetDetailField label="Tipo de vacuna"      value={data.vaccinationType?.name} />
      <VetDetailField label="Fecha"               value={vetFormatEventDate(data.date)} />
      <VetDetailField label="Lote"                value={data.lot} />
      <VetDetailField label="Próxima vacunación"  value={data.nextVaccination ? vetFormatEventDate(data.nextVaccination) : null} />
      <VetDetailField label="Notas"               value={data.notes} span="full" />
      <VetLinkedConsultation consultation={data.consultation} />
    </div>
  );
}

function VetLaboratoryDetail({ data }) {
  return (
    <div className="vet-detail-grid">
      <VetDetailField label="Tipo de examen" value={data.testType?.name} />
      <VetDetailField label="Fecha"          value={vetFormatEventDate(data.date)} />
      <VetDetailField label="Cantidad"       value={data.quantity} />
      <VetDetailField label="Diagnóstico"    value={data.diagnosis} span="full" />
      <VetLinkedConsultation consultation={data.consultation} />
    </div>
  );
}

function VetSurgeryDetail({ data }) {
  return (
    <div className="vet-detail-grid">
      <VetDetailField label="Tipo de cirugía" value={data.surgeryType?.name} />
      <VetDetailField label="Fecha"           value={vetFormatEventDate(data.date)} />
      <VetDetailField label="Descripción"     value={data.description}   span="full" />
      <VetDetailField label="Medicamento"     value={data.medicament}    span="full" />
      <VetDetailField label="Observaciones"   value={data.observations}  span="full" />
      <VetDetailField label="Complicaciones"  value={data.complications} span="full" />
      <VetLinkedConsultation consultation={data.consultation} />
    </div>
  );
}

const VET_DEWORM_TYPE_LABEL = { INTERNAL: 'Interna', EXTERNAL: 'Externa', MIX: 'Mixta', OTHER: 'Otra' };

function VetDewormingDetail({ data }) {
  return (
    <div className="vet-detail-grid">
      <VetDetailField label="Tipo"                   value={VET_DEWORM_TYPE_LABEL[data.deworming || 'OTHER']} />
      <VetDetailField label="Fecha"                  value={vetFormatEventDate(data.date)} />
      <VetDetailField label="Última desparasitación" value={data.lastDeworming ? vetFormatEventDate(data.lastDeworming) : null} />
      <VetDetailField label="Próximo control"        value={data.nextControl ? vetFormatEventDate(data.nextControl) : null} />
      <VetDetailField label="Producto"               value={data.product} />
      <VetDetailField label="Dosis"                  value={data.dosage} />
      <VetDetailField label="Observaciones"          value={data.observations} span="full" />
      <VetLinkedConsultation consultation={data.consultation} />
    </div>
  );
}

const VET_HOSP_TYPE_LABEL = { HOSPITALIZATION: 'Hospitalización', OUTPATIENT: 'Ambulatoria' };
const VET_REASON_LEAVING_LABEL = {
  MEDICAL_DISCHARGE: 'Alta médica', HOME_TREATMENT: 'Tratamiento en casa',
  TRANSFER: 'Traslado', TUTOR_WISH: 'Deseo del tutor',
  ADMIN: 'Administrativa', DEATH: 'Fallecimiento', EUTHANASIA: 'Eutanasia',
};

function VetHospitalizationDetail({ data }) {
  return (
    <div className="vet-detail-grid">
      <VetDetailField label="Tipo"            value={VET_HOSP_TYPE_LABEL[data.hospType]} />
      <VetDetailField label="Fecha"           value={vetFormatEventDate(data.date)} />
      <VetDetailField label="Inicio"          value={vetFormatEventDate(data.startDate)} />
      <VetDetailField label="Fin"             value={data.endDate ? vetFormatEventDate(data.endDate) : null} />
      <VetDetailField label="Motivo de egreso" value={data.reasonLeaving ? VET_REASON_LEAVING_LABEL[data.reasonLeaving] : null} span="full" />
      <VetDetailField label="Motivo"          value={data.reason} span="full" />
      <VetDetailField label="Observaciones"   value={data.observations} span="full" />
      <VetLinkedConsultation consultation={data.consultation} />
    </div>
  );
}

function VetImagingDetail({ data }) {
  return (
    <div className="vet-detail-grid">
      <VetDetailField label="Tipo de imagen" value={data.diagnosticImagingType?.name} />
      <VetDetailField label="Fecha"          value={vetFormatEventDate(data.date)} />
      <VetDetailField label="Tipo de estudio" value={data.studyType}     span="full" />
      <VetDetailField label="Signos clínicos" value={data.clinicalSigns} span="full" />
      <VetDetailField label="Diagnóstico"     value={data.diagnosis}     span="full" />
      <VetDetailField label="Observaciones"   value={data.observations}  span="full" />
      <VetLinkedConsultation consultation={data.consultation} />
    </div>
  );
}

function VetPrescriptionDetail({ data }) {
  const count = data.medicaments.length;
  return (
    <div className="vet-detail-grid">
      <VetDetailField label="Fecha"         value={vetFormatEventDate(data.date)} />
      <VetDetailField label="Diagnóstico"   value={data.diagnosis}    span="full" />
      <VetDetailField label="Observaciones" value={data.observations} span="full" />

      <div className="vet-children-section">
        <div className="vet-children-head">
          <span className="vet-children-label">Medicamentos</span>
          <span className="vet-children-count">{count === 1 ? '1 ítem' : `${count} ítems`}</span>
        </div>
        {count === 0 ? (
          <div className="vet-children-empty">Sin medicamentos registrados.</div>
        ) : (
          <ul className="vet-meds">
            {data.medicaments.map((m) => (
              <li key={m.id} className="vet-med">
                <div className="vet-med-head">
                  <span className="vet-med-name">{m.name}</span>
                  <span className="vet-med-qty">×{m.quantity}</span>
                </div>
                <div className="vet-med-line">
                  <span className="vet-med-tag">Presentación</span>
                  <span>{m.presentation}</span>
                </div>
                <div className="vet-med-line">
                  <span className="vet-med-tag">Posología</span>
                  <span>{m.posology}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <VetLinkedConsultation consultation={data.consultation} />
    </div>
  );
}

// ============================================================================
// EventDetailModal — components/EventDetailModal.vue
// ============================================================================

function VetEventDetailModal({ open, event, children = [], onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [payload, setPayload] = React.useState(null);

  React.useEffect(() => {
    if (!open || !event) { setPayload(null); return; }
    setLoading(true);
    const id = event.sourceId;
    const t = setTimeout(() => {
      const data = VET_MOCK_EVENT_DETAILS[id];
      if (data) setPayload({ type: data.type, data });
      else setPayload(null);
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [open, event?.sourceId, event?.eventType]);

  if (!open || !event) return null;
  const meta = VET_EVENT_TYPES[event.eventType];
  const title = `${meta.icon}  ${meta.label}`;
  const subtitle = `${vetFormatEventDate(event.eventDate)} · #${event.sourceId}`;

  function renderDetail() {
    if (!payload) return null;
    switch (payload.type) {
      case 'CONSULTATION':       return <VetConsultationDetail data={payload.data} children={children} />;
      case 'VACCINATION':        return <VetVaccinationDetail data={payload.data} />;
      case 'LABORATORY_TEST':    return <VetLaboratoryDetail data={payload.data} />;
      case 'SURGERY':            return <VetSurgeryDetail data={payload.data} />;
      case 'DEWORMING':          return <VetDewormingDetail data={payload.data} />;
      case 'HOSPITALIZATION':    return <VetHospitalizationDetail data={payload.data} />;
      case 'DIAGNOSTIC_IMAGING': return <VetImagingDetail data={payload.data} />;
      case 'PRESCRIPTION':       return <VetPrescriptionDetail data={payload.data} />;
      default: return <div style={{ padding: 20, color: 'var(--warm-500)' }}>Tipo no soportado.</div>;
    }
  }

  return (
    <VetModalShell
      open={open}
      title={title}
      subtitle={subtitle}
      width={640}
      onClose={onClose}
      footerActions={
        <button type="button" className="vet-historia-btn-primary" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '40px 0' }}>
          <VetPawLoader />
        </div>
      ) : payload ? renderDetail() : (
        <div className="vet-banner-error">No se pudo cargar el detalle del evento.</div>
      )}
    </VetModalShell>
  );
}

// ============================================================================
// PawLoader — components/ui/PawLoader.vue (simplified)
// ============================================================================
function VetPawLoader({ size = 42 }) {
  return (
    <div style={{
      width: size, height: size, color: 'var(--amatista-500)',
      animation: 'vetSpin 0.9s linear infinite', transformOrigin: 'center',
      display: 'inline-flex',
    }}>
      <VetIcons.PawPrint size={size} strokeWidth={1.5} />
    </div>
  );
}

Object.assign(window, {
  VetDetailField, VetLinkedConsultation,
  VetConsultationDetail, VetVaccinationDetail, VetLaboratoryDetail,
  VetSurgeryDetail, VetDewormingDetail, VetHospitalizationDetail,
  VetImagingDetail, VetPrescriptionDetail,
  VetEventDetailModal, VetPawLoader,
});
