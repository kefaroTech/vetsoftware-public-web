/* global VET_MOCK_OWNERS */

// ============================================================================
// Tienda (Petshop) — productos + ventas
// ============================================================================

const VET_SHOP_CATEGORIES = [
  { id: 'alimento',    name: 'Alimento' },
  { id: 'accesorios',  name: 'Accesorios' },
  { id: 'higiene',     name: 'Higiene' },
  { id: 'medicamento', name: 'Medicamento OTC' },
  { id: 'juguetes',    name: 'Juguetes' },
];

const VET_SHOP_CAT_TONE = {
  alimento:    { bg: 'oklch(94% 0.06 80)',  fg: 'oklch(45% 0.13 70)' },
  accesorios:  { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  higiene:     { bg: 'oklch(94% 0.05 200)', fg: 'oklch(42% 0.12 200)' },
  medicamento: { bg: 'oklch(94% 0.05 340)', fg: 'oklch(42% 0.15 340)' },
  juguetes:    { bg: 'var(--amatista-100)',  fg: 'var(--amatista-700)' },
};

const VET_SHOP_PAY = {
  EFECTIVO:     'Efectivo',
  TARJETA:      'Tarjeta',
  TRANSFERENCIA:'Transferencia',
};

const VET_SHOP_TAX_RATE = 0.19; // IVA Colombia 19% (configurable)

function vetShopStockState(p) {
  if (p.stock <= 0) return 'AGOTADO';
  if (p.stock <= p.minStock) return 'BAJO';
  return 'OK';
}

// Servicios facturables (consultas, laboratorio, procedimientos, etc.) — sin stock
const VET_SHOP_SERVICE_CATEGORIES = [
  { id: 'consulta',     name: 'Consultas' },
  { id: 'laboratorio',  name: 'Laboratorio' },
  { id: 'imagen',       name: 'Imagen Dx' },
  { id: 'procedimiento',name: 'Procedimientos' },
  { id: 'estetica',     name: 'Estética y baño' },
  { id: 'hospital',     name: 'Hospitalización' },
];

const VET_SHOP_SVC_TONE = {
  consulta:      { bg: 'var(--amatista-100)',  fg: 'var(--amatista-700)' },
  laboratorio:   { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  imagen:        { bg: 'oklch(94% 0.05 280)', fg: 'oklch(45% 0.16 280)' },
  procedimiento: { bg: 'oklch(94% 0.05 200)', fg: 'oklch(42% 0.12 200)' },
  estetica:      { bg: 'oklch(94% 0.05 340)', fg: 'oklch(42% 0.15 340)' },
  hospital:      { bg: 'oklch(94% 0.07 80)',  fg: 'oklch(45% 0.13 70)' },
};

const VET_SHOP_SERVICES = [
  { id: 's1',  name: 'Consulta general',              category: 'consulta',     salePrice: 55000 },
  { id: 's2',  name: 'Consulta especializada',        category: 'consulta',     salePrice: 90000 },
  { id: 's3',  name: 'Consulta de urgencia',          category: 'consulta',     salePrice: 120000 },
  { id: 's4',  name: 'Hemograma completo',            category: 'laboratorio',  salePrice: 48000 },
  { id: 's5',  name: 'Química sanguínea (8)',         category: 'laboratorio',  salePrice: 72000 },
  { id: 's6',  name: 'Uroanálisis',                   category: 'laboratorio',  salePrice: 38000 },
  { id: 's7',  name: 'Radiografía simple',            category: 'imagen',       salePrice: 85000 },
  { id: 's8',  name: 'Ecografía abdominal',           category: 'imagen',       salePrice: 130000 },
  { id: 's9',  name: 'Vacunación (aplicación)',       category: 'procedimiento',salePrice: 25000 },
  { id: 's10', name: 'Desparasitación',               category: 'procedimiento',salePrice: 20000 },
  { id: 's11', name: 'Curación / sutura',             category: 'procedimiento',salePrice: 65000 },
  { id: 's12', name: 'Baño y peluquería',             category: 'estetica',     salePrice: 45000 },
  { id: 's13', name: 'Corte de uñas',                 category: 'estetica',     salePrice: 15000 },
  { id: 's14', name: 'Día de hospitalización',        category: 'hospital',     salePrice: 95000 },
];

function vetSvcCatName(id) {
  return (VET_SHOP_SERVICE_CATEGORIES.find((c) => c.id === id) || {}).name || id;
}

const VET_SHOP_PRODUCTS_INITIAL = [
  { id: 1, name: 'Royal Canin Adult 3kg',        sku: 'ALM-0001', category: 'alimento',    costPrice: 48000, salePrice: 72000, stock: 24, minStock: 6, supplier: 'Royal Canin', expiryDate: '2026-12-01' },
  { id: 2, name: 'Hill\u2019s Science Diet 2kg',  sku: 'ALM-0002', category: 'alimento',    costPrice: 52000, salePrice: 78000, stock: 4,  minStock: 6, supplier: 'Hill\u2019s', expiryDate: '2026-09-15' },
  { id: 3, name: 'Pro Plan Cat 1.5kg',           sku: 'ALM-0003', category: 'alimento',    costPrice: 31000, salePrice: 46000, stock: 18, minStock: 5, supplier: 'Purina', expiryDate: '2027-02-20' },
  { id: 4, name: 'Collar antipulgas perro',       sku: 'ACC-0011', category: 'accesorios',  costPrice: 18000, salePrice: 32000, stock: 30, minStock: 8, supplier: 'Bayer' },
  { id: 5, name: 'Correa retráctil 5m',           sku: 'ACC-0012', category: 'accesorios',  costPrice: 22000, salePrice: 39000, stock: 12, minStock: 4, supplier: 'Flexi' },
  { id: 6, name: 'Comedero doble acero',          sku: 'ACC-0013', category: 'accesorios',  costPrice: 14000, salePrice: 26000, stock: 0,  minStock: 4, supplier: 'PetMate' },
  { id: 7, name: 'Shampoo hipoalergénico 250ml',  sku: 'HIG-0021', category: 'higiene',     costPrice: 12000, salePrice: 23000, stock: 16, minStock: 5, supplier: 'Virbac' },
  { id: 8, name: 'Toallitas húmedas x80',         sku: 'HIG-0022', category: 'higiene',     costPrice: 7000,  salePrice: 14000, stock: 40, minStock: 10, supplier: 'PetClean' },
  { id: 9, name: 'Cepillo dental + pasta',        sku: 'HIG-0023', category: 'higiene',     costPrice: 9000,  salePrice: 18000, stock: 3,  minStock: 5, supplier: 'Virbac' },
  { id: 10, name: 'Antiparasitario oral (OTC)',   sku: 'MED-0031', category: 'medicamento', costPrice: 8000,  salePrice: 16000, stock: 22, minStock: 8, supplier: 'Drontal', expiryDate: '2026-07-30' },
  { id: 11, name: 'Suplemento vitamínico',        sku: 'MED-0032', category: 'medicamento', costPrice: 15000, salePrice: 28000, stock: 9,  minStock: 4, supplier: 'Nutreca', expiryDate: '2026-11-10' },
  { id: 12, name: 'Pelota de caucho',             sku: 'JUG-0041', category: 'juguetes',    costPrice: 5000,  salePrice: 12000, stock: 35, minStock: 8, supplier: 'Kong' },
  { id: 13, name: 'Ratón con catnip',             sku: 'JUG-0042', category: 'juguetes',    costPrice: 3000,  salePrice: 8000,  stock: 2,  minStock: 6, supplier: 'PetToys' },
  { id: 14, name: 'Hueso masticable',             sku: 'JUG-0043', category: 'juguetes',    costPrice: 6000,  salePrice: 13000, stock: 20, minStock: 5, supplier: 'Nylabone' },
];

// Ventas históricas
const VET_SHOP_SALES_INITIAL = [
  { id: 9001, code: 'V-2026-0512', date: '2026-05-23 11:20', customerId: '101', items: [{ productId: 1, qty: 1, unitPrice: 72000 }, { productId: 12, qty: 2, unitPrice: 12000 }], discount: 0, paymentMethod: 'TARJETA' },
  { id: 9002, code: 'V-2026-0511', date: '2026-05-23 10:05', customerId: null, items: [{ productId: 8, qty: 3, unitPrice: 14000 }], discount: 0, paymentMethod: 'EFECTIVO' },
  { id: 9003, code: 'V-2026-0510', date: '2026-05-22 17:40', customerId: '104', items: [{ productId: 2, qty: 1, unitPrice: 78000 }, { productId: 7, qty: 1, unitPrice: 23000 }], discount: 5000, paymentMethod: 'EFECTIVO' },
  { id: 9004, code: 'V-2026-0509', date: '2026-05-22 14:15', customerId: null, items: [{ productId: 10, qty: 2, unitPrice: 16000 }], discount: 0, paymentMethod: 'TRANSFERENCIA' },
];

function vetMoney(n) {
  return '$' + (n ?? 0).toLocaleString('es-CO');
}

function vetShopCustomerName(id) {
  if (!id) return null;
  const o = VET_MOCK_OWNERS.find((x) => x.id === id);
  return o ? o.name : null;
}

Object.assign(window, {
  VET_SHOP_CATEGORIES, VET_SHOP_CAT_TONE, VET_SHOP_PAY, VET_SHOP_TAX_RATE,
  vetShopStockState, VET_SHOP_PRODUCTS_INITIAL, VET_SHOP_SALES_INITIAL,
  vetMoney, vetShopCustomerName,
  VET_SHOP_SERVICE_CATEGORIES, VET_SHOP_SVC_TONE, VET_SHOP_SERVICES, vetSvcCatName,
});
