// Flujos independientes · Shell, primitives + PatientPicker
// Reutiliza el mismo lenguaje visual (sidebar amatista, header con título serif)

const { useState: useS, useMemo: useM } = React;

// ─── Shell con sidebar y header ───────────────────────────────
function FlowShell({ activeId, onNav, title, eyebrow, subtitle, primaryCta, children }) {
  const navItems = [
    { id:'lab',     label:'Examen laboratorio' },
    { id:'imaging', label:'Imagen diagnóstica' },
    { id:'vaccine', label:'Vacunación' },
    { id:'hosp',    label:'Hospitalización' },
    { id:'deworm',  label:'Desparasitación' },
    { id:'surgery', label:'Cirugía' },
  ];

  return (
    <div style={{
      width:'100%', height:'100%', display:'flex',
      background:'var(--warm-100)', color:'var(--warm-900)',
      fontFamily:'Geist, sans-serif', overflow:'hidden',
    }}>
      <aside style={{
        width: 248, flexShrink: 0,
        background:'linear-gradient(180deg, oklch(28% 0.10 var(--hue)) 0%, oklch(22% 0.08 var(--hue)) 100%)',
        color: 'oklch(94% 0.02 var(--hue))', padding:'20px 14px',
        display:'flex', flexDirection:'column', gap:2,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 8px 18px' }}>
          <div style={{
            width:30, height:30, borderRadius:8,
            background:'oklch(72% 0.16 var(--hue))', color:'oklch(20% 0.05 var(--hue))',
            display:'grid', placeItems:'center', fontWeight:700, fontSize:15,
            fontFamily:'Instrument Serif, serif', fontStyle:'italic',
          }}>V</div>
          <div>
            <div style={{ fontSize:15, fontWeight:600 }}>Vetrina</div>
            <div style={{ fontSize:11, opacity:0.55, letterSpacing:'0.06em', textTransform:'uppercase' }}>Clínica Norte</div>
          </div>
        </div>

        <div style={navLabel}>Acciones clínicas</div>
        {navItems.map(item => {
          const active = item.id === activeId;
          return (
            <div key={item.id} onClick={() => onNav(item.id)} style={{
              display:'flex', alignItems:'center', gap:11,
              padding:'9px 10px', borderRadius:8, fontSize:13.5,
              color: active ? 'oklch(98% 0.01 var(--hue))' : 'oklch(88% 0.03 var(--hue) / 0.85)',
              background: active ? 'oklch(45% 0.16 var(--hue) / 0.4)' : 'transparent',
              boxShadow: active ? '0 0 0 1px oklch(70% 0.14 var(--hue) / 0.3) inset' : 'none',
              cursor:'pointer', fontWeight: active ? 500 : 400,
            }}>
              {item.label}
            </div>
          );
        })}

        <div style={{ marginTop:'auto', fontSize:11, opacity:0.55, padding:'10px 8px' }}>
          Recetas solo dentro de Nueva Consulta
        </div>
      </aside>

      <main style={{ flex:1, display:'flex', flexDirection:'column', position:'relative', minWidth:0 }}>
        <div style={{ padding:'28px 40px 0' }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24 }}>
            <div>
              <div style={{ fontSize:11.5, color:'var(--warm-500)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6, fontWeight:500 }}>
                {eyebrow}
              </div>
              <h1 style={{
                fontFamily:'Instrument Serif, serif', fontSize:38, fontWeight:400,
                letterSpacing:'-0.015em', color:'var(--warm-900)', margin:0, lineHeight:1.05,
              }}>{title}</h1>
              {subtitle && <div style={{ fontSize:13.5, color:'var(--warm-600)', marginTop:6 }}>{subtitle}</div>}
            </div>
            {primaryCta}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

// ─── Primitives ──────────────────────────────────────────────
function StatusPill({ status }) {
  const cfg = STATUS_LABELS[status] || { bg:'var(--warm-200)', fg:'var(--warm-700)', label:status };
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'3px 9px', borderRadius:999,
      background:cfg.bg, color:cfg.fg,
      fontSize:11.5, fontWeight:500,
    }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor', opacity:0.7 }} />
      {cfg.label}
    </span>
  );
}

function PatientCell({ patientId }) {
  const p = findPatient(patientId);
  if (!p) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
      <div style={{
        width:32, height:32, borderRadius:9,
        background:'var(--amatista-100)', color:'var(--amatista-700)',
        display:'grid', placeItems:'center', fontWeight:600, fontSize:12,
        flexShrink:0,
      }}>{p.initials}</div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13.5, fontWeight:500, color:'var(--warm-900)' }}>{p.name}</div>
        <div style={{ fontSize:11.5, color:'var(--warm-500)' }}>{p.specie} · {p.owner}</div>
      </div>
    </div>
  );
}

function PrimaryBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'10px 16px', fontSize:13.5, fontWeight:500,
      background:'linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)))',
      color:'white', border:'none', borderRadius:9,
      cursor:'pointer', fontFamily:'inherit',
      boxShadow:'0 1px 2px rgba(50,20,80,0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5)',
    }}>{children}</button>
  );
}

function GhostBtn({ onClick, children, style }) {
  return (
    <button onClick={onClick} style={{
      padding:'8px 14px', fontSize:13,
      background:'var(--warm-50)', color:'var(--warm-700)',
      border:'1px solid var(--warm-200)', borderRadius:8,
      cursor:'pointer', fontFamily:'inherit',
      ...style,
    }}>{children}</button>
  );
}

// ─── PatientPicker · usado en todos los modales ──────────────
function PatientPicker({ value, onChange }) {
  const [open, setOpen] = useS(false);
  const [q, setQ] = useS('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const selected = findPatient(value);
  const filtered = q
    ? PATIENTS.filter(p => (p.name + ' ' + p.owner + ' ' + p.breed).toLowerCase().includes(q.toLowerCase()))
    : PATIENTS;

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        ...inp, cursor:'pointer', textAlign:'left',
        display:'flex', alignItems:'center', gap:10, padding:'6px 10px',
      }}>
        {selected ? (
          <>
            <div style={{
              width:26, height:26, borderRadius:7,
              background:'var(--amatista-100)', color:'var(--amatista-700)',
              display:'grid', placeItems:'center', fontWeight:600, fontSize:11,
            }}>{selected.initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--warm-900)' }}>{selected.name}</div>
              <div style={{ fontSize:11.5, color:'var(--warm-500)' }}>{selected.owner} · {selected.specie}</div>
            </div>
          </>
        ) : (
          <span style={{ color:'var(--warm-500)', fontSize:13.5, padding:'2px 0' }}>Buscar y seleccionar paciente…</span>
        )}
        <span style={{ color:'var(--warm-500)', fontSize:11, marginLeft:'auto' }}>▾</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:20,
          background:'var(--warm-50)', border:'1px solid var(--warm-300)',
          borderRadius:10, boxShadow:'0 12px 30px rgba(0,0,0,0.12)', overflow:'hidden',
        }}>
          <div style={{ padding:8, borderBottom:'1px solid var(--warm-200)' }}>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
              placeholder="Buscar por mascota, propietario o raza…"
              style={{ ...inp, padding:'7px 10px', fontSize:12.5 }}/>
          </div>
          <div style={{ maxHeight:280, overflow:'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding:'12px', fontSize:12.5, color:'var(--warm-500)' }}>Sin coincidencias</div>
            )}
            {filtered.map(p => (
              <div key={p.id} onMouseDown={() => { onChange(p.id); setOpen(false); setQ(''); }}
                style={{
                  padding:'10px 12px', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:10,
                  background: p.id === value ? 'var(--amatista-50)' : 'transparent',
                  borderBottom:'1px solid var(--warm-150)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--amatista-50)'}
                onMouseLeave={e => e.currentTarget.style.background = p.id === value ? 'var(--amatista-50)' : 'transparent'}
              >
                <div style={{
                  width:30, height:30, borderRadius:8,
                  background:'var(--amatista-100)', color:'var(--amatista-700)',
                  display:'grid', placeItems:'center', fontWeight:600, fontSize:12,
                }}>{p.initials}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{p.name}</div>
                  <div style={{ fontSize:11.5, color:'var(--warm-500)' }}>{p.owner} · {p.specie} · {p.breed} · {p.weight}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SearchableSelect (catálogos con creación inline) ───────
function SearchableSelect({ value, options, onChange, placeholder, onCreate, createLabel }) {
  const norm = options.map(o => typeof o === 'string' ? { value:o, label:o } : o);
  const [open, setOpen] = useS(false);
  const [q, setQ] = useS('');
  const [creating, setCreating] = useS(false);
  const [newName, setNewName] = useS('');
  const [newHint, setNewHint] = useS('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setCreating(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const selected = norm.find(o => o.value === value);
  const filtered = q ? norm.filter(o => (o.label + ' ' + (o.hint||'')).toLowerCase().includes(q.toLowerCase())) : norm;
  const showCreate = onCreate && !creating;
  const startCreate = () => { setNewName(q); setNewHint(''); setCreating(true); };
  const confirmCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate({ value:name, label:name, hint:newHint.trim() || undefined });
    onChange(name);
    setCreating(false); setOpen(false); setQ(''); setNewName(''); setNewHint('');
  };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        ...inp, cursor:'pointer', textAlign:'left',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
        color: selected ? 'var(--warm-900)' : 'var(--warm-500)',
      }}>
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {selected ? selected.label : (placeholder || 'Seleccione…')}
        </span>
        <span style={{ color:'var(--warm-500)', fontSize:11 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:20,
          background:'var(--warm-50)', border:'1px solid var(--warm-300)',
          borderRadius:10, boxShadow:'0 12px 30px rgba(0,0,0,0.12)', overflow:'hidden',
        }}>
          {!creating && (
            <>
              <div style={{ padding:8, borderBottom:'1px solid var(--warm-200)' }}>
                <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
                  placeholder="Buscar…" style={{ ...inp, padding:'7px 10px', fontSize:12.5 }}/>
              </div>
              <div style={{ maxHeight:220, overflow:'auto' }}>
                {filtered.length === 0 && (
                  <div style={{ padding:'10px 12px', fontSize:12, color:'var(--warm-500)' }}>Sin coincidencias</div>
                )}
                {filtered.map(o => (
                  <div key={o.value} onMouseDown={() => { onChange(o.value); setOpen(false); setQ(''); }}
                    style={{
                      padding:'9px 12px', cursor:'pointer', fontSize:12.5,
                      background: o.value === value ? 'var(--amatista-50)' : 'transparent',
                      borderBottom:'1px solid var(--warm-150)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--amatista-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = o.value === value ? 'var(--amatista-50)' : 'transparent'}
                  >
                    <div style={{ fontWeight: o.value === value ? 500 : 400 }}>{o.label}</div>
                    {o.hint && <div style={{ color:'var(--warm-500)', fontSize:11.5, marginTop:2 }}>{o.hint}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
          {showCreate && (
            <button type="button" onClick={(e) => { e.stopPropagation(); startCreate(); }} style={{
              width:'100%', textAlign:'left', padding:'11px 14px',
              background:'var(--amatista-100)', color:'var(--amatista-700)',
              border:'none', borderTop:'1px solid var(--warm-200)',
              fontSize:13, fontWeight:500, fontFamily:'inherit', cursor:'pointer',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span style={{
                width:18, height:18, borderRadius:'50%', background:'var(--amatista-700)', color:'white',
                display:'inline-grid', placeItems:'center', fontSize:13, lineHeight:1, fontWeight:600,
              }}>+</span>
              {q ? <>Crear <span style={{ fontWeight:600 }}>"{q}"</span></> : (createLabel || 'Crear nuevo')}
            </button>
          )}
          {creating && (
            <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10, background:'var(--amatista-50)' }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{createLabel || 'Crear nuevo'}</div>
              <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter' && newName.trim()){ e.preventDefault(); confirmCreate(); } if(e.key==='Escape'){ setCreating(false); } }}
                placeholder="Nombre" style={{ ...inp, padding:'8px 10px', fontSize:13 }}/>
              <input value={newHint} onChange={e=>setNewHint(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter' && newName.trim()){ e.preventDefault(); confirmCreate(); } if(e.key==='Escape'){ setCreating(false); } }}
                placeholder="Descripción (opcional)" style={{ ...inp, padding:'8px 10px', fontSize:13 }}/>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={(e)=>{ e.stopPropagation(); setCreating(false); }} style={smallGhost}>Cancelar</button>
                <button type="button" onClick={(e)=>{ e.stopPropagation(); confirmCreate(); }} disabled={!newName.trim()} style={{
                  ...smallPrimary, opacity: newName.trim()?1:0.5, cursor: newName.trim()?'pointer':'not-allowed',
                }}>Crear y seleccionar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DatePicker estilizado ───────────────────────────────────
function DatePicker({ value, onChange }) {
  const ref = React.useRef(null);
  const display = value
    ? new Date(value + 'T00:00').toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })
    : '';
  const open = () => { try { ref.current?.showPicker?.(); } catch(e) {} ref.current?.focus(); };
  return (
    <div onClick={open} style={{
      ...inp, padding:0, cursor:'pointer',
      display:'flex', alignItems:'center', gap:8, position:'relative', overflow:'hidden',
    }}>
      <div style={{
        padding:'8px 10px', color:'var(--amatista-700)',
        background:'var(--amatista-100)', borderRight:'1px solid var(--warm-200)',
        display:'flex', alignItems:'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div>
      <span style={{ flex:1, padding:'8px 0', fontSize:13.5, color: display ? 'var(--warm-900)' : 'var(--warm-500)' }}>
        {display || 'Seleccionar fecha'}
      </span>
      <input ref={ref} type="date" value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}
      />
    </div>
  );
}

// ─── Field wrapper ──────────────────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:12, fontWeight:500, color:'var(--warm-900)', display:'flex', gap:4 }}>
        {label}
        {required && <span style={{ color:'oklch(55% 0.18 25)' }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize:11.5, color:'var(--warm-500)' }}>{hint}</div>}
    </div>
  );
}

// ─── ModalShell ─────────────────────────────────────────────
function ModalShell({ title, subtitle, icon, onClose, children, footer }) {
  return (
    <>
      <div onClick={onClose} style={{
        position:'absolute', inset:0, background:'oklch(15% 0.05 var(--hue) / 0.45)',
        backdropFilter:'blur(2px)', zIndex:50,
      }} />
      <div style={{
        position:'absolute', top:'10%', left:'10%', right:'10%', bottom:'10%',
        background:'var(--warm-50)', borderRadius:16,
        boxShadow:'0 30px 80px oklch(15% 0.05 var(--hue) / 0.3)',
        display:'flex', flexDirection:'column', zIndex:51, overflow:'hidden',
        fontFamily:'Geist, sans-serif', color:'var(--warm-900)',
      }}>
        <div style={{
          padding:'18px 26px', borderBottom:'1px solid var(--warm-200)',
          display:'flex', alignItems:'center', gap:14, flexShrink:0,
        }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:'var(--amatista-700)', color:'white',
            display:'grid', placeItems:'center', fontSize:18,
          }}>{icon}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Instrument Serif, serif', fontSize:22, lineHeight:1.1 }}>{title}</div>
            {subtitle && <div style={{ fontSize:12.5, color:'var(--warm-600)', marginTop:2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{
            background:'transparent', border:'none', cursor:'pointer',
            color:'var(--warm-600)', padding:8, borderRadius:8, fontSize:18,
          }}>×</button>
        </div>
        <div style={{ padding:'22px 28px', overflow:'auto', flex:1 }}>{children}</div>
        <div style={{
          padding:'14px 26px', borderTop:'1px solid var(--warm-200)',
          background:'var(--warm-100)', display:'flex', alignItems:'center', gap:10,
        }}>{footer}</div>
      </div>
    </>
  );
}

// ─── Toast ──────────────────────────────────────────────────
function Toast({ msg, onDismiss }) {
  React.useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position:'absolute', bottom:24, right:24, zIndex:100,
      padding:'12px 18px', borderRadius:10,
      background:'var(--warm-900)', color:'var(--warm-50)',
      fontSize:13, boxShadow:'0 12px 30px rgba(0,0,0,0.25)',
      display:'flex', alignItems:'center', gap:10,
    }}>
      <span style={{ color:'oklch(70% 0.16 150)' }}>✓</span>
      {msg}
    </div>
  );
}

// ─── styles ─────────────────────────────────────────────────
const inp = {
  width:'100%', background:'var(--warm-50)',
  border:'1px solid var(--warm-200)', borderRadius:8,
  padding:'8px 12px', fontSize:13.5, fontFamily:'inherit', color:'var(--warm-900)', outline:'none',
};
const txt = { ...inp, lineHeight:1.55, resize:'vertical' };
const smallGhost = {
  background:'transparent', border:'1px solid var(--warm-200)',
  padding:'6px 10px', borderRadius:7, fontSize:12, fontWeight:500,
  fontFamily:'inherit', color:'var(--warm-700)', cursor:'pointer',
};
const smallPrimary = {
  background:'var(--amatista-700)', color:'white',
  border:'none', padding:'6px 10px', borderRadius:7,
  fontSize:12, fontWeight:500, fontFamily:'inherit', cursor:'pointer',
};
const navLabel = {
  fontSize:10.5, letterSpacing:'0.1em', textTransform:'uppercase',
  color:'oklch(75% 0.04 var(--hue) / 0.55)', padding:'14px 10px 8px',
};

const tableHead = {
  display:'flex', alignItems:'center', gap:16,
  padding:'12px 18px', background:'var(--warm-100)',
  borderBottom:'1px solid var(--warm-200)',
  fontSize:11.5, letterSpacing:'0.06em', textTransform:'uppercase',
  color:'var(--warm-500)', fontWeight:500,
};
const tableRow = {
  display:'flex', alignItems:'center', gap:16,
  padding:'13px 18px', borderBottom:'1px solid var(--warm-150)',
  cursor:'pointer',
};

Object.assign(window, {
  FlowShell, StatusPill, PatientCell, PrimaryBtn, GhostBtn,
  PatientPicker, SearchableSelect, DatePicker, Field,
  ModalShell, Toast, inp, txt, tableHead, tableRow,
});
