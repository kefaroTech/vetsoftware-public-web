/* global React, VetIcons, useVetRoute */

// Placeholder fiel al sistema de diseño — todavía no implementado.
function VetRoutePlaceholder({ title, vueFiles = [], description, screens = [] }) {
  return (
    <div className="vet-placeholder">
      <div style={{
        width: 64, height: 64, margin: '0 auto 16px',
        borderRadius: 16, background: 'var(--amatista-100)',
        color: 'var(--amatista-700)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <VetIcons.FileText size={28} strokeWidth={1.5} />
      </div>
      <h2>{title}</h2>
      <p style={{ marginTop: 4 }}>{description}</p>
      <p style={{ fontSize: 12, marginTop: 18, color: 'var(--warm-500)' }}>
        Pantallas que cubrirá esta vista:
      </p>
      {screens.length > 0 && (
        <ul className="vet-ph-list">
          {screens.map((s) => <li key={s}>· {s}</li>)}
        </ul>
      )}
      <p style={{ fontSize: 11.5, marginTop: 18, color: 'var(--warm-500)' }}>
        Archivos fuente:
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 6 }}>
        {vueFiles.map((f) => <code key={f}>{f}</code>)}
      </div>
    </div>
  );
}

// ===== Historia clínica =====
function VetHistoriaOwnerStep() {
  return (
    <VetRoutePlaceholder
      title="Historia clínica — Selecciona dueño"
      description="Buscador y lista de dueños. Tras seleccionar uno, se navega a sus mascotas."
      screens={[
        'Buscador con autocompletado',
        'Lista de dueños con últimas consultas',
        'Crear nuevo dueño',
        'Estado vacío',
      ]}
      vueFiles={[
        'features/historia-clinica/views/OwnerStep.vue',
        'features/historia-clinica/components/OwnerSearchList.vue',
      ]}
    />
  );
}
function VetHistoriaPetStep() {
  return (
    <VetRoutePlaceholder
      title="Historia clínica — Mascotas del dueño"
      description="Grid de tarjetas con cada mascota. Tras seleccionar una, se ve su timeline."
      screens={[
        'Grid de PetCard',
        'Breadcrumb Dueño › Mascota',
        'Crear nueva mascota',
      ]}
      vueFiles={[
        'features/historia-clinica/views/PetStep.vue',
        'features/historia-clinica/components/PetCard.vue',
        'features/historia-clinica/components/OwnerAnimalBreadcrumb.vue',
      ]}
    />
  );
}
function VetHistoriaHistoryStep() {
  return (
    <VetRoutePlaceholder
      title="Historia clínica — Timeline de eventos"
      description="Timeline cronológico de eventos clínicos agrupado por mes, con modales de detalle por tipo."
      screens={[
        'Timeline agrupado por mes (MonthTimelineGroup)',
        'EventCard por consulta / vacuna / cirugía',
        'EventDetailModal',
        'Exportar PDF',
      ]}
      vueFiles={[
        'features/historia-clinica/views/HistoryStep.vue',
        'features/historia-clinica/components/MonthTimelineGroup.vue',
        'features/historia-clinica/components/EventCard.vue',
        'features/historia-clinica/components/EventDetailModal.vue',
      ]}
    />
  );
}

// ===== Consulta =====
function VetConsultaNuevaView() {
  return (
    <VetRoutePlaceholder
      title="Nueva consulta — Flujo multipaso"
      description="Captura motivo, examen físico, diagnóstico y tratamiento del paciente en una sola pantalla."
      screens={[
        'Paso 1: Identificación del paciente',
        'Paso 2: Anamnesis',
        'Paso 3: Examen físico',
        'Paso 4: Diagnóstico y plan',
        'Banner consulta activa',
        'Dialog reanudar/nueva',
      ]}
      vueFiles={[
        'features/dashboard/views/consulta/nueva/NuevaView.vue',
        'composables/useConsultaResumeGuard.ts',
        'features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft.ts',
      ]}
    />
  );
}
function VetConsultaExitoView() {
  return (
    <VetRoutePlaceholder
      title="Consulta guardada"
      description="Pantalla de confirmación tras guardar una consulta."
      vueFiles={['features/dashboard/views/consulta/nueva/exito/ConsultaGuardada.vue']}
    />
  );
}
function VetConsultaVacunacionView() {
  return (
    <VetRoutePlaceholder
      title="Vacunación rápida (durante consulta)"
      description="Form de vacunación contextual a una consulta activa."
      vueFiles={['features/dashboard/views/consulta/VacunacionView.vue']}
    />
  );
}
function VetConsultaHospitalView() {
  return (
    <VetRoutePlaceholder
      title="Hospitalización (durante consulta)"
      description="Form de hospitalización contextual."
      vueFiles={['features/dashboard/views/consulta/HospitalView.vue']}
    />
  );
}

Object.assign(window, {
  VetHistoriaOwnerStep, VetHistoriaPetStep, VetHistoriaHistoryStep,
  VetConsultaNuevaView, VetConsultaExitoView, VetConsultaVacunacionView, VetConsultaHospitalView,
});
