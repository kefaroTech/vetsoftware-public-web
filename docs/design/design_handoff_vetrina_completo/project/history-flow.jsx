// Flujo completo: Propietario → Mascota → Historia clínica (timeline de eventos)

const { useState: useS, useMemo: useM } = React;

function Shell({ children, step, owner, pet, onJump }) {
  return (
    <div style={{
      width:'100%', height:'100%', display:'flex',
      background:'var(--warm-100)', color:'var(--warm-900)',
      fontFamily:'Geist, sans-serif', overflow:'hidden',
    }}>
      <aside style={{
        width:230, flexShrink:0,
        background:'linear-gradient(180deg, oklch(28% 0.10 var(--hue)) 0%, oklch(22% 0.08 var(--hue)) 100%)',
        color:'oklch(94% 0.02 var(--hue))', padding:'18px 12px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 8px 18px' }}>
          <div style={{
            width:28, height:28, borderRadius:7,
            background:'oklch(72% 0.16 var(--hue))', color:'oklch(20% 0.05 var(--hue))',
            display:'grid', placeItems:'center', fontWeight:700,
            fontFamily:'Instrument Serif, serif', fontStyle:'italic',
          }}>V</div>
          <div style={{ fontSize:14, fontWeight:600 }}>Vetrina</div>
        </div>
        <div style={{ fontSize:10.5, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.55, padding:'10px 10px 6px' }}>Clínica</div>
        <div style={{
          padding:'8px 10px', fontSize:13, borderRadius:7,
          background:'oklch(45% 0.16 var(--hue) / 0.4)', fontWeight:500,
          boxShadow:'0 0 0 1px oklch(70% 0.14 var(--hue) / 0.3) inset',
        }}>Historia clínica</div>
      </aside>
      <main style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, position:'relative' }}>
        <header style={{
          height:56, padding:'0 28px',
          borderBottom:'1px solid var(--warm-200)',
          background:'var(--warm-50)',
          display:'flex', alignItems:'center', gap:8,
          flexShrink:0,
        }}>
          <Crumb label="Propietario" active={step===1} done={step>1} value={owner?.name} onClick={() => onJump(1)} />
          <Sep />
          <Crumb label="Mascota" active={step===2} done={step>2} value={pet?.name} onClick={() => pet && onJump(2)} disabled={!owner} />
          <Sep />
          <Crumb label="Historia clínica" active={step===3} done={false} value={null} disabled={!pet} />
        </header>
        {children}
      </main>
    </div>
  );
}

function Crumb({ label, value, active, done, onClick, disabled }) {
  return (
    <button onClick={!disabled ? onClick : undefined} disabled={disabled} style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'6px 10px', borderRadius:7,
      border:'none', fontFamily:'inherit',
      background: active ? 'var(--amatista-50)' : 'transparent',
      color: active ? 'var(--amatista-700)' : done ? 'var(--warm-700)' : 'var(--warm-500)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontSize:13,
    }}>
      <span style={{
        width:18, height:18, borderRadius:'50%',
        background: active ? 'var(--amatista-700)' : done ? 'var(--amatista-200)' : 'var(--warm-200)',
        color: active ? 'white' : done ? 'var(--amatista-700)' : 'var(--warm-500)',
        display:'grid', placeItems:'center', fontSize:10, fontWeight:600,
      }}>{done ? '✓' : (label === 'Propietario' ? 1 : label === 'Mascota' ? 2 : 3)}</span>
      <span style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
      {value && <span style={{ color:'var(--warm-500)', fontWeight:400 }}>· {value}</span>}
    </button>
  );
}

function Sep() { return <span style={{ color:'var(--warm-300)', fontSize:11 }}>›</span>; }

// ─── Step 1: Propietario ─────────────────────────────────
function OwnerStep({ onSelect }) {
  const [q, setQ] = useS('');
  const filtered = OWNERS.filter(o =>
    !q || (o.name + ' ' + o.document + ' ' + o.email + ' ' + o.phone).toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div style={{ flex:1, overflow:'auto', padding:'32px 40px', maxWidth:900, width:'100%', margin:'0 auto' }}>
      <div style={{
        fontSize:11.5, color:'var(--warm-500)', letterSpacing:'0.06em', textTransform:'uppercase',
        fontWeight:500, marginBottom:6,
      }}>Paso 1 de 3</div>
      <h1 style={titleS}>¿De quién es la mascota?</h1>
      <div style={{ fontSize:13.5, color:'var(--warm-600)', marginTop:6, marginBottom:22 }}>
        Busca al propietario por nombre, documento, email o teléfono.
      </div>

      <div style={{
        background:'var(--warm-50)', border:'1px solid var(--warm-200)', borderRadius:12,
        padding:'14px 16px', marginBottom:14,
      }}>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Carla, DNI 41…, +51 987…"
          style={{
            width:'100%', border:'none', outline:'none',
            background:'transparent', fontSize:15, fontFamily:'inherit',
            color:'var(--warm-900)',
          }} />
      </div>

      <div style={{
        background:'var(--warm-50)', border:'1px solid var(--warm-200)', borderRadius:12, overflow:'hidden',
      }}>
        {filtered.length === 0 && (
          <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--warm-500)', fontSize:13.5 }}>
            Sin coincidencias para "<strong>{q}</strong>"
          </div>
        )}
        {filtered.map((o, i) => (
          <button key={o.id} onClick={() => onSelect(o)} style={{
            display:'flex', alignItems:'center', gap:14, width:'100%',
            padding:'14px 18px', textAlign:'left',
            background: i % 2 === 0 ? 'transparent' : 'oklch(98% 0.005 60)',
            border:'none', borderBottom: i < filtered.length - 1 ? '1px solid var(--warm-150)' : 'none',
            cursor:'pointer', fontFamily:'inherit',
          }}>
            <div style={{
              width:40, height:40, borderRadius:11,
              background:'var(--amatista-100)', color:'var(--amatista-700)',
              display:'grid', placeItems:'center', fontWeight:600, fontSize:13,
            }}>{o.initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14.5, fontWeight:500, color:'var(--warm-900)' }}>{o.name}</div>
              <div style={{ fontSize:12, color:'var(--warm-500)', marginTop:2 }}>
                {o.document} · {o.phone} · {o.email}
              </div>
            </div>
            <span style={{
              padding:'3px 9px', borderRadius:999,
              background:'var(--warm-200)', color:'var(--warm-700)',
              fontSize:11.5, fontWeight:500,
            }}>{o.petsCount} {o.petsCount === 1 ? 'mascota' : 'mascotas'}</span>
            <span style={{ color:'var(--warm-400)', fontSize:14 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Mascota ─────────────────────────────────────
function PetStep({ owner, onSelect, onBack }) {
  const pets = PETS.filter(p => p.ownerId === owner.id);
  return (
    <div style={{ flex:1, overflow:'auto', padding:'32px 40px', maxWidth:1000, width:'100%', margin:'0 auto' }}>
      <button onClick={onBack} style={backBtn}>← Cambiar propietario</button>
      <div style={{ fontSize:11.5, color:'var(--warm-500)', letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:500, marginBottom:6, marginTop:14 }}>
        Paso 2 de 3 · {owner.name}
      </div>
      <h1 style={titleS}>¿Qué mascota quieres consultar?</h1>
      <div style={{ fontSize:13.5, color:'var(--warm-600)', marginTop:6, marginBottom:22 }}>
        {pets.length} {pets.length === 1 ? 'mascota registrada' : 'mascotas registradas'} a nombre de {owner.name.split(' ')[0]}.
      </div>

      <div style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12,
      }}>
        {pets.map(p => (
          <button key={p.id} onClick={() => onSelect(p)} style={petCard}>
            <div style={{
              width:48, height:48, borderRadius:12,
              background:'var(--amatista-100)', color:'var(--amatista-700)',
              display:'grid', placeItems:'center', fontWeight:600, fontSize:15,
            }}>{p.initials}</div>
            <div style={{ flex:1, textAlign:'left' }}>
              <div style={{ fontSize:15, fontWeight:500, color:'var(--warm-900)' }}>{p.name}</div>
              <div style={{ fontSize:12, color:'var(--warm-500)', marginTop:3 }}>
                {p.specie} · {p.breed}
              </div>
              <div style={{ fontSize:12, color:'var(--warm-600)', marginTop:6 }}>
                <span style={{ color:'var(--warm-500)' }}>Sexo:</span> {p.sex === 'F' ? 'Hembra' : 'Macho'}
                <span style={{ color:'var(--warm-300)', margin:'0 6px' }}>·</span>
                <span style={{ color:'var(--warm-500)' }}>Edad:</span> {p.age}
              </div>
              <div style={{ fontSize:12, color:'var(--warm-600)', marginTop:2 }}>
                <span style={{ color:'var(--warm-500)' }}>Peso:</span> {p.weight}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Historia clínica ────────────────────────────
function HistoryStep({ owner, pet, onBack }) {
  const events = (EVENTS_BY_PET[pet.id] || []).slice().sort((a,b) => b.eventDate.localeCompare(a.eventDate));
  const [filter, setFilter] = useS('ALL');
  const [q, setQ] = useS('');

  const types = useM(() => {
    const counts = {};
    events.forEach(e => { counts[e.eventType] = (counts[e.eventType] || 0) + 1; });
    return Object.entries(counts).map(([t, c]) => ({ type:t, count:c }));
  }, [events]);

  const filtered = events.filter(e => {
    if (filter !== 'ALL' && e.eventType !== filter) return false;
    if (q && !(e.summary.toLowerCase().includes(q.toLowerCase()) || EVENT_TYPES[e.eventType].label.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  // group by month
  const grouped = useM(() => {
    const map = new Map();
    filtered.forEach(e => {
      const key = e.eventDate.slice(0,7);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div style={{ flex:1, overflow:'auto' }}>
      {/* Sub-header con datos paciente */}
      <div style={{
        padding:'24px 36px',
        background:'linear-gradient(180deg, var(--amatista-50), var(--warm-50))',
        borderBottom:'1px solid var(--warm-200)',
      }}>
        <button onClick={onBack} style={backBtn}>← Cambiar mascota</button>
        <div style={{ display:'flex', alignItems:'flex-start', gap:18, marginTop:14 }}>
          <div style={{
            width:72, height:72, borderRadius:18,
            background:'var(--amatista-200)', color:'var(--amatista-700)',
            display:'grid', placeItems:'center', fontWeight:600, fontSize:22,
            flexShrink:0,
          }}>{pet.initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <h1 style={{ ...titleS, fontSize:32, lineHeight:1.1, margin:0 }}>{pet.name}</h1>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:6, flexWrap:'wrap' }}>
              <Pill>{pet.specie}</Pill>
              <Pill>{pet.breed}</Pill>
              <Pill>{pet.sex === 'F' ? 'Hembra' : 'Macho'}</Pill>
              <Pill>{pet.age}</Pill>
              <Pill>{pet.weight}</Pill>
              <Pill>{pet.color}</Pill>
            </div>
            <div style={{ fontSize:13, color:'var(--warm-600)', marginTop:8 }}>
              Propietario: <strong style={{ color:'var(--warm-900)' }}>{owner.name}</strong> · {owner.phone}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={ghostBtn}>Exportar PDF</button>
            <button style={primaryBtn}>+ Nueva consulta</button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ padding:'18px 36px 0' }}>
        {/* Chips de filtro por tipo */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
          <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')}
            label={`Todos · ${events.length}`} />
          {types.map(({ type, count }) => {
            const t = EVENT_TYPES[type];
            return (
              <FilterChip key={type}
                active={filter === type} onClick={() => setFilter(type)}
                color={t.color} icon={t.icon}
                label={`${t.label} · ${count}`} />
            );
          })}
        </div>

        {/* Search */}
        <div style={{
          padding:'10px 12px', marginBottom:18,
          background:'var(--warm-50)', border:'1px solid var(--warm-200)', borderRadius:10,
        }}>
          <input value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Buscar en eventos…"
            style={{
              width:'100%', border:'none', outline:'none',
              background:'var(--warm-100)', borderRadius:7,
              padding:'7px 12px', fontSize:13.5, fontFamily:'inherit',
            }}/>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding:'0 36px 40px' }}>
        {filtered.length === 0 && (
          <div style={{
            padding:'50px 20px', textAlign:'center', color:'var(--warm-500)',
            background:'var(--warm-50)', border:'1px solid var(--warm-200)', borderRadius:12,
            fontSize:14,
          }}>
            {events.length === 0 ? 'Sin historia clínica registrada todavía.' : 'Ningún evento coincide con los filtros.'}
          </div>
        )}

        {grouped.map(([monthKey, items]) => (
          <div key={monthKey} style={{ marginBottom:24 }}>
            <div style={{
              fontSize:12, color:'var(--warm-500)', letterSpacing:'0.06em',
              textTransform:'uppercase', fontWeight:500, marginBottom:10,
              display:'flex', alignItems:'center', gap:10,
            }}>
              <span>{fmtMonth(monthKey + '-01')}</span>
              <span style={{ flex:1, height:1, background:'var(--warm-200)' }} />
              <span style={{ color:'var(--warm-500)' }}>{items.length} {items.length === 1 ? 'evento' : 'eventos'}</span>
            </div>
            <div style={{ position:'relative', paddingLeft:38 }}>
              <div style={{
                position:'absolute', left:14, top:8, bottom:8,
                width:2, background:'var(--warm-200)', borderRadius:1,
              }} />
              {items.map((ev, idx) => <EventCard key={ev.sourceId + '-' + idx} ev={ev} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventCard({ ev }) {
  const t = EVENT_TYPES[ev.eventType];
  const c = TYPE_COLORS[t.color];
  return (
    <div style={{ position:'relative', marginBottom:10 }}>
      <div style={{
        position:'absolute', left:-31, top:14,
        width:28, height:28, borderRadius:8,
        background:c.bg, color:c.fg,
        display:'grid', placeItems:'center', fontSize:14,
        border:'3px solid var(--warm-100)',
      }}>{t.icon}</div>
      <div style={{
        background:'var(--warm-50)', border:'1px solid var(--warm-200)',
        borderRadius:11, padding:'12px 16px',
        display:'flex', alignItems:'flex-start', gap:14,
        cursor:'pointer',
        transition:'border-color .12s, background .12s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = c.dot; e.currentTarget.style.background = 'var(--warm-50)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--warm-200)'; }}
      >
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{
              padding:'2px 9px', borderRadius:999,
              background:c.bg, color:c.fg,
              fontSize:11, fontWeight:500,
            }}>{t.label}</span>
            <span style={{ fontSize:12, color:'var(--warm-500)' }}>{fmtDate(ev.eventDate)}</span>
            <span style={{ fontSize:11, color:'var(--warm-400)', fontFamily:'JetBrains Mono, monospace' }}>#{ev.sourceId}</span>
          </div>
          <div style={{ fontSize:13.5, color:'var(--warm-800)', lineHeight:1.45 }}>
            {ev.summary}
          </div>
        </div>
        <span style={{ color:'var(--warm-400)', fontSize:14, alignSelf:'center' }}>›</span>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick, color, icon }) {
  const c = color ? TYPE_COLORS[color] : null;
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'5px 11px', borderRadius:999,
      background: active ? (c ? c.bg : 'var(--amatista-700)') : 'var(--warm-50)',
      color: active ? (c ? c.fg : 'white') : 'var(--warm-700)',
      border: '1px solid ' + (active ? (c ? c.dot : 'var(--amatista-700)') : 'var(--warm-200)'),
      fontSize:12, fontWeight: active ? 500 : 400,
      cursor:'pointer', fontFamily:'inherit',
    }}>
      {icon && <span style={{ fontSize:13 }}>{icon}</span>}
      {label}
    </button>
  );
}

function Pill({ children }) {
  return (
    <span style={{
      padding:'3px 9px', borderRadius:999,
      background:'var(--warm-200)', color:'var(--warm-700)',
      fontSize:11.5, fontWeight:500,
    }}>{children}</span>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{
      padding:'10px 16px', minWidth:130,
      background:'var(--warm-50)', border:'1px solid var(--warm-200)', borderRadius:10,
    }}>
      <div style={{ fontSize:11, color:'var(--warm-500)', letterSpacing:'0.05em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontFamily:'Instrument Serif, serif', fontSize:22, color:'var(--warm-900)', marginTop:2, lineHeight:1.1 }}>{value}</div>
    </div>
  );
}

// ─── styles ───
const titleS = {
  fontFamily:'Instrument Serif, serif',
  fontSize:32, fontWeight:400, letterSpacing:'-0.015em',
  color:'var(--warm-900)', margin:0, lineHeight:1.05,
};
const backBtn = {
  background:'transparent', border:'none',
  color:'var(--warm-600)', fontSize:13,
  cursor:'pointer', fontFamily:'inherit', padding:0,
};
const petCard = {
  display:'flex', gap:14, alignItems:'flex-start',
  padding:'16px 18px',
  background:'var(--warm-50)', border:'1px solid var(--warm-200)', borderRadius:14,
  cursor:'pointer', fontFamily:'inherit',
};
const primaryBtn = {
  padding:'8px 14px', fontSize:13, fontWeight:500,
  background:'var(--amatista-700)', color:'white',
  border:'none', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
};
const ghostBtn = {
  padding:'8px 14px', fontSize:13,
  background:'var(--warm-50)', color:'var(--warm-700)',
  border:'1px solid var(--warm-200)', borderRadius:8,
  cursor:'pointer', fontFamily:'inherit',
};

// ─── App raíz ───
function HistoryApp() {
  const [owner, setOwner] = useS(null);
  const [pet, setPet] = useS(null);
  const step = pet ? 3 : owner ? 2 : 1;

  const jump = (n) => {
    if (n === 1) { setOwner(null); setPet(null); }
    if (n === 2) { setPet(null); }
  };

  return (
    <Shell step={step} owner={owner} pet={pet} onJump={jump}>
      {step === 1 && <OwnerStep onSelect={setOwner} />}
      {step === 2 && <PetStep owner={owner} onSelect={setPet} onBack={() => setOwner(null)} />}
      {step === 3 && <HistoryStep owner={owner} pet={pet} onBack={() => setPet(null)} />}
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HistoryApp />);
