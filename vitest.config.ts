import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    passWithNoTests: false,
    include: ['tests/unit/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],

      // Se mide toda la lógica TypeScript de la aplicación. Antes `include`
      // apuntaba a un único archivo de cuatro líneas y los umbrales exigían
      // 100 % sobre él, de modo que el CI certificaba "cobertura 100 %" midiendo
      // dos sentencias. Eso es peor que no medir: es un número que miente.
      //
      // Los `.vue` quedan fuera porque este proyecto ejecuta las pruebas en
      // entorno `node`, sin jsdom ni plugin de Vue: instrumentarlos rompería el
      // parseo. Es una limitación conocida, no una exclusión de conveniencia —
      // el porcentaje global de abajo mide menos código del que existe.
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/types/**', // solo tipos, se borran al compilar
        'src/**/*.d.ts',
        'src/main.ts', // arranque de la aplicación
        'src/**/data/**', // mocks de desarrollo
      ],

      // Umbrales por ruta, no globales. Uno global tendría que ponerse en el
      // ~1 % que hay hoy, y entonces cualquier PR que añada código sin pruebas
      // bajaría el ratio y rompería el build — castigando el crecimiento en vez
      // de premiar las pruebas.
      //
      // En su lugar se exige 100 % en lo que YA está cubierto, de modo que esas
      // rutas no puedan regresar. La lista crece a medida que se cubren módulos.
      thresholds: {
        'src/services/http/api-base-url.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        // El núcleo monetario: puerto de `Money.java`. Si algo aquí deja de
        // estar cubierto, deja de estar garantizado que el ticket coincida con
        // el documento electrónico.
        'src/features/tienda/composables/money.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        // La aritmética del POS: totales, base gravable, IVA y promociones.
        'src/features/tienda/composables/pricing.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        // El comprobante que el cliente se lleva en la mano.
        'src/composables/buildDocumentReceipt.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        // El contexto de sede que decide en qué sucursal se escribe.
        'src/features/branches/api/branchContext.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
})
