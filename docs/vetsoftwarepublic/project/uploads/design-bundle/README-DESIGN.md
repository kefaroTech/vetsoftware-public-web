# VetSoftwarePublicFront — Bundle para Claude Design

Contenido: todos los componentes .vue (plantillas + estilos scoped), CSS global, tokens de diseño (src/assets/styles/tokens.css), tema Vuetify (src/plugins/vuetify.ts) e index.html (fuentes Google).
NO incluye: lógica TS (stores/api/composables), node_modules, tests, dist.

## Pantallas (views = puntos de entrada de cada ruta):

- src/features/acciones/views/DewormListView.vue
- src/features/acciones/views/HospListView.vue
- src/features/acciones/views/ImagingListView.vue
- src/features/acciones/views/LabListView.vue
- src/features/acciones/views/SpaListView.vue
- src/features/acciones/views/SurgeryListView.vue
- src/features/acciones/views/VaccineListView.vue
- src/features/agenda/views/AgendaView.vue
- src/features/auth/views/LoginView.vue
- src/features/cuentas/views/CuentasView.vue
- src/features/dashboard/views/HomeView.vue
- src/features/dashboard/views/consulta/HospitalView.vue
- src/features/dashboard/views/consulta/VacunacionView.vue
- src/features/dashboard/views/consulta/nueva/NuevaView.vue
- src/features/dashboard/views/consulta/nueva/components/ContentWrap.vue
- src/features/dashboard/views/consulta/nueva/components/ContextHeader.vue
- src/features/dashboard/views/consulta/nueva/components/DeceasedConfirmDialog.vue
- src/features/dashboard/views/consulta/nueva/components/DiscardConsultaDialog.vue
- src/features/dashboard/views/consulta/nueva/components/OwnerForm.vue
- src/features/dashboard/views/consulta/nueva/components/OwnerHeader.vue
- src/features/dashboard/views/consulta/nueva/components/OwnerResultRow.vue
- src/features/dashboard/views/consulta/nueva/components/OwnerSearchInput.vue
- src/features/dashboard/views/consulta/nueva/components/OwnerSummaryCard.vue
- src/features/dashboard/views/consulta/nueva/components/PageHeading.vue
- src/features/dashboard/views/consulta/nueva/components/PetCard.vue
- src/features/dashboard/views/consulta/nueva/components/PetForm.vue
- src/features/dashboard/views/consulta/nueva/components/QuickActionsCard.vue
- src/features/dashboard/views/consulta/nueva/components/ResumeOrNewConsultaDialog.vue
- src/features/dashboard/views/consulta/nueva/components/SaveConsultaConfirmDialog.vue
- src/features/dashboard/views/consulta/nueva/components/SummaryRow.vue
- src/features/dashboard/views/consulta/nueva/components/WizardFooter.vue
- src/features/dashboard/views/consulta/nueva/exito/ConsultaGuardada.vue
- src/features/dashboard/views/consulta/nueva/modals/DewormingModal.vue
- src/features/dashboard/views/consulta/nueva/modals/HospitalizationModal.vue
- src/features/dashboard/views/consulta/nueva/modals/ImagingModal.vue
- src/features/dashboard/views/consulta/nueva/modals/LabTestModal.vue
- src/features/dashboard/views/consulta/nueva/modals/RecetaModal.vue
- src/features/dashboard/views/consulta/nueva/modals/SurgeryModal.vue
- src/features/dashboard/views/consulta/nueva/modals/VaccinationModal.vue
- src/features/dashboard/views/consulta/nueva/pasos/PasoConsulta.vue
- src/features/dashboard/views/consulta/nueva/pasos/PasoPaciente.vue
- src/features/employees/views/EmpleadosView.vue
- src/features/facturacion/views/DocumentosView.vue
- src/features/facturacion/views/HabilitacionView.vue
- src/features/facturacion/views/ReportesView.vue
- src/features/historia-clinica/views/HistoriaClinicaView.vue
- src/features/historia-clinica/views/HistoryStep.vue
- src/features/historia-clinica/views/OwnerStep.vue
- src/features/historia-clinica/views/PetStep.vue
- src/features/hospitalizacion/views/HospitalizacionView.vue
- src/features/laboratorio/views/LaboratorioView.vue
- src/features/registration/views/SignupView.vue
- src/features/roles/views/RolesView.vue
- src/features/tienda/views/ImpuestosView.vue
- src/features/tienda/views/InventarioView.vue
- src/features/tienda/views/POSView.vue
- src/features/tienda/views/PromocionesView.vue
- src/features/tienda/views/ServiciosView.vue
