// Pantalla B — Detalle del historial clínico de una mascota
function HistorialDetail({ pet, onBack }) {
  const [tab, setTab] = React.useState('consultas');
  const [expandedId, setExpandedId] = React.useState('c1');

  // Mock data del historial
  const consultas = [
    { id: 'c1', date: '2 may 2026', time: '09:30', type: 'Control', vet: 'Dra. Mariana R.',
      motivo: 'Control anual y refuerzo de vacunación.',
      diagnostico: 'Paciente sana. Peso ideal para su edad y raza.',
      tratamiento: 'Refuerzo polivalente DHPP. Próximo control en 12 meses.',
      signos: { peso: '28.4 kg', temp: '38.6 °C', fc: '92 lpm', fr: '24 rpm' },
      status: 'completed' },
    { id: 'c2', date: '14 feb 2026', time: '11:15', type: 'Urgencia', vet: 'Dr. Andrés P.',
      motivo: 'Vómitos intermitentes 24h, decaimiento.',
      diagnostico: 'Gastroenteritis aguda no específica.',
      tratamiento: 'Metoclopramida 0.3mg/kg c/8h × 3 días. Dieta blanda.',
      signos: { peso: '27.9 kg', temp: '39.2 °C', fc: '108 lpm', fr: '32 rpm' },
      status: 'completed' },
    { id: 'c3', date: '8 nov 2025', time: '16:00', type: 'Cirugía', vet: 'Dra. Mariana R.',
      motivo: 'Esterilización electiva (OVH).',
      diagnostico: 'Procedimiento sin complicaciones. Recuperación normal.',
      tratamiento: 'Carprofeno 4mg/kg c/24h × 5 días. Retiro de puntos en 10 días.',
      signos: { peso: '27.4 kg', temp: '38.8 °C', fc: '88 lpm', fr: '22 rpm' },
      status: 'completed' },
    { id: 'c4', date: '21 ago 2025', time: '10:00', type: 'Control', vet: 'Dra. Mariana R.',
      motivo: 'Chequeo pre-quirúrgico, hemograma.',
      diagnostico: 'Apta para procedimiento. Hemograma dentro de rangos.',
      tratamiento: 'Sin medicación. Ayuno 12h previo a cirugía.',
      signos: { peso: '27.1 kg', temp: '38.5 °C', fc: '90 lpm', fr: '22 rpm' },
      status: 'completed' },
  ];

  const vacunas = [
    { name: 'Polivalente DHPP', date: '2 may 2026', next: '2 may 2027', status: 'vigente', lote: 'NB-2245' },
    { name: 'Antirrábica', date: '2 may 2026', next: '2 may 2027', status: 'vigente', lote: 'RB-1183' },
    { name: 'Bordetella', date: '14 oct 2025', next: '14 oct 2026', status: 'vigente', lote: 'BD-0921' },
    { name: 'Leptospira', date: '21 mar 2025', next: '21 mar 2026', status: 'vencida', lote: 'LP-7740' },
  ];

  const typeColor = {
    Control: { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)' },
    Urgencia: { bg: 'oklch(94% 0.06 30)', fg: 'oklch(45% 0.15 30)' },
    Cirugía: { bg: 'oklch(94% 0.05 220)', fg: 'oklch(40% 0.13 220)' },
  };

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {/* Sub-header con breadcrumb + acciones */}
      <div style={{
        background: 'var(--warm-50)',
        borderBottom: '1px solid var(--warm-200)',
        padding: '14px 32px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 12.5, color: 'var(--warm-600)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Buscar otro paciente
        </button>
        <span style={{ color: 'var(--warm-300)' }}>/</span>
        <span style={{ fontSize: 12.5, color: 'var(--warm-600)' }}>Historial clínico</span>
        <span style={{ color: 'var(--warm-300)' }}>/</span>
        <span style={{ fontSize: 12.5, color: 'var(--warm-800)', fontWeight: 500 }}>{pet.name}</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={ghostBtn}>Exportar PDF</button>
          <button style={primaryBtn}>
            <IconPlus size={13} /> Nueva consulta
          </button>
        </div>
      </div>

      {/* Hero card del paciente */}
      <div style={{ padding: '28px 32px 0' }}>
        <div style={{
          background: 'var(--warm-50)',
          border: '1px solid var(--warm-200)',
          borderRadius: 16,
          padding: 24,
          display: 'grid',
          gridTemplateColumns: '92px 1fr auto',
          gap: 24,
          alignItems: 'center',
        }}>
          <div style={{
            width: 92, height: 92, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--amatista-100), var(--amatista-200))',
            display: 'grid', placeItems: 'center', fontSize: 48,
            border: '1px solid var(--amatista-200)',
          }}>{pet.avatar}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{
                fontFamily: 'Instrument Serif, serif', fontSize: 36, fontWeight: 400,
                letterSpacing: '-0.015em', margin: 0, color: 'var(--warm-900)',
              }}>{pet.name}</h1>
              <span style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 999,
                background: 'var(--warm-150)', color: 'var(--warm-700)',
                textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500,
              }}>{pet.species} · {pet.sex === 'H' ? 'Hembra' : 'Macho'}</span>
              {pet.alerts.length > 0 && (
                <span style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 999,
                  background: 'oklch(95% 0.06 60)', color: 'oklch(40% 0.14 60)', fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>⚠ {pet.alerts[0]}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--warm-600)', flexWrap: 'wrap' }}>
              <Field label="Raza" value={pet.breed} />
              <Field label="Edad" value={pet.age} />
              <Field label="Peso actual" value={consultas[0].signos.peso} />
              <Field label="Microchip" value="985 112 003 7724" mono />
              <Field label="Total visitas" value={`${pet.visits}`} />
            </div>
          </div>
          <div style={{
            borderLeft: '1px solid var(--warm-200)',
            paddingLeft: 24,
            minWidth: 220,
          }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--warm-500)', fontWeight: 500, marginBottom: 8 }}>Propietario</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--warm-900)' }}>{pet.owner}</div>
            <div style={{ fontSize: 12, color: 'var(--warm-600)', marginTop: 2 }}>{pet.ownerId}</div>
            <div style={{ fontSize: 12, color: 'var(--amatista-700)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              📞 {pet.phone}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '24px 32px 0' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--warm-200)' }}>
          {[
            ['consultas', 'Consultas', consultas.length],
            ['vacunacion', 'Vacunación', vacunas.length],
            ['procedimientos', 'Procedimientos', 3],
            ['indicadores', 'Indicadores', null],
            ['archivos', 'Archivos', 12],
          ].map(([id, label, count]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background: 'transparent', border: 'none',
              padding: '10px 14px',
              fontSize: 13, fontFamily: 'inherit',
              color: tab === id ? 'var(--amatista-700)' : 'var(--warm-600)',
              fontWeight: tab === id ? 500 : 400,
              borderBottom: tab === id ? '2px solid var(--amatista-600)' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              {label}
              {count !== null && (
                <span style={{
                  fontSize: 10.5, padding: '1px 6px', borderRadius: 999,
                  background: tab === id ? 'var(--amatista-100)' : 'var(--warm-150)',
                  color: tab === id ? 'var(--amatista-700)' : 'var(--warm-500)',
                  fontWeight: 500,
                }}>{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '24px 32px 48px' }}>
        {tab === 'consultas' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
            {/* Timeline de consultas */}
            <div>
              <div style={{ position: 'relative' }}>
                {/* Línea vertical */}
                <div style={{
                  position: 'absolute', left: 19, top: 12, bottom: 12,
                  width: 2, background: 'var(--warm-200)',
                }} />
                {consultas.map((c, i) => {
                  const expanded = expandedId === c.id;
                  const tc = typeColor[c.type] || typeColor.Control;
                  return (
                    <div key={c.id} style={{ position: 'relative', paddingLeft: 56, marginBottom: 14 }}>
                      <div style={{
                        position: 'absolute', left: 11, top: 18,
                        width: 18, height: 18, borderRadius: '50%',
                        background: tc.bg, border: `2px solid var(--warm-50)`,
                        boxShadow: `0 0 0 2px ${tc.fg}`,
                        display: 'grid', placeItems: 'center',
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: tc.fg }} />
                      </div>
                      <div style={{
                        background: 'var(--warm-50)',
                        border: `1px solid ${expanded ? 'var(--amatista-300)' : 'var(--warm-200)'}`,
                        borderRadius: 12,
                        boxShadow: expanded ? '0 4px 16px -8px oklch(50% 0.18 var(--hue) / 0.25)' : 'none',
                        overflow: 'hidden',
                        transition: 'all .18s',
                      }}>
                        <div onClick={() => setExpandedId(expanded ? null : c.id)} style={{
                          padding: '14px 18px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 14,
                        }}>
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 4,
                            background: tc.bg, color: tc.fg, fontWeight: 500,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>{c.type}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, color: 'var(--warm-900)', fontWeight: 500, marginBottom: 1 }}>
                              {c.motivo}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--warm-500)' }}>
                              {c.date} · {c.time} · {c.vet}
                            </div>
                          </div>
                          <IconChevronDown size={14} style={{ color: 'var(--warm-400)', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }} />
                        </div>
                        {expanded && (
                          <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--warm-150)', animation: 'fadeUp .25s ease' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '14px 0' }}>
                              {Object.entries(c.signos).map(([k, v]) => (
                                <div key={k} style={{
                                  background: 'var(--warm-100)',
                                  borderRadius: 8, padding: '8px 10px',
                                }}>
                                  <div style={{ fontSize: 10, color: 'var(--warm-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                                    {k === 'peso' ? 'Peso' : k === 'temp' ? 'Temperatura' : k === 'fc' ? 'F. cardiaca' : 'F. respiratoria'}
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--warm-900)' }}>{v}</div>
                                </div>
                              ))}
                            </div>
                            <DetailRow label="Diagnóstico" value={c.diagnostico} />
                            <DetailRow label="Tratamiento" value={c.tratamiento} />
                            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                              <button style={ghostBtn}>Ver consulta completa</button>
                              <button style={ghostBtn}>Imprimir receta</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div style={{ paddingLeft: 56, fontSize: 11.5, color: 'var(--warm-500)', marginTop: 4 }}>
                  · Inicio del historial · Registrada el 12 mar 2022
                </div>
              </div>
            </div>

            {/* Sidebar derecho */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 0 }}>
              <div style={{
                background: 'var(--warm-50)', border: '1px solid var(--warm-200)',
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--warm-500)', fontWeight: 500, marginBottom: 10 }}>Resumen</div>
                {[
                  ['Total consultas', `${pet.visits}`],
                  ['Última visita', pet.lastVisit],
                  ['Próxima vacuna', '2 may 2027'],
                  ['Esterilizada', 'Sí · nov 2025'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--warm-150)', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--warm-600)' }}>{k}</span>
                    <span style={{ color: 'var(--warm-900)', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'var(--amatista-50)', border: '1px solid var(--amatista-200)',
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amatista-700)', fontWeight: 500, marginBottom: 8 }}>
                  ⚠ Alertas clínicas
                </div>
                {pet.alerts.length > 0 ? pet.alerts.map(a => (
                  <div key={a} style={{ fontSize: 12.5, color: 'var(--warm-800)', padding: '6px 0' }}>
                    · {a}
                  </div>
                )) : (
                  <div style={{ fontSize: 12.5, color: 'var(--warm-600)' }}>Sin alergias ni condiciones registradas.</div>
                )}
              </div>
            </aside>
          </div>
        )}

        {tab === 'vacunacion' && (
          <div style={{ background: 'var(--warm-50)', border: '1px solid var(--warm-200)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
              gap: 14, padding: '12px 18px',
              background: 'var(--warm-100)', borderBottom: '1px solid var(--warm-200)',
              fontSize: 11, color: 'var(--warm-600)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500,
            }}>
              <div>Vacuna</div><div>Aplicación</div><div>Próxima dosis</div><div>Lote</div><div>Estado</div>
            </div>
            {vacunas.map((v, i, arr) => (
              <div key={v.name} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                gap: 14, padding: '14px 18px', alignItems: 'center',
                borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--warm-150)',
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 500, color: 'var(--warm-900)' }}>{v.name}</div>
                <div style={{ color: 'var(--warm-700)' }}>{v.date}</div>
                <div style={{ color: v.status === 'vencida' ? 'oklch(45% 0.15 30)' : 'var(--warm-700)', fontWeight: v.status === 'vencida' ? 500 : 400 }}>{v.next}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: 'var(--warm-600)' }}>{v.lote}</div>
                <span style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 999,
                  background: v.status === 'vigente' ? 'oklch(94% 0.04 145)' : 'oklch(94% 0.06 30)',
                  color: v.status === 'vigente' ? 'oklch(40% 0.10 145)' : 'oklch(45% 0.15 30)',
                  fontWeight: 500, textTransform: 'capitalize',
                }}>{v.status}</span>
              </div>
            ))}
          </div>
        )}

        {(tab === 'procedimientos' || tab === 'indicadores' || tab === 'archivos') && (
          <div style={{
            padding: '60px 24px', textAlign: 'center',
            background: 'var(--warm-50)', border: '1px dashed var(--warm-300)',
            borderRadius: 12, color: 'var(--warm-500)',
          }}>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 22, color: 'var(--warm-700)', marginBottom: 6 }}>
              Próximamente
            </div>
            <div style={{ fontSize: 13 }}>Esta sección se habilitará cuando lancemos los módulos correspondientes.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--warm-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--warm-900)', fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', fontWeight: mono ? 400 : 500 }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, color: 'var(--warm-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: 'var(--warm-800)', lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}

const primaryBtn = {
  background: 'linear-gradient(135deg, var(--amatista-600), var(--amatista-700))',
  color: 'white', border: 'none', borderRadius: 8,
  padding: '7px 14px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
  boxShadow: '0 1px 2px rgba(50,20,80,0.08), 0 6px 18px -8px oklch(40% 0.18 var(--hue) / 0.4)',
};

const ghostBtn = {
  background: 'var(--warm-50)', color: 'var(--warm-700)',
  border: '1px solid var(--warm-200)', borderRadius: 8,
  padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
  fontFamily: 'inherit',
};

Object.assign(window, { HistorialDetail });
