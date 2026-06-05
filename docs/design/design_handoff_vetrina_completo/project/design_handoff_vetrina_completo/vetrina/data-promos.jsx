/* global VET_SHOP_PRODUCTS_INITIAL, VET_SHOP_SERVICES, VET_SHOP_CATEGORIES, VET_SHOP_SERVICE_CATEGORIES */

// ============================================================================
// Promociones — descuentos, precios especiales, paquetes, tiempo limitado
// ============================================================================

const VET_PROMO_TYPES = {
  DESCUENTO: 'Descuento',
  PRECIO:    'Precio especial',
  PAQUETE:   'Paquete',
};

const VET_PROMO_TODAY = '2026-05-23';

// Estado calculado por vigencia
function vetPromoStatus(promo) {
  if (!promo.active) return 'INACTIVA';
  if (promo.startDate && VET_PROMO_TODAY < promo.startDate) return 'PROGRAMADA';
  if (promo.endDate && VET_PROMO_TODAY > promo.endDate) return 'EXPIRADA';
  return 'ACTIVA';
}

const VET_PROMO_STATUS_TONE = {
  ACTIVA:     { label: 'Activa',     bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)' },
  PROGRAMADA: { label: 'Programada', bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  EXPIRADA:   { label: 'Expirada',   bg: 'var(--warm-200)',     fg: 'var(--warm-500)' },
  INACTIVA:   { label: 'Inactiva',   bg: 'var(--warm-200)',     fg: 'var(--warm-500)' },
};

const VET_PROMOS_INITIAL = [
  {
    id: 1, name: '20% en Higiene', type: 'DESCUENTO',
    target: 'categoria', categoryId: 'higiene', scope: 'producto',
    value: 20, valueKind: 'PCT',
    startDate: '2026-05-01', endDate: '2026-06-30', active: true,
  },
  {
    id: 2, name: 'Royal Canin precio especial', type: 'PRECIO',
    target: 'producto', targetId: 1,
    specialPrice: 59000,
    startDate: '2026-05-15', endDate: '2026-05-31', active: true,
  },
  {
    id: 3, name: 'Baño y peluquería −$5.000', type: 'DESCUENTO',
    target: 'servicio', targetId: 's12',
    value: 5000, valueKind: 'FIJO',
    startDate: null, endDate: null, active: true,
  },
  {
    id: 4, name: 'Plan Cachorro', type: 'PAQUETE',
    bundlePrice: 120000,
    bundleItems: [
      { kind: 'service', id: 's1', qty: 1 },   // Consulta general
      { kind: 'service', id: 's9', qty: 3 },   // Vacunación x3
      { kind: 'service', id: 's10', qty: 1 },  // Desparasitación
    ],
    startDate: '2026-05-01', endDate: '2026-12-31', active: true,
  },
  {
    id: 5, name: 'Combo antiparasitario', type: 'PAQUETE',
    bundlePrice: 26000,
    bundleItems: [
      { kind: 'product', id: 10, qty: 1 },  // Antiparasitario oral
      { kind: 'product', id: 4, qty: 1 },   // Collar antipulgas
    ],
    startDate: null, endDate: null, active: false,
  },
];

// Dado un producto/servicio + promos activas, devuelve { price, original, promo } aplicando
// la mejor promo de tipo DESCUENTO o PRECIO (no paquetes).
function vetApplyPromo(item, kind, promos) {
  const active = promos.filter((p) => vetPromoStatus(p) === 'ACTIVA' && p.type !== 'PAQUETE');
  let best = null;
  for (const p of active) {
    let applies = false;
    if (p.target === 'categoria') applies = (kind === 'product' && p.categoryId === item.category) ||
                                             (kind === 'servicio' && p.categoryId === item.category);
    else if (p.target === 'producto') applies = kind === 'product' && p.targetId === item.id;
    else if (p.target === 'servicio') applies = kind === 'servicio' && p.targetId === item.id;
    if (!applies) continue;
    let candidate;
    if (p.type === 'PRECIO') candidate = p.specialPrice;
    else candidate = p.valueKind === 'PCT' ? Math.round(item.salePrice * (1 - p.value / 100)) : Math.max(0, item.salePrice - p.value);
    if (best === null || candidate < best.price) best = { price: candidate, promo: p };
  }
  if (!best) return { price: item.salePrice, original: item.salePrice, promo: null };
  return { price: best.price, original: item.salePrice, promo: best.promo };
}

Object.assign(window, {
  VET_PROMO_TYPES, VET_PROMO_TODAY, vetPromoStatus, VET_PROMO_STATUS_TONE,
  VET_PROMOS_INITIAL, vetApplyPromo,
});
