/* global React, VetIcons, VetModalShell,
   VetBaseField, VetBaseInput, VetBaseTextarea, VetBaseSelect, VetDateInput,
   VET_LAB_QUEUE_STATUS, VET_LAB_QUEUE_TONE, VET_LAB_PRIORITY,
   VET_LAB_QUEUE, VET_LAB_HISTORY, vetLabPetCtx, useVetToast,
   VetPatientCascadePicker, VetOwnerAnimalBreadcrumb */

// ============================================================================
// State
// ============================================================================

function useVetLabState() {
  const toast = useVetToast();
  const [samples, setSamples] = React.useState(VET_LAB_QUEUE);
  const [history, setHistory] = React.useState(VET_LAB_HISTORY);

  function update(id, patch) {
    setSamples((arr) => arr.map((s) => s.id === id ? { ...s, ...patch } : s));
  }
  function nowStr() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function takeSample(sample) {
    update(sample.id, { status: 'EN_PROCESO', startedAt: nowStr() });
    toast.info('Muestra en proceso', `${sample.code} pasó a procesamiento.`);
  }
  function loadResults(sample, { attachments }) {
    update(sample.id, { status: 'POR_VALIDAR', attachments });
    toast.success('Resultado cargado', `${sample.code} pasó a validación.`);
  }
  function validate(sample, validatedBy) {
    const at = nowStr();
    // sale del tablero activo → entra al histórico
    setSamples((arr) => arr.filter((s) => s.id !== sample.id));
    setHistory((arr) => [{ ...sample, status: 'VALIDADO', validatedBy, validatedAt: at }, ...arr]);
    toast.success('Resultado validado', `${sample.code} archivado en el histórico.`);
  }
  function reject(sample) {
    update(sample.id, { status: 'EN_PROCESO' });
    toast.warn('Resultado devuelto', `${sample.code} regresó a proceso para corrección.`);
  }

  return { samples, history, takeSample, loadResults, validate, reject };
}

// ============================================================================
// Pills
// ============================================================================

function VetLabPriorityPill({ priority }) {
  const cfg = VET_LAB_PRIORITY[priority] ?? VET_LAB_PRIORITY.RUTINA;
  return (
    <span className="vet-lab-prio-pill" style={{ background: cfg.tone.bg, color: cfg.tone.fg }}>
      {priority === 'STAT' && <VetIcons.Bell size={10} strokeWidth={2} />}
      {cfg.label}
    </span>
  );
}

// ============================================================================
// Attachment row
// ============================================================================

function VetLabFileRow({ file, onRemove }) {
  const isImg = file.kind === 'image';
  return (
    <div className="vet-lab-file-row">
      <div className={'vet-lab-file-ic' + (isImg ? ' img' : '')}>
        {isImg ? <VetIcons.ScanLine size={15} strokeWidth={1.7} /> : <VetIcons.FileText size={15} strokeWidth={1.7} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="vet-lab-file-name">{file.name}</div>
        {file.size && <div className="vet-lab-file-size">{file.size}</div>}
      </div>
      {onRemove && (
        <button type="button" className="vet-existing-remove" onClick={onRemove} aria-label="Quitar">
          <VetIcons.Trash size={13} />
        </button>
      )}
      {!onRemove && (
        <button type="button" className="vet-lab-file-dl" aria-label="Descargar">
          <VetIcons.Download size={14} strokeWidth={1.7} />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Sample card (kanban)
// ============================================================================

function VetLabSampleCard({ sample, onOpen }) {
  const ctx = vetLabPetCtx(sample.animalId);
  return (
    <button type="button" className="vet-lab-card" onClick={() => onOpen(sample)}>
      <div className="vet-lab-card-top">
        <span className="vet-lab-card-code">{sample.code}</span>
        <VetLabPriorityPill priority={sample.priority} />
      </div>
      <div className="vet-lab-card-test">{sample.testType}</div>
      <div className="vet-lab-card-patient">
        <VetIcons.PawPrint size={13} strokeWidth={1.7} style={{ color: 'var(--amatista-600)' }} />
        <span>{ctx.pet?.name ?? '—'}</span>
        <span className="vet-lab-card-dim">· {ctx.owner?.name ?? ''}</span>
      </div>
      <div className="vet-lab-card-meta">
        <span className="vet-lab-card-dim">Recolectada {sample.collectedAt.slice(5)}</span>
      </div>
      {sample.status === 'POR_VALIDAR' && (
        <div className="vet-lab-card-tech">📎 {sample.attachments.length} archivo{sample.attachments.length === 1 ? '' : 's'} adjunto{sample.attachments.length === 1 ? '' : 's'}</div>
      )}
      {sample.status === 'VALIDADO' && sample.validatedBy && (
        <div className="vet-lab-card-tech">✓ Validado por {sample.validatedBy}</div>
      )}
    </button>
  );
}

// ============================================================================
// Kanban board
// ============================================================================

function VetLabBoard({ samples, onOpen }) {
  const columns = ['EN_COLA', 'EN_PROCESO', 'POR_VALIDAR'];
  return (
    <div className="vet-lab-board vet-lab-board-3">
      {columns.map((col) => {
        const cfg = VET_LAB_QUEUE_STATUS[col];
        const tone = VET_LAB_QUEUE_TONE[cfg.color];
        const colSamples = samples.filter((s) => s.status === col);
        return (
          <div key={col} className="vet-lab-col">
            <header className="vet-lab-col-head" style={{ borderTopColor: tone.dot }}>
              <div className="vet-lab-col-title">
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </div>
              <span className="vet-lab-col-count" style={{ background: tone.bg, color: tone.fg }}>
                {colSamples.length}
              </span>
            </header>
            <div className="vet-lab-col-body">
              {colSamples.length === 0 ? (
                <div className="vet-lab-col-empty">Sin muestras</div>
              ) : (
                colSamples.map((s) => <VetLabSampleCard key={s.id} sample={s} onOpen={onOpen} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Histórico — tabla con búsqueda, filtros y paginación
// ============================================================================

function VetLabHistory({ history, onOpen }) {
  const [patient, setPatient] = React.useState(null);     // filtro opcional por paciente
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState('');
  const [prioFilter, setPrioFilter] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 12;

  const testTypes = React.useMemo(() => {
    const set = new Set(history.map((h) => h.testType));
    return Array.from(set).sort();
  }, [history]);

  const filtered = React.useMemo(() => {
    return history.filter((h) => {
      if (patient && h.animalId !== patient.animal.id) return false;
      if (typeFilter && h.testType !== typeFilter) return false;
      if (prioFilter && h.priority !== prioFilter) return false;
      if (from && h.validatedAt.slice(0, 10) < from) return false;
      if (to && h.validatedAt.slice(0, 10) > to) return false;
      return true;
    });
  }, [history, patient, typeFilter, prioFilter, from, to]);

  React.useEffect(() => { setPage(1); }, [patient, typeFilter, prioFilter, from, to]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = patient || typeFilter || prioFilter || from || to;

  function clearFilters() {
    setPatient(null); setTypeFilter(''); setPrioFilter(''); setFrom(''); setTo('');
  }

  return (
    <div className="vet-lab-history">
      <div className="vet-lab-filters">
        {patient ? (
          <div className="vet-lab-patient-chip">
            <VetIcons.PawPrint size={13} strokeWidth={1.7} style={{ color: 'var(--amatista-600)' }} />
            <span className="vet-lab-patient-chip-name">{patient.animal.name}</span>
            <span className="vet-lab-patient-chip-owner">· {patient.owner.name}</span>
            <button type="button" className="vet-lab-patient-chip-x" onClick={() => setPatient(null)} aria-label="Quitar filtro de paciente">
              <VetIcons.X size={12} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button type="button" className="vet-lab-patient-btn" onClick={() => setPickerOpen(true)}>
            <VetIcons.User size={14} strokeWidth={1.7} />
            Filtrar por paciente
          </button>
        )}
        <select className="vet-lab-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {testTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="vet-lab-filter-select" value={prioFilter} onChange={(e) => setPrioFilter(e.target.value)}>
          <option value="">Toda prioridad</option>
          <option value="RUTINA">Rutina</option>
          <option value="URGENTE">Urgente</option>
          <option value="STAT">STAT</option>
        </select>
        <div className="vet-lab-date-range">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Desde" />
          <span className="vet-lab-date-sep">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hasta" />
        </div>
        {hasFilters && (
          <button type="button" className="vet-lab-clear" onClick={clearFilters}>
            <VetIcons.X size={13} strokeWidth={1.8} /> Limpiar
          </button>
        )}
      </div>

      <div className="vet-lab-hist-count">
        {filtered.length.toLocaleString('es')} examen{filtered.length === 1 ? '' : 'es'} validado{filtered.length === 1 ? '' : 's'}
        {hasFilters && ` (de ${history.length.toLocaleString('es')})`}
      </div>

      <table className="vet-lab-hist-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Examen</th>
            <th>Paciente</th>
            <th>Prioridad</th>
            <th>Validado</th>
            <th>Por</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {slice.length === 0 ? (
            <tr><td colSpan={7} className="vet-lab-hist-empty">Sin resultados para los filtros aplicados.</td></tr>
          ) : (
            slice.map((h) => {
              const ctx = vetLabPetCtx(h.animalId);
              return (
                <tr key={h.id} onClick={() => onOpen(h)} className="vet-lab-hist-row">
                  <td><span className="vet-lab-hist-code">{h.code}</span></td>
                  <td>{h.testType}</td>
                  <td>
                    <div className="vet-lab-hist-patient">{ctx.pet?.name ?? '—'}</div>
                    <div className="vet-lab-hist-owner">{ctx.owner?.name ?? ''}</div>
                  </td>
                  <td><VetLabPriorityPill priority={h.priority} /></td>
                  <td className="vet-lab-hist-date">{h.validatedAt}</td>
                  <td className="vet-lab-hist-by">{h.validatedBy}</td>
                  <td><VetIcons.ChevronRight size={15} strokeWidth={1.6} style={{ color: 'var(--warm-400)' }} /></td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {pageCount > 1 && (
        <div className="vet-lab-pagination">
          <span className="vet-lab-pag-info">Página {page} de {pageCount}</span>
          <div className="vet-lab-pag-controls">
            <button type="button" className="vet-lab-pag-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button type="button" className="vet-lab-pag-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <VetIcons.ChevronLeft size={14} />
            </button>
            <span className="vet-lab-pag-current">{page}</span>
            <button type="button" className="vet-lab-pag-btn" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
              <VetIcons.ChevronRight size={14} />
            </button>
            <button type="button" className="vet-lab-pag-btn" disabled={page === pageCount} onClick={() => setPage(pageCount)}>»</button>
          </div>
        </div>
      )}

      <VetModalShell
        open={pickerOpen}
        title="Filtrar por paciente"
        subtitle="Busca el propietario y selecciona su mascota."
        icon={VetIcons.User}
        accent="amatista"
        width={560}
        onClose={() => setPickerOpen(false)}
      >
        <VetPatientCascadePicker onSelect={(sel) => { setPatient(sel); setPickerOpen(false); }} />
      </VetModalShell>
    </div>
  );
}

// ============================================================================
// Load results modal (EN_PROCESO → POR_VALIDAR) — solo archivos adjuntos
// ============================================================================

const VET_LAB_SAMPLE_FILES = [
  { name: 'resultado-laboratorio.pdf', size: '286 KB', kind: 'pdf' },
  { name: 'microscopia.jpg', size: '1.1 MB', kind: 'image' },
  { name: 'informe-equipo.pdf', size: '204 KB', kind: 'pdf' },
];

function VetLabResultsModal({ open, sample, onClose, onConfirm }) {
  const [files, setFiles] = React.useState([]);

  React.useEffect(() => {
    if (!open || !sample) return;
    setFiles(sample.attachments && sample.attachments.length > 0
      ? sample.attachments.map((f) => ({ ...f }))
      : []);
  }, [open, sample]);

  function addDemoFile() {
    const next = VET_LAB_SAMPLE_FILES[files.length % VET_LAB_SAMPLE_FILES.length];
    setFiles((arr) => [...arr, { ...next }]);
  }
  function removeFile(i) { setFiles((arr) => arr.filter((_, idx) => idx !== i)); }

  const canSave = files.length > 0;

  if (!open || !sample) return null;
  return (
    <VetModalShell
      open={open} onClose={onClose}
      title="Cargar resultados"
      subtitle={`${sample.code} · ${sample.testType}`}
      icon={VetIcons.Beaker} accent="amatista" width={560}
      footerLeft={`${files.length} archivo${files.length === 1 ? '' : 's'} adjunto${files.length === 1 ? '' : 's'}`}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal"
            disabled={!canSave}
            style={!canSave ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onConfirm(sample, { attachments: files })}>
            Enviar a validación
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        <div className="vet-lab-params-head">
          <span>Archivos de resultado</span>
        </div>

        <button type="button" className="vet-lab-upload" onClick={addDemoFile}>
          <VetIcons.Download size={16} strokeWidth={1.7} style={{ transform: 'rotate(180deg)' }} />
          <span>Arrastra un PDF o imagen del resultado, o haz clic para adjuntar</span>
        </button>

        {files.length > 0 && (
          <div className="vet-lab-file-list">
            {files.map((f, i) => (
              <VetLabFileRow key={i} file={f} onRemove={() => removeFile(i)} />
            ))}
          </div>
        )}
      </div>
    </VetModalShell>
  );
}

// ============================================================================
// Sample detail drawer (read-only + actions)
// ============================================================================

function VetLabDetailModal({ open, sample, onClose, onTake, onLoad, onValidate, onReject }) {
  if (!open || !sample) return null;
  const ctx = vetLabPetCtx(sample.animalId);
  const cfg = VET_LAB_QUEUE_STATUS[sample.status];
  const tone = VET_LAB_QUEUE_TONE[cfg.color];

  const actions = (() => {
    if (sample.status === 'EN_COLA') {
      return <button type="button" className="vet-btn-primary-modal" onClick={() => onTake(sample)}>Tomar muestra</button>;
    }
    if (sample.status === 'EN_PROCESO') {
      return <button type="button" className="vet-btn-primary-modal" onClick={() => onLoad(sample)}>Cargar resultados</button>;
    }
    if (sample.status === 'POR_VALIDAR') {
      return (
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={() => onReject(sample)}>Devolver</button>
          <button type="button" className="vet-btn-primary-modal" onClick={() => onValidate(sample)}>Validar y firmar</button>
        </>
      );
    }
    return <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cerrar</button>;
  })();

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title={sample.code}
      subtitle={`${sample.testType}`}
      icon={VetIcons.Beaker} accent="amatista" width={600}
      footerLeft={
        <span className="vet-lab-status-inline" style={{ background: tone.bg, color: tone.fg }}>
          {cfg.icon} {cfg.label}
        </span>
      }
      footerActions={actions}
    >
      <div className="vet-action-detail-grid">
        <div className="vet-action-detail-field">
          <div className="vet-action-detail-label">Paciente</div>
          <div className="vet-action-detail-value">{ctx.pet?.name ?? '—'}
            <span style={{ color: 'var(--warm-500)', textTransform: 'none' }}> · {ctx.pet?.specie.name}, {ctx.pet?.breed.name}</span>
          </div>
        </div>
        <div className="vet-action-detail-field">
          <div className="vet-action-detail-label">Propietario</div>
          <div className="vet-action-detail-value" style={{ textTransform: 'none' }}>{ctx.owner?.name ?? '—'}</div>
        </div>
        <div className="vet-action-detail-field">
          <div className="vet-action-detail-label">Prioridad</div>
          <div className="vet-action-detail-value"><VetLabPriorityPill priority={sample.priority} /></div>
        </div>
        <div className="vet-action-detail-field">
          <div className="vet-action-detail-label">Recolectada</div>
          <div className="vet-action-detail-value" style={{ textTransform: 'none' }}>{sample.collectedAt} · {sample.collectedBy}</div>
        </div>
      </div>

      {sample.attachments.length > 0 && (
        <div className="vet-lab-result-block">
          <div className="vet-lab-result-title">Archivos de resultado</div>
          <div className="vet-lab-file-list">
            {sample.attachments.map((f, i) => <VetLabFileRow key={i} file={f} />)}
          </div>
          {sample.validatedBy && (
            <div className="vet-lab-validated">
              ✓ Validado por <strong>{sample.validatedBy}</strong> · {sample.validatedAt}
            </div>
          )}
        </div>
      )}
    </VetModalShell>
  );
}

// ============================================================================
// Main view
// ============================================================================

function VetLabInternoView() {
  const lab = useVetLabState();
  const [tab, setTab] = React.useState('activo');
  const [detail, setDetail] = React.useState(null);
  const [resultsFor, setResultsFor] = React.useState(null);

  // El detalle puede venir del tablero activo o del histórico
  const liveDetail = detail
    ? (lab.samples.find((s) => s.id === detail.id) ?? lab.history.find((s) => s.id === detail.id) ?? detail)
    : null;

  const pendientes = lab.samples.length;

  return (
    <div className="vet-lab-page">
      <header className="vet-lab-header">
        <div>
          <div className="vet-lab-kicker">Laboratorio</div>
          <h1 className="vet-lab-title">Bandeja de muestras</h1>
          <div className="vet-lab-lead">
            Procesa las muestras solicitadas: toma, carga de resultados y validación firmada.
          </div>
        </div>
      </header>

      <div className="vet-lab-tabs" role="tablist">
        <button
          type="button" role="tab" aria-selected={tab === 'activo'}
          className={'vet-lab-tab' + (tab === 'activo' ? ' active' : '')}
          onClick={() => setTab('activo')}
        >
          <VetIcons.Beaker size={15} strokeWidth={1.7} />
          <span>Bandeja activa</span>
          {pendientes > 0 && <span className="vet-lab-tab-badge">{pendientes}</span>}
        </button>
        <button
          type="button" role="tab" aria-selected={tab === 'historico'}
          className={'vet-lab-tab' + (tab === 'historico' ? ' active' : '')}
          onClick={() => setTab('historico')}
        >
          <VetIcons.History size={15} strokeWidth={1.7} />
          <span>Histórico</span>
          <span className="vet-lab-tab-badge muted">{lab.history.length.toLocaleString('es')}</span>
        </button>
      </div>

      {tab === 'activo'
        ? <VetLabBoard samples={lab.samples} onOpen={setDetail} />
        : <VetLabHistory history={lab.history} onOpen={setDetail} />}

      <VetLabDetailModal
        open={!!liveDetail}
        sample={liveDetail}
        onClose={() => setDetail(null)}
        onTake={(s) => { lab.takeSample(s); }}
        onLoad={(s) => { setResultsFor(s); }}
        onValidate={(s) => { lab.validate(s, 'Mariana Rojas'); setDetail(null); }}
        onReject={(s) => { lab.reject(s); }}
      />

      <VetLabResultsModal
        open={!!resultsFor}
        sample={resultsFor}
        onClose={() => setResultsFor(null)}
        onConfirm={(s, data) => { lab.loadResults(s, data); setResultsFor(null); }}
      />
    </div>
  );
}

Object.assign(window, { VetLabInternoView });
