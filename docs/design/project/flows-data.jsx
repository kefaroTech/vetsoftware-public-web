// Standalone flows · Data mocks (pacientes + registros recientes por módulo)

const PATIENTS = [
  { id:1, name:'Luna',   specie:'Felino', breed:'Mestizo',     owner:'Carla Mendoza',   weight:'4.2 kg', age:'4 años',  initials:'LU' },
  { id:2, name:'Rocco',  specie:'Canino', breed:'Labrador',     owner:'Carla Mendoza',   weight:'32 kg',  age:'7 años',  initials:'RO' },
  { id:3, name:'Niko',   specie:'Canino', breed:'Beagle',       owner:'Carla Vásquez',   weight:'11 kg',  age:'2 años',  initials:'NI' },
  { id:4, name:'Toby',   specie:'Canino', breed:'Schnauzer',    owner:'Carlos Mendoza',  weight:'8 kg',   age:'5 años',  initials:'TO' },
  { id:5, name:'Pepa',   specie:'Felino', breed:'Siamés',       owner:'Carlos Mendoza',  weight:'3.8 kg', age:'3 años',  initials:'PE' },
  { id:6, name:'Bruno',  specie:'Canino', breed:'Bulldog F.',   owner:'Carlos Mendoza',  weight:'10 kg',  age:'1 año',   initials:'BR' },
  { id:7, name:'Mishi',  specie:'Felino', breed:'Persa',        owner:'Andrea Solís',    weight:'4.0 kg', age:'6 años',  initials:'MI' },
  { id:8, name:'Kiwi',   specie:'Ave',    breed:'Periquito',    owner:'Laura Reinoso',   weight:'80 g',   age:'3 años',  initials:'KI' },
];

const LAB_RECORDS = [
  { id:101, date:'2026-05-14', patientId:1, tests:['Hemograma completo','Bioquímica'], suspicion:'Decaimiento + vómitos', status:'pendiente', vet:'Mariana Soto' },
  { id:102, date:'2026-05-13', patientId:4, tests:['T4 / TSH'], suspicion:'Letargia', status:'completado', vet:'Lucía Fernández' },
  { id:103, date:'2026-05-12', patientId:2, tests:['Urianálisis','Cultivo + antibiograma'], suspicion:'Cistitis recurrente', status:'pendiente', vet:'Mariana Soto' },
];

const IMAGING_RECORDS = [
  { id:201, date:'2026-05-15', patientId:2, type:'Ecografía', studyType:'Abdomen completo', signs:'Distensión abdominal · 48h', status:'pendiente', vet:'Valeria Cordero' },
  { id:202, date:'2026-05-14', patientId:5, type:'Rayos X',   studyType:'Tórax 2 vistas',  signs:'Tos seca persistente',     status:'completado', vet:'Mariana Soto' },
  { id:203, date:'2026-05-11', patientId:7, type:'TAC',       studyType:'Cráneo',          signs:'Crisis convulsivas',       status:'completado', vet:'Lucía Fernández' },
];

const VACCINE_RECORDS = [
  { id:301, date:'2026-05-15', patientId:1, vaccine:'Triple felina',         lab:'Zoetis', lot:'TF-2026-04', nextDate:'2027-05-15', vet:'Mariana Soto' },
  { id:302, date:'2026-05-15', patientId:3, vaccine:'Polivalente (DHPPi+L)', lab:'MSD',    lot:'PV-2025-12', nextDate:'2027-05-15', vet:'Mariana Soto' },
  { id:303, date:'2026-05-13', patientId:6, vaccine:'Antirrábica',           lab:'Virbac', lot:'AR-2026-02', nextDate:'2027-05-13', vet:'Valeria Cordero' },
];

const HOSP_RECORDS = [
  { id:401, patientId:2, type:'HOSPITALIZATION', startDate:'2026-05-14', endDate:null,         reason:'Pancreatitis aguda', status:'ACTIVE',     vet:'Lucía Fernández' },
  { id:402, patientId:7, type:'HOSPITALIZATION', startDate:'2026-05-13', endDate:'2026-05-15', reason:'Post-quirúrgico',    status:'DISCHARGED', vet:'Mariana Soto' },
  { id:403, patientId:8, type:'OUTPATIENT',      startDate:'2026-05-12', endDate:'2026-05-12', reason:'Fluidoterapia',      status:'DISCHARGED', vet:'Valeria Cordero' },
];

const DEWORM_RECORDS = [
  { id:501, date:'2026-05-15', patientId:1, type:'INTERNAL', product:'Drontal Plus',  dosage:'1 comp/10kg VO', next:'2026-08-15', vet:'Mariana Soto' },
  { id:502, date:'2026-05-12', patientId:4, type:'EXTERNAL', product:'Bravecto',       dosage:'1 comp VO',      next:'2026-08-10', vet:'Valeria Cordero' },
  { id:503, date:'2026-05-09', patientId:6, type:'MIX',      product:'NexGard Spectra',dosage:'1 comp VO',      next:'2026-08-09', vet:'Lucía Fernández' },
];

const SURGERY_RECORDS = [
  { id:601, date:'2026-05-20', patientId:3, surgeryType:'Esterilización (OVH)',    description:'OVH electiva',         status:'scheduled', vet:'Lucía Fernández' },
  { id:602, date:'2026-05-13', patientId:7, surgeryType:'Limpieza dental',         description:'+ extracción de 2 pza', status:'completed', vet:'Lucía Fernández' },
  { id:603, date:'2026-05-10', patientId:5, surgeryType:'Castración',              description:'Sin complicaciones',    status:'completed', vet:'Mariana Soto' },
];

const STATUS_LABELS = {
  pendiente:   { bg: 'oklch(96% 0.04 80)',  fg: 'oklch(40% 0.13 70)',  label: 'Pendiente' },
  completado:  { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', label: 'Completado' },
  ACTIVE:      { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)', label: 'En curso' },
  DISCHARGED:  { bg: 'var(--warm-200)',     fg: 'var(--warm-700)',     label: 'De alta' },
  scheduled:   { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)', label: 'Programada' },
  completed:   { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', label: 'Completada' },
};

function findPatient(id) { return PATIENTS.find(p => p.id === id); }
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00');
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

Object.assign(window, {
  PATIENTS, LAB_RECORDS, IMAGING_RECORDS, VACCINE_RECORDS,
  HOSP_RECORDS, DEWORM_RECORDS, SURGERY_RECORDS, STATUS_LABELS,
  findPatient, fmtDate,
});
