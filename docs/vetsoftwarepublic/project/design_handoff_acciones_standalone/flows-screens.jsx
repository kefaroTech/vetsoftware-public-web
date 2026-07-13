// 6 listas + modales para cada acción clínica standalone

const { useState: useStt, useMemo: useMm } = React;

// Catálogos compartidos (mismos que en el wizard)
const LAB_CATALOG = [
  { name:'Hemograma completo', description:'CBC + diferencial' },
  { name:'Bioquímica sanguínea', description:'Panel hepático + renal' },
  { name:'Urianálisis', description:'Físico-químico + sedimento' },
  { name:'Coproparasitario', description:'Examen de heces' },
  { name:'T4 / TSH', description:'Perfil tiroideo' },
  { name:'Citología', description:'Punción / hisopado' },
  { name:'Cultivo + antibiograma', description:'Microbiología' },
];
const IMAGING_TYPES = ['Rayos X', 'Ecografía', 'TAC', 'Resonancia magnética', 'Endoscopia'];
const VACCINE_CATALOG = [
  { name:'Polivalente (DHPPi+L)', description:'Caninos' },
  { name:'Antirrábica', description:'Caninos y felinos' },
  { name:'Triple felina', description:'Rinotraqueitis + calicivirus + panleucopenia' },
  { name:'Leucemia felina (FeLV)', description:'Felinos' },
  { name:'Tos de las perreras (Bb)', description:'Caninos · intranasal' },
];
const SURGERY_CATALOG = [
  'Esterilización (OVH)', 'Castración', 'Limpieza dental',
  'Cesárea', 'Cirugía de tejidos blandos', 'Cirugía ortopédica',
];

// ════════════════════════════════════════════════════════════
// LAB
// ════════════════════════════════════════════════════════════
function LabFlow({ onOpenCreate, records, onToast }) {
  const [query, setQuery] = useStt('');
  const filtered = records.filter(r => {
    if (!query) return true;
    const p = findPatient(r.patientId);
    return (p.name + ' ' + p.owner + ' ' + r.tests.join(' ')).toLowerCase().includes(query.toLowerCase());
  });
  const pg = usePaged(filtered);
  return (
    <ListBody query={query} onQuery={setQuery} placeholder="Buscar por paciente, propietario o examen…"
      total={pg.total} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage}>
      <div style={tableHead}>
        <div style={{ flex:'0 0 110px' }}>Fecha</div>
        <div style={{ flex:1.5 }}>Paciente</div>
        <div style={{ flex:2 }}>Exámenes</div>
        <div style={{ flex:1.4 }}>Sospecha</div>
        <div style={{ flex:'0 0 130px' }}>Veterinario</div>
        <div style={{ flex:'0 0 110px' }}>Estado</div>
      </div>
      {pg.slice.map(r => (
        <div key={r.id} style={tableRow}>
          <div style={{ flex:'0 0 110px', fontSize:12.5, color:'var(--warm-700)' }}>{fmtDate(r.date)}</div>
          <div style={{ flex:1.5 }}><PatientCell patientId={r.patientId} /></div>
          <div style={{ flex:2, fontSize:12.5, color:'var(--warm-800)' }}>
            {r.tests.slice(0,2).join(', ')}{r.tests.length>2 ? ` +${r.tests.length-2}` : ''}
          </div>
          <div style={{ flex:1.4, fontSize:12.5, color:'var(--warm-600)' }}>{r.suspicion}</div>
          <div style={{ flex:'0 0 130px', fontSize:12.5, color:'var(--warm-700)' }}>{r.vet}</div>
          <div style={{ flex:'0 0 110px' }}><StatusPill status={r.status} /></div>
        </div>
      ))}
      {filtered.length === 0 && <EmptyRow text="Sin resultados" />}
    </ListBody>
  );
}

function LabCreateModal({ onClose, onSave }) {
  const [patientId, setPatientId] = useStt(null);
  const [date, setDate] = useStt(new Date().toISOString().slice(0,10));
  const [suspicion, setSuspicion] = useStt('');
  const [tests, setTests] = useStt([{ type:'', qty:1, dx:'' }]);
  const [catalog, setCatalog] = useStt(LAB_CATALOG);
  const upd = (i,k,v) => setTests(arr => arr.map((x,idx) => idx===i ? {...x,[k]:v} : x));
  const valid = patientId && tests.every(t => t.type);

  return (
    <ModalShell
      title="Solicitud de exámenes de laboratorio"
      subtitle="Sin consulta · independiente"
      icon="🧪"
      onClose={onClose}
      footer={<>
        <div style={{ fontSize:11.5, color:'var(--warm-500)' }}>
          {tests.length} examen{tests.length>1?'es':''} · paciente {patientId ? '✓' : 'pendiente'}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <button disabled={!valid} onClick={() => onSave({ patientId, date, suspicion, tests })} style={{
            background:'var(--amatista-700)', color:'white', border:'none',
            padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:500,
            fontFamily:'inherit', opacity: valid?1:0.5, cursor: valid?'pointer':'not-allowed',
          }}>Guardar solicitud</button>
        </div>
      </>}
    >
      <Field label="Paciente" required><PatientPicker value={patientId} onChange={setPatientId} /></Field>
      <div style={{ height:14 }} />
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:14, marginBottom:18 }}>
        <Field label="Fecha de toma" required><DatePicker value={date} onChange={setDate} /></Field>
        <Field label="Sospecha clínica / motivo">
          <input value={suspicion} onChange={e=>setSuspicion(e.target.value)} style={inp}
            placeholder="Ej. Decaimiento + vómitos · descartar pancreatitis"/>
        </Field>
      </div>

      <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>Exámenes solicitados</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {tests.map((t,i) => (
          <div key={i} style={{
            background:'var(--warm-50)', border:'1px solid var(--warm-200)',
            borderRadius:11, padding:14,
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 100px 2fr 32px', gap:10, alignItems:'flex-end' }}>
              <Field label="Tipo de examen" required>
                <SearchableSelect
                  value={t.type} onChange={v=>upd(i,'type',v)}
                  placeholder="Seleccione un examen…"
                  options={catalog.map(c => ({ value:c.name, label:c.name, hint:c.description }))}
                  onCreate={(opt) => setCatalog(c => [...c, { name:opt.value, description:opt.hint || '' }])}
                  createLabel="Crear nuevo tipo de examen"
                />
              </Field>
              <Field label="Cantidad"><input type="number" min="1" value={t.qty} onChange={e=>upd(i,'qty',e.target.value)} style={inp}/></Field>
              <Field label="Diagnóstico presuntivo">
                <input value={t.dx} onChange={e=>upd(i,'dx',e.target.value)} style={inp}
                  placeholder="Ej. Descartar IRC"/>
              </Field>
              <button onClick={() => setTests(a => a.length>1 ? a.filter((_,idx) => idx!==i) : a)} style={iconDel}>×</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setTests(a => [...a, { type:'', qty:1, dx:'' }])} style={addRowBtn}>
        + Agregar otro examen
      </button>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════
// IMAGING
// ════════════════════════════════════════════════════════════
function ImagingFlow({ records }) {
  const [q, setQ] = useStt('');
  const filtered = records.filter(r => {
    if (!q) return true;
    const p = findPatient(r.patientId);
    return (p.name + ' ' + r.type + ' ' + r.studyType).toLowerCase().includes(q.toLowerCase());
  });
  const pg = usePaged(filtered);
  return (
    <ListBody query={q} onQuery={setQ} placeholder="Buscar por paciente, tipo o región…"
      total={pg.total} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage}>
      <div style={tableHead}>
        <div style={{ flex:'0 0 110px' }}>Fecha</div>
        <div style={{ flex:1.4 }}>Paciente</div>
        <div style={{ flex:'0 0 140px' }}>Tipo</div>
        <div style={{ flex:1.6 }}>Región / protocolo</div>
        <div style={{ flex:1.6 }}>Signos clínicos</div>
        <div style={{ flex:'0 0 110px' }}>Estado</div>
      </div>
      {pg.slice.map(r => (
        <div key={r.id} style={tableRow}>
          <div style={{ flex:'0 0 110px', fontSize:12.5, color:'var(--warm-700)' }}>{fmtDate(r.date)}</div>
          <div style={{ flex:1.4 }}><PatientCell patientId={r.patientId} /></div>
          <div style={{ flex:'0 0 140px', fontSize:13, fontWeight:500 }}>{r.type}</div>
          <div style={{ flex:1.6, fontSize:12.5, color:'var(--warm-700)' }}>{r.studyType}</div>
          <div style={{ flex:1.6, fontSize:12.5, color:'var(--warm-600)' }}>{r.signs}</div>
          <div style={{ flex:'0 0 110px' }}><StatusPill status={r.status} /></div>
        </div>
      ))}
      {filtered.length === 0 && <EmptyRow text="Sin resultados" />}
    </ListBody>
  );
}

function ImagingCreateModal({ onClose, onSave }) {
  const [patientId, setPatientId] = useStt(null);
  const [date, setDate] = useStt(new Date().toISOString().slice(0,10));
  const [type, setType] = useStt('');
  const [studyType, setStudyType] = useStt('');
  const [signs, setSigns] = useStt('');
  const [diag, setDiag] = useStt('');
  const [obs, setObs] = useStt('');
  const [types, setTypes] = useStt(IMAGING_TYPES);
  const valid = patientId && type && signs.length > 3;

  return (
    <ModalShell title="Estudio de imagen diagnóstica" subtitle="Sin consulta · independiente" icon="🩻" onClose={onClose}
      footer={<>
        <div style={{ fontSize:11.5, color:'var(--warm-500)' }}>{type ? `${type} · ${studyType || '—'}` : 'Selecciona tipo'}</div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <button disabled={!valid} onClick={() => onSave({ patientId, date, type, studyType, signs, diag, obs })} style={{
            background:'var(--amatista-700)', color:'white', border:'none',
            padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:500,
            fontFamily:'inherit', opacity: valid?1:0.5, cursor: valid?'pointer':'not-allowed',
          }}>Guardar estudio</button>
        </div>
      </>}>
      <Field label="Paciente" required><PatientPicker value={patientId} onChange={setPatientId} /></Field>
      <div style={{ height:14 }} />
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:14, marginBottom:14 }}>
        <Field label="Fecha" required><DatePicker value={date} onChange={setDate} /></Field>
        <Field label="Tipo de estudio" required>
          <SearchableSelect value={type} onChange={setType}
            placeholder="Seleccione tipo de estudio…" options={types}
            onCreate={(opt) => setTypes(t => [...t, opt.value])}
            createLabel="Crear nuevo tipo de estudio" />
        </Field>
      </div>
      <Field label="Región / protocolo" hint="Ej. Tórax LL · Abdomen VD · Cadera">
        <input value={studyType} onChange={e=>setStudyType(e.target.value)} style={inp}
          placeholder="Ej. Abdomen latero-lateral derecho"/>
      </Field>
      <div style={{ height:14 }} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Signos clínicos" required hint="Motivo del estudio">
          <textarea value={signs} onChange={e=>setSigns(e.target.value)} rows={3} style={txt}
            placeholder="Ej. Disnea + tos seca · 5 días"/>
        </Field>
        <Field label="Diagnóstico / hallazgos" hint="Si ya hay lectura del estudio">
          <textarea value={diag} onChange={e=>setDiag(e.target.value)} rows={3} style={txt}
            placeholder="Ej. Patrón intersticial difuso"/>
        </Field>
      </div>
      <Field label="Observaciones">
        <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={2} style={txt}
          placeholder="Equipo, sedación, contraste..."/>
      </Field>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════
// VACCINE
// ════════════════════════════════════════════════════════════
function VaccineFlow({ records }) {
  const [q, setQ] = useStt('');
  const filtered = records.filter(r => {
    if (!q) return true;
    const p = findPatient(r.patientId);
    return (p.name + ' ' + r.vaccine + ' ' + r.lab).toLowerCase().includes(q.toLowerCase());
  });
  const pg = usePaged(filtered);
  return (
    <ListBody query={q} onQuery={setQ} placeholder="Buscar por paciente, vacuna o laboratorio…"
      total={pg.total} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage}>
      <div style={tableHead}>
        <div style={{ flex:'0 0 110px' }}>Fecha</div>
        <div style={{ flex:1.4 }}>Paciente</div>
        <div style={{ flex:1.6 }}>Vacuna</div>
        <div style={{ flex:1 }}>Laboratorio</div>
        <div style={{ flex:1 }}>Lote</div>
        <div style={{ flex:'0 0 130px' }}>Próxima dosis</div>
      </div>
      {pg.slice.map(r => (
        <div key={r.id} style={tableRow}>
          <div style={{ flex:'0 0 110px', fontSize:12.5, color:'var(--warm-700)' }}>{fmtDate(r.date)}</div>
          <div style={{ flex:1.4 }}><PatientCell patientId={r.patientId} /></div>
          <div style={{ flex:1.6, fontSize:13, fontWeight:500 }}>{r.vaccine}</div>
          <div style={{ flex:1, fontSize:12.5, color:'var(--warm-700)' }}>{r.lab}</div>
          <div style={{ flex:1, fontSize:12.5, color:'var(--warm-600)', fontFamily:'JetBrains Mono, monospace' }}>{r.lot}</div>
          <div style={{ flex:'0 0 130px', fontSize:12.5, color:'var(--amatista-700)', fontWeight:500 }}>{fmtDate(r.nextDate)}</div>
        </div>
      ))}
      {filtered.length === 0 && <EmptyRow text="Sin resultados" />}
    </ListBody>
  );
}

function VaccineCreateModal({ onClose, onSave }) {
  const today = new Date().toISOString().slice(0,10);
  const nextYear = new Date(Date.now() + 365*864e5).toISOString().slice(0,10);
  const [patientId, setPatientId] = useStt(null);
  const [date, setDate] = useStt(today);
  const [items, setItems] = useStt([{ type:'', lab:'', lot:'', next:nextYear }]);
  const [catalog, setCatalog] = useStt(VACCINE_CATALOG);
  const upd = (i,k,v) => setItems(arr => arr.map((x,idx) => idx===i ? {...x,[k]:v} : x));
  const valid = patientId && items.every(v => v.type && v.lot && v.lab);

  return (
    <ModalShell title="Aplicación de vacuna" subtitle="Sin consulta · independiente" icon="💉" onClose={onClose}
      footer={<>
        <div style={{ fontSize:11.5, color:'var(--warm-500)' }}>{items.length} dosis</div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <button disabled={!valid} onClick={() => onSave({ patientId, date, items })} style={{
            background:'var(--amatista-700)', color:'white', border:'none',
            padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:500,
            fontFamily:'inherit', opacity: valid?1:0.5, cursor: valid?'pointer':'not-allowed',
          }}>Registrar dosis</button>
        </div>
      </>}>
      <Field label="Paciente" required><PatientPicker value={patientId} onChange={setPatientId} /></Field>
      <div style={{ height:14 }} />
      <Field label="Fecha de aplicación" required>
        <div style={{ maxWidth:220 }}><DatePicker value={date} onChange={setDate} /></div>
      </Field>
      <div style={{ height:14 }} />
      <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>Vacunas aplicadas</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {items.map((it,i) => (
          <div key={i} style={{
            background:'var(--warm-50)', border:'1px solid var(--warm-200)',
            borderRadius:11, padding:14,
          }}>
            <Field label="Tipo de vacuna" required>
              <SearchableSelect value={it.type} onChange={v=>upd(i,'type',v)}
                placeholder="Seleccione vacuna…"
                options={catalog.map(c => ({ value:c.name, label:c.name, hint:c.description }))}
                onCreate={(opt) => setCatalog(c => [...c, { name:opt.value, description:opt.hint || '' }])}
                createLabel="Crear nueva vacuna" />
            </Field>
            <div style={{ height:10 }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 32px', gap:10, alignItems:'flex-end' }}>
              <Field label="Laboratorio" required>
                <input value={it.lab} onChange={e=>upd(i,'lab',e.target.value)} style={inp} placeholder="Zoetis · MSD · Virbac"/>
              </Field>
              <Field label="Lote" required>
                <input value={it.lot} onChange={e=>upd(i,'lot',e.target.value)} style={inp} placeholder="Ej. ABX-2026-04"/>
              </Field>
              <Field label="Próxima dosis"><DatePicker value={it.next} onChange={v=>upd(i,'next',v)} /></Field>
              <button onClick={() => setItems(a => a.length>1 ? a.filter((_,idx) => idx!==i) : a)} style={iconDel}>×</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setItems(a => [...a, { type:'', lab:'', lot:'', next:nextYear }])} style={addRowBtn}>
        + Agregar otra vacuna
      </button>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════
// HOSPITALIZATION
// ════════════════════════════════════════════════════════════
function HospFlow({ records }) {
  const [q, setQ] = useStt('');
  const filtered = records.filter(r => {
    if (!q) return true;
    const p = findPatient(r.patientId);
    return (p.name + ' ' + r.reason).toLowerCase().includes(q.toLowerCase());
  });
  const pg = usePaged(filtered);
  return (
    <ListBody query={q} onQuery={setQ} placeholder="Buscar por paciente o motivo…"
      total={pg.total} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage}>
      <div style={tableHead}>
        <div style={{ flex:'0 0 110px' }}>Ingreso</div>
        <div style={{ flex:'0 0 110px' }}>Salida</div>
        <div style={{ flex:1.4 }}>Paciente</div>
        <div style={{ flex:'0 0 130px' }}>Tipo</div>
        <div style={{ flex:2 }}>Motivo</div>
        <div style={{ flex:'0 0 110px' }}>Estado</div>
      </div>
      {pg.slice.map(r => (
        <div key={r.id} style={tableRow}>
          <div style={{ flex:'0 0 110px', fontSize:12.5, color:'var(--warm-700)' }}>{fmtDate(r.startDate)}</div>
          <div style={{ flex:'0 0 110px', fontSize:12.5, color:'var(--warm-700)' }}>{r.endDate ? fmtDate(r.endDate) : '—'}</div>
          <div style={{ flex:1.4 }}><PatientCell patientId={r.patientId} /></div>
          <div style={{ flex:'0 0 130px', fontSize:12.5, color:'var(--warm-800)' }}>
            {r.type === 'HOSPITALIZATION' ? 'Hospitalización' : 'Ambulatorio'}
          </div>
          <div style={{ flex:2, fontSize:12.5, color:'var(--warm-700)' }}>{r.reason}</div>
          <div style={{ flex:'0 0 110px' }}><StatusPill status={r.status} /></div>
        </div>
      ))}
      {filtered.length === 0 && <EmptyRow text="Sin resultados" />}
    </ListBody>
  );
}

function HospCreateModal({ onClose, onSave }) {
  const today = new Date().toISOString().slice(0,10);
  const [patientId, setPatientId] = useStt(null);
  const [type, setType] = useStt('HOSPITALIZATION');
  const [startDate, setStartDate] = useStt(today);
  const [endDate, setEndDate] = useStt('');
  const [reasonLeaving, setReasonLeaving] = useStt('');
  const [reason, setReason] = useStt('');
  const [obs, setObs] = useStt('');
  const valid = patientId && type && reason.length > 3;

  return (
    <ModalShell title="Registro de hospitalización" subtitle="Sin consulta · independiente" icon="🏥" onClose={onClose}
      footer={<>
        <div style={{ fontSize:11.5, color:'var(--warm-500)' }}>
          {type === 'HOSPITALIZATION' ? 'Internación' : 'Ambulatorio'}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <button disabled={!valid} onClick={() => onSave({ patientId, type, startDate, endDate, reasonLeaving, reason, obs })} style={{
            background:'var(--amatista-700)', color:'white', border:'none',
            padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:500,
            fontFamily:'inherit', opacity: valid?1:0.5, cursor: valid?'pointer':'not-allowed',
          }}>Registrar</button>
        </div>
      </>}>
      <Field label="Paciente" required><PatientPicker value={patientId} onChange={setPatientId} /></Field>
      <div style={{ height:14 }} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Tipo" required>
          <select value={type} onChange={e=>setType(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
            <option value="HOSPITALIZATION">Hospitalización</option>
            <option value="OUTPATIENT">Ambulatorio</option>
          </select>
        </Field>
        <Field label="Motivo de salida" hint="Solo si el paciente ya egresó">
          <select value={reasonLeaving} onChange={e=>setReasonLeaving(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
            <option value="">— Aún hospitalizado —</option>
            <option value="MEDICAL_DISCHARGE">Alta médica</option>
            <option value="HOME_TREATMENT">Tratamiento en casa</option>
            <option value="TRANSFER">Traslado / derivación</option>
            <option value="TUTOR_WISH">Solicitud del tutor</option>
            <option value="DEATH">Fallecimiento</option>
            <option value="EUTHANASIA">Eutanasia</option>
          </select>
        </Field>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Fecha de ingreso" required><DatePicker value={startDate} onChange={setStartDate} /></Field>
        <Field label="Fecha de salida" hint="Real · si ya egresó"><DatePicker value={endDate} onChange={setEndDate} /></Field>
      </div>
      <Field label="Motivo de internación" required>
        <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} style={txt}
          placeholder="Ej. Pancreatitis aguda · requiere fluidoterapia"/>
      </Field>
      <div style={{ height:14 }} />
      <Field label="Indicaciones / observaciones">
        <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={3} style={txt}
          placeholder="Plan de manejo, medicación, monitoreo..."/>
      </Field>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════
// DEWORM
// ════════════════════════════════════════════════════════════
function DewormFlow({ records }) {
  const [q, setQ] = useStt('');
  const filtered = records.filter(r => {
    if (!q) return true;
    const p = findPatient(r.patientId);
    return (p.name + ' ' + r.product).toLowerCase().includes(q.toLowerCase());
  });
  const pg = usePaged(filtered);
  const typeLabel = { INTERNAL:'Interna', EXTERNAL:'Externa', MIX:'Mixta', OTHER:'Otra' };
  return (
    <ListBody query={q} onQuery={setQ} placeholder="Buscar por paciente o producto…"
      total={pg.total} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage}>
      <div style={tableHead}>
        <div style={{ flex:'0 0 110px' }}>Fecha</div>
        <div style={{ flex:1.4 }}>Paciente</div>
        <div style={{ flex:'0 0 100px' }}>Tipo</div>
        <div style={{ flex:1.8 }}>Producto</div>
        <div style={{ flex:1.2 }}>Dosis</div>
        <div style={{ flex:'0 0 130px' }}>Próximo control</div>
      </div>
      {pg.slice.map(r => (
        <div key={r.id} style={tableRow}>
          <div style={{ flex:'0 0 110px', fontSize:12.5, color:'var(--warm-700)' }}>{fmtDate(r.date)}</div>
          <div style={{ flex:1.4 }}><PatientCell patientId={r.patientId} /></div>
          <div style={{ flex:'0 0 100px', fontSize:12.5, color:'var(--warm-700)' }}>{typeLabel[r.type]}</div>
          <div style={{ flex:1.8, fontSize:13, fontWeight:500 }}>{r.product}</div>
          <div style={{ flex:1.2, fontSize:12.5, color:'var(--warm-600)' }}>{r.dosage}</div>
          <div style={{ flex:'0 0 130px', fontSize:12.5, color:'var(--amatista-700)', fontWeight:500 }}>{fmtDate(r.next)}</div>
        </div>
      ))}
      {filtered.length === 0 && <EmptyRow text="Sin resultados" />}
    </ListBody>
  );
}

function DewormCreateModal({ onClose, onSave }) {
  const today = new Date().toISOString().slice(0,10);
  const next3mo = new Date(Date.now() + 90*864e5).toISOString().slice(0,10);
  const [patientId, setPatientId] = useStt(null);
  const [date, setDate] = useStt(today);
  const [type, setType] = useStt('INTERNAL');
  const [product, setProduct] = useStt('');
  const [dosage, setDosage] = useStt('');
  const [lastD, setLastD] = useStt('');
  const [next, setNext] = useStt(next3mo);
  const [obs, setObs] = useStt('');
  const valid = patientId && product && dosage;

  return (
    <ModalShell title="Desparasitación" subtitle="Sin consulta · independiente" icon="🪱" onClose={onClose}
      footer={<>
        <div style={{ fontSize:11.5, color:'var(--warm-500)' }}>Próximo control: {fmtDate(next)}</div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <button disabled={!valid} onClick={() => onSave({ patientId, date, type, product, dosage, lastD, next, obs })} style={{
            background:'var(--amatista-700)', color:'white', border:'none',
            padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:500,
            fontFamily:'inherit', opacity: valid?1:0.5, cursor: valid?'pointer':'not-allowed',
          }}>Registrar</button>
        </div>
      </>}>
      <Field label="Paciente" required><PatientPicker value={patientId} onChange={setPatientId} /></Field>
      <div style={{ height:14 }} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Tipo" required>
          <select value={type} onChange={e=>setType(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
            <option value="INTERNAL">Interna</option>
            <option value="EXTERNAL">Externa</option>
            <option value="MIX">Mixta</option>
            <option value="OTHER">Otra</option>
          </select>
        </Field>
        <Field label="Fecha" required><DatePicker value={date} onChange={setDate} /></Field>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Producto" required hint="Nombre comercial + principio activo">
          <input value={product} onChange={e=>setProduct(e.target.value)} style={inp}
            placeholder="Ej. Drontal Plus · Praziquantel + Pirantel"/>
        </Field>
        <Field label="Dosis" required>
          <input value={dosage} onChange={e=>setDosage(e.target.value)} style={inp} placeholder="Ej. 1 comp./10 kg VO"/>
        </Field>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Última desparasitación" hint="Si se conoce"><DatePicker value={lastD} onChange={setLastD} /></Field>
        <Field label="Próximo control" required><DatePicker value={next} onChange={setNext} /></Field>
      </div>
      <Field label="Observaciones">
        <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={2} style={txt}
          placeholder="Tolerancia, efectos adversos..."/>
      </Field>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════
// SURGERY
// ════════════════════════════════════════════════════════════
function SurgeryFlow({ records }) {
  const [q, setQ] = useStt('');
  const filtered = records.filter(r => {
    if (!q) return true;
    const p = findPatient(r.patientId);
    return (p.name + ' ' + r.surgeryType).toLowerCase().includes(q.toLowerCase());
  });
  const pg = usePaged(filtered);
  return (
    <ListBody query={q} onQuery={setQ} placeholder="Buscar por paciente o tipo de cirugía…"
      total={pg.total} page={pg.page} pageSize={pg.pageSize} onPage={pg.setPage}>
      <div style={tableHead}>
        <div style={{ flex:'0 0 110px' }}>Fecha</div>
        <div style={{ flex:1.4 }}>Paciente</div>
        <div style={{ flex:1.6 }}>Procedimiento</div>
        <div style={{ flex:2 }}>Descripción</div>
        <div style={{ flex:'0 0 130px' }}>Veterinario</div>
        <div style={{ flex:'0 0 110px' }}>Estado</div>
      </div>
      {pg.slice.map(r => (
        <div key={r.id} style={tableRow}>
          <div style={{ flex:'0 0 110px', fontSize:12.5, color:'var(--warm-700)' }}>{fmtDate(r.date)}</div>
          <div style={{ flex:1.4 }}><PatientCell patientId={r.patientId} /></div>
          <div style={{ flex:1.6, fontSize:13, fontWeight:500 }}>{r.surgeryType}</div>
          <div style={{ flex:2, fontSize:12.5, color:'var(--warm-600)' }}>{r.description}</div>
          <div style={{ flex:'0 0 130px', fontSize:12.5, color:'var(--warm-700)' }}>{r.vet}</div>
          <div style={{ flex:'0 0 110px' }}><StatusPill status={r.status} /></div>
        </div>
      ))}
      {filtered.length === 0 && <EmptyRow text="Sin resultados" />}
    </ListBody>
  );
}

function SurgeryCreateModal({ onClose, onSave }) {
  const today = new Date().toISOString().slice(0,10);
  const [patientId, setPatientId] = useStt(null);
  const [date, setDate] = useStt(today);
  const [surgeryType, setSurgeryType] = useStt('');
  const [desc, setDesc] = useStt('');
  const [med, setMed] = useStt('');
  const [obs, setObs] = useStt('');
  const [compl, setCompl] = useStt('');
  const [catalog, setCatalog] = useStt(SURGERY_CATALOG);
  const valid = patientId && surgeryType && desc.length > 3;

  return (
    <ModalShell title="Programar / registrar cirugía" subtitle="Sin consulta · independiente" icon="🔪" onClose={onClose}
      footer={<>
        <div style={{ fontSize:11.5, color:'var(--warm-500)' }}>Se generará el consentimiento al guardar</div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <button disabled={!valid} onClick={() => onSave({ patientId, date, surgeryType, desc, med, obs, compl })} style={{
            background:'var(--amatista-700)', color:'white', border:'none',
            padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:500,
            fontFamily:'inherit', opacity: valid?1:0.5, cursor: valid?'pointer':'not-allowed',
          }}>Registrar cirugía</button>
        </div>
      </>}>
      <Field label="Paciente" required><PatientPicker value={patientId} onChange={setPatientId} /></Field>
      <div style={{ height:14 }} />
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:14, marginBottom:14 }}>
        <Field label="Fecha programada" required><DatePicker value={date} onChange={setDate} /></Field>
        <Field label="Tipo de cirugía" required>
          <SearchableSelect value={surgeryType} onChange={setSurgeryType}
            placeholder="Seleccione tipo de cirugía…"
            options={catalog}
            onCreate={(opt) => setCatalog(c => [...c, opt.value])}
            createLabel="Crear nuevo tipo de cirugía" />
        </Field>
      </div>
      <Field label="Descripción del procedimiento" required hint="Técnica · enfoque">
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} style={txt}
          placeholder="Ej. OVH por línea media · abordaje convencional"/>
      </Field>
      <div style={{ height:14 }} />
      <Field label="Anestesia / medicación quirúrgica" hint="Pre, trans y post-operatorio">
        <textarea value={med} onChange={e=>setMed(e.target.value)} rows={3} style={txt}
          placeholder="Ej. Premed: Aceprom + Butorfanol IM · Inducción: Propofol IV..."/>
      </Field>
      <div style={{ height:14 }} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <Field label="Observaciones">
          <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={3} style={txt}
            placeholder="Hallazgos, suturas, drenajes..."/>
        </Field>
        <Field label="Complicaciones" hint="Si las hubo">
          <textarea value={compl} onChange={e=>setCompl(e.target.value)} rows={3} style={txt}
            placeholder="Ej. Sangrado leve · controlado"/>
        </Field>
      </div>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════
// Shared helpers
// ════════════════════════════════════════════════════════════
function ListBody({ query, onQuery, placeholder, total, page, pageSize, onPage, children }) {
  const pageCount = Math.max(1, Math.ceil((total || 0) / pageSize));
  return (
    <div style={{ flex:1, padding:'24px 40px 40px', overflow:'auto', minWidth:0 }}>
      <div style={{
        padding:'10px 12px', marginBottom:14,
        background:'var(--warm-50)', border:'1px solid var(--warm-200)', borderRadius:10,
      }}>
        <input value={query} onChange={e=>onQuery(e.target.value)}
          placeholder={placeholder}
          style={{
            width:'100%', border:'none', outline:'none',
            background:'var(--warm-100)', borderRadius:7,
            padding:'7px 12px', fontSize:13.5, fontFamily:'inherit',
          }}/>
      </div>
      <div style={{
        background:'var(--warm-50)', border:'1px solid var(--warm-200)',
        borderRadius:12, overflow:'hidden',
      }}>
        {children}
        {total > 0 && (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 18px', background:'var(--warm-100)',
            borderTop:'1px solid var(--warm-200)', fontSize:12.5, color:'var(--warm-600)',
            gap:12,
          }}>
            <div>
              Mostrando <strong style={{ color:'var(--warm-900)' }}>{(page-1)*pageSize + 1}</strong>
              –<strong style={{ color:'var(--warm-900)' }}>{Math.min(page*pageSize, total)}</strong> de
              <strong style={{ color:'var(--warm-900)' }}> {total}</strong>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={() => onPage(1)} disabled={page<=1} style={pageBtn(page<=1)}>«</button>
              <button onClick={() => onPage(page-1)} disabled={page<=1} style={pageBtn(page<=1)}>‹</button>
              {pageNumbers(page, pageCount).map((n, i) => n === '…'
                ? <span key={i} style={{ padding:'0 6px', color:'var(--warm-500)' }}>…</span>
                : <button key={i} onClick={() => onPage(n)} style={{
                    ...pageBtn(false),
                    background: n === page ? 'var(--amatista-700)' : 'var(--warm-50)',
                    color: n === page ? 'white' : 'var(--warm-700)',
                    fontWeight: n === page ? 600 : 400,
                  }}>{n}</button>)}
              <button onClick={() => onPage(page+1)} disabled={page>=pageCount} style={pageBtn(page>=pageCount)}>›</button>
              <button onClick={() => onPage(pageCount)} disabled={page>=pageCount} style={pageBtn(page>=pageCount)}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function pageBtn(disabled) {
  return {
    width:28, height:28, borderRadius:6,
    background:'var(--warm-50)', color: disabled ? 'var(--warm-400)' : 'var(--warm-700)',
    border:'1px solid var(--warm-200)',
    fontSize:12, fontFamily:'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display:'inline-flex', alignItems:'center', justifyContent:'center',
  };
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({length:total}, (_,i) => i+1);
  if (current <= 4) return [1,2,3,4,5,'…',total];
  if (current >= total-3) return [1,'…',total-4,total-3,total-2,total-1,total];
  return [1,'…',current-1,current,current+1,'…',total];
}

function usePaged(items) {
  const PAGE_SIZE = 8;
  const [page, setPage] = useStt(1);
  React.useEffect(() => { setPage(1); }, [items.length]);
  const slice = items.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  return { slice, page, setPage, total: items.length, pageSize: PAGE_SIZE };
}

function EmptyRow({ text }) {
  return <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--warm-500)', fontSize:13 }}>{text}</div>;
}

const iconDel = {
  width:32, height:32, borderRadius:7,
  background:'transparent', border:'1px solid var(--warm-200)',
  color:'var(--warm-500)', cursor:'pointer', fontSize:16, fontFamily:'inherit',
};
const addRowBtn = {
  marginTop:10, width:'100%',
  background:'transparent', border:'1.5px dashed var(--warm-300)',
  borderRadius:10, padding:'10px 12px',
  fontSize:13, color:'var(--warm-700)', fontWeight:500,
  fontFamily:'inherit', cursor:'pointer',
};

Object.assign(window, {
  LabFlow, LabCreateModal,
  ImagingFlow, ImagingCreateModal,
  VaccineFlow, VaccineCreateModal,
  HospFlow, HospCreateModal,
  DewormFlow, DewormCreateModal,
  SurgeryFlow, SurgeryCreateModal,
});
