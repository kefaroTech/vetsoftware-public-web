// App canvas — todas las pantallas del flujo Nueva Consulta
const { DesignCanvas, DCSection, DCArtboard } = window;

function FlowApp() {
  const W = 1280, H = 820;
  return (
    <DesignCanvas>
      <DCSection
        id="step1"
        title="Paso 1 · Propietario"
        subtitle="Buscar, seleccionar o crear el propietario"
      >
        <DCArtboard id="s1-empty" label="1.A · Búsqueda inicial" width={W} height={H}>
          <Step1OwnerSearch />
        </DCArtboard>
        <DCArtboard id="s1-results" label="1.B · Resultados de búsqueda" width={W} height={H}>
          <Step1OwnerResults />
        </DCArtboard>
        <DCArtboard id="s1-selected" label="1.C · Propietario seleccionado" width={W} height={H}>
          <Step1OwnerSelected />
        </DCArtboard>
        <DCArtboard id="s1-create" label="1.D · Crear propietario nuevo" width={W} height={H}>
          <Step1OwnerCreate />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="step2"
        title="Paso 2 · Mascota"
        subtitle="Seleccionar mascota del propietario o registrar una nueva"
      >
        <DCArtboard id="s2-list" label="2.A · Lista de mascotas" width={W} height={H}>
          <Step2PetSelect />
        </DCArtboard>
        <DCArtboard id="s2-empty" label="2.B · Sin mascotas" width={W} height={H}>
          <Step2PetEmpty />
        </DCArtboard>
        <DCArtboard id="s2-create" label="2.C · Crear mascota nueva" width={W} height={H}>
          <Step2PetCreate />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="step3"
        title="Paso 3 · Datos de la consulta"
        subtitle="Anamnesis, diagnóstico, planes y atajos a registros vinculados"
      >
        <DCArtboard id="s3-form" label="3 · Formulario de consulta" width={W} height={H}>
          <Step3Consultation />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="step4"
        title="Paso 4 · Resumen y confirmación"
        subtitle="Revisar todo antes de guardar"
      >
        <DCArtboard id="s4-summary" label="4 · Resumen final" width={W} height={H}>
          <Step4Summary />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="states"
        title="Estados especiales"
        subtitle="Confirmación de cancelar y guardado exitoso"
      >
        <DCArtboard id="cancel" label="Modal · Cancelar consulta" width={W} height={H}>
          <StateCancel />
        </DCArtboard>
        <DCArtboard id="success" label="Pantalla · Guardado exitoso" width={W} height={H}>
          <StateSuccess />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<FlowApp />);
