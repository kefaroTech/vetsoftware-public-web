// App raíz: navegación entre los 6 flujos standalone

function StandaloneFlowsApp() {
  const [activeId, setActiveId] = React.useState('lab');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  // Estado local de registros (mutable para ver el resultado de crear)
  const [labs, setLabs] = React.useState(LAB_RECORDS);
  const [imgs, setImgs] = React.useState(IMAGING_RECORDS);
  const [vacs, setVacs] = React.useState(VACCINE_RECORDS);
  const [hosp, setHosp] = React.useState(HOSP_RECORDS);
  const [dew,  setDew]  = React.useState(DEWORM_RECORDS);
  const [surg, setSurg] = React.useState(SURGERY_RECORDS);

  const flows = {
    lab: {
      title: 'Exámenes de laboratorio', eyebrow: 'Acciones clínicas',
      subtitle: 'Solicita exámenes sin necesidad de iniciar una consulta.',
      ctaLabel: '+ Nueva solicitud',
      Body: () => <LabFlow records={labs} />,
      Modal: (props) => <LabCreateModal {...props} onSave={(d) => {
        setLabs(arr => [{ id:Date.now(), date:d.date, patientId:d.patientId,
          tests:d.tests.map(t=>t.type), suspicion:d.suspicion, status:'pendiente', vet:'Mariana Soto' }, ...arr]);
        setModalOpen(false); setToast('Solicitud de laboratorio creada');
      }}/>,
    },
    imaging: {
      title: 'Imagen diagnóstica', eyebrow: 'Acciones clínicas',
      subtitle: 'Estudios de imagen (RX, eco, TAC, RM, endoscopia) independientes.',
      ctaLabel: '+ Nuevo estudio',
      Body: () => <ImagingFlow records={imgs} />,
      Modal: (props) => <ImagingCreateModal {...props} onSave={(d) => {
        setImgs(arr => [{ id:Date.now(), date:d.date, patientId:d.patientId,
          type:d.type, studyType:d.studyType, signs:d.signs, status:'pendiente', vet:'Mariana Soto' }, ...arr]);
        setModalOpen(false); setToast('Estudio de imagen creado');
      }}/>,
    },
    vaccine: {
      title: 'Vacunación', eyebrow: 'Acciones clínicas',
      subtitle: 'Registra dosis aplicadas sin pasar por consulta.',
      ctaLabel: '+ Registrar dosis',
      Body: () => <VaccineFlow records={vacs} />,
      Modal: (props) => <VaccineCreateModal {...props} onSave={(d) => {
        setVacs(arr => [...d.items.map((it, idx) => ({
          id: Date.now() + idx, date: d.date, patientId: d.patientId,
          vaccine: it.type, lab: it.lab, lot: it.lot, nextDate: it.next, vet:'Mariana Soto',
        })), ...arr]);
        setModalOpen(false); setToast('Vacunación registrada');
      }}/>,
    },
    hosp: {
      title: 'Hospitalización', eyebrow: 'Acciones clínicas',
      subtitle: 'Internaciones y tratamientos ambulatorios.',
      ctaLabel: '+ Nueva hospitalización',
      Body: () => <HospFlow records={hosp} />,
      Modal: (props) => <HospCreateModal {...props} onSave={(d) => {
        setHosp(arr => [{
          id: Date.now(), patientId: d.patientId, type: d.type,
          startDate: d.startDate, endDate: d.endDate || null,
          reason: d.reason,
          status: d.endDate ? 'DISCHARGED' : 'ACTIVE', vet: 'Mariana Soto',
        }, ...arr]);
        setModalOpen(false); setToast('Hospitalización registrada');
      }}/>,
    },
    deworm: {
      title: 'Desparasitación', eyebrow: 'Acciones clínicas',
      subtitle: 'Aplicaciones internas, externas o mixtas.',
      ctaLabel: '+ Nueva desparasitación',
      Body: () => <DewormFlow records={dew} />,
      Modal: (props) => <DewormCreateModal {...props} onSave={(d) => {
        setDew(arr => [{
          id: Date.now(), date: d.date, patientId: d.patientId, type: d.type,
          product: d.product, dosage: d.dosage, next: d.next, vet:'Mariana Soto',
        }, ...arr]);
        setModalOpen(false); setToast('Desparasitación registrada');
      }}/>,
    },
    surgery: {
      title: 'Cirugía', eyebrow: 'Acciones clínicas',
      subtitle: 'Programa cirugías o registra procedimientos completados.',
      ctaLabel: '+ Nueva cirugía',
      Body: () => <SurgeryFlow records={surg} />,
      Modal: (props) => <SurgeryCreateModal {...props} onSave={(d) => {
        setSurg(arr => [{
          id: Date.now(), date: d.date, patientId: d.patientId,
          surgeryType: d.surgeryType, description: d.desc,
          status: 'scheduled', vet: 'Mariana Soto',
        }, ...arr]);
        setModalOpen(false); setToast('Cirugía registrada');
      }}/>,
    },
  };

  const flow = flows[activeId];

  return (
    <FlowShell
      activeId={activeId}
      onNav={(id) => { setActiveId(id); setModalOpen(false); }}
      title={flow.title} eyebrow={flow.eyebrow} subtitle={flow.subtitle}
      primaryCta={<PrimaryBtn onClick={() => setModalOpen(true)}>{flow.ctaLabel}</PrimaryBtn>}
    >
      <flow.Body />
      {modalOpen && <flow.Modal onClose={() => setModalOpen(false)} />}
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}
    </FlowShell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<StandaloneFlowsApp />);
