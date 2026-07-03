/* global VET_MOCK_OWNERS, VET_MOCK_PETS */

// ============================================================================
// Laboratorio interno — cola de procesamiento de muestras
// ============================================================================

// Estados del ciclo de vida de la muestra dentro del laboratorio
const VET_LAB_QUEUE_STATUS = {
  EN_COLA:     { label: 'En cola',      color: 'amber',    icon: '📥', desc: 'Muestra recolectada, esperando procesamiento' },
  EN_PROCESO:  { label: 'En proceso',   color: 'blue',     icon: '🔬', desc: 'Técnico analizando la muestra' },
  POR_VALIDAR: { label: 'Por validar',  color: 'indigo',   icon: '📝', desc: 'Resultado cargado, espera validación' },
  VALIDADO:    { label: 'Validado',     color: 'green',    icon: '✓',  desc: 'Resultado firmado y disponible' },
};

const VET_LAB_QUEUE_TONE = {
  amber:  { bg: 'oklch(94% 0.07 80)',  fg: 'oklch(45% 0.13 70)',  dot: 'oklch(65% 0.15 75)' },
  blue:   { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)', dot: 'oklch(55% 0.16 240)' },
  indigo: { bg: 'oklch(94% 0.05 280)', fg: 'oklch(40% 0.16 280)', dot: 'oklch(55% 0.18 280)' },
  green:  { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.15 150)' },
};

// Prioridad
const VET_LAB_PRIORITY = {
  RUTINA:  { label: 'Rutina',  tone: { bg: 'var(--warm-200)', fg: 'var(--warm-700)' } },
  URGENTE: { label: 'Urgente', tone: { bg: 'oklch(94% 0.07 60)', fg: 'oklch(45% 0.14 55)' } },
  STAT:    { label: 'STAT',    tone: { bg: 'oklch(93% 0.06 25)', fg: 'oklch(48% 0.19 25)' } },
};

function vetLabPetCtx(animalId) {
  for (const ownerId of Object.keys(VET_MOCK_PETS)) {
    const p = VET_MOCK_PETS[ownerId].find((x) => x.id === animalId);
    if (p) return { pet: p, owner: VET_MOCK_OWNERS.find((o) => o.id === ownerId) };
  }
  return { pet: null, owner: null };
}

// Cola de muestras en el laboratorio
const VET_LAB_QUEUE = [
  {
    id: 5001, code: 'M-2026-0512', animalId: '1005',
    testType: 'Panel geriátrico + uroanálisis',
    priority: 'URGENTE',
    collectedAt: '2026-05-23 08:40', collectedBy: 'Valentina Torres',
    status: 'EN_COLA',
    startedAt: null,
    attachments: [], validatedBy: null, validatedAt: null,
  },
  {
    id: 5002, code: 'M-2026-0513', animalId: '1003',
    testType: 'Hemograma completo',
    priority: 'RUTINA',
    collectedAt: '2026-05-23 09:10', collectedBy: 'Diego Ramírez',
    status: 'EN_COLA',
    startedAt: null,
    attachments: [], validatedBy: null, validatedAt: null,
  },
  {
    id: 5003, code: 'M-2026-0509', animalId: '1001',
    testType: 'Química sanguínea (8)',
    priority: 'RUTINA',
    collectedAt: '2026-05-22 16:20', collectedBy: 'Valentina Torres',
    status: 'EN_PROCESO',
    startedAt: '2026-05-23 10:05',
    attachments: [], validatedBy: null, validatedAt: null,
  },
  {
    id: 5004, code: 'M-2026-0505', animalId: '1004',
    testType: 'Uroanálisis',
    priority: 'URGENTE',
    collectedAt: '2026-05-22 11:30', collectedBy: 'Diego Ramírez',
    status: 'POR_VALIDAR',
    startedAt: '2026-05-22 12:00',
    attachments: [
      { name: 'uroanalisis-mishi.pdf', size: '248 KB', kind: 'pdf' },
      { name: 'sedimento-microscopia.jpg', size: '1.2 MB', kind: 'image' },
    ],
    validatedBy: null, validatedAt: null,
  },
  {
    id: 5005, code: 'M-2026-0488', animalId: '1001',
    testType: 'Hemograma + química',
    priority: 'RUTINA',
    collectedAt: '2026-05-20 09:00', collectedBy: 'Valentina Torres',
    status: 'VALIDADO',
    startedAt: '2026-05-20 10:30',
    attachments: [
      { name: 'hemograma-luna.pdf', size: '312 KB', kind: 'pdf' },
    ],
    validatedBy: 'Mariana Rojas', validatedAt: '2026-05-20 14:15',
  },
];

const VET_LAB_TECHNICIANS_REMOVED = true;

// ============================================================================
// Histórico de validados — simula >1 año de operación (volumen alto)
// ============================================================================

const VET_LAB_HISTORY = (() => {
  const animalIds = ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009'];
  const testTypes = [
    'Hemograma completo', 'Química sanguínea (8)', 'Uroanálisis', 'Coprológico',
    'Panel geriátrico', 'Perfil tiroideo', 'Citología', 'Cultivo + antibiograma',
    'Hemograma + química', 'Tiempos de coagulación',
  ];
  const validators = ['Mariana Rojas', 'Andrés Mejía', 'Sofía Cárdenas'];
  const priorities = ['RUTINA', 'RUTINA', 'RUTINA', 'URGENTE', 'STAT'];
  const out = [];
  let seq = 487;
  // ~520 registros distribuidos en ~13 meses
  const start = new Date('2025-05-01');
  for (let i = 0; i < 520; i++) {
    const day = new Date(start.getTime() + (i * 0.62) * 86400000);
    const p = (n) => String(n).padStart(2, '0');
    const dateStr = `${day.getFullYear()}-${p(day.getMonth() + 1)}-${p(day.getDate())}`;
    seq -= 1;
    const animalId = animalIds[i % animalIds.length];
    out.push({
      id: 4000 - i,
      code: `M-${day.getFullYear()}-${p((seq % 9999 + 9999) % 9999)}`,
      animalId,
      testType: testTypes[i % testTypes.length],
      priority: priorities[i % priorities.length],
      collectedAt: `${dateStr} ${p(7 + (i % 10))}:${p((i * 7) % 60)}`,
      collectedBy: validators[(i + 1) % validators.length],
      status: 'VALIDADO',
      attachments: [{ name: `resultado-${seq}.pdf`, size: `${180 + (i % 220)} KB`, kind: 'pdf' }],
      validatedBy: validators[i % validators.length],
      validatedAt: `${dateStr} ${p(9 + (i % 8))}:${p((i * 13) % 60)}`,
    });
  }
  return out.sort((a, b) => b.validatedAt.localeCompare(a.validatedAt));
})();

Object.assign(window, {
  VET_LAB_QUEUE_STATUS, VET_LAB_QUEUE_TONE, VET_LAB_PRIORITY,
  VET_LAB_QUEUE, VET_LAB_HISTORY, vetLabPetCtx,
});
