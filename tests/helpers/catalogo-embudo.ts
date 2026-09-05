import type {
  ArticuloCatalogo,
  CapacidadCatalogo,
  CatalogoComercial,
  PaqueteCatalogo,
} from '@/features/asistente/types/catalogo.types'

/**
 * El catálogo que ven las pruebas del cotizador de la portada.
 *
 * <p>Dos áreas y no una: con una sola no se puede comprobar que solo la primera
 * arranca desplegada, que es la mitigación de la que depende el orden de
 * tabulación de la pantalla.
 */
export function articulo(over: Partial<ArticuloCatalogo> = {}): ArticuloCatalogo {
  return {
    code: 'SCHEDULING',
    nombre: 'Agenda de citas',
    descripcion: '',
    grupo: null,
    importe: 35_000,
    taxRate: 19,
    taxTreatment: 'TAXED',
    trialDays: 30,
    obligatorio: false,
    vendible: true,
    areaCode: 'PATIENT_CARE',
    shortLabel: 'Agenda',
    ...over,
  }
}

export function capacidad(over: Partial<CapacidadCatalogo> = {}): CapacidadCatalogo {
  return {
    code: 'EXTRA_BRANCH',
    nombre: 'Sede adicional',
    unit: 'BRANCH',
    incluido: 0,
    vendible: true,
    importe: 25_000,
    taxRate: 19,
    taxTreatment: 'TAXED',
    ...over,
  }
}

export const PACK_BARRIO: PaqueteCatalogo = {
  code: 'PACK_CLINIC',
  nombre: 'Consulta de barrio',
  tagline: null,
  importe: 189_000,
  taxRate: 19,
  taxTreatment: 'TAXED',
  componentes: ['CORE', 'SCHEDULING', 'CLINICAL_HISTORY'],
  recommended: true,
}

export function catalogoEmbudo(over: Partial<CatalogoComercial> = {}): CatalogoComercial {
  return {
    currency: 'COP',
    priceValidFrom: '2026-08-27',
    articulos: [
      articulo({
        code: 'CORE',
        nombre: 'Núcleo: clientes y mascotas',
        importe: 59_000,
        obligatorio: true,
        areaCode: null,
        shortLabel: null,
      }),
      articulo(),
      articulo({
        code: 'CLINICAL_HISTORY',
        nombre: 'Historia clínica y consultas',
        shortLabel: 'Historia clínica',
      }),
      articulo({
        code: 'CASH_REGISTER',
        nombre: 'Caja y mostrador',
        areaCode: 'MONEY',
        shortLabel: 'Caja',
      }),
      articulo({
        code: 'INVOICING',
        nombre: 'Facturación DIAN',
        areaCode: 'MONEY',
        shortLabel: 'Facturación',
      }),
      // No vendible: se muestra como dato en otras pantallas, nunca como casilla.
      articulo({ code: 'LAB', nombre: 'Laboratorio', areaCode: 'MONEY', vendible: false }),
    ],
    capacidades: [
      capacidad({ code: 'CAPACITY_BRANCH', nombre: 'Sede incluida', incluido: 0, vendible: false }),
      capacidad(),
      capacidad({
        code: 'CAPACITY_USER',
        nombre: 'Usuario incluido',
        unit: 'USER',
        incluido: 1,
        vendible: false,
      }),
      capacidad({ code: 'EXTRA_USER', nombre: 'Usuario adicional', unit: 'USER', incluido: 0 }),
    ],
    paquetes: [PACK_BARRIO],
    arcos: [],
    areas: [
      { code: 'PATIENT_CARE', nombre: 'Atención a los pacientes' },
      { code: 'MONEY', nombre: 'Mostrador y dinero' },
    ],
    ...over,
  }
}
