// Componentes compartidos del flujo Nueva Consulta
// Wizard shell, stepper, form fields, etc.

const flowTokens = {
  bg: 'var(--warm-100)',
  surface: 'var(--warm-50)',
  surface2: 'var(--warm-150)',
  border: 'var(--warm-200)',
  borderStrong: 'var(--warm-300)',
  text: 'var(--warm-900)',
  textMuted: 'var(--warm-600)',
  textSubtle: 'var(--warm-500)',
  accent: 'var(--amatista-700)',
  accentBg: 'var(--amatista-100)',
  accentBg2: 'var(--amatista-50)',
  font: 'Geist, sans-serif',
};

// ─── Wizard Shell (sidebar + topbar minimal + stepper + content) ───
function WizardShell({ step, onCancel, children, stepperKind = 'top' }) {
  const steps = [
    { n: 1, label: 'Propietario' },
    { n: 2, label: 'Mascota' },
    { n: 3, label: 'Consulta' },
    { n: 4, label: 'Resumen' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: flowTokens.bg,
      fontFamily: flowTokens.font,
      color: flowTokens.text,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top header */}
      <header style={{
        height: 60, padding: '0 28px',
        background: flowTokens.surface,
        borderBottom: `1px solid ${flowTokens.border}`,
        display: 'flex', alignItems: 'center', gap: 16,
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          color: flowTokens.textMuted, fontSize: 13,
          cursor: 'pointer',
        }}>
          <IconArrowLeft size={15} />
          <span>Volver a inicio</span>
        </div>
        <div style={{ width: 1, height: 22, background: flowTokens.border, margin: '0 6px' }} />
        <div style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: 22, letterSpacing: '-0.01em',
          color: flowTokens.text,
        }}>
          Nueva consulta
        </div>
        <div style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 999,
          background: flowTokens.accentBg, color: flowTokens.accent,
          letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500,
          marginLeft: 4,
        }}>
          Borrador
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={onCancel} style={{
            background: 'transparent', border: 'none',
            color: flowTokens.textMuted, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 10px',
          }}>
            <IconX size={14} /> Cancelar
          </button>
        </div>
      </header>

      {/* Stepper */}
      <div style={{
        padding: '20px 48px 16px',
        background: flowTokens.surface,
        borderBottom: `1px solid ${flowTokens.border}`,
        flexShrink: 0,
      }}>
        <Stepper steps={steps} active={step} />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

function Stepper({ steps, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: 0, maxWidth: 720, margin: '0 auto',
    }}>
      {steps.map((s, i) => {
        const done = s.n < active;
        const current = s.n === active;
        const future = s.n > active;
        return (
          <React.Fragment key={s.n}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              flexShrink: 0,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: current ? flowTokens.accent : done ? flowTokens.accentBg : flowTokens.surface2,
                color: current ? 'white' : done ? flowTokens.accent : flowTokens.textSubtle,
                display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 600,
                border: current ? 'none' : `1px solid ${done ? 'transparent' : flowTokens.border}`,
                transition: 'all .2s',
              }}>
                {done ? <IconCheck size={13} /> : s.n}
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: current ? 600 : 400,
                color: current ? flowTokens.text : done ? flowTokens.textMuted : flowTokens.textSubtle,
                letterSpacing: '-0.005em',
              }}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 1, margin: '0 14px',
                background: done ? flowTokens.accent : flowTokens.border,
                opacity: done ? 0.4 : 1,
                minWidth: 24,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Footer with Atrás / Siguiente ───
function WizardFooter({ onBack, onNext, nextLabel = 'Siguiente', nextDisabled = false, nextVariant = 'primary', extra }) {
  return (
    <div style={{
      borderTop: `1px solid ${flowTokens.border}`,
      background: flowTokens.surface,
      padding: '14px 48px',
      display: 'flex', alignItems: 'center', gap: 10,
      flexShrink: 0,
    }}>
      {onBack && (
        <button style={{
          background: 'transparent', border: `1px solid ${flowTokens.border}`,
          padding: '9px 16px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
          color: flowTokens.text, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <IconArrowLeft size={13} /> Atrás
        </button>
      )}
      {extra}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <button disabled={nextDisabled} style={{
          background: nextDisabled ? flowTokens.surface2 : nextVariant === 'success' ? 'oklch(50% 0.15 145)' : flowTokens.accent,
          color: nextDisabled ? flowTokens.textSubtle : 'white',
          border: 'none', padding: '9px 18px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {nextLabel} <IconArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Field primitives ───
function Field({ label, required, hint, children, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: flowTokens.text, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {required && <span style={{ color: 'oklch(55% 0.18 25)' }}>*</span>}
      </label>
      {children}
      {hint && !error && <div style={{ fontSize: 11.5, color: flowTokens.textSubtle }}>{hint}</div>}
      {error && <div style={{ fontSize: 11.5, color: 'oklch(55% 0.18 25)', display: 'flex', gap: 4, alignItems: 'center' }}><IconAlert size={11}/> {error}</div>}
    </div>
  );
}

function Input({ value, placeholder, icon: Ico, suffix }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: flowTokens.surface,
      border: `1px solid ${flowTokens.border}`,
      borderRadius: 8, padding: '8px 12px',
      fontSize: 13.5,
    }}>
      {Ico && <Ico size={14} style={{ color: flowTokens.textSubtle }} />}
      <span style={{ flex: 1, color: value ? flowTokens.text : flowTokens.textSubtle }}>
        {value || placeholder}
      </span>
      {suffix}
    </div>
  );
}

function Select({ value, placeholder }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: flowTokens.surface,
      border: `1px solid ${flowTokens.border}`,
      borderRadius: 8, padding: '8px 12px',
      fontSize: 13.5,
    }}>
      <span style={{ flex: 1, color: value ? flowTokens.text : flowTokens.textSubtle }}>
        {value || placeholder}
      </span>
      <IconChevronDown size={13} style={{ color: flowTokens.textSubtle }} />
    </div>
  );
}

function Textarea({ value, placeholder, rows = 4 }) {
  return (
    <div style={{
      background: flowTokens.surface,
      border: `1px solid ${flowTokens.border}`,
      borderRadius: 8, padding: '10px 12px',
      fontSize: 13.5, lineHeight: 1.55,
      color: value ? flowTokens.text : flowTokens.textSubtle,
      minHeight: rows * 18 + 20,
      whiteSpace: 'pre-wrap',
    }}>
      {value || placeholder}
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Ico, children, action, padded = true, accent = false }) {
  return (
    <div style={{
      background: flowTokens.surface,
      border: `1px solid ${flowTokens.border}`,
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {(title || subtitle) && (
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${flowTokens.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {Ico && (
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: accent ? flowTokens.accent : flowTokens.accentBg,
              color: accent ? 'white' : flowTokens.accent,
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <Ico size={16} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: flowTokens.text }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: flowTokens.textMuted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={padded ? { padding: 20 } : {}}>
        {children}
      </div>
    </div>
  );
}

function Chip({ children, variant = 'neutral' }) {
  const v = {
    neutral: { bg: flowTokens.surface2, fg: flowTokens.textMuted },
    accent: { bg: flowTokens.accentBg, fg: flowTokens.accent },
    success: { bg: 'oklch(94% 0.04 145)', fg: 'oklch(40% 0.10 145)' },
    warn: { bg: 'oklch(94% 0.05 80)', fg: 'oklch(40% 0.12 80)' },
  }[variant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, padding: '2px 8px',
      borderRadius: 999,
      background: v.bg, color: v.fg,
      fontWeight: 500,
    }}>{children}</span>
  );
}

function PageHeading({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 22, fontWeight: 500,
        letterSpacing: '-0.015em', color: flowTokens.text,
        marginBottom: 4,
      }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13.5, color: flowTokens.textMuted }}>{subtitle}</div>}
    </div>
  );
}

function ContentWrap({ children, maxWidth = 1280 }) {
  return (
    <div style={{ flex: 1, padding: '24px 28px', overflow: 'auto' }}>
      <div style={{ maxWidth, margin: '0 auto', width: '100%' }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, {
  flowTokens, WizardShell, Stepper, WizardFooter,
  Field, Input, Select, Textarea, SectionCard, Chip, PageHeading, ContentWrap,
});
