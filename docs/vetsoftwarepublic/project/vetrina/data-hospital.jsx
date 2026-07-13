/* global VET_MOCK_OWNERS, VET_MOCK_PETS */

// ============================================================================
// Hospitalización — panel de internación (ward management)
// ============================================================================

// Hora "actual" simulada para calcular dosis atrasadas
const VET_HOSP_NOW = '15:30';
const VET_HOSP_TODAY = '2026-05-23';

// Días de la semana visible (Lun 18 – Dom 24 may 2026; hoy = Sáb 23)
function vetHospWeekDays() {
  const rows = [
    { iso: '2026-05-18', dow: 'Lun', dom: '18' },
    { iso: '2026-05-19', dow: 'Mar', dom: '19' },
    { iso: '2026-05-20', dow: 'Mié', dom: '20' },
    { iso: '2026-05-21', dow: 'Jue', dom: '21' },
    { iso: '2026-05-22', dow: 'Vie', dom: '22' },
    { iso: '2026-05-23', dow: 'Sáb', dom: '23' },
    { iso: '2026-05-24', dow: 'Dom', dom: '24' },
  ];
  return rows.map((r) => ({
    ...r,
    isToday: r.iso === VET_HOSP_TODAY,
    isPast: r.iso < VET_HOSP_TODAY,
    isFuture: r.iso > VET_HOSP_TODAY,
  }));
}

const VET_HOSP_STATUS = {
  ESTABLE:     { label: 'Estable',     tone: { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.15 150)' } },
  OBSERVACION: { label: 'Observación', tone: { bg: 'oklch(94% 0.07 80)',  fg: 'oklch(45% 0.13 70)',  dot: 'oklch(65% 0.14 75)' } },
  CRITICO:     { label: 'Crítico',     tone: { bg: 'oklch(93% 0.06 25)',  fg: 'oklch(48% 0.19 25)',  dot: 'oklch(58% 0.20 25)' } },
};

const VET_HOSP_ROUTE = {
  VO: 'Vía oral', IV: 'Intravenosa', IM: 'Intramuscular', SC: 'Subcutánea', TOP: 'Tópica', OFT: 'Oftálmica',
};

const VET_HOSP_DOSE_STATUS = {
  APLICADA:  { label: 'Aplicada',  tone: { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)' } },
  PENDIENTE: { label: 'Pendiente', tone: { bg: 'var(--warm-150)',     fg: 'var(--warm-600)' } },
  ATRASADA:  { label: 'Atrasada',  tone: { bg: 'oklch(93% 0.06 25)',  fg: 'oklch(48% 0.19 25)' } },
  OMITIDA:   { label: 'Omitida',   tone: { bg: 'var(--warm-200)',     fg: 'var(--warm-500)' } },
};

function vetHospPetCtx(animalId) {
  for (const ownerId of Object.keys(VET_MOCK_PETS)) {
    const p = VET_MOCK_PETS[ownerId].find((x) => x.id === animalId);
    if (p) return { pet: p, owner: VET_MOCK_OWNERS.find((o) => o.id === ownerId) };
  }
  return { pet: null, owner: null };
}

// Pacientes internados — cada uno con plan de tratamiento + cronograma de dosis + evolución
const VET_HOSP_PATIENTS = [
  {
    id: 7001, animalId: '1005', kennel: 'A-03',
    admittedAt: '2026-05-21 18:40', reason: 'Insuficiencia renal aguda — fluidoterapia',
    attendingVet: 'Mariana Rojas', status: 'OBSERVACION',
    diagnosis: 'IRA grado II. Creatinina 4.2 mg/dL al ingreso.',
    medications: [
      {
        id: 1, name: 'Solución Hartmann', dose: '120 ml/h', route: 'IV', frequency: 'Continua',
        startDate: '2026-05-21', endDate: '2026-05-25', notes: 'Fluidoterapia de mantenimiento + corrección.',
        schedule: [
          { id: 'd1', time: '06:00', status: 'APLICADA', givenBy: 'Diego Ramírez', givenAt: '06:05' },
          { id: 'd2', time: '12:00', status: 'APLICADA', givenBy: 'Valentina Torres', givenAt: '12:10' },
          { id: 'd3', time: '18:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
        ],
      },
      {
        id: 2, name: 'Omeprazol', dose: '1 mg/kg', route: 'IV', frequency: 'c/24h',
        startDate: '2026-05-21', endDate: '2026-05-25', notes: 'Protección gástrica.',
        schedule: [
          { id: 'd4', time: '08:00', status: 'APLICADA', givenBy: 'Diego Ramírez', givenAt: '08:15' },
        ],
      },
      {
        id: 3, name: 'Maropitant', dose: '1 mg/kg', route: 'SC', frequency: 'c/24h',
        startDate: '2026-05-21', endDate: '2026-05-24', notes: 'Antiemético.',
        schedule: [
          { id: 'd5', time: '14:00', status: 'ATRASADA', givenBy: null, givenAt: null },
        ],
      },
    ],
    procedures: [
      { id: 1, name: 'Control de diuresis', frequency: 'c/4h', notes: 'Medir producción de orina por sonda.', done: false,
        schedule: [
          { id: 'p1', time: '08:00', status: 'APLICADA', givenBy: 'Diego Ramírez', givenAt: '08:00' },
          { id: 'p2', time: '12:00', status: 'APLICADA', givenBy: 'Valentina Torres', givenAt: '12:05' },
          { id: 'p3', time: '16:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
        ] },
      { id: 2, name: 'Toma de tensión arterial', frequency: 'c/6h', notes: 'Registrar PAS/PAD.', done: false,
        schedule: [
          { id: 'p4', time: '06:00', status: 'APLICADA', givenBy: 'Diego Ramírez', givenAt: '06:10' },
          { id: 'p5', time: '12:00', status: 'APLICADA', givenBy: 'Valentina Torres', givenAt: '12:00' },
          { id: 'p6', time: '18:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
        ] },
    ],
    evolution: [
      { id: 1, date: '2026-05-23', time: '08:00', author: 'Diego Ramírez', temp: '38.4', hr: '120', rr: '28', notes: 'Paciente alerta, mucosas rosadas. Apetito parcial. Diuresis adecuada.' },
      { id: 2, date: '2026-05-22', time: '20:00', author: 'Valentina Torres', temp: '38.9', hr: '132', rr: '32', notes: 'Decaído al inicio del turno, mejora tras fluidos. Vomitó una vez.' },
      { id: 3, date: '2026-05-22', time: '08:00', author: 'Mariana Rojas', temp: '39.1', hr: '140', rr: '34', notes: 'Ingreso estabilizado. Inicia protocolo de fluidoterapia.' },
    ],
    observations: [
      { id: 1, date: '2026-05-23', time: '08:30', author: 'Mariana Rojas', text: 'No dar comida sólida. Dieta húmeda renal en pequeñas porciones.' },
      { id: 2, date: '2026-05-21', time: '19:00', author: 'Diego Ramírez', text: 'Mantener catéter IV protegido. Vigilar signos de sobrehidratación.' },
    ],
  },
  {
    id: 7002, animalId: '1003', kennel: 'B-01',
    admittedAt: '2026-05-23 09:30', reason: 'Postquirúrgico — cirugía ortopédica cadera',
    attendingVet: 'Andrés Mejía', status: 'ESTABLE',
    diagnosis: 'Post-op reducción displasia coxofemoral. Recuperación anestésica completa.',
    medications: [
      {
        id: 1, name: 'Tramadol', dose: '3 mg/kg', route: 'VO', frequency: 'c/8h',
        startDate: '2026-05-23', endDate: '2026-05-27', notes: 'Analgesia.',
        schedule: [
          { id: 'd1', time: '08:00', status: 'APLICADA', givenBy: 'Valentina Torres', givenAt: '08:00' },
          { id: 'd2', time: '16:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
          { id: 'd3', time: '00:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
        ],
      },
      {
        id: 2, name: 'Cefazolina', dose: '22 mg/kg', route: 'IV', frequency: 'c/12h', pauta: 'INTERVALO',
        startDate: '2026-05-23', endDate: '2026-05-26', notes: 'Antibiótico profiláctico.',
        schedule: [
          { id: 'd4', time: '10:00', status: 'APLICADA', givenBy: 'Andrés Mejía', givenAt: '10:05' },
          { id: 'd5', time: '22:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
        ],
      },
    ],
    procedures: [
      { id: 1, name: 'Curación de herida quirúrgica', frequency: 'c/24h', notes: 'Revisar puntos y signos de infección.', done: false,
        schedule: [
          { id: 'p1', time: '10:00', status: 'APLICADA', givenBy: 'Andrés Mejía', givenAt: '10:10' },
        ] },
      { id: 2, name: 'Crioterapia en zona quirúrgica', frequency: 'c/8h', notes: '10 min por aplicación.', done: false,
        schedule: [
          { id: 'p2', time: '08:00', status: 'APLICADA', givenBy: 'Valentina Torres', givenAt: '08:05' },
          { id: 'p3', time: '16:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
          { id: 'p4', time: '00:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
        ] },
    ],
    evolution: [
      { id: 1, date: '2026-05-23', time: '12:00', author: 'Andrés Mejía', temp: '38.2', hr: '95', rr: '22', notes: 'Recuperación anestésica completa. Dolor controlado. Apoya levemente la extremidad.' },
    ],
    observations: [
      { id: 1, date: '2026-05-23', time: '10:00', author: 'Andrés Mejía', text: 'Reposo absoluto. No permitir saltos ni escaleras.' },
    ],
  },
  {
    id: 7003, animalId: '1009', kennel: 'A-01',
    admittedAt: '2026-05-20 14:00', reason: 'Gastroenteritis hemorrágica — deshidratación severa',
    attendingVet: 'Mariana Rojas', status: 'CRITICO',
    diagnosis: 'GEH con deshidratación 10%. Parvovirus descartado. Sospecha de cuerpo extraño.',
    medications: [
      {
        id: 1, name: 'NaCl 0.9%', dose: '90 ml/h', route: 'IV', frequency: 'Continua',
        startDate: '2026-05-20', endDate: '2026-05-24', notes: 'Rehidratación + electrolitos.',
        schedule: [
          { id: 'd1', time: '06:00', status: 'APLICADA', givenBy: 'Diego Ramírez', givenAt: '06:00' },
          { id: 'd2', time: '12:00', status: 'APLICADA', givenBy: 'Valentina Torres', givenAt: '12:00' },
          { id: 'd3', time: '15:00', status: 'ATRASADA', givenBy: null, givenAt: null },
        ],
      },
      {
        id: 2, name: 'Metronidazol', dose: '15 mg/kg', route: 'IV', frequency: 'c/12h', pauta: 'INTERVALO',
        startDate: '2026-05-20', endDate: '2026-05-24', notes: 'Cobertura anaerobios.',
        schedule: [
          { id: 'd4', time: '08:00', status: 'APLICADA', givenBy: 'Diego Ramírez', givenAt: '08:20' },
          { id: 'd5', time: '20:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
        ],
      },
      {
        id: 3, name: 'Buprenorfina', dose: '0.02 mg/kg', route: 'IV', frequency: 'c/8h',
        startDate: '2026-05-20', endDate: '2026-05-23', notes: 'Analgesia.',
        schedule: [
          { id: 'd6', time: '07:00', status: 'APLICADA', givenBy: 'Diego Ramírez', givenAt: '07:00' },
          { id: 'd7', time: '15:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
          { id: 'd8', time: '23:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
        ],
      },
    ],
    procedures: [
      { id: 1, name: 'Monitoreo de signos vitales', frequency: 'c/2h', notes: 'TPR + estado de conciencia.', done: false,
        schedule: [
          { id: 'p1', time: '08:00', status: 'APLICADA', givenBy: 'Diego Ramírez', givenAt: '08:00' },
          { id: 'p2', time: '10:00', status: 'APLICADA', givenBy: 'Diego Ramírez', givenAt: '10:00' },
          { id: 'p3', time: '12:00', status: 'APLICADA', givenBy: 'Valentina Torres', givenAt: '12:00' },
          { id: 'p4', time: '14:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
          { id: 'p5', time: '16:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
        ] },
      { id: 2, name: 'Toma de tensión arterial', frequency: 'c/4h', notes: 'Registrar PAS/PAD.', done: false,
        schedule: [
          { id: 'p6', time: '08:00', status: 'APLICADA', givenBy: 'Diego Ramírez', givenAt: '08:15' },
          { id: 'p7', time: '12:00', status: 'APLICADA', givenBy: 'Valentina Torres', givenAt: '12:10' },
          { id: 'p8', time: '16:00', status: 'PENDIENTE', givenBy: null, givenAt: null },
        ] },
    ],
    evolution: [
      { id: 1, date: '2026-05-23', time: '14:00', author: 'Mariana Rojas', temp: '37.6', hr: '160', rr: '40', notes: 'Mucosas pálidas, TLLC 3s. Persiste taquicardia. Se solicita ecografía abdominal urgente.' },
      { id: 2, date: '2026-05-23', time: '08:00', author: 'Diego Ramírez', temp: '37.9', hr: '152', rr: '38', notes: 'Sin vómito en las últimas 6h. Continúa decaído.' },
    ],
    observations: [
      { id: 1, date: '2026-05-23', time: '07:00', author: 'Mariana Rojas', text: 'Ayuno total hasta descartar cuerpo extraño. Nada por vía oral.' },
      { id: 2, date: '2026-05-20', time: '15:00', author: 'Valentina Torres', text: 'Aislamiento por sospecha infecciosa. Usar bata y guantes.' },
    ],
  },
];

const VET_HOSP_STAFF = [
  { id: '1', name: 'Mariana Rojas' },
  { id: '2', name: 'Andrés Mejía' },
  { id: '3', name: 'Diego Ramírez' },
  { id: '4', name: 'Valentina Torres' },
];

// Calcula si una dosis pendiente ya está atrasada respecto a VET_HOSP_NOW
function vetDoseIsOverdue(dose) {
  if (dose.status !== 'PENDIENTE') return false;
  return dose.time < VET_HOSP_NOW && dose.time !== '00:00';
}

// Horas de intervalo a partir de la frecuencia ('c/8h' -> 8). null si no aplica.
function vetIntervalFromFreq(freq) {
  if (!freq) return null;
  const m = /c\/(\d+)h/i.exec(freq);
  return m ? Number(m[1]) : null;
}

// Suma horas a 'HH:MM' (modulo 24, formato 24h)
function vetShiftTime(timeStr, hours) {
  const [h, m] = timeStr.split(':').map(Number);
  let total = (h * 60 + m + hours * 60) % (24 * 60);
  if (total < 0) total += 24 * 60;
  const nh = Math.floor(total / 60), nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

Object.assign(window, {
  VET_HOSP_NOW, VET_HOSP_TODAY, vetHospWeekDays,
  VET_HOSP_STATUS, VET_HOSP_ROUTE, VET_HOSP_DOSE_STATUS,
  VET_HOSP_PATIENTS, VET_HOSP_STAFF, vetHospPetCtx, vetDoseIsOverdue,
  vetIntervalFromFreq, vetShiftTime,
});
