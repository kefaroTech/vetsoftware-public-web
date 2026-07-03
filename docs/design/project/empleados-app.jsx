// Empleados — App raíz: state global + composición

const { EmpleadosSidebar, ConsultaBanner, EmpleadosList, EmpleadoDrawer } = window;

function EmpleadosApp() {
  const [employees, setEmployees] = React.useState(EMPLOYEES);
  const [selectedId, setSelectedId] = React.useState(null);
  const [bannerOpen, setBannerOpen] = React.useState(true);

  const selected = employees.find(e => e.id === selectedId) || null;

  const handleUpdate = (id, patch) => {
    setEmployees(emps => emps.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const handleDeactivate = (id) => {
    setEmployees(emps => emps.map(e => e.id === id ? { ...e, active: false, lastLogin: 'desactivado' } : e));
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex',
      background: 'var(--warm-100)',
      fontFamily: 'Geist, sans-serif',
      color: 'var(--warm-900)',
      overflow: 'hidden',
    }}>
      <EmpleadosSidebar activeId="empleados" />

      <main style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        background: 'var(--warm-100)',
      }}>
        {bannerOpen && (
          <ConsultaBanner
            onResume={() => alert('Volver a la consulta de Luna…')}
            onDismiss={() => setBannerOpen(false)}
          />
        )}

        <EmpleadosList
          employees={employees}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNewEmployee={() => alert('Abrir wizard "Nuevo empleado" (siguiente entregable)')}
        />

        {selected && (
          <EmpleadoDrawer
            employee={selected}
            onClose={() => setSelectedId(null)}
            onUpdate={handleUpdate}
            onDeactivate={handleDeactivate}
          />
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<EmpleadosApp />);
