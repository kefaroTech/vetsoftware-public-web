// Datos mock alineados al backend: ClinicalEventResponse + ClinicalEventType
// Flujo: Propietario → Mascota → Historia (timeline de eventos)

const OWNERS = [
  { id:1, name:'Carla Mendoza Ríos',  document:'DNI 41.829.301', email:'carla.mendoza@gmail.com', phone:'+51 987 654 321', address:'Av. Salaverry 2580 · Lima', petsCount:2, initials:'CM' },
  { id:2, name:'Carlos Bustamante',    document:'DNI 38.451.220', email:'carlos.b@gmail.com',     phone:'+51 962 311 089', address:'Calle Lima 421 · Lima',    petsCount:3, initials:'CB' },
  { id:3, name:'Andrea Solís Vega',    document:'DNI 45.123.876', email:'andrea.solis@vet.com',   phone:'+51 951 220 887', address:'Av. Brasil 1280 · Lima',   petsCount:1, initials:'AS' },
  { id:4, name:'Laura Reinoso',        document:'DNI 49.110.554', email:'laura.r@hotmail.com',    phone:'+51 988 401 220', address:'Jr. Camaná 540 · Lima',    petsCount:2, initials:'LR' },
  { id:5, name:'Diego Salinas',        document:'DNI 47.331.082', email:'diego.s@gmail.com',      phone:'+51 977 555 410', address:'Av. Aviación 3100 · Lima', petsCount:1, initials:'DS' },
  { id:6, name:'Valeria Cordero',      document:'DNI 44.502.991', email:'valeria.c@vet.com',      phone:'+51 933 800 277', address:'Av. La Marina 890 · Lima', petsCount:2, initials:'VC' },
];

const PETS = [
  { id:1,  ownerId:1, name:'Luna',   specie:'Felino', breed:'Mestizo',    sex:'F', weight:'4.2 kg',  age:'4 años',  birthDate:'2022-04-15', initials:'LU', color:'Atigrado' },
  { id:2,  ownerId:1, name:'Rocco',  specie:'Canino', breed:'Labrador',   sex:'M', weight:'32 kg',   age:'7 años',  birthDate:'2019-02-10', initials:'RO', color:'Dorado' },
  { id:3,  ownerId:2, name:'Toby',   specie:'Canino', breed:'Schnauzer',  sex:'M', weight:'8 kg',    age:'5 años',  birthDate:'2021-08-20', initials:'TO', color:'Sal y pimienta' },
  { id:4,  ownerId:2, name:'Pepa',   specie:'Felino', breed:'Siamés',     sex:'F', weight:'3.8 kg',  age:'3 años',  birthDate:'2023-01-05', initials:'PE', color:'Seal point' },
  { id:5,  ownerId:2, name:'Bruno',  specie:'Canino', breed:'Bulldog F.', sex:'M', weight:'10 kg',   age:'1 año',   birthDate:'2025-04-12', initials:'BR', color:'Atigrado' },
  { id:6,  ownerId:3, name:'Mishi',  specie:'Felino', breed:'Persa',      sex:'F', weight:'4.0 kg',  age:'6 años',  birthDate:'2020-03-22', initials:'MI', color:'Blanco' },
  { id:7,  ownerId:4, name:'Kiwi',   specie:'Ave',    breed:'Periquito',  sex:'M', weight:'80 g',    age:'3 años',  birthDate:'2023-06-01', initials:'KI', color:'Verde' },
  { id:8,  ownerId:4, name:'Niko',   specie:'Canino', breed:'Beagle',     sex:'M', weight:'11 kg',   age:'2 años',  birthDate:'2024-02-18', initials:'NI', color:'Tricolor' },
  { id:9,  ownerId:5, name:'Coco',   specie:'Canino', breed:'Pug',        sex:'M', weight:'9 kg',    age:'4 años',  birthDate:'2022-09-30', initials:'CO', color:'Beige' },
  { id:10, ownerId:6, name:'Maya',   specie:'Felino', breed:'Mestizo',    sex:'F', weight:'3.5 kg',  age:'2 años',  birthDate:'2024-05-18', initials:'MA', color:'Negra' },
  { id:11, ownerId:6, name:'Thor',   specie:'Canino', breed:'Husky',      sex:'M', weight:'28 kg',   age:'5 años',  birthDate:'2021-01-10', initials:'TH', color:'Gris' },
];

// Mock de eventos clínicos por mascota (Luna · id:1)
const EVENTS_BY_PET = {
  1: [
    { sourceId:101, eventType:'CONSULTATION',     eventDate:'2026-05-12', summary:'Control de rutina · sin hallazgos relevantes' },
    { sourceId:301, eventType:'VACCINATION',      eventDate:'2026-05-12', summary:'Triple felina · Lote TF-2026-04 · Zoetis' },
    { sourceId:501, eventType:'DEWORMING',        eventDate:'2026-05-12', summary:'Interna · Drontal Plus 1 comp/4kg' },
    { sourceId:701, eventType:'PRESCRIPTION',     eventDate:'2026-05-12', summary:'Vitaminas A+D · 1 ml/día por 30 días' },
    { sourceId:102, eventType:'CONSULTATION',     eventDate:'2026-02-08', summary:'Vómitos esporádicos · gastritis leve' },
    { sourceId:201, eventType:'LABORATORY_TEST',  eventDate:'2026-02-08', summary:'Hemograma + bioquímica · resultados normales' },
    { sourceId:702, eventType:'PRESCRIPTION',     eventDate:'2026-02-08', summary:'Maropitant 4 mg c/24h por 3 días' },
    { sourceId:401, eventType:'DIAGNOSTIC_IMAGING', eventDate:'2025-11-22', summary:'Ecografía abdominal · sin alteraciones' },
    { sourceId:601, eventType:'HOSPITALIZATION',  eventDate:'2025-07-04', summary:'Pancreatitis aguda · 48h fluidoterapia' },
    { sourceId:103, eventType:'CONSULTATION',     eventDate:'2025-07-02', summary:'Decaimiento + vómitos · derivada a hospital' },
    { sourceId:802, eventType:'SPA',              eventDate:'2025-05-20', summary:'Baño + corte higiénico' },
    { sourceId:801, eventType:'SURGERY',          eventDate:'2024-11-15', summary:'Ovariohisterectomía · sin complicaciones' },
    { sourceId:104, eventType:'CONSULTATION',     eventDate:'2024-03-10', summary:'Primera consulta · ficha de ingreso' },
  ],
  2: [
    { sourceId:201, eventType:'CONSULTATION', eventDate:'2026-04-12', summary:'Cojera pata trasera derecha · descartar displasia' },
    { sourceId:401, eventType:'DIAGNOSTIC_IMAGING', eventDate:'2026-04-12', summary:'RX caderas · displasia leve' },
    { sourceId:301, eventType:'VACCINATION', eventDate:'2025-12-08', summary:'Polivalente DHPPi+L · Zoetis' },
  ],
  3: [
    { sourceId:301, eventType:'CONSULTATION', eventDate:'2026-03-22', summary:'Control geriátrico · todo normal' },
  ],
};

const EVENT_TYPES = {
  CONSULTATION:       { label:'Consulta',          color:'amatista', icon:'🩺' },
  SURGERY:            { label:'Cirugía',           color:'red',      icon:'🔪' },
  VACCINATION:        { label:'Vacunación',        color:'green',    icon:'💉' },
  DEWORMING:          { label:'Desparasitación',   color:'teal',     icon:'🪱' },
  HOSPITALIZATION:    { label:'Hospitalización',   color:'amber',    icon:'🏥' },
  LABORATORY_TEST:    { label:'Laboratorio',       color:'blue',     icon:'🧪' },
  DIAGNOSTIC_IMAGING: { label:'Imagen Dx',         color:'indigo',   icon:'🩻' },
  PRESCRIPTION:       { label:'Receta',            color:'pink',     icon:'💊' },
  SPA:                { label:'Spa',               color:'gray',     icon:'🛁' },
};

const TYPE_COLORS = {
  amatista: { bg:'var(--amatista-100)', fg:'var(--amatista-700)', dot:'var(--amatista-600)' },
  red:      { bg:'oklch(94% 0.05 25)',  fg:'oklch(48% 0.18 25)',  dot:'oklch(60% 0.20 25)' },
  green:    { bg:'oklch(94% 0.06 150)', fg:'oklch(40% 0.13 150)', dot:'oklch(55% 0.16 150)' },
  teal:     { bg:'oklch(94% 0.05 200)', fg:'oklch(42% 0.12 200)', dot:'oklch(58% 0.14 200)' },
  amber:    { bg:'oklch(94% 0.07 80)',  fg:'oklch(45% 0.13 70)',  dot:'oklch(65% 0.13 75)' },
  blue:     { bg:'oklch(94% 0.04 240)', fg:'oklch(40% 0.15 240)', dot:'oklch(55% 0.16 240)' },
  indigo:   { bg:'oklch(94% 0.05 280)', fg:'oklch(40% 0.16 280)', dot:'oklch(55% 0.18 280)' },
  pink:     { bg:'oklch(94% 0.05 340)', fg:'oklch(42% 0.15 340)', dot:'oklch(60% 0.17 340)' },
  gray:     { bg:'var(--warm-200)',     fg:'var(--warm-700)',     dot:'var(--warm-500)' },
};

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00');
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtMonth(iso) {
  const d = new Date(iso + 'T00:00');
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

Object.assign(window, { OWNERS, PETS, EVENTS_BY_PET, EVENT_TYPES, TYPE_COLORS, fmtDate, fmtMonth });
