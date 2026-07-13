// Orchestrator — alterna entre búsqueda y detalle
function HistorialApp() {
  const [selected, setSelected] = React.useState(null);
  return (
    <Shell activeSubItem="historial">
      {selected
        ? <HistorialDetail pet={selected} onBack={() => setSelected(null)} />
        : <HistorialSearch onSelect={(p) => setSelected(p)} />}
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HistorialApp />);
