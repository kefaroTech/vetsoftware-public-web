/* global VET_MOCK_OWNERS, VET_MOCK_PETS, vetComputeTotals */

// ============================================================================
// Cuentas abiertas — POR PROPIETARIO. Cada cargo se etiqueta con su mascota
// (petId) o queda como "General" (petId: null) si no corresponde a una mascota.
// ============================================================================

const VET_ACCT_TODAY = '2026-05-23';

const VET_ACCT_STATUS = {
  ABIERTA: { label: 'Abierta', bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.15 150)' },
  CERRADA: { label: 'Cerrada', bg: 'var(--warm-200)', fg: 'var(--warm-600)', dot: 'var(--warm-500)' },
};

function vetAcctOwner(ownerId) {
  return VET_MOCK_OWNERS.find((o) => o.id === ownerId) || null;
}
function vetAcctPet(petId) {
  if (!petId) return null;
  for (const ownerId of Object.keys(VET_MOCK_PETS)) {
    const p = VET_MOCK_PETS[ownerId].find((x) => x.id === petId);
    if (p) return p;
  }
  return null;
}
// Compat: contexto a partir de un petId
function vetAcctPetCtx(petId) {
  for (const ownerId of Object.keys(VET_MOCK_PETS)) {
    const p = VET_MOCK_PETS[ownerId].find((x) => x.id === petId);
    if (p) return { pet: p, owner: VET_MOCK_OWNERS.find((o) => o.id === ownerId) };
  }
  return { pet: null, owner: null };
}
// Mascotas distintas que aparecen en los cargos de una cuenta (en orden de aparición)
function vetAcctPets(acct) {
  const ids = [];
  for (const c of acct.charges) if (c.petId && !ids.includes(c.petId)) ids.push(c.petId);
  return ids.map((id) => vetAcctPet(id)).filter(Boolean);
}

// Cuentas semilla — ahora por propietario. La 8001 (Jorge) mezcla 2 mascotas + general.
const VET_ACCOUNTS_INITIAL = [
  {
    id: 8001, ownerId: '104', origen: 'hospitalizacion',
    estado: 'ABIERTA', openedAt: '2026-05-21 18:40',
    charges: [
      { id: 'c1', date: '2026-05-21', petId: '1005', concepto: 'Día de hospitalización', kind: 'dia_hosp', qty: 1, unitPrice: 95000, taxId: 'excluido' },
      { id: 'c2', date: '2026-05-21', petId: '1005', concepto: 'Consulta de urgencia', kind: 'servicio', qty: 1, unitPrice: 120000, taxId: 'excluido' },
      { id: 'c3', date: '2026-05-22', petId: '1005', concepto: 'Día de hospitalización', kind: 'dia_hosp', qty: 1, unitPrice: 95000, taxId: 'excluido' },
      { id: 'c4', date: '2026-05-22', petId: '1006', concepto: 'Consulta general', kind: 'servicio', qty: 1, unitPrice: 55000, taxId: 'excluido' },
      { id: 'c5', date: '2026-05-22', petId: '1006', concepto: 'Vacuna óctuple', kind: 'servicio', qty: 1, unitPrice: 65000, taxId: 'excluido' },
      { id: 'c6', date: '2026-05-23', petId: null, concepto: 'Royal Canin Adult 3kg', kind: 'producto', qty: 1, unitPrice: 72000, taxId: 'iva19', priceIncludesTax: true },
    ],
    pagos: [
      { id: 'p1', date: '2026-05-22', monto: 150000, metodo: 'EFECTIVO' },
    ],
  },
  {
    id: 8002, ownerId: '106', origen: 'hospitalizacion',
    estado: 'ABIERTA', openedAt: '2026-05-20 14:00',
    charges: [
      { id: 'c1', date: '2026-05-20', petId: '1009', concepto: 'Día de hospitalización', kind: 'dia_hosp', qty: 1, unitPrice: 95000, taxId: 'excluido' },
      { id: 'c2', date: '2026-05-21', petId: '1009', concepto: 'Día de hospitalización', kind: 'dia_hosp', qty: 1, unitPrice: 95000, taxId: 'excluido' },
      { id: 'c3', date: '2026-05-22', petId: '1009', concepto: 'Día de hospitalización', kind: 'dia_hosp', qty: 1, unitPrice: 95000, taxId: 'excluido' },
      { id: 'c4', date: '2026-05-20', petId: '1009', concepto: 'Ecografía abdominal', kind: 'servicio', qty: 1, unitPrice: 130000, taxId: 'excluido' },
      { id: 'c5', date: '2026-05-22', petId: '1008', concepto: 'Control geriátrico', kind: 'servicio', qty: 1, unitPrice: 70000, taxId: 'excluido' },
    ],
    pagos: [],
  },
  {
    id: 8003, ownerId: '102', origen: 'hospitalizacion',
    estado: 'ABIERTA', openedAt: '2026-05-23 09:30',
    charges: [
      { id: 'c1', date: '2026-05-23', petId: '1003', concepto: 'Día de hospitalización', kind: 'dia_hosp', qty: 1, unitPrice: 95000, taxId: 'excluido' },
      { id: 'c2', date: '2026-05-23', petId: '1003', concepto: 'Radiografía simple', kind: 'servicio', qty: 2, unitPrice: 85000, taxId: 'excluido' },
    ],
    pagos: [],
  },
];

function vetAcctChargesTotal(acct) {
  const lines = acct.charges.map((c) => ({ unitPrice: c.unitPrice, qty: c.qty, taxId: c.taxId, priceIncludesTax: c.priceIncludesTax !== false }));
  return vetComputeTotals(lines, 0, null).total;
}
// Total de un subconjunto de cargos (para subtotales por mascota)
function vetAcctChargesSubtotal(charges) {
  const lines = charges.map((c) => ({ unitPrice: c.unitPrice, qty: c.qty, taxId: c.taxId, priceIncludesTax: c.priceIncludesTax !== false }));
  return vetComputeTotals(lines, 0, null).total;
}
function vetAcctPagado(acct) {
  return acct.pagos.reduce((a, p) => a + p.monto, 0);
}
function vetAcctSaldo(acct) {
  return vetAcctChargesTotal(acct) - vetAcctPagado(acct);
}
// Agrupa los cargos por mascota; el grupo "General" (petId null) va al final.
function vetAcctGroupByPet(acct) {
  const groups = [];
  const byId = new Map();
  for (const c of acct.charges) {
    const key = c.petId || '__general__';
    if (!byId.has(key)) {
      const g = { key, pet: c.petId ? vetAcctPet(c.petId) : null, charges: [] };
      byId.set(key, g);
      groups.push(g);
    }
    byId.get(key).charges.push(c);
  }
  groups.sort((a, b) => (a.key === '__general__' ? 1 : 0) - (b.key === '__general__' ? 1 : 0));
  return groups;
}

Object.assign(window, {
  VET_ACCT_TODAY, VET_ACCT_STATUS, VET_ACCOUNTS_INITIAL,
  vetAcctOwner, vetAcctPet, vetAcctPets, vetAcctPetCtx,
  vetAcctChargesTotal, vetAcctChargesSubtotal, vetAcctPagado, vetAcctSaldo,
  vetAcctGroupByPet,
});
