// Vetrina — pantalla principal (variación A pulida) + tweaks
const { TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSlider, TweakToggle, TweakSelect, TweakText, TweakColor } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "hue": 300,
  "sidebarTone": "dark",
  "greetingStyle": "serif-italic",
  "density": "comfortable",
  "ctaStyle": "gradient",
  "showRecent": true,
  "showStats": true,
  "showActiveBanner": true,
  "userName": "Mariana",
  "clinicName": "Clínica Norte",
  "userRole": "Veterinaria"
}/*EDITMODE-END*/;

function VetrinaApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [consultaOpen, setConsultaOpen] = React.useState(true);
  const [activeSubItem, setActiveSubItem] = React.useState('nueva');

  // Apply hue token globally
  React.useEffect(() => {
    document.documentElement.style.setProperty('--hue', t.hue);
  }, [t.hue]);

  const dark = t.sidebarTone === 'dark';
  const compact = t.density === 'compact';
  const initials = (t.userName || 'U').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();

  // Layout sizing
  const padX = compact ? 32 : 48;
  const padY = compact ? 24 : 36;
  const sidebarW = 248;

  const sidebarBg = dark
    ? 'linear-gradient(180deg, oklch(28% 0.10 var(--hue)) 0%, oklch(22% 0.08 var(--hue)) 100%)'
    : 'var(--warm-100)';
  const sidebarColor = dark ? 'oklch(94% 0.02 var(--hue))' : 'var(--warm-800)';
  const sidebarBorder = dark ? 'none' : '1px solid var(--warm-200)';

  // Nav item builder
  const navItem = (active, disabled) => ({
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '9px 10px',
    borderRadius: 8,
    fontSize: 13.5,
    color: dark
      ? (active ? 'oklch(98% 0.01 var(--hue))' : disabled ? 'oklch(70% 0.03 var(--hue) / 0.4)' : 'oklch(88% 0.03 var(--hue) / 0.85)')
      : (active ? 'var(--amatista-700)' : disabled ? 'var(--warm-400)' : 'var(--warm-700)'),
    background: active
      ? (dark ? 'oklch(45% 0.16 var(--hue) / 0.4)' : 'var(--amatista-100)')
      : 'transparent',
    boxShadow: active && dark ? '0 0 0 1px oklch(70% 0.14 var(--hue) / 0.3) inset' : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? 500 : 400,
  });

  const subItem = (active) => ({
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '7px 10px',
    borderRadius: 6,
    fontSize: 12.5,
    color: dark
      ? (active ? 'oklch(95% 0.02 var(--hue))' : 'oklch(82% 0.04 var(--hue) / 0.72)')
      : (active ? 'var(--amatista-700)' : 'var(--warm-600)'),
    background: active
      ? (dark ? 'oklch(50% 0.10 var(--hue) / 0.25)' : 'oklch(96% 0.025 var(--hue))')
      : 'transparent',
    fontWeight: active ? 500 : 400,
    cursor: 'pointer',
  });

  const badge = {
    marginLeft: 'auto',
    fontSize: 9.5, padding: '2px 6px',
    background: dark ? 'oklch(70% 0.04 var(--hue) / 0.18)' : 'var(--warm-200)',
    color: dark ? 'oklch(78% 0.04 var(--hue) / 0.7)' : 'var(--warm-500)',
    borderRadius: 4, letterSpacing: '0.04em', textTransform: 'uppercase',
    fontWeight: 500,
  };

  const navLabel = {
    fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: dark ? 'oklch(75% 0.04 var(--hue) / 0.55)' : 'var(--warm-500)',
    padding: '14px 10px 8px',
  };

  const userCard = {
    marginTop: 'auto',
    display: 'flex', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 10,
    background: dark ? 'oklch(35% 0.10 var(--hue) / 0.4)' : 'var(--warm-50)',
    border: dark ? 'none' : '1px solid var(--warm-200)',
    cursor: 'pointer',
  };

  // Greeting
  const renderGreeting = () => {
    const hour = 9; // demo
    const greet = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
    if (t.greetingStyle === 'serif-italic') {
      return (
        <div style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: compact ? 38 : 44, lineHeight: 1.05, letterSpacing: '-0.015em',
          color: 'var(--warm-900)', fontWeight: 400, marginBottom: 6,
        }}>
          {greet}, <span style={{ fontStyle: 'italic', color: 'var(--amatista-700)' }}>{t.userName}</span>.
        </div>
      );
    }
    if (t.greetingStyle === 'serif') {
      return (
        <div style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: compact ? 38 : 44, lineHeight: 1.05, letterSpacing: '-0.015em',
          color: 'var(--warm-900)', fontWeight: 400, marginBottom: 6,
        }}>
          {greet}, {t.userName}.
        </div>
      );
    }
    // sans
    return (
      <div style={{
        fontSize: compact ? 28 : 34, lineHeight: 1.1, letterSpacing: '-0.02em',
        color: 'var(--warm-900)', fontWeight: 500, marginBottom: 6,
      }}>
        {greet}, {t.userName} <span style={{ color: 'var(--amatista-700)' }}>👋</span>
      </div>
    );
  };

  // CTA primary
  const ctaPrimaryBg = t.ctaStyle === 'gradient'
    ? 'linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)))'
    : t.ctaStyle === 'solid'
    ? 'var(--amatista-700)'
    : 'var(--warm-50)'; // outline
  const ctaPrimaryColor = t.ctaStyle === 'outline' ? 'var(--warm-900)' : 'white';
  const ctaPrimaryBorder = t.ctaStyle === 'outline' ? '1px solid var(--warm-200)' : 'none';
  const ctaPrimaryShadow = t.ctaStyle === 'outline'
    ? '0 1px 2px rgba(0,0,0,0.03)'
    : '0 1px 2px rgba(50,20,80,0.08), 0 8px 24px -8px oklch(40% 0.18 var(--hue) / 0.5)';

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--warm-100)',
      color: 'var(--warm-900)',
      fontFamily: 'Geist, sans-serif',
      overflow: 'hidden',
    }}>
      {/* SIDEBAR */}
      <aside style={{
        width: sidebarW, flexShrink: 0,
        background: sidebarBg,
        color: sidebarColor,
        borderRight: sidebarBorder,
        display: 'flex', flexDirection: 'column',
        padding: '20px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 22px 8px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: dark ? 'oklch(72% 0.16 var(--hue))' : 'linear-gradient(135deg, var(--amatista-500), var(--amatista-700))',
            display: 'grid', placeItems: 'center',
            color: dark ? 'oklch(20% 0.05 var(--hue))' : 'white',
            fontWeight: 700, fontSize: 15,
            fontFamily: 'Instrument Serif, serif',
            fontStyle: 'italic',
          }}>V</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: dark ? 'inherit' : 'var(--warm-900)' }}>Vetrina</div>
            <div style={{ fontSize: 11, opacity: dark ? 0.55 : 1, color: dark ? 'inherit' : 'var(--warm-500)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>{t.clinicName}</div>
          </div>
        </div>

        <div style={navLabel}>Trabajo</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={navItem(true, false)} onClick={() => setConsultaOpen(o => !o)}>
            <IconConsulta size={17} />
            <span>Consulta</span>
            <span style={{ marginLeft: 'auto', opacity: 0.6, transform: consultaOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .2s' }}>
              <IconChevronDown size={14} />
            </span>
          </div>
          {consultaOpen && (
            <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2, marginBottom: 6 }}>
              {[
                ['nueva', 'Nueva consulta', IconNueva],
                ['historial', 'Historial clínico', IconHistorial],
                ['vacunacion', 'Plan de vacunación', IconVacuna],
                ['hospital', 'Hospitalización', IconPaw],
              ].map(([id, label, Ico]) => (
                <div key={id} style={subItem(activeSubItem === id)} onClick={() => setActiveSubItem(id)}>
                  <Ico size={14} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={navLabel}>Próximamente</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[['Pacientes', IconPaciente], ['Agenda', IconAgenda], ['Inventario', IconInventario], ['Facturación', IconFacturacion], ['Reportes', IconReportes]].map(([label, Ico]) => (
            <div key={label} style={navItem(false, true)}>
              <Ico size={17} />
              <span>{label}</span>
              <span style={badge}>Pronto</span>
            </div>
          ))}
        </div>

        <div style={userCard}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))',
            display: 'grid', placeItems: 'center', fontWeight: 600,
            color: 'white', fontSize: 12,
          }}>{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: dark ? 'inherit' : 'var(--warm-900)' }}>Dra. {t.userName}</div>
            <div style={{ fontSize: 11, opacity: dark ? 0.6 : 1, color: dark ? 'inherit' : 'var(--warm-500)' }}>{t.userRole}</div>
          </div>
          <IconChevronDown size={14} style={{ opacity: 0.5 }} />
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height: 60, borderBottom: '1px solid var(--warm-200)',
          background: 'var(--warm-50)',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--warm-150)',
            border: '1px solid var(--warm-200)',
            borderRadius: 8, padding: '7px 12px',
            width: 320, color: 'var(--warm-500)',
            fontSize: 13,
          }}>
            <IconSearch size={15} />
            <span style={{ flex: 1 }}>Buscar paciente, dueño, código…</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              padding: '2px 6px', background: 'var(--warm-50)',
              border: '1px solid var(--warm-200)', borderRadius: 4,
              color: 'var(--warm-600)',
            }}>⌘K</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={iconBtn}><IconBell size={16} /></button>
            <button style={iconBtn}><IconAjustes size={16} /></button>
            <div style={{ width: 1, height: 22, background: 'var(--warm-200)', margin: '0 4px' }} />
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))',
              color: 'white', fontWeight: 600, fontSize: 13,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              boxShadow: '0 0 0 2px var(--warm-50), 0 0 0 3px var(--warm-200)',
            }}>{initials}</div>
          </div>
        </header>

        {t.showActiveBanner && (
          <div style={{
            background: 'linear-gradient(90deg, oklch(42% 0.16 var(--hue)) 0%, oklch(50% 0.18 var(--hue)) 60%, oklch(58% 0.18 var(--hue)) 100%)',
            color: 'white',
            padding: '11px 28px',
            display: 'flex', alignItems: 'center', gap: 14,
            fontSize: 13,
            position: 'relative', overflow: 'hidden',
            cursor: 'pointer',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 400px 60px at 20% 50%, oklch(75% 0.18 var(--hue) / 0.35), transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ width: 22, height: 22, color: 'white', flexShrink: 0, position: 'relative', filter: 'drop-shadow(0 0 4px oklch(85% 0.10 var(--hue) / 0.7))' }}>
              <svg viewBox="-40 -40 200 200" style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible', animation: 'pawBeat 1.2s ease-in-out infinite', transformOrigin: 'center', transformBox: 'fill-box' }}>
                <path fill="currentColor" d="M 60 58 C 80 58, 94 72, 97 90 C 100 105, 92 120, 80 124 C 73 127, 66 124, 60 124 C 54 124, 47 127, 40 124 C 28 120, 20 105, 23 90 C 26 72, 40 58, 60 58 Z"/>
                <ellipse fill="currentColor" cx="42" cy="22" rx="14" ry="19"/>
                <ellipse fill="currentColor" cx="78" cy="22" rx="14" ry="19"/>
                <ellipse fill="currentColor" cx="14" cy="46" rx="12" ry="16" transform="rotate(-25 14 46)"/>
                <ellipse fill="currentColor" cx="106" cy="46" rx="12" ry="16" transform="rotate(25 106 46)"/>
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
              <b style={{ fontWeight: 500 }}>Consulta en curso</b>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{
                background: 'oklch(100% 0 0 / 0.18)',
                border: '1px solid oklch(100% 0 0 / 0.22)',
                padding: '2px 9px', borderRadius: 999,
                fontSize: 11.5, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>🐕 Luna · Golden Retriever</span>
              <span style={{ opacity: 0.78, fontSize: 12 }}>Carlos Méndez</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ opacity: 0.78, fontSize: 12 }}>iniciada hace 32 min</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              <button style={{
                background: 'white', color: 'oklch(32% 0.12 var(--hue))',
                border: 'none', borderRadius: 6,
                padding: '5px 12px', fontSize: 12.5, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>Reanudar →</button>
              <button style={{
                background: 'transparent', border: 'none',
                color: 'oklch(100% 0 0 / 0.7)',
                cursor: 'pointer', padding: 4,
                display: 'flex', alignItems: 'center',
              }} onClick={(e) => { e.stopPropagation(); setTweak('showActiveBanner', false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, padding: `${padY}px ${padX}px`, overflow: 'auto' }}>
          {renderGreeting()}
          <div style={{ fontSize: 14, color: 'var(--warm-600)', marginBottom: compact ? 22 : 32 }}>
            Sábado 2 de mayo · 8 consultas previstas hoy
          </div>

          {t.showStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: compact ? 18 : 24 }}>
              {[
                { label: 'Consultas hoy', value: '8', sub: '+2 vs ayer', tone: 'ok' },
                { label: 'En curso', value: '1', sub: 'Luna · 09:30', tone: 'amatista' },
                { label: 'Pendientes', value: '5', sub: 'Próxima 11:00', tone: 'neutral' },
                { label: 'Completadas', value: '2', sub: 'esta mañana', tone: 'neutral' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--warm-50)',
                  border: '1px solid var(--warm-200)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 11.5, color: 'var(--warm-500)', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{
                    fontSize: 11.5, marginTop: 4,
                    color: s.tone === 'ok' ? 'oklch(50% 0.13 145)'
                         : s.tone === 'amatista' ? 'var(--amatista-700)'
                         : 'var(--warm-500)',
                  }}>{s.sub}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 28 }}>
            <div style={{
              background: ctaPrimaryBg,
              color: ctaPrimaryColor,
              border: ctaPrimaryBorder,
              borderRadius: 16,
              padding: '28px 30px',
              position: 'relative', overflow: 'hidden',
              boxShadow: ctaPrimaryShadow,
              cursor: 'pointer',
            }}>
              {t.ctaStyle === 'gradient' && (
                <div style={{
                  position: 'absolute', right: -30, top: -30,
                  width: 220, height: 220,
                  background: 'radial-gradient(circle, oklch(70% 0.18 var(--hue) / 0.4), transparent 60%)',
                  pointerEvents: 'none',
                }} />
              )}
              <div style={{
                fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                opacity: t.ctaStyle === 'outline' ? 1 : 0.7,
                color: t.ctaStyle === 'outline' ? 'var(--amatista-700)' : 'inherit',
                marginBottom: 10, fontWeight: 500,
              }}>Acción rápida</div>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 4 }}>
                Iniciar una nueva consulta
              </div>
              <div style={{
                fontSize: 13,
                opacity: t.ctaStyle === 'outline' ? 1 : 0.75,
                color: t.ctaStyle === 'outline' ? 'var(--warm-600)' : 'inherit',
                lineHeight: 1.5, maxWidth: 380,
              }}>
                Registra el motivo, examen físico, diagnóstico y tratamiento del paciente en una sola pantalla.
              </div>
              <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
                <button style={{
                  background: t.ctaStyle === 'outline' ? 'var(--amatista-700)' : 'white',
                  color: t.ctaStyle === 'outline' ? 'white' : 'var(--amatista-700)',
                  border: 'none', borderRadius: 8, padding: '9px 16px',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                  fontFamily: 'inherit',
                }}>
                  <IconPlus size={14} /> Nueva consulta
                </button>
                <button style={{
                  background: t.ctaStyle === 'outline' ? 'transparent' : 'oklch(60% 0.10 var(--hue) / 0.25)',
                  color: t.ctaStyle === 'outline' ? 'var(--warm-700)' : 'white',
                  border: t.ctaStyle === 'outline' ? '1px solid var(--warm-200)' : '1px solid oklch(80% 0.06 var(--hue) / 0.3)',
                  borderRadius: 8, padding: '9px 16px',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>Ver historial</button>
              </div>
            </div>

            <div style={{
              background: 'var(--warm-50)',
              border: '1px solid var(--warm-200)',
              borderRadius: 16,
              padding: 24,
              display: 'flex', flexDirection: 'column',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--amatista-100)', color: 'var(--amatista-700)', display: 'grid', placeItems: 'center' }}>
                  <IconHistorial size={18} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Historial clínico</div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--warm-600)', lineHeight: 1.5, flex: 1 }}>
                Busca consultas previas por paciente, dueño o fecha. Exporta resúmenes en PDF.
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--amatista-700)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 14, fontWeight: 500 }}>
                Abrir historial <IconArrowRight size={13} />
              </div>
            </div>
          </div>

          {t.showRecent && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--warm-800)' }}>Consultas recientes</div>
                <div style={{ fontSize: 12, color: 'var(--amatista-700)', cursor: 'pointer' }}>Ver todas →</div>
              </div>
              <div style={{
                background: 'var(--warm-50)',
                border: '1px solid var(--warm-200)',
                borderRadius: 12,
                overflow: 'hidden',
              }}>
                {[
                  { name: 'Luna', species: 'Felina · 4 a', owner: 'Carla Mendoza', motivo: 'Control vacunación', date: 'Hoy · 09:30', status: 'En curso', variant: 'amatista' },
                  { name: 'Rocco', species: 'Canino · 7 a', owner: 'Luis Paredes', motivo: 'Cojera pata trasera', date: 'Hoy · 11:00', status: 'Programada', variant: 'wait' },
                  { name: 'Mishi', species: 'Felina · 2 a', owner: 'Andrea Solís', motivo: 'Esterilización post-op', date: 'Ayer · 16:20', status: 'Completada', variant: 'ok' },
                  { name: 'Toby', species: 'Canino · 11 a', owner: 'Jorge Vargas', motivo: 'Chequeo geriátrico', date: 'Ayer · 14:00', status: 'Completada', variant: 'ok' },
                ].map((r, i, arr) => (
                  <div key={r.name} style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1.4fr 1fr 1fr 1fr auto',
                    gap: 14, alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--warm-150)',
                    fontSize: 13,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'var(--amatista-100)',
                      color: 'var(--amatista-700)',
                      display: 'grid', placeItems: 'center',
                    }}><IconPaw size={16} /></div>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--warm-900)' }}>{r.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--warm-500)' }}>{r.species}</div>
                    </div>
                    <div style={{ color: 'var(--warm-600)', fontSize: 12.5 }}>{r.owner}</div>
                    <div style={{ color: 'var(--warm-600)', fontSize: 12.5 }}>{r.motivo}</div>
                    <div style={{ color: 'var(--warm-600)', fontSize: 12.5 }}>{r.date}</div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 11, padding: '3px 8px', borderRadius: 999,
                      background: r.variant === 'ok' ? 'oklch(94% 0.04 145)' : r.variant === 'wait' ? 'var(--warm-150)' : 'var(--amatista-100)',
                      color:      r.variant === 'ok' ? 'oklch(40% 0.10 145)' : r.variant === 'wait' ? 'var(--warm-600)' : 'var(--amatista-700)',
                      fontWeight: 500,
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background:
                          r.variant === 'ok' ? 'oklch(55% 0.15 145)' :
                          r.variant === 'wait' ? 'var(--warm-500)' :
                          'var(--amatista-600)',
                      }} />
                      {r.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Apariencia">
          <TweakSlider label="Tono amatista (hue)" value={t.hue} min={260} max={340} step={1} onChange={(v) => setTweak('hue', v)} />
          <TweakRadio label="Sidebar" value={t.sidebarTone} options={[{value: 'dark', label: 'Oscuro'}, {value: 'light', label: 'Claro'}]} onChange={(v) => setTweak('sidebarTone', v)} />
          <TweakRadio label="Densidad" value={t.density} options={[{value: 'comfortable', label: 'Cómoda'}, {value: 'compact', label: 'Compacta'}]} onChange={(v) => setTweak('density', v)} />
        </TweakSection>

        <TweakSection title="Saludo">
          <TweakSelect label="Estilo" value={t.greetingStyle} options={[
            {value: 'serif-italic', label: 'Serif con itálica'},
            {value: 'serif', label: 'Serif simple'},
            {value: 'sans', label: 'Sans con emoji'},
          ]} onChange={(v) => setTweak('greetingStyle', v)} />
          <TweakText label="Nombre" value={t.userName} onChange={(v) => setTweak('userName', v)} />
          <TweakText label="Rol" value={t.userRole} onChange={(v) => setTweak('userRole', v)} />
          <TweakText label="Clínica" value={t.clinicName} onChange={(v) => setTweak('clinicName', v)} />
        </TweakSection>

        <TweakSection title="CTA principal">
          <TweakRadio label="Estilo" value={t.ctaStyle} options={[
            {value: 'gradient', label: 'Gradiente'},
            {value: 'solid', label: 'Sólido'},
            {value: 'outline', label: 'Outline'},
          ]} onChange={(v) => setTweak('ctaStyle', v)} />
        </TweakSection>

        <TweakSection title="Secciones">
          <TweakToggle label="Banner consulta activa" value={t.showActiveBanner} onChange={(v) => setTweak('showActiveBanner', v)} />
          <TweakToggle label="Mostrar stats del día" value={t.showStats} onChange={(v) => setTweak('showStats', v)} />
          <TweakToggle label="Mostrar consultas recientes" value={t.showRecent} onChange={(v) => setTweak('showRecent', v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

const iconBtn = {
  width: 34, height: 34, borderRadius: 8,
  border: '1px solid var(--warm-200)',
  background: 'var(--warm-50)',
  color: 'var(--warm-600)',
  display: 'grid', placeItems: 'center', cursor: 'pointer',
};

ReactDOM.createRoot(document.getElementById('root')).render(<VetrinaApp />);
