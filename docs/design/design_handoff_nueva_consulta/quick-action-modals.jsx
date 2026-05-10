// Modales para acciones rápidas del Paso 3 — basados en el modelo de datos
// LaboratoryTest, DiagnosticImaging, Vaccination, Hospitalization, Deworming, Surgery
// Mismo patrón visual que RecetaModal (ancho 1200px, padding 24/32, footer ghost+primary)

const { useState: useS } = React;

// ─── Sample catalogs (basados en *Type entities) ───
const TEST_CATALOG = [
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
  { name:'Polivalente (DHPPi+L)', description:'Moquillo, hepatitis, parvo, parainfluenza, leptospira', interval:365 },
  { name:'Antirrábica', description:'Rabia · obligatoria', interval:365 },
  { name:'Triple felina', description:'Rinotraqueitis, calicivirus, panleucopenia', interval:365 },
  { name:'Leucemia felina (FeLV)', description:'Solo gatos', interval:365 },
  { name:'Tos de las perreras (Bb)', description:'Bordetella · intranasal', interval:365 },
  { name:'Giardia', description:'Refuerzo opcional', interval:365 },
];

const SURGERY_CATALOG = [
  'Esterilización (OVH)',
  'Castración',
  'Limpieza dental + extracciones',
  'Cesárea',
  'Cirugía de tejidos blandos',
  'Cirugía ortopédica',
  'Otro',
];

// ─── Shell común para todos los modales ───
function ModalShell({ icon: Ico, title, subtitle, onClose, children, footer, width = 1600 }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(20,15,22,0.55)',
      backdropFilter:'blur(4px)', zIndex:60,
      display:'grid', placeItems:'center',
      fontFamily:flowTokens.font, color:flowTokens.text,
      animation:'fadeIn .15s',
    }}>
      <div style={{
        width:`min(${width}px, 80vw)`, height:'80vh', maxHeight:'80vh',
        background:flowTokens.surface, borderRadius:16,
        boxShadow:'0 30px 80px rgba(20,15,30,0.35)',
        display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        <div style={{
          padding:'18px 24px', borderBottom:`1px solid ${flowTokens.border}`,
          display:'flex', alignItems:'center', gap:14, flexShrink:0,
        }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:flowTokens.accent, color:'white',
            display:'grid', placeItems:'center',
          }}><Ico size={19} /></div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Instrument Serif, serif', fontSize:22, lineHeight:1.1 }}>{title}</div>
            <div style={{ fontSize:12.5, color:flowTokens.textMuted, marginTop:2 }}>{subtitle}</div>
          </div>
          <button onClick={onClose} style={{
            background:'transparent', border:'none', cursor:'pointer',
            color:flowTokens.textMuted, padding:8, borderRadius:8,
          }}><IconX size={18} /></button>
        </div>
        <div style={{ padding:'24px 32px', overflow:'auto', flex:1 }}>
          {children}
        </div>
        <div style={{
          padding:'14px 24px',
          borderTop:`1px solid ${flowTokens.border}`,
          background:flowTokens.surface2,
          display:'flex', alignItems:'center', gap:10, flexShrink:0,
        }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

// ─── Estilos compartidos ───
const qInp = {
  width:'100%', background:flowTokens.surface,
  border:`1px solid ${flowTokens.border}`,
  borderRadius:8, padding:'8px 12px',
  fontSize:13.5, fontFamily:'inherit', color:flowTokens.text, outline:'none',
};
const qTxt = { ...qInp, lineHeight:1.55, resize:'vertical' };
const qBtnGhost = {
  background:'transparent', border:`1px solid ${flowTokens.border}`,
  padding:'9px 16px', borderRadius:8, fontSize:13, fontWeight:500,
  fontFamily:'inherit', color:flowTokens.text, cursor:'pointer',
};
const qBtnPrimary = {
  background:flowTokens.accent, color:'white',
  border:'none', padding:'9px 18px', borderRadius:8,
  fontSize:13, fontWeight:500, fontFamily:'inherit', cursor:'pointer',
};

function SearchableSelect({ value, options, onChange, placeholder = 'Seleccione…', onCreate, createLabel = 'Crear nuevo' }) {
  // options: array of strings, or { value, label, hint }
  const norm = options.map(o => typeof o === 'string' ? { value:o, label:o } : o);
  const [open, setOpen] = useS(false);
  const [q, setQ] = useS('');
  const [creating, setCreating] = useS(false);
  const [newName, setNewName] = useS('');
  const [newHint, setNewHint] = useS('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setCreating(false); } };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const selected = norm.find(o => o.value === value);
  const filtered = q
    ? norm.filter(o => (o.label + ' ' + (o.hint||'')).toLowerCase().includes(q.toLowerCase()))
    : norm;
  const showCreate = onCreate && !creating;
  const startCreate = () => {
    setNewName(q || '');
    setNewHint('');
    setCreating(true);
  };
  const confirmCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate({ value:name, label:name, hint:newHint.trim() || undefined });
    onChange(name);
    setCreating(false);
    setOpen(false);
    setQ(''); setNewName(''); setNewHint('');
  };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        ...qInp, cursor:'pointer', textAlign:'left',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
        color: selected ? flowTokens.text : flowTokens.textSubtle,
      }}>
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ color:flowTokens.textSubtle, fontSize:11 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:20,
          background:flowTokens.surface, border:`1px solid ${flowTokens.borderStrong}`,
          borderRadius:10, boxShadow:'0 12px 30px rgba(0,0,0,0.12)', overflow:'hidden',
        }}>
          {!creating && (
            <div style={{ padding:8, borderBottom:`1px solid ${flowTokens.border}` }}>
              <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
                placeholder="Buscar…"
                style={{ ...qInp, padding:'7px 10px', fontSize:12.5 }}/>
            </div>
          )}
          {!creating && (
            <div style={{ maxHeight:240, overflow:'auto' }}>
              {filtered.length === 0 && (
                <div style={{ padding:'10px 12px', fontSize:12, color:flowTokens.textSubtle }}>
                  Sin coincidencias
                </div>
              )}
              {filtered.map(o => (
                <div key={o.value} onMouseDown={() => { onChange(o.value); setOpen(false); setQ(''); }}
                  style={{
                    padding:'9px 12px', cursor:'pointer', fontSize:12.5,
                    background: o.value === value ? flowTokens.accentBg2 : 'transparent',
                    borderBottom:`1px solid ${flowTokens.border}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = flowTokens.accentBg2}
                  onMouseLeave={e => e.currentTarget.style.background = o.value === value ? flowTokens.accentBg2 : 'transparent'}
                >
                  <div style={{ fontWeight: o.value === value ? 500 : 400 }}>{o.label}</div>
                  {o.hint && <div style={{ color:flowTokens.textSubtle, fontSize:11.5, marginTop:2 }}>{o.hint}</div>}
                </div>
              ))}
            </div>
          )}
          {showCreate && (
            <button type="button" onClick={(e) => { e.stopPropagation(); startCreate(); }} style={{
              width:'100%', textAlign:'left', padding:'12px 14px',
              background:flowTokens.accentBg, color:flowTokens.accent,
              border:'none', borderTop:`1px solid ${flowTokens.border}`,
              fontSize:13, fontWeight:500, fontFamily:'inherit', cursor:'pointer',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span style={{
                width:20, height:20, borderRadius:'50%', background:flowTokens.accent, color:'white',
                display:'inline-grid', placeItems:'center', fontSize:14, lineHeight:1, fontWeight:600,
              }}>+</span>
              {q ? <>Crear <span style={{ fontWeight:600 }}>"{q}"</span></> : createLabel}
            </button>
          )}
          {creating && (
            <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10, background:flowTokens.accentBg }}>
              <div style={{ fontSize:13, fontWeight:500, color:flowTokens.text }}>{createLabel}</div>
              <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter' && newName.trim()){ e.preventDefault(); confirmCreate(); } if(e.key==='Escape'){ setCreating(false); } }}
                placeholder="Nombre"
                style={{ ...qInp, padding:'8px 10px', fontSize:13 }}/>
              <input value={newHint} onChange={e=>setNewHint(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter' && newName.trim()){ e.preventDefault(); confirmCreate(); } if(e.key==='Escape'){ setCreating(false); } }}
                placeholder="Descripción (opcional)"
                style={{ ...qInp, padding:'8px 10px', fontSize:13 }}/>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={(e)=>{ e.stopPropagation(); setCreating(false); }} style={{
                  ...qBtnGhost, padding:'7px 12px', fontSize:12.5,
                }}>Cancelar</button>
                <button type="button" onClick={(e)=>{ e.stopPropagation(); confirmCreate(); }} disabled={!newName.trim()} style={{
                  ...qBtnPrimary, padding:'7px 12px', fontSize:12.5,
                  opacity: newName.trim()?1:0.5, cursor: newName.trim()?'pointer':'not-allowed',
                }}>Crear y seleccionar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DatePicker estilizado (con icono calendario) ───
function DatePicker({ value, onChange, min, max }) {
  const ref = React.useRef(null);
  const display = value
    ? new Date(value + 'T00:00').toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })
    : '';
  const open = () => {
    try { ref.current?.showPicker?.(); } catch(e) {}
    ref.current?.focus();
  };
  return (
    <div onClick={open} style={{
      ...qInp, padding:0, cursor:'pointer',
      display:'flex', alignItems:'center', gap:8,
      position:'relative', overflow:'hidden',
    }}>
      <div style={{
        padding:'8px 10px', color:flowTokens.accent,
        background:flowTokens.accentBg, borderRight:`1px solid ${flowTokens.border}`,
        display:'flex', alignItems:'center',
      }}>
        <IconCalendar size={15} />
      </div>
      <span style={{
        flex:1, padding:'8px 0', fontSize:13.5,
        color: display ? flowTokens.text : flowTokens.textSubtle,
      }}>{display || 'Seleccionar fecha'}</span>
      <input
        ref={ref}
        type="date"
        value={value || ''}
        min={min} max={max}
        onChange={e => onChange(e.target.value)}
        style={{
          position:'absolute', inset:0, opacity:0, cursor:'pointer',
          fontSize:13.5, fontFamily:'inherit',
        }}
      />
    </div>
  );
}

function PillSelector({ options, value, onChange }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        const active = value === v;
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            padding:'7px 14px', borderRadius:999,
            border:`1px solid ${active ? flowTokens.accent : flowTokens.border}`,
            background: active ? flowTokens.accentBg : flowTokens.surface,
            color: active ? flowTokens.accent : flowTokens.textMuted,
            fontSize:12.5, fontWeight: active ? 500 : 400,
            fontFamily:'inherit', cursor:'pointer',
          }}>{l}</button>
        );
      })}
    </div>
  );
}

function ItemHeader({ idx, title, onRemove, removable }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
      <div style={{
        width:24, height:24, borderRadius:'50%',
        background:flowTokens.accentBg, color:flowTokens.accent,
        fontSize:11, fontWeight:600, display:'grid', placeItems:'center',
      }}>{idx+1}</div>
      <div style={{ fontSize:12.5, fontWeight:500, color:flowTokens.textMuted }}>{title}</div>
      {removable && (
        <button onClick={onRemove} style={{
          marginLeft:'auto', background:'transparent', border:'none',
          color:flowTokens.textSubtle, cursor:'pointer', padding:4,
        }}><IconTrash size={14} /></button>
      )}
    </div>
  );
}

const itemCard = {
  background:flowTokens.surface,
  border:`1px solid ${flowTokens.border}`,
  borderRadius:11, padding:14,
};

// ════════════════════════════════════════════════════════
// 1) EXAMEN LABORATORIO
// ════════════════════════════════════════════════════════
function LabTestModal({ pet, onClose, onSave }) {
  const today = new Date().toISOString().slice(0,10);
  const [date, setDate] = useS(today);
  const [catalog, setCatalog] = useS(TEST_CATALOG);
  const [tests, setTests] = useS([{ type:'', quantity:1, diagnosis:'' }]);
  const update = (i, k, v) => setTests(arr => arr.map((x, idx) => idx===i ? {...x, [k]:v} : x));
  const add = () => setTests(arr => [...arr, { type:'', quantity:1, diagnosis:'' }]);
  const remove = (i) => setTests(arr => arr.length>1 ? arr.filter((_,idx)=>idx!==i) : arr);
  const valid = tests.every(t => t.type);

  return (
    <ModalShell
      icon={IconBeaker} title="Solicitud de exámenes de laboratorio"
      subtitle={`${pet?.name} · ${pet?.specie} · Hoy, ${new Date().toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'})}`}
      onClose={onClose}
      footer={
        <>
          <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>
            Se vinculará a la consulta · {tests.length} examen{tests.length>1?'es':''}
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={onClose} style={qBtnGhost}>Cancelar</button>
            <button disabled={!valid} onClick={() => onSave({ date, tests })}
              style={{ ...qBtnPrimary, opacity: valid?1:0.5, cursor: valid?'pointer':'not-allowed' }}>
              Guardar solicitud
            </button>
          </div>
        </>
      }
    >
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:14, marginBottom:18 }}>
        <Field label="Fecha de toma" required>
          <DatePicker value={date} onChange={setDate} />
        </Field>
        <Field label="Sospecha clínica / motivo">
          <input placeholder="Ej. Decaimiento + vómitos · descartar pancreatitis" style={qInp}/>
        </Field>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>Exámenes solicitados</div>
        <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>{tests.length} en la lista</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {tests.map((t, i) => (
          <div key={i} style={itemCard}>
            <ItemHeader idx={i} title={t.type || 'Nuevo examen'} removable={tests.length>1} onRemove={()=>remove(i)} />
            <div style={{ display:'grid', gridTemplateColumns:'2fr 120px 2fr', gap:10 }}>
              <Field label="Tipo de examen" required>
                <SearchableSelect
                  value={t.type}
                  onChange={v => update(i,'type',v)}
                  placeholder="Seleccione un examen…"
                  options={catalog.map(c => ({ value:c.name, label:c.name, hint:c.description }))}
                  onCreate={(opt) => setCatalog(c => [...c, { name:opt.value, description:opt.hint || '' }])}
                  createLabel="Crear nuevo tipo de examen"
                />
              </Field>
              <Field label="Cantidad" required>
                <input type="number" min="1" value={t.quantity} onChange={e=>update(i,'quantity',e.target.value)} style={qInp}/>
              </Field>
              <Field label="Diagnóstico presuntivo / orientación">
                <input value={t.diagnosis} onChange={e=>update(i,'diagnosis',e.target.value)}
                  placeholder="Ej. Descartar IRC · evaluar función hepática" style={qInp}/>
              </Field>
            </div>
          </div>
        ))}
      </div>

      <button onClick={add} style={{
        marginTop:10, width:'100%', background:'transparent',
        border:`1.5px dashed ${flowTokens.borderStrong}`, borderRadius:10, padding:'10px 12px',
        fontSize:13, color:flowTokens.text, fontWeight:500, fontFamily:'inherit', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:7,
      }}><IconPlus size={14} /> Agregar otro examen</button>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════
// 2) IMAGEN DIAGNÓSTICA
// ════════════════════════════════════════════════════════
function ImagingModal({ pet, onClose, onSave }) {
  const today = new Date().toISOString().slice(0,10);
  const [date, setDate] = useS(today);
  const [type, setType] = useS('');
  const [imagingTypes, setImagingTypes] = useS(IMAGING_TYPES.map(t => ({ name:t, description:'' })));
  const [studyType, setStudyType] = useS('');
  const [clinicalSigns, setClinicalSigns] = useS('');
  const [diagnosis, setDiagnosis] = useS('');
  const [observations, setObservations] = useS('');
  const valid = type && clinicalSigns.length > 3;

  return (
    <ModalShell
      icon={IconImage} title="Imagen diagnóstica"
      subtitle={`${pet?.name} · ${pet?.specie} · Hoy, ${new Date().toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'})}`}
      onClose={onClose}
      footer={
        <>
          <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>
            {type ? `${type} · ${studyType || 'sin especificar región'}` : 'Selecciona tipo de estudio'}
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={onClose} style={qBtnGhost}>Cancelar</button>
            <button disabled={!valid} onClick={() => onSave({ date, type, studyType, clinicalSigns, diagnosis, observations })}
              style={{ ...qBtnPrimary, opacity:valid?1:0.5, cursor:valid?'pointer':'not-allowed' }}>
              Guardar estudio
            </button>
          </div>
        </>
      }
    >
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:14, marginBottom:18 }}>
        <Field label="Fecha" required>
          <DatePicker value={date} onChange={setDate} />
        </Field>
        <Field label="Tipo de estudio" required>
          <SearchableSelect
            value={type} onChange={setType}
            placeholder="Seleccione tipo de estudio…"
            options={imagingTypes.map(c => ({ value:c.name, label:c.name, hint:c.description }))}
            onCreate={(opt) => setImagingTypes(c => [...c, { name:opt.value, description:opt.hint || '' }])}
            createLabel="Crear nuevo tipo de estudio"
          />
        </Field>
      </div>

      <Field label="Región / proyección" hint="Ej. Tórax LL · Abdomen VD · Cadera">
        <input value={studyType} onChange={e=>setStudyType(e.target.value)}
          placeholder="Ej. Abdomen latero-lateral derecho" style={qInp}/>
      </Field>

      <div style={{ height:14 }} />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Signos clínicos" required hint="Motivo del estudio">
          <textarea value={clinicalSigns} onChange={e=>setClinicalSigns(e.target.value)} rows={3}
            placeholder="Ej. Disnea + tos seca · 5 días de evolución" style={qTxt}/>
        </Field>
        <Field label="Diagnóstico / hallazgos" hint="Si ya hay lectura del estudio">
          <textarea value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} rows={3}
            placeholder="Ej. Patrón intersticial difuso · sospecha de edema pulmonar" style={qTxt}/>
        </Field>
      </div>

      <Field label="Observaciones">
        <textarea value={observations} onChange={e=>setObservations(e.target.value)} rows={2}
          placeholder="Equipo utilizado, sedación, contraste, etc." style={qTxt}/>
      </Field>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════
// 3) VACUNACIÓN
// ════════════════════════════════════════════════════════
function VaccinationModal({ pet, onClose, onSave }) {
  const today = new Date().toISOString().slice(0,10);
  const nextYear = new Date(Date.now() + 365*864e5).toISOString().slice(0,10);
  const [date, setDate] = useS(today);
  const [items, setItems] = useS([{ type:'', laboratory:'', lot:'', notes:'', nextVaccination:nextYear }]);
  const [vaccineCatalog, setVaccineCatalog] = useS(VACCINE_CATALOG);
  const update = (i, k, v) => setItems(arr => arr.map((x, idx) => idx===i ? {...x, [k]:v} : x));
  const pick = (i, vac) => update(i, 'type', vac.name);
  const add = () => setItems(arr => [...arr, { type:'', laboratory:'', lot:'', notes:'', nextVaccination:nextYear }]);
  const remove = (i) => setItems(arr => arr.length>1 ? arr.filter((_,idx)=>idx!==i) : arr);
  const valid = items.every(v => v.type && v.lot && v.laboratory);

  return (
    <ModalShell
      icon={IconShield} title="Vacunación"
      subtitle={`${pet?.name} · ${pet?.specie} · Hoy, ${new Date().toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'})}`}
      onClose={onClose}
      footer={
        <>
          <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>
            Se actualizará el carnet de vacunación · {items.length} dosis
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={onClose} style={qBtnGhost}>Cancelar</button>
            <button disabled={!valid} onClick={() => onSave({ date, items })}
              style={{ ...qBtnPrimary, opacity:valid?1:0.5, cursor:valid?'pointer':'not-allowed' }}>
              Registrar dosis
            </button>
          </div>
        </>
      }
    >
      <Field label="Fecha de aplicación" required>
        <div style={{ maxWidth:220 }}><DatePicker value={date} onChange={setDate} /></div>
      </Field>

      <div style={{ height:18 }} />

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>Vacunas aplicadas</div>
        <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>{items.length} dosis</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {items.map((it, i) => (
          <div key={i} style={itemCard}>
            <ItemHeader idx={i} title={it.type || 'Nueva vacuna'} removable={items.length>1} onRemove={()=>remove(i)} />
            <Field label="Tipo de vacuna" required>
              <SearchableSelect
                value={it.type}
                onChange={v => update(i,'type',v)}
                placeholder="Seleccione vacuna…"
                options={vaccineCatalog.map(c => ({ value:c.name, label:c.name, hint:c.description }))}
                onCreate={(opt) => setVaccineCatalog(c => [...c, { name:opt.value, description:opt.hint || '', interval:365 }])}
                createLabel="Crear nueva vacuna"
              />
            </Field>
            <div style={{ height:10 }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
              <Field label="Laboratorio" required>
                <input value={it.laboratory} onChange={e=>update(i,'laboratory',e.target.value)}
                  placeholder="Ej. Zoetis · MSD · Virbac" style={qInp}/>
              </Field>
              <Field label="Lote" required>
                <input value={it.lot} onChange={e=>update(i,'lot',e.target.value)}
                  placeholder="Ej. ABX-2024-12" style={qInp}/>
              </Field>
              <Field label="Próxima dosis">
                <DatePicker value={it.nextVaccination} onChange={v=>update(i,'nextVaccination',v)} />
              </Field>
              <Field label="Vía / sitio">
                <input placeholder="Subcutánea · escapular izq." style={qInp}/>
              </Field>
            </div>
            <Field label="Notas">
              <input value={it.notes} onChange={e=>update(i,'notes',e.target.value)}
                placeholder="Reacciones, refuerzo, recordar al propietario..." style={qInp}/>
            </Field>
          </div>
        ))}
      </div>

      <button onClick={add} style={{
        marginTop:10, width:'100%', background:'transparent',
        border:`1.5px dashed ${flowTokens.borderStrong}`, borderRadius:10, padding:'10px 12px',
        fontSize:13, color:flowTokens.text, fontWeight:500, fontFamily:'inherit', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:7,
      }}><IconPlus size={14} /> Agregar otra vacuna</button>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════
// 4) HOSPITALIZACIÓN
// ════════════════════════════════════════════════════════
function HospitalizationModal({ pet, onClose, onSave }) {
  const today = new Date().toISOString().slice(0,10);
  const [type, setType] = useS('HOSPITALIZATION');
  const [startDate, setStartDate] = useS(today);
  const [endDate, setEndDate] = useS('');
  const [reasonLeaving, setReasonLeaving] = useS('');
  const [reason, setReason] = useS('');
  const [observations, setObservations] = useS('');
  const valid = type && reason.length > 3;

  return (
    <ModalShell
      icon={IconBed} title="Hospitalización"
      subtitle={`${pet?.name} · ${pet?.specie} · Internación o ambulatorio`}
      onClose={onClose}
      footer={
        <>
          <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>
            {type === 'HOSPITALIZATION' ? 'Se registrará la internación al confirmar' : 'Tratamiento ambulatorio · sin internación'}
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={onClose} style={qBtnGhost}>Cancelar</button>
            <button disabled={!valid} onClick={() => onSave({ type, startDate, endDate, reasonLeaving, reason, observations })}
              style={{ ...qBtnPrimary, opacity:valid?1:0.5, cursor:valid?'pointer':'not-allowed' }}>
              Registrar hospitalización
            </button>
          </div>
        </>
      }
    >
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Tipo" required>
          <select value={type} onChange={e=>setType(e.target.value)} style={{ ...qInp, cursor:'pointer' }}>
            <option value="HOSPITALIZATION">Hospitalización</option>
            <option value="OUTPATIENT">Ambulatorio</option>
          </select>
        </Field>
        <Field label="Motivo de salida" hint="Solo si el paciente ya egresó">
          <select value={reasonLeaving} onChange={e=>setReasonLeaving(e.target.value)} style={{ ...qInp, cursor:'pointer' }}>
            <option value="">— Aún hospitalizado —</option>
            <option value="MEDICAL_DISCHARGE">Alta médica</option>
            <option value="HOME_TREATMENT">Tratamiento en casa</option>
            <option value="TRANSFER">Traslado / derivación</option>
            <option value="TUTOR_WISH">Solicitud del tutor</option>
            <option value="ADMIN">Alta administrativa</option>
            <option value="DEATH">Fallecimiento</option>
            <option value="EUTHANASIA">Eutanasia</option>
          </select>
        </Field>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Fecha de ingreso" required>
          <DatePicker value={startDate} onChange={setStartDate} />
        </Field>
        <Field label="Fecha de salida" hint="Real · si ya egresó">
          <DatePicker value={endDate} onChange={setEndDate} />
        </Field>
      </div>

      <Field label="Motivo de internación" required hint="Cuadro clínico que justifica la hospitalización">
        <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3}
          placeholder="Ej. Pancreatitis aguda con vómitos persistentes · requiere fluidoterapia y monitoreo" style={qTxt}/>
      </Field>

      <div style={{ height:14 }} />

      <Field label="Indicaciones / observaciones" hint="Plan de manejo, medicación, monitoreo">
        <textarea value={observations} onChange={e=>setObservations(e.target.value)} rows={4}
          placeholder="Ej. Ringer 60 ml/kg/día · Maropitant 1 mg/kg SC c/24h · control glicemia c/4h" style={qTxt}/>
      </Field>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════
// 5) DESPARASITACIÓN
// ════════════════════════════════════════════════════════
function DewormingModal({ pet, onClose, onSave }) {
  const today = new Date().toISOString().slice(0,10);
  const next3mo = new Date(Date.now() + 90*864e5).toISOString().slice(0,10);
  const [date, setDate] = useS(today);
  const [type, setType] = useS('INTERNAL');
  const [product, setProduct] = useS('');
  const [dosage, setDosage] = useS('');
  const [lastDeworming, setLastDeworming] = useS('');
  const [nextControl, setNextControl] = useS(next3mo);
  const [observations, setObservations] = useS('');
  const valid = product && dosage;

  return (
    <ModalShell
      icon={IconBug} title="Desparasitación"
      subtitle={`${pet?.name} · ${pet?.specie}`}
      onClose={onClose}
      footer={
        <>
          <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>
            Recordatorio próximo control: {new Date(nextControl).toLocaleDateString('es-PE')}
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={onClose} style={qBtnGhost}>Cancelar</button>
            <button disabled={!valid} onClick={() => onSave({ date, type, product, dosage, lastDeworming, nextControl, observations })}
              style={{ ...qBtnPrimary, opacity:valid?1:0.5, cursor:valid?'pointer':'not-allowed' }}>
              Registrar desparasitación
            </button>
          </div>
        </>
      }
    >
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Tipo" required>
          <PillSelector
            options={[
              { value:'INTERNAL', label:'Interna' },
              { value:'EXTERNAL', label:'Externa' },
              { value:'MIX', label:'Mixta' },
              { value:'OTHER', label:'Otra' },
            ]}
            value={type} onChange={setType}
          />
        </Field>
        <Field label="Fecha" required>
          <DatePicker value={date} onChange={setDate} />
        </Field>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Producto" required hint="Nombre comercial + principio activo">
          <input value={product} onChange={e=>setProduct(e.target.value)}
            placeholder="Ej. Drontal Plus · Praziquantel + Pirantel" style={qInp}/>
        </Field>
        <Field label="Dosis" required>
          <input value={dosage} onChange={e=>setDosage(e.target.value)}
            placeholder="Ej. 1 comp./10 kg VO" style={qInp}/>
        </Field>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Field label="Última desparasitación" hint="Si se conoce">
          <DatePicker value={lastDeworming} onChange={setLastDeworming} />
        </Field>
        <Field label="Próximo control" required>
          <DatePicker value={nextControl} onChange={setNextControl} />
        </Field>
      </div>

      <Field label="Observaciones">
        <textarea value={observations} onChange={e=>setObservations(e.target.value)} rows={2}
          placeholder="Tolerancia, efectos adversos, cambios de protocolo..." style={qTxt}/>
      </Field>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════
// 6) CIRUGÍA
// ════════════════════════════════════════════════════════
function SurgeryModal({ pet, onClose, onSave }) {
  const today = new Date().toISOString().slice(0,10);
  const [date, setDate] = useS(today);
  const [surgeryType, setSurgeryType] = useS('');
  const [surgeryCatalog, setSurgeryCatalog] = useS(SURGERY_CATALOG.map(s => ({ name:s, description:'' })));
  const [description, setDescription] = useS('');
  const [medicament, setMedicament] = useS('');
  const [observations, setObservations] = useS('');
  const [complications, setComplications] = useS('');
  const valid = surgeryType && description.length > 3;

  return (
    <ModalShell
      icon={IconScalpel} title="Cirugía"
      subtitle={`${pet?.name} · ${pet?.specie} · Programación o registro post-operatorio`}
      onClose={onClose}
      footer={
        <>
          <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>
            Se generará el consentimiento informado al guardar
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={onClose} style={qBtnGhost}>Cancelar</button>
            <button disabled={!valid} onClick={() => onSave({ date, surgeryType, description, medicament, observations, complications })}
              style={{ ...qBtnPrimary, opacity:valid?1:0.5, cursor:valid?'pointer':'not-allowed' }}>
              Registrar cirugía
            </button>
          </div>
        </>
      }
    >
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:14, marginBottom:14 }}>
        <Field label="Fecha programada" required>
          <DatePicker value={date} onChange={setDate} />
        </Field>
        <Field label="Tipo de cirugía" required>
          <SearchableSelect
            value={surgeryType} onChange={setSurgeryType}
            placeholder="Seleccione tipo de cirugía…"
            options={surgeryCatalog.map(c => ({ value:c.name, label:c.name, hint:c.description }))}
            onCreate={(opt) => setSurgeryCatalog(c => [...c, { name:opt.value, description:opt.hint || '' }])}
            createLabel="Crear nuevo tipo de cirugía"
          />
        </Field>
      </div>

      <Field label="Descripción del procedimiento" required hint="Técnica quirúrgica · enfoque">
        <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3}
          placeholder="Ej. Ovariohisterectomía por línea media · abordaje convencional" style={qTxt}/>
      </Field>

      <div style={{ height:14 }} />

      <Field label="Anestesia / medicación quirúrgica" hint="Pre, trans y post-operatorio">
        <textarea value={medicament} onChange={e=>setMedicament(e.target.value)} rows={3}
          placeholder="Ej. Premed: Acepromacina + Butorfanol IM · Inducción: Propofol IV · Mantenimiento: Isoflurano" style={qTxt}/>
      </Field>

      <div style={{ height:14 }} />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <Field label="Observaciones">
          <textarea value={observations} onChange={e=>setObservations(e.target.value)} rows={3}
            placeholder="Hallazgos intraoperatorios, suturas, drenajes..." style={qTxt}/>
        </Field>
        <Field label="Complicaciones" hint="Si las hubo">
          <textarea value={complications} onChange={e=>setComplications(e.target.value)} rows={3}
            placeholder="Ej. Sangrado leve en pedículo ovárico · controlado con ligadura adicional" style={qTxt}/>
        </Field>
      </div>
    </ModalShell>
  );
}

Object.assign(window, {
  LabTestModal, ImagingModal, VaccinationModal,
  HospitalizationModal, DewormingModal, SurgeryModal,
});
