// ============ PÁGINA PRINCIPAL / DECISIÓN (ingresar o registrarse) ============
// Sobria y moderna: fondo amatista, blobs a la deriva, glow que sigue el cursor,
// dos rutas claras (Iniciar sesión / Crear cuenta) con microinteracciones.

function Landing() {
  const [pointer, setPointer] = React.useState({ x: 0.5, y: 0.35 });
  const [hover, setHover] = React.useState(''); // '' | 'login' | 'signup'
  const stageRef = React.useRef(null);

  const onMove = (e) => {
    const r = stageRef.current.getBoundingClientRect();
    setPointer({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  };

  const glowX = 50 + (pointer.x - 0.5) * 40;
  const glowY = 30 + (pointer.y - 0.5) * 30;

  return (
    <div
      ref={stageRef}
      onMouseMove={onMove}
      style={{
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
        background: 'radial-gradient(ellipse at top,#f3e8ff 0%,#f5f1fa 48%,#ede8f4 100%)',
        fontFamily: "'Inter',sans-serif", color: '#1a1325',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Glow que sigue al cursor */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(560px circle at ${glowX}% ${glowY}%, rgba(168,85,247,.18), transparent 62%)`,
        transition: 'background .18s ease-out',
      }} />
      {/* Blobs a la deriva */}
      <div className="blob" style={{ top: -160, right: -120, width: 480, height: 480, background: 'radial-gradient(circle,rgba(192,132,252,.30),transparent 60%)', animationDelay: '0s' }} />
      <div className="blob" style={{ bottom: -180, left: -140, width: 520, height: 520, background: 'radial-gradient(circle,rgba(147,51,234,.20),transparent 62%)', animationDelay: '-7s' }} />
      <div className="blob" style={{ top: '40%', left: '52%', width: 340, height: 340, background: 'radial-gradient(circle,rgba(216,180,254,.28),transparent 60%)', animationDelay: '-3.5s' }} />
      {/* Grid sutil */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .5,
        backgroundImage: 'linear-gradient(rgba(126,34,206,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(126,34,206,.045) 1px,transparent 1px)',
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(ellipse at center,#000 30%,transparent 78%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center,#000 30%,transparent 78%)',
      }} />

      {/* Top bar */}
      <header style={{ position: 'relative', padding: '26px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#a855f7,#581c87)', display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 4px 10px -2px rgba(126,34,206,.45)' }}>
            <IconPaw size={17} stroke={2} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' }}>VetSoftware</span>
        </div>
        <a href="Login.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#3d2e57', textDecoration: 'none', padding: '9px 15px', borderRadius: 9, border: '1px solid #e6ddf0', background: 'rgba(255,255,255,.6)', backdropFilter: 'blur(6px)', transition: 'all .16s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#d6c8ea'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.6)'; e.currentTarget.style.borderColor = '#e6ddf0'; }}>
          Iniciar sesión <IconArrow size={13} stroke={2.2} />
        </a>
      </header>

      {/* Contenido */}
      <main style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 24px 8px', textAlign: 'center', minHeight: 0 }}>
        <div className="reveal" style={{ animationDelay: '.05s', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 13px', borderRadius: 999, background: 'rgba(255,255,255,.7)', border: '1px solid #ecd9fb', fontSize: 12, fontWeight: 600, letterSpacing: '.04em', color: '#7e22ce', textTransform: 'uppercase' }}>
          <IconSparkle size={13} stroke={1.9} /> Plataforma de gestión veterinaria
        </div>

        <h1 className="reveal" style={{ animationDelay: '.12s', fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 'clamp(38px,5.4vw,64px)', lineHeight: 1.12, letterSpacing: '-.02em', margin: '22px 0 0', maxWidth: 820, textWrap: 'balance' }}>
          Todo tu centro veterinario,<br /><span style={{ fontStyle: 'italic', color: '#7e22ce' }}>en un solo panel.</span>
        </h1>

        <p className="reveal" style={{ animationDelay: '.19s', fontSize: 16, lineHeight: 1.55, color: '#6b5b80', margin: '20px 0 0', maxWidth: 500 }}>
          Administra clínicas, empleados, membresías y permisos desde una sola plataforma clara y segura. Comienza en segundos.
        </p>

        {/* Rutas */}
        <div className="reveal" style={{ animationDelay: '.28s', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 40, width: '100%', maxWidth: 720 }}>
          <ChoiceCard
            href="Registro.html"
            primary
            active={hover === 'signup'}
            onEnter={() => setHover('signup')}
            onLeave={() => setHover('')}
            icon={IconSparkle}
            kicker="Nuevo aquí"
            title="Crear cuenta"
            desc="Registra tu centro y empieza a operar hoy mismo."
            cta="Registrarme"
          />
          <ChoiceCard
            href="Login.html"
            active={hover === 'login'}
            onEnter={() => setHover('login')}
            onLeave={() => setHover('')}
            icon={IconShieldCheck}
            kicker="Ya tengo cuenta"
            title="Iniciar sesión"
            desc="Accede a tu panel administrativo de siempre."
            cta="Entrar"
          />
        </div>

        {/* Confianza */}
        <div className="reveal" style={{ animationDelay: '.38s', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 34, fontSize: 12.5, color: '#8578a0' }}>
          {[[IconBuilding, 'Multiclínica'], [IconUsers, 'Gestión de equipo'], [IconShieldCheck, 'Datos cifrados']].map(([Ico, label], i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Ico size={15} stroke={1.7} style={{ color: '#a855f7' }} /> {label}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ position: 'relative', padding: '18px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#8578a0', flexShrink: 0 }}>
        <span>© 2026 VetSoftware</span>
        <div style={{ display: 'flex', gap: 18 }}>
          <a href="#" onClick={e => e.preventDefault()} style={{ color: '#8578a0', textDecoration: 'none' }}>Privacidad</a>
          <a href="#" onClick={e => e.preventDefault()} style={{ color: '#8578a0', textDecoration: 'none' }}>Términos</a>
          <a href="#" onClick={e => e.preventDefault()} style={{ color: '#8578a0', textDecoration: 'none' }}>Soporte</a>
        </div>
      </footer>
    </div>
  );
}

function ChoiceCard({ href, primary, active, onEnter, onLeave, icon, kicker, title, desc, cta }) {
  const Ico = icon;
  const base = {
    position: 'relative', overflow: 'hidden', textAlign: 'left', textDecoration: 'none',
    display: 'flex', flexDirection: 'column', gap: 0,
    padding: '24px 24px 22px', borderRadius: 16,
    transition: 'transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s, border-color .2s',
    transform: active ? 'translateY(-4px)' : 'translateY(0)',
  };
  const style = primary
    ? { ...base,
        background: 'linear-gradient(160deg,#9333ea,#7e22ce 70%,#6b1fa8)',
        color: '#fff', border: '1px solid transparent',
        boxShadow: active ? '0 22px 44px -14px rgba(126,34,206,.55)' : '0 12px 28px -12px rgba(126,34,206,.4)' }
    : { ...base,
        background: '#fff', color: '#1a1325', border: `1px solid ${active ? '#d6c8ea' : '#ece5f4'}`,
        boxShadow: active ? '0 22px 44px -16px rgba(91,33,182,.22)' : '0 8px 20px -12px rgba(91,33,182,.12)' };

  return (
    <a href={href} onMouseEnter={onEnter} onMouseLeave={onLeave} style={style}>
      {primary && (
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,.18),transparent 65%)', pointerEvents: 'none', transform: active ? 'scale(1.15)' : 'scale(1)', transition: 'transform .3s' }} />
      )}
      <div style={{
        width: 42, height: 42, borderRadius: 11, display: 'grid', placeItems: 'center', marginBottom: 16,
        background: primary ? 'rgba(255,255,255,.16)' : 'linear-gradient(135deg,#f3e8ff,#e9d5ff)',
        color: primary ? '#fff' : '#7e22ce',
        border: primary ? '1px solid rgba(255,255,255,.22)' : '1px solid #ecd9fb',
      }}>
        <Ico size={20} stroke={1.9} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: primary ? 'rgba(255,255,255,.7)' : '#a08bbd', marginBottom: 5 }}>{kicker}</div>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.01em' }}>{title}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 7, color: primary ? 'rgba(255,255,255,.82)' : '#6b5b80' }}>{desc}</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 18, fontSize: 13.5, fontWeight: 600, color: primary ? '#fff' : '#7e22ce' }}>
        {cta}
        <span style={{ display: 'inline-flex', transform: active ? 'translateX(4px)' : 'translateX(0)', transition: 'transform .2s' }}>
          <IconArrow size={14} stroke={2.2} />
        </span>
      </div>
    </a>
  );
}

window.Landing = Landing;
