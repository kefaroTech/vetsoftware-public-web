// Shell compartido (sidebar + header + banner consulta activa)
function Shell({ children, activeSubItem, showBanner = true }) {
  const dark = true;
  const sidebarBg = 'linear-gradient(180deg, oklch(28% 0.10 var(--hue)) 0%, oklch(22% 0.08 var(--hue)) 100%)';
  const sidebarColor = 'oklch(94% 0.02 var(--hue))';

  const navItem = (active, disabled) => ({
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '9px 10px', borderRadius: 8, fontSize: 13.5,
    color: active ? 'oklch(98% 0.01 var(--hue))' : disabled ? 'oklch(70% 0.03 var(--hue) / 0.4)' : 'oklch(88% 0.03 var(--hue) / 0.85)',
    background: active ? 'oklch(45% 0.16 var(--hue) / 0.4)' : 'transparent',
    boxShadow: active ? '0 0 0 1px oklch(70% 0.14 var(--hue) / 0.3) inset' : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? 500 : 400,
  });

  const subItem = (active) => ({
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '7px 10px', borderRadius: 6, fontSize: 12.5,
    color: active ? 'oklch(95% 0.02 var(--hue))' : 'oklch(82% 0.04 var(--hue) / 0.72)',
    background: active ? 'oklch(50% 0.10 var(--hue) / 0.25)' : 'transparent',
    fontWeight: active ? 500 : 400, cursor: 'pointer',
  });

  const navLabel = {
    fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'oklch(75% 0.04 var(--hue) / 0.55)',
    padding: '14px 10px 8px',
  };

  const badge = {
    marginLeft: 'auto', fontSize: 9.5, padding: '2px 6px',
    background: 'oklch(70% 0.04 var(--hue) / 0.18)',
    color: 'oklch(78% 0.04 var(--hue) / 0.7)',
    borderRadius: 4, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500,
  };

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--warm-100)', color: 'var(--warm-900)',
      fontFamily: 'Geist, sans-serif', overflow: 'hidden',
    }}>
      <aside style={{
        width: 248, flexShrink: 0,
        background: sidebarBg, color: sidebarColor,
        display: 'flex', flexDirection: 'column',
        padding: '20px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 22px 8px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'oklch(72% 0.16 var(--hue))',
            display: 'grid', placeItems: 'center',
            color: 'oklch(20% 0.05 var(--hue))', fontWeight: 700,
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
          }}>V</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Vetrina</div>
            <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>Clínica Norte</div>
          </div>
        </div>

        <div style={navLabel}>Trabajo</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={navItem(true, false)}>
            <IconConsulta size={17} />
            <span>Consulta</span>
            <IconChevronDown size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
          </div>
          <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2, marginBottom: 6 }}>
            {[
              ['nueva', 'Nueva consulta', IconNueva],
              ['historial', 'Historial clínico', IconHistorial],
              ['vacunacion', 'Plan de vacunación', IconVacuna],
              ['hospital', 'Hospitalización', IconPaw],
            ].map(([id, label, Ico]) => (
              <div key={id} style={subItem(activeSubItem === id)}>
                <Ico size={14} /><span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={navLabel}>Próximamente</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[['Pacientes', IconPaciente], ['Agenda', IconAgenda], ['Inventario', IconInventario], ['Facturación', IconFacturacion], ['Reportes', IconReportes]].map(([label, Ico]) => (
            <div key={label} style={navItem(false, true)}>
              <Ico size={17} /><span>{label}</span><span style={badge}>Pronto</span>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10,
          padding: 10, borderRadius: 10,
          background: 'oklch(35% 0.10 var(--hue) / 0.4)', cursor: 'pointer',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))',
            display: 'grid', placeItems: 'center', fontWeight: 600, color: 'white', fontSize: 12,
          }}>MR</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>Dra. Mariana</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Veterinaria</div>
          </div>
          <IconChevronDown size={14} style={{ opacity: 0.5 }} />
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height: 60, borderBottom: '1px solid var(--warm-200)',
          background: 'var(--warm-50)',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--warm-150)', border: '1px solid var(--warm-200)',
            borderRadius: 8, padding: '7px 12px',
            width: 320, color: 'var(--warm-500)', fontSize: 13,
          }}>
            <IconSearch size={15} />
            <span style={{ flex: 1 }}>Buscar paciente, dueño, código…</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              padding: '2px 6px', background: 'var(--warm-50)',
              border: '1px solid var(--warm-200)', borderRadius: 4, color: 'var(--warm-600)',
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
            }}>MR</div>
          </div>
        </header>

        {showBanner && <ConsultaBanner />}

        {children}
      </div>
    </div>
  );
}

function ConsultaBanner() {
  return (
    <div style={{
      background: 'linear-gradient(90deg, oklch(42% 0.16 var(--hue)) 0%, oklch(50% 0.18 var(--hue)) 60%, oklch(58% 0.18 var(--hue)) 100%)',
      color: 'white', padding: '11px 28px',
      display: 'flex', alignItems: 'center', gap: 14,
      fontSize: 13, position: 'relative', overflow: 'hidden', cursor: 'pointer',
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
          background: 'oklch(100% 0 0 / 0.18)', border: '1px solid oklch(100% 0 0 / 0.22)',
          padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 500,
        }}>🐕 Luna · Golden Retriever</span>
        <span style={{ opacity: 0.78, fontSize: 12 }}>Carlos Méndez</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ opacity: 0.78, fontSize: 12 }}>iniciada hace 32 min</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        <button style={{
          background: 'white', color: 'oklch(32% 0.12 var(--hue))',
          border: 'none', borderRadius: 6, padding: '5px 12px',
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>Reanudar →</button>
      </div>
    </div>
  );
}

const iconBtn = {
  width: 34, height: 34, borderRadius: 8,
  border: '1px solid var(--warm-200)', background: 'var(--warm-50)',
  color: 'var(--warm-600)', display: 'grid', placeItems: 'center', cursor: 'pointer',
};

Object.assign(window, { Shell, ConsultaBanner, iconBtn });
