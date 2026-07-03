// App raíz: design canvas con las 4 variaciones
const { VariationA, VariationB, VariationC, VariationD } = window;

function RolesApp() {
  return (
    <DesignCanvas>
      <DCSection
        id="roles-variations"
        title="Roles y permisos · 4 propuestas de layout"
        subtitle="Misma data y mismo lenguaje visual. Cambia la composición de la pantalla principal."
      >
        <DCArtboard id="A" label="A · Lista + drawer (Empleados-style)" width={1280} height={820}>
          <VariationA />
        </DCArtboard>
        <DCArtboard id="B" label="B · Master-detail (lista izq + detalle der)" width={1280} height={820}>
          <VariationB />
        </DCArtboard>
        <DCArtboard id="C" label="C · Grid de tarjetas" width={1280} height={820}>
          <VariationC />
        </DCArtboard>
        <DCArtboard id="D" label="D · Matriz roles × permisos" width={1280} height={820}>
          <VariationD />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<RolesApp />);
