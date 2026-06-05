/* global React, VetIcons, VetModalShell, VetBaseInput */

// ============================================================================
// Administrador de categorías (CRUD) — reutilizable para Inventario y Servicios
// ============================================================================

function VetCategoryManager({ open, onClose, title, categories, counts, onUpsert, onRemove }) {
  const [editing, setEditing] = React.useState(null); // {id, name} | {name:''} nuevo
  const [name, setName] = React.useState('');
  const [confirmDel, setConfirmDel] = React.useState(null);

  React.useEffect(() => { if (!open) { setEditing(null); setName(''); setConfirmDel(null); } }, [open]);

  function startNew() { setEditing({ name: '' }); setName(''); }
  function startEdit(c) { setEditing(c); setName(c.name); }
  function save() {
    if (!name.trim()) return;
    onUpsert(editing.id ? { id: editing.id, name: name.trim() } : { name: name.trim() });
    setEditing(null); setName('');
  }

  return (
    <VetModalShell open={open} onClose={onClose} title={title} subtitle="Crea, edita o elimina categorías"
      icon={VetIcons.Package} accent="amatista" width={520}
      footerActions={<button type="button" className="vet-btn-primary-modal" onClick={onClose}>Listo</button>}>
      <div className="vet-action-modal-body">
        {editing ? (
          <div className="vet-catm-form">
            <div className="vet-acct-fieldlabel">{editing.id ? 'Editar categoría' : 'Nueva categoría'}</div>
            <div className="vet-catm-formrow">
              <VetBaseInput value={name} onChange={setName} placeholder="Nombre de la categoría" autoFocus
                onKeyDown={(e) => e.key === 'Enter' && save()} />
              <button type="button" className="vet-btn-primary-modal" disabled={!name.trim()}
                style={!name.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : null} onClick={save}>
                {editing.id ? 'Guardar' : 'Crear'}
              </button>
              <button type="button" className="vet-btn-ghost-modal" onClick={() => { setEditing(null); setName(''); }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button type="button" className="vet-catm-add" onClick={startNew}>
            <VetIcons.Plus size={15} strokeWidth={2} /> Nueva categoría
          </button>
        )}

        <div className="vet-catm-list">
          {categories.map((c) => {
            const n = counts[c.id] || 0;
            const isDel = confirmDel === c.id;
            return (
              <div key={c.id} className={'vet-catm-row' + (isDel ? ' danger' : '')}>
                <div className="vet-catm-info">
                  <span className="vet-catm-name">{c.name}</span>
                  <span className="vet-catm-count">{n} ítem{n === 1 ? '' : 's'}</span>
                </div>
                {isDel ? (
                  <div className="vet-catm-actions">
                    <span className="vet-catm-delq">¿Eliminar?</span>
                    <button type="button" className="vet-catm-del" onClick={() => { onRemove(c.id); setConfirmDel(null); }}>Sí</button>
                    <button type="button" className="vet-catm-iconbtn" onClick={() => setConfirmDel(null)}>No</button>
                  </div>
                ) : (
                  <div className="vet-catm-actions">
                    <button type="button" className="vet-catm-iconbtn" onClick={() => startEdit(c)} aria-label="Editar">
                      <VetIcons.Edit size={14} strokeWidth={1.8} />
                    </button>
                    <button type="button" className="vet-catm-iconbtn danger" onClick={() => setConfirmDel(c.id)} aria-label="Eliminar"
                      title={n > 0 ? 'Reasigna los ítems antes de eliminar' : 'Eliminar'}>
                      <VetIcons.Trash size={14} strokeWidth={1.8} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {categories.length === 0 && <div className="vet-hosp-mini-empty">Sin categorías. Crea la primera.</div>}
        </div>
      </div>
    </VetModalShell>
  );
}

Object.assign(window, { VetCategoryManager });
