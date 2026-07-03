// Pantalla A — Búsqueda de historial clínico
const PETS = [
  { id: 1, name: 'Luna', species: 'Canino', breed: 'Golden Retriever', age: '4 años', sex: 'H', owner: 'Carlos Méndez', ownerId: 'CC 1.085.221.430', phone: '+57 311 555 0182', lastVisit: 'Hoy', visits: 14, alerts: ['alérgica a penicilina'], avatar: '🐕' },
  { id: 2, name: 'Rocco', species: 'Canino', breed: 'Bulldog Francés', age: '7 años', sex: 'M', owner: 'Carlos Méndez', ownerId: 'CC 1.085.221.430', phone: '+57 311 555 0182', lastVisit: 'hace 2 días', visits: 22, alerts: [], avatar: '🐶' },
  { id: 3, name: 'Mishi', species: 'Felina', breed: 'Doméstico Pelo Corto', age: '2 años', sex: 'H', owner: 'Andrea Solís', ownerId: 'CC 52.876.014', phone: '+57 320 222 9011', lastVisit: 'hace 1 semana', visits: 6, alerts: [], avatar: '🐈' },
  { id: 4, name: 'Toby', species: 'Canino', breed: 'Schnauzer Mini', age: '11 años', sex: 'M', owner: 'Jorge Vargas', ownerId: 'CC 80.412.330', phone: '+57 312 884 7720', lastVisit: 'hace 1 semana', visits: 38, alerts: ['cardiopatía controlada'], avatar: '🐕' },
  { id: 5, name: 'Kiwi', species: 'Ave', breed: 'Periquito', age: '3 años', sex: 'M', owner: 'Laura Reinoso', ownerId: 'CC 1.012.778.992', phone: '+57 318 660 2255', lastVisit: 'hace 3 meses', visits: 2, alerts: [], avatar: '🦜' },
];

function HistorialSearch({ onSelect }) {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [focused, setFocused] = React.useState(true);

  const results = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return PETS.filter(p => {
      const matchPet = p.name.toLowerCase().includes(q) || p.breed.toLowerCase().includes(q);
      const matchOwner = p.owner.toLowerCase().includes(q) || p.ownerId.toLowerCase().includes(q);
      if (filter === 'pet') return matchPet;
      if (filter === 'owner') return matchOwner;
      return matchPet || matchOwner;
    });
  }, [query, filter]);

  const hasQuery = query.trim().length > 0;

  return (
    <div style={{ flex: 1, padding: '40px 56px 56px', overflow: 'auto' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amatista-700)', fontWeight: 500, marginBottom: 8 }}>
          Consulta · Historial clínico
        </div>
        <div style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: 42, lineHeight: 1.05, letterSpacing: '-0.015em',
          color: 'var(--warm-900)', fontWeight: 400, marginBottom: 8,
        }}>
          Encuentra <span style={{ fontStyle: 'italic', color: 'var(--amatista-700)' }}>el historial</span> de un paciente
        </div>
        <div style={{ fontSize: 14, color: 'var(--warm-600)', marginBottom: 28, maxWidth: 540 }}>
          Busca por nombre de la mascota, nombre del propietario o número de identificación.
        </div>

        {/* Search box */}
        <div style={{
          background: 'var(--warm-50)',
          border: `1px solid ${focused ? 'var(--amatista-400)' : 'var(--warm-200)'}`,
          borderRadius: 14,
          boxShadow: focused
            ? '0 0 0 4px oklch(78% 0.12 var(--hue) / 0.18), 0 4px 24px -8px oklch(50% 0.18 var(--hue) / 0.2)'
            : '0 1px 2px rgba(0,0,0,0.02)',
          transition: 'all .18s',
          overflow: 'hidden',
        }}>
          {/* Filter chips */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '12px 16px 0',
          }}>
            {[
              ['all', 'Todos'],
              ['pet', 'Por mascota'],
              ['owner', 'Por propietario'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} style={{
                background: filter === id ? 'var(--amatista-100)' : 'transparent',
                color: filter === id ? 'var(--amatista-700)' : 'var(--warm-600)',
                border: filter === id ? '1px solid var(--amatista-200)' : '1px solid transparent',
                borderRadius: 999, padding: '4px 11px',
                fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>{label}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--warm-500)' }}>
              {hasQuery ? `${results.length} ${results.length === 1 ? 'coincidencia' : 'coincidencias'}` : `${PETS.length} pacientes registrados`}
            </span>
          </div>

          {/* Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <IconSearch size={20} style={{ color: focused ? 'var(--amatista-600)' : 'var(--warm-400)', flexShrink: 0 }} />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={filter === 'owner' ? 'Ej. Carlos Méndez, CC 1.085…' : filter === 'pet' ? 'Ej. Luna, Golden Retriever…' : 'Nombre de mascota, propietario o ID…'}
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', fontSize: 17, fontFamily: 'inherit',
                color: 'var(--warm-900)',
              }}
            />
            {hasQuery && (
              <button onClick={() => setQuery('')} style={{
                background: 'var(--warm-150)', border: 'none', borderRadius: 6,
                padding: '4px 8px', fontSize: 11, color: 'var(--warm-600)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Limpiar</button>
            )}
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              padding: '3px 7px', background: 'var(--warm-150)',
              border: '1px solid var(--warm-200)', borderRadius: 4,
              color: 'var(--warm-600)',
            }}>esc</span>
          </div>

          {/* Results dropdown style list */}
          {hasQuery && (
            <div style={{ borderTop: '1px solid var(--warm-150)', maxHeight: 420, overflow: 'auto' }}>
              {results.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: 'var(--warm-700)', marginBottom: 4 }}>
                    Sin resultados para "<b>{query}</b>"
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--warm-500)' }}>
                    ¿Es un paciente nuevo? <span style={{ color: 'var(--amatista-700)', cursor: 'pointer' }}>Crear historial →</span>
                  </div>
                </div>
              ) : results.map((p, i) => (
                <div key={p.id} onClick={() => onSelect(p)} style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr 1fr auto',
                  gap: 14, alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: i === results.length - 1 ? 'none' : '1px solid var(--warm-150)',
                  cursor: 'pointer',
                  animation: `fadeUp .25s ease ${i * 0.03}s both`,
                }} onMouseEnter={e => e.currentTarget.style.background = 'var(--warm-100)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--amatista-100)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 20,
                  }}>{p.avatar}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--warm-900)' }}>
                        <Highlight text={p.name} q={query} />
                      </span>
                      <span style={{
                        fontSize: 10.5, padding: '1px 6px', borderRadius: 4,
                        background: 'var(--warm-150)', color: 'var(--warm-600)',
                        textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500,
                      }}>{p.species} · {p.sex}</span>
                      {p.alerts.length > 0 && (
                        <span title={p.alerts.join(', ')} style={{
                          fontSize: 10.5, padding: '1px 6px', borderRadius: 4,
                          background: 'oklch(95% 0.06 60)', color: 'oklch(45% 0.12 60)',
                          fontWeight: 500,
                        }}>⚠ {p.alerts[0]}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--warm-500)', marginTop: 2 }}>
                      <Highlight text={p.breed} q={query} /> · {p.age}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5 }}>
                    <div style={{ color: 'var(--warm-700)' }}>
                      <Highlight text={p.owner} q={query} />
                    </div>
                    <div style={{ color: 'var(--warm-500)', fontSize: 11.5, marginTop: 2 }}>
                      <Highlight text={p.ownerId} q={query} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--warm-500)' }}>Última visita</div>
                    <div style={{ fontSize: 12.5, color: 'var(--warm-800)', marginTop: 2 }}>{p.lastVisit}</div>
                    <div style={{ fontSize: 11, color: 'var(--amatista-700)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Ver historial <IconChevronRight size={11} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empty state — recent / suggestions */}
        {!hasQuery && (
          <div style={{ marginTop: 36 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--warm-800)' }}>Vistos recientemente</div>
              <div style={{ fontSize: 11.5, color: 'var(--warm-500)' }}>Tus últimas consultas</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {PETS.slice(0, 3).map(p => (
                <div key={p.id} onClick={() => onSelect(p)} style={{
                  background: 'var(--warm-50)',
                  border: '1px solid var(--warm-200)',
                  borderRadius: 12, padding: 16, cursor: 'pointer',
                  display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'var(--amatista-100)',
                    display: 'grid', placeItems: 'center', fontSize: 22,
                  }}>{p.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--warm-900)' }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--warm-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.owner} · {p.lastVisit}
                    </div>
                  </div>
                  <IconChevronRight size={16} style={{ color: 'var(--warm-400)', flexShrink: 0 }} />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28, padding: '14px 18px',
              background: 'var(--amatista-50)', border: '1px solid var(--amatista-200)',
              borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ fontSize: 18 }}>💡</div>
              <div style={{ fontSize: 12.5, color: 'var(--warm-700)', flex: 1 }}>
                <b style={{ color: 'var(--warm-900)' }}>Tip:</b> también puedes buscar por número de cédula del propietario o por raza de la mascota.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Highlight({ text, q }) {
  if (!q.trim()) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: 'oklch(92% 0.10 var(--hue))', color: 'var(--amatista-800)', padding: '0 1px', borderRadius: 2 }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

Object.assign(window, { HistorialSearch, PETS });
