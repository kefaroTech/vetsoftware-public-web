/* global React, ReactDOM,
   VetRouterProvider, useVetRoute,
   VetHistoriaProvider,
   VetDraftProvider,
   VetToastProvider,
   VetAppLayout,
   VetLoginView, VetSignupView,
   VetHomeView,
   VetOwnerStepInner, VetPetStepInner, VetHistoryStepInner,
   VetNuevaView, VetConsultaGuardadaView, VetConsultaActiveBanner,
   VetConsultaVacunacionView, VetConsultaHospitalView,
   VetLabListViewC, VetImagingListViewC, VetVaccineListViewC,
   VetHospListViewC, VetDewormListViewC, VetSurgeryListViewC, VetSpaListViewC,
   VetEmpleadosView, VetRolesView, VetAgendaView, VetLabInternoView, VetHospitalView, VetShopView */

function VetRoutedScreen() {
  const route = useVetRoute();

  // Auth routes (no shell)
  if (route.name === 'signup') return <VetSignupView />;
  if (route.name === 'login')  return <VetLoginView />;

  // Consulta nueva — fullBleed, no topbar (its own wizard chrome)
  if (route.name === 'consulta-nueva')
    return <VetAppLayout><VetNuevaView /></VetAppLayout>;
  if (route.name === 'consulta-nueva-exito')
    return <VetAppLayout><VetConsultaGuardadaView /></VetAppLayout>;

  // Historia routes — full-bleed, use historia shell internally
  if (route.name === 'consulta-historial')
    return <VetAppLayout><VetOwnerStepInner /></VetAppLayout>;
  if (route.name === 'consulta-historial-pet')
    return <VetAppLayout><VetPetStepInner /></VetAppLayout>;
  if (route.name === 'consulta-historial-detail')
    return <VetAppLayout><VetHistoryStepInner /></VetAppLayout>;

  // Dashboard shell
  const screen = (() => {
    switch (route.name) {
      case 'home':                       return <VetHomeView />;
      case 'agenda':                     return <VetAgendaView />;
      case 'laboratorio-interno':        return <VetLabInternoView />;
      case 'hospital-ward':              return <VetHospitalView />;
      case 'tienda-pos':                 return <VetShopView tab="pos" />;
      case 'tienda-inventario':          return <VetShopView tab="inventario" />;
      case 'tienda-servicios':           return <VetShopView tab="servicios" />;
      case 'tienda-promociones':         return <VetShopView tab="promociones" />;
      case 'consulta-vacunacion':        return <VetConsultaVacunacionView />;
      case 'consulta-hospital':          return <VetConsultaHospitalView />;
      case 'acciones-laboratorio':       return <VetLabListViewC />;
      case 'acciones-imagen':            return <VetImagingListViewC />;
      case 'acciones-vacunacion':        return <VetVaccineListViewC />;
      case 'acciones-hospitalizacion':   return <VetHospListViewC />;
      case 'acciones-desparasitacion':   return <VetDewormListViewC />;
      case 'acciones-cirugia':           return <VetSurgeryListViewC />;
      case 'acciones-spa':               return <VetSpaListViewC />;
      case 'empleados':                  return <VetEmpleadosView />;
      case 'roles':                      return <VetRolesView />;
      default:                           return <VetHomeView />;
    }
  })();

  return <VetAppLayout>{screen}</VetAppLayout>;
}

function VetApp() {
  return (
    <VetRouterProvider>
      <VetToastProvider>
        <VetDraftProvider>
          <VetHistoriaProvider>
            <VetRoutedScreen />
            <VetConsultaActiveBanner />
          </VetHistoriaProvider>
        </VetDraftProvider>
      </VetToastProvider>
    </VetRouterProvider>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<VetApp />);
