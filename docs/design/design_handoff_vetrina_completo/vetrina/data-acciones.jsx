/* global VET_MOCK_OWNERS, VET_MOCK_PETS,
   VET_VACCINATION_TYPES, VET_LAB_TYPES, VET_IMAGING_TYPES, VET_SURGERY_TYPES */

// Mock data para las 6 vistas de Acciones Clínicas (listados standalone)

const VET_ACCIONES_LAB = [
  { id: 101, animalId: '1001', date: '2025-11-04', testType: { name: 'Hemograma + química' }, quantity: 1, diagnosis: 'Eosinofilia leve. Resto normal.' },
  { id: 102, animalId: '1005', date: '2026-05-23', testType: { name: 'Panel geriátrico + uroanálisis' }, quantity: 1, diagnosis: 'Creatinina 1.6 mg/dL.' },
  { id: 103, animalId: '1001', date: '2024-12-02', testType: { name: 'Coprológico' }, quantity: 2, diagnosis: 'Negativo.' },
  { id: 104, animalId: '1003', date: '2025-03-12', testType: { name: 'Hemograma completo' }, quantity: 1, diagnosis: 'Normal.' },
];

const VET_ACCIONES_IMAGING = [
  { id: 201, animalId: '1003', date: '2026-05-23', diagnosticImagingType: { name: 'Radiografía simple' }, studyType: 'Cadera AP + LL', diagnosis: 'Displasia coxofemoral leve.', observations: 'Comparativo bilateral.' },
  { id: 202, animalId: '1005', date: '2024-12-11', diagnosticImagingType: { name: 'Radiografía simple' }, studyType: 'Tórax LL', diagnosis: 'Sin alteraciones.', observations: '—' },
  { id: 203, animalId: '1004', date: '2026-05-05', diagnosticImagingType: { name: 'Ecografía abdominal' }, studyType: 'Abdomen completo', diagnosis: 'Vejiga distendida.', observations: 'Repetir en 7 días.' },
];

const VET_ACCIONES_VAC = [
  { id: 301, animalId: '1001', date: '2026-05-12', vaccinationType: { name: 'Triple felina + Leucemia' }, lot: 'VT-99221', nextVaccination: '2027-05-12', notes: 'Sin reacción adversa.' },
  { id: 302, animalId: '1002', date: '2026-04-30', vaccinationType: { name: 'Triple felina' }, lot: 'VT-99440', nextVaccination: '2027-04-30', notes: '' },
  { id: 303, animalId: '1003', date: '2025-08-04', vaccinationType: { name: 'Óctuple canina' }, lot: 'OC-22118', nextVaccination: '2026-08-04', notes: '' },
  { id: 304, animalId: '1006', date: '2026-05-01', vaccinationType: { name: 'Óctuple canina (refuerzo)' }, lot: 'OC-23330', nextVaccination: '2027-05-01', notes: '' },
  { id: 305, animalId: '1009', date: '2025-12-08', vaccinationType: { name: 'Triple felina (1ª dosis)' }, lot: 'VT-99001', nextVaccination: '2026-01-08', notes: 'Refuerzo en 30 días.' },
];

const VET_ACCIONES_HOSP = [
  { id: 401, animalId: '1001', date: '2024-05-11', type: 'HOSPITALIZATION', startDate: '2024-05-11', endDate: '2024-05-12', reason: 'Observación postquirúrgica OVH.', reasonLeaving: 'MEDICAL_DISCHARGE', observations: 'Recuperación normal.' },
  { id: 402, animalId: '1005', date: '2024-12-11', type: 'OUTPATIENT', startDate: '2024-12-11', endDate: '2024-12-11', reason: 'Post-anestesia profilaxis dental.', reasonLeaving: 'MEDICAL_DISCHARGE', observations: '' },
];

const VET_ACCIONES_DEWORM = [
  { id: 501, animalId: '1001', date: '2026-05-12', type: 'INTERNAL', product: 'Drontal Cat', dosage: '1 tableta', lastDeworming: '2025-11-04', nextControl: '2026-11-12', observations: 'Bien tolerada.' },
  { id: 502, animalId: '1003', date: '2025-08-04', type: 'MIX', product: 'Bravecto + Drontal Plus', dosage: 'Según peso', lastDeworming: '2025-05-01', nextControl: '2025-11-04', observations: '' },
  { id: 503, animalId: '1007', date: '2026-04-15', type: 'EXTERNAL', product: 'Frontline TriAct', dosage: '1 pipeta', lastDeworming: '', nextControl: '2026-05-15', observations: '' },
];

const VET_ACCIONES_SURG = [
  { id: 601, animalId: '1001', date: '2024-05-11', surgeryType: { name: 'OVH' }, description: 'Ovariohisterectomía electiva.', medicament: 'Aceprom + ketamina + propofol.', observations: '45 min sin complicaciones.', complications: 'Ninguna.' },
  { id: 602, animalId: '1005', date: '2024-12-11', surgeryType: { name: 'Profilaxis dental' }, description: 'Profilaxis + extracciones (3 piezas).', medicament: 'Isofluorano + meloxicam.', observations: '60 min, recuperación normal.', complications: 'Ninguna.' },
  { id: 603, animalId: '1004', date: '2026-05-08', surgeryType: { name: 'OVH' }, description: 'Esterilización electiva línea media.', medicament: 'Acepromacina + propofol + isofluorano.', observations: '35 min sin complicaciones.', complications: 'Ninguna.' },
];

// Spa
const VET_SPA_TYPES = [
  { id: '1', name: 'Baño completo' },
  { id: '2', name: 'Baño medicado' },
  { id: '3', name: 'Corte de pelo' },
  { id: '4', name: 'Limpieza de oídos' },
  { id: '5', name: 'Corte de uñas' },
  { id: '6', name: 'Peinado y desenredado' },
  { id: '7', name: 'Estética completa' },
];

const VET_ACCIONES_SPA = [
  { id: 701, animalId: '1001', date: '2026-04-22', spaType: { name: 'Baño completo' }, reason: 'Mantenimiento mensual.', details: 'Shampoo hipoalergénico, secado a baja temperatura.', observations: 'Comportamiento tranquilo. Pelaje en buen estado.' },
  { id: 702, animalId: '1003', date: '2026-05-10', spaType: { name: 'Estética completa' }, reason: 'Corte de raza Labrador.', details: 'Baño + corte sanitario + uñas + oídos.', observations: 'Sin novedades.' },
  { id: 703, animalId: '1002', date: '2026-03-18', spaType: { name: 'Baño medicado' }, reason: 'Dermatitis leve.', details: 'Shampoo con clorhexidina al 4%. 2 aplicaciones consecutivas.', observations: 'Mejora visible tras la segunda aplicación.' },
  { id: 704, animalId: '1007', date: '2026-05-21', spaType: { name: 'Corte de pelo' }, reason: 'Verano — reducir pelaje.', details: 'Corte tipo escolar, sin afeitar.', observations: 'Tranquila durante el proceso.' },
  { id: 705, animalId: '1006', date: '2026-02-04', spaType: { name: 'Limpieza de oídos' }, reason: 'Acumulación de cerumen.', details: 'Limpieza con solución otológica enzimática.', observations: 'Próximo control en 1 mes.' },
];

// Helpers para localizar owner / pet a partir del animalId
function vetFindPetAnywhere(animalId) {
  for (const ownerId of Object.keys(VET_MOCK_PETS)) {
    const p = VET_MOCK_PETS[ownerId].find((x) => x.id === animalId);
    if (p) {
      const owner = VET_MOCK_OWNERS.find((o) => o.id === ownerId);
      return { owner, animal: p };
    }
  }
  return null;
}

Object.assign(window, {
  VET_ACCIONES_LAB, VET_ACCIONES_IMAGING, VET_ACCIONES_VAC,
  VET_ACCIONES_HOSP, VET_ACCIONES_DEWORM, VET_ACCIONES_SURG,
  VET_ACCIONES_SPA, VET_SPA_TYPES,
  vetFindPetAnywhere,
});
