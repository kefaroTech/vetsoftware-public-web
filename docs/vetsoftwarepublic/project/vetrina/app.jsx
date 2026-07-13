/* global React, ReactDOM,
   VetRouterProvider, useVetRoute,
   VetHistoriaProvider,
   VetDraftProvider,
   VetToastProvider,
   VetAppLayout,
   VetLandingView, VetLoginView, VetSignupView, VetVerifyEmailView,
   VetRecuperarCodigoView, VetRecuperarContrasenaView, VetRestablecerContrasenaView, VetCambiarContrasenaView,
   VetHomeView,
   VetOwnerStepInner, VetPetStepInner, VetHistoryStepInner,
   VetNuevaView, VetConsultaGuardadaView, VetConsultaActiveBanner,
   VetConsultaVacunacionView, VetConsultaHospitalView,
   VetLabListViewC, VetImagingListViewC, VetVaccineListViewC,
   VetHospListViewC, VetDewormListViewC, VetSurgeryListViewC, VetSpaListViewC,
   VetEmpleadosView, VetRolesView, VetAgendaView, VetLabInternoView, VetHospitalView, VetShopView, VetAccountsView, VetFacturacionView, VetFeDocsView, VetFeReportes, VetMedicamentosView, VetEmpresaView */

function VetRoutedScreen() {
  const route = useVetRoute();

  // Auth / public routes (no shell)
  if (route.name === 'landing') return <VetLandingView />;
  if (route.name === 'signup')  return <VetSignupView />;
  if (route.name === 'login')   return <VetLoginView />;
  if (route.name === 'verify-email')           return <VetVerifyEmailView />;
  if (route.name === 'recuperar-codigo')       return <VetRecuperarCodigoView />;
  if (route.name === 'recuperar-contrasena')   return <VetRecuperarContrasenaView />;
  if (route.name === 'restablecer-contrasena') return <VetRestablecerContrasenaView />;
  if (route.name === 'cambiar-contrasena')     return <VetCambiarContrasenaView />;

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
      case 'facturacion-habilitacion':   return <VetFacturacionView />;
      case 'facturacion-documentos':     return <VetFeDocsView />;
      case 'facturacion-reportes':       return <VetFeReportes />;
      case 'tienda-pos':                 return <VetShopView tab="pos" />;
      case 'tienda-inventario':          return <VetShopView tab="inventario" />;
      case 'tienda-servicios':           return <VetShopView tab="servicios" />;
      case 'tienda-promociones':         return <VetShopView tab="promociones" />;
      case 'tienda-impuestos':           return <VetShopView tab="impuestos" />;
      case 'cuentas':                    return <VetAccountsView />;
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
      case 'empresa':                    return <VetEmpresaView />;
      case 'roles':                      return <VetRolesView />;
      case 'medicamentos':               return <VetMedicamentosView />;
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
