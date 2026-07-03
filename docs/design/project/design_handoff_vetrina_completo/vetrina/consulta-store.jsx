/* global React, VET_MOCK_OWNERS, VET_MOCK_PETS */

// ============================================================================
// FORMAT HELPERS — composables/format.ts
// ============================================================================

const VET_C_MONTHS_LONG = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const VET_C_MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function vetTodayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function vetFormatDateLong(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} de ${VET_C_MONTHS_LONG[m - 1]}, ${y}`;
}
function vetFormatDateShort(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${VET_C_MONTHS_SHORT[m - 1]} ${y}`;
}
function vetCalcAge(bodIso) {
  if (!bodIso) return '—';
  const bod = new Date(bodIso);
  if (Number.isNaN(bod.getTime())) return '—';
  const now = new Date();
  let years = now.getFullYear() - bod.getFullYear();
  let months = now.getMonth() - bod.getMonth();
  if (now.getDate() < bod.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0 && months <= 0) return 'Recién nacido';
  if (years <= 0) return `${months} mes${months === 1 ? '' : 'es'}`;
  if (months === 0) return `${years} año${years === 1 ? '' : 's'}`;
  return `${years} año${years === 1 ? '' : 's'} · ${months} m`;
}
function vetInitialsC(name) {
  return name.trim().split(/\s+/).map((p) => p[0] ?? '').slice(0, 2).join('').toUpperCase();
}
function vetGenderLabel(g)       { return g === 'FEMALE' ? 'Hembra' : g === 'MALE' ? 'Macho' : '—'; }
function vetReproductiveLabel(r) {
  if (r === 'STERILIZED') return 'Esterilizada';
  if (r === 'NO_STERILIZED') return 'No esterilizada';
  if (r === 'UNKNOWN') return 'Desconocido';
  return '—';
}
function vetWeightUnitLabel(u)   { return u === 'KILOGRAMS' ? 'kg' : u === 'GRAMS' ? 'g' : u === 'POUNDS' ? 'lb' : ''; }

// ============================================================================
// CATALOGS (mocks)
// ============================================================================

const VET_CONSULTATION_TYPES = [
  { id: '1', name: 'Control general' },
  { id: '2', name: 'Vacunación' },
  { id: '3', name: 'Dermatología' },
  { id: '4', name: 'Ortopedia' },
  { id: '5', name: 'Emergencia' },
  { id: '6', name: 'Geriátrico' },
  { id: '7', name: 'Odontológica' },
  { id: '8', name: 'Postoperatorio' },
  { id: '9', name: 'Reproducción' },
  { id: '10', name: 'Comportamiento' },
];

const VET_SPECIES = [
  { id: '1', name: 'Canino' }, { id: '2', name: 'Felino' },
  { id: '3', name: 'Conejo' }, { id: '4', name: 'Ave' }, { id: '5', name: 'Otro' },
];
const VET_BREEDS_BY_SPECIE = {
  '1': [
    { id: 'b1', name: 'Mestizo' }, { id: 'b3', name: 'Labrador Retriever' },
    { id: 'b6', name: 'Golden Retriever' }, { id: 'b7', name: 'Schnauzer' },
    { id: 'b8', name: 'Border Collie' }, { id: 'b9', name: 'Bulldog' },
    { id: 'b10', name: 'Pastor Alemán' }, { id: 'b11', name: 'Chihuahua' },
  ],
  '2': [
    { id: 'b2', name: 'Mestizo' }, { id: 'b21', name: 'Persa' },
    { id: 'b22', name: 'Siamés' }, { id: 'b23', name: 'Maine Coon' },
    { id: 'b24', name: 'British Shorthair' },
  ],
  '3': [{ id: 'b31', name: 'Belier' }, { id: 'b32', name: 'Holland Lop' }],
  '4': [{ id: 'b41', name: 'Periquito' }, { id: 'b42', name: 'Canario' }],
  '5': [{ id: 'b51', name: 'Sin especificar' }],
};
const VET_ANIMAL_COLORS = [
  { id: 'c1', name: 'Negro' }, { id: 'c2', name: 'Blanco' },
  { id: 'c3', name: 'Dorado' }, { id: 'c4', name: 'Atigrado' },
  { id: 'c5', name: 'Tricolor' }, { id: 'c6', name: 'Marrón' },
  { id: 'c7', name: 'Gris' }, { id: 'c8', name: 'Crema' },
];

const VET_COUNTRIES_C = [
  { id: '1', name: 'Colombia' }, { id: '2', name: 'México' }, { id: '3', name: 'Perú' },
];
const VET_STATES_C = {
  '1': [{ id: '11', name: 'Cundinamarca' }, { id: '12', name: 'Antioquia' }],
  '2': [{ id: '21', name: 'CDMX' }, { id: '22', name: 'Jalisco' }],
  '3': [{ id: '31', name: 'Lima' }, { id: '32', name: 'Arequipa' }],
};
const VET_CITIES_C = {
  '11': [{ id: '111', name: 'Bogotá' }, { id: '112', name: 'Soacha' }],
  '12': [{ id: '121', name: 'Medellín' }, { id: '122', name: 'Envigado' }],
  '21': [{ id: '211', name: 'Ciudad de México' }],
  '22': [{ id: '221', name: 'Guadalajara' }],
  '31': [{ id: '311', name: 'Lima' }],
  '32': [{ id: '321', name: 'Arequipa' }],
};

const VET_VACCINATION_TYPES = [
  { id: '1', name: 'Triple felina' }, { id: '2', name: 'Triple felina + Leucemia' },
  { id: '3', name: 'Antirrábica' }, { id: '4', name: 'Óctuple canina' },
  { id: '5', name: 'Tos de las perreras' },
];
const VET_LAB_TYPES = [
  { id: '1', name: 'Hemograma completo' }, { id: '2', name: 'Química sanguínea (8)' },
  { id: '3', name: 'Uroanálisis' }, { id: '4', name: 'Coprológico' },
  { id: '5', name: 'Panel geriátrico' },
];
const VET_IMAGING_TYPES = [
  { id: '1', name: 'Radiografía simple' }, { id: '2', name: 'Ecografía abdominal' },
  { id: '3', name: 'TAC' }, { id: '4', name: 'RMN' },
];
const VET_SURGERY_TYPES = [
  { id: '1', name: 'OVH (esterilización)' }, { id: '2', name: 'Profilaxis dental' },
  { id: '3', name: 'Castración' }, { id: '4', name: 'Otra cirugía' },
];

// ============================================================================
// DRAFT STORE — composables/useNuevaConsultaDraft.ts
// ============================================================================

const vetEmptyConsultation = () => ({
  date: vetTodayISO(),
  typeId: '',
  anamnesis: '', diagnosis: '',
  diagnosticPlan: '', therapeuticPlan: '',
  nextControlDate: '', nextControlNotes: '',
});

const vetEmptyOwnerCreating = (init = {}) => ({
  name: '', document: '', phone: '', email: '', address: '',
  countryId: '', stateId: '', cityId: '', ...init,
});

const vetEmptyPetCreating = () => ({
  name: '', specieId: '', breedId: '', colorId: '',
  gender: '', bod: '', weight: '', weightType: 'KILOGRAMS',
  reproductiveState: '',
});

const VET_INITIAL_DRAFT = {
  step: 1,
  owner: null,
  ownerCreating: null,
  pet: null,
  petCreating: null,
  consultation: vetEmptyConsultation(),
  consultationType: null,
  consultationCreatedId: null,
  prescriptions: [],
  laboratoryTests: [],
  diagnosticImagings: [],
  vaccinations: [],
  hospitalizations: [],
  dewormings: [],
  surgeries: [],
};

const VetDraftCtx = React.createContext(null);

function VetDraftProvider({ children }) {
  const [s, setS] = React.useState(VET_INITIAL_DRAFT);
  const patch = (p) => setS((prev) => ({ ...prev, ...p }));
  const patchConsultation = (p) =>
    setS((prev) => ({ ...prev, consultation: { ...prev.consultation, ...p } }));

  const api = React.useMemo(() => ({
    state: s,
    setStep: (step) => patch({ step }),
    setOwner: (owner) => setS((p) => ({ ...p, owner, ownerCreating: null })),
    startCreatingOwner: (init) => patch({ ownerCreating: vetEmptyOwnerCreating(init) }),
    cancelCreatingOwner: () => patch({ ownerCreating: null }),
    updateOwnerCreating: (p) =>
      setS((prev) => ({ ...prev, ownerCreating: { ...prev.ownerCreating, ...p } })),

    setPet: (pet) => setS((p) => ({ ...p, pet, petCreating: null })),
    startCreatingPet: () => patch({ petCreating: vetEmptyPetCreating() }),
    cancelCreatingPet: () => patch({ petCreating: null }),
    updatePetCreating: (p) =>
      setS((prev) => ({ ...prev, petCreating: { ...prev.petCreating, ...p } })),

    updateConsultation: patchConsultation,
    setConsultationType: (t) => patch({ consultationType: t }),

    addPrescription: (p) => setS((prev) => ({ ...prev, prescriptions: [...prev.prescriptions, p] })),
    removePrescription: (i) => setS((prev) => ({ ...prev, prescriptions: prev.prescriptions.filter((_, idx) => idx !== i) })),
    updatePrescription: (i, p) => setS((prev) => ({ ...prev, prescriptions: prev.prescriptions.map((x, idx) => idx === i ? p : x) })),

    addLaboratoryTest: (t) => setS((prev) => ({ ...prev, laboratoryTests: [...prev.laboratoryTests, t] })),
    removeLaboratoryTest: (i) => setS((prev) => ({ ...prev, laboratoryTests: prev.laboratoryTests.filter((_, idx) => idx !== i) })),

    addDiagnosticImaging: (t) => setS((prev) => ({ ...prev, diagnosticImagings: [...prev.diagnosticImagings, t] })),
    removeDiagnosticImaging: (i) => setS((prev) => ({ ...prev, diagnosticImagings: prev.diagnosticImagings.filter((_, idx) => idx !== i) })),

    addVaccination: (t) => setS((prev) => ({ ...prev, vaccinations: [...prev.vaccinations, t] })),
    removeVaccination: (i) => setS((prev) => ({ ...prev, vaccinations: prev.vaccinations.filter((_, idx) => idx !== i) })),

    addHospitalization: (t) => setS((prev) => ({ ...prev, hospitalizations: [...prev.hospitalizations, t] })),
    removeHospitalization: (i) => setS((prev) => ({ ...prev, hospitalizations: prev.hospitalizations.filter((_, idx) => idx !== i) })),

    addDeworming: (t) => setS((prev) => ({ ...prev, dewormings: [...prev.dewormings, t] })),
    removeDeworming: (i) => setS((prev) => ({ ...prev, dewormings: prev.dewormings.filter((_, idx) => idx !== i) })),

    addSurgery: (t) => setS((prev) => ({ ...prev, surgeries: [...prev.surgeries, t] })),
    removeSurgery: (i) => setS((prev) => ({ ...prev, surgeries: prev.surgeries.filter((_, idx) => idx !== i) })),

    reset: () => setS(VET_INITIAL_DRAFT),
    resetKeepingOwner: () => setS((prev) => ({ ...VET_INITIAL_DRAFT, owner: prev.owner, step: 2 })),
  }), [s]);

  api.isEmpty = !s.owner && !s.ownerCreating && !s.pet && !s.petCreating;
  api.actionsCount =
    s.prescriptions.length + s.laboratoryTests.length + s.diagnosticImagings.length +
    s.vaccinations.length + s.hospitalizations.length + s.dewormings.length + s.surgeries.length;

  return <VetDraftCtx.Provider value={api}>{children}</VetDraftCtx.Provider>;
}
function useVetDraft() { return React.useContext(VetDraftCtx); }

Object.assign(window, {
  vetTodayISO, vetFormatDateLong, vetFormatDateShort, vetCalcAge, vetInitialsC,
  vetGenderLabel, vetReproductiveLabel, vetWeightUnitLabel,
  VET_CONSULTATION_TYPES, VET_SPECIES, VET_BREEDS_BY_SPECIE, VET_ANIMAL_COLORS,
  VET_COUNTRIES_C, VET_STATES_C, VET_CITIES_C,
  VET_VACCINATION_TYPES, VET_LAB_TYPES, VET_IMAGING_TYPES, VET_SURGERY_TYPES,
  VetDraftProvider, useVetDraft,
});
