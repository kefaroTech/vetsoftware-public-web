// ============ REGISTRO · Flujo (orquestador + pantallas 2 y 3) ============
// Registro → "Revisa tu correo" → Verificación de correo. Sin auto-login.

// --- Shell común: fondo + top bar + footer ---
function RegShell({ children, footerCenter }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'radial-gradient(ellipse at top,#f3e8ff 0%,#f5f1fa 50%,#ede8f4 100%)', fontFamily: "'Inter',sans-serif", color: '#1a1325', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: -160, right: -140, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(192,132,252,.24),transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -160, left: -140, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,.16),transparent 62%)', pointerEvents: 'none' }} />

      <header style={{ position: 'relative', padding: '22px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <a href="Inicio.html" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#1a1325' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#a855f7,#581c87)', display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 2px 6px -1px rgba(126,34,206,.4)' }}><IconPaw size={16} stroke={2} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em' }}>VetSoftware</span>
        </a>
        <div style={{ fontSize: 13, color: '#6b5b80' }}>¿Ya tienes cuenta? <a href="Login.html" style={{ color: AME, fontWeight: 600, textDecoration: 'none' }}>Inicia sesión</a></div>
      </header>

      <main style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 24px 12px', minHeight: 0 }}>
        {children}
      </main>

      <footer style={{ position: 'relative', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: footerCenter ? 'center' : 'space-between', fontSize: 12, color: '#8578a0', flexShrink: 0 }}>
        <span>© 2026 VetSoftware · Colombia</span>
        {!footerCenter && <a href="Inicio.html" style={{ color: '#8578a0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconArrowLeft size={13} stroke={2} /> Volver al inicio</a>}
      </footer>
    </div>
  );
}

// --- Tarjeta centrada reutilizable (pantallas 2 y 3) ---
function CenterCard({ maxWidth, iconNode, title, children, className }) {
  return (
    <div className={className} style={{
      width: '100%', maxWidth, textAlign: 'center',
      background: '#fff', borderRadius: 16, border: '1px solid #ece5f4',
      boxShadow: '0 24px 48px -18px rgba(91,33,182,.18), 0 4px 12px -4px rgba(91,33,182,.07)',
      padding: 'clamp(30px,5vw,46px) clamp(26px,5vw,44px)',
    }}>
      {iconNode}
      <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 30, fontWeight: 400, margin: '18px 0 0', letterSpacing: '-.02em', lineHeight: 1.08 }}>{title}</h1>
      {children}
    </div>
  );
}

function PrimaryBtn({ children, onClick, as = 'button', href }) {
  const style = {
    width: '100%', padding: '13px 16px', borderRadius: 9,
    background: 'linear-gradient(180deg,#9333ea,#7e22ce)', color: '#fff',
    border: 'none', cursor: 'pointer', fontSize: 14.5, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)',
    transition: 'transform .12s, box-shadow .15s',
  };
  const hoverIn = (e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(126,34,206,.5), inset 0 1px 0 rgba(255,255,255,.15)'; };
  const hoverOut = (e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)'; };
  if (as === 'a') return <a href={href} style={style} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>{children}</a>;
  return <button type="button" onClick={onClick} style={style} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>{children}</button>;
}

function TextBtn({ children, onClick, href, as = 'button' }) {
  const style = { background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b5b80', fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
  if (as === 'a') return <a href={href} style={style}>{children}</a>;
  return <button type="button" onClick={onClick} style={style}>{children}</button>;
}

// --- PANTALLA 2 — Revisa tu correo ---
function CheckEmailScreen({ email, onGoLogin, onSimulateLink }) {
  const [resent, setResent] = React.useState(false);
  return (
    <CenterCard maxWidth={560} className="reveal"
      iconNode={
        <div style={{ width: 74, height: 74, margin: '0 auto', borderRadius: 18, background: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)', border: '1px solid #ecd9fb', display: 'grid', placeItems: 'center', color: AME }}>
          <IconMailCheck size={36} stroke={1.6} />
        </div>
      }
      title="Revisa tu correo">
      <p style={{ fontSize: 14.5, color: '#4a3d63', lineHeight: 1.6, margin: '12px auto 0', maxWidth: 420 }}>
        Te enviamos un enlace de verificación a <strong style={{ color: '#1a1325' }}>{email}</strong>. Ábrelo para activar tu cuenta; después podrás iniciar sesión.
      </p>
      <p style={{ fontSize: 12.5, color: '#8578a0', lineHeight: 1.55, margin: '14px auto 0', maxWidth: 400 }}>
        ¿No lo ves? Revisa la carpeta de spam. El enlace vence en unas horas.
      </p>
      <div style={{ marginTop: 26 }}>
        <PrimaryBtn onClick={onGoLogin}>Ir a iniciar sesión</PrimaryBtn>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <TextBtn onClick={() => setResent(true)}>
          {resent
            ? <span style={{ color: AME, display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconCheck size={14} stroke={2.2} /> Correo reenviado</span>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconRefresh size={14} stroke={1.9} /> Reenviar correo</span>}
        </TextBtn>
        {/* Demo: simular clic en el enlace del email */}
        <TextBtn onClick={onSimulateLink}><span style={{ color: '#a08bbd' }}>▸ Simular clic en el enlace del correo</span></TextBtn>
      </div>
    </CenterCard>
  );
}

// --- PANTALLA 3 — Verificación (3 estados) ---
function VerifyScreen({ initial = 'loading', onGoLogin, onRestart }) {
  const [state, setState] = React.useState(initial); // loading | success | error

  React.useEffect(() => {
    if (state === 'loading') {
      const t = setTimeout(() => setState('success'), 1900);
      return () => clearTimeout(t);
    }
  }, [state]);

  let iconNode, title, body, actions;
  if (state === 'loading') {
    iconNode = <div style={{ width: 74, height: 74, margin: '0 auto', display: 'grid', placeItems: 'center' }}>
      <span className="reg-spin" style={{ width: 46, height: 46, border: '4px solid #e9d5ff', borderTopColor: AME, borderRadius: '50%', display: 'block' }} />
    </div>;
    title = 'Verificando tu cuenta…';
    body = <p style={{ fontSize: 14.5, color: '#4a3d63', lineHeight: 1.6, margin: '12px auto 0', maxWidth: 380 }}>Un momento, estamos confirmando tu correo.</p>;
  } else if (state === 'success') {
    iconNode = <div style={{ width: 74, height: 74, margin: '0 auto', borderRadius: '50%', background: '#ecfdf3', border: '1px solid #bbf7d0', display: 'grid', placeItems: 'center', color: '#16a34a' }}>
      <IconCheckCircle size={40} stroke={1.7} />
    </div>;
    title = '¡Cuenta verificada!';
    body = <p style={{ fontSize: 14.5, color: '#4a3d63', lineHeight: 1.6, margin: '12px auto 0', maxWidth: 380 }}>Tu correo quedó confirmado. Ya puedes iniciar sesión.</p>;
    actions = <div style={{ marginTop: 26 }}><PrimaryBtn onClick={onGoLogin}>Iniciar sesión</PrimaryBtn></div>;
  } else {
    iconNode = <div style={{ width: 74, height: 74, margin: '0 auto', borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'grid', placeItems: 'center', color: ERR }}>
      <IconAlertCircle size={40} stroke={1.7} />
    </div>;
    title = 'No pudimos verificar';
    body = <p style={{ fontSize: 14.5, color: '#4a3d63', lineHeight: 1.6, margin: '12px auto 0', maxWidth: 380 }}>El enlace de verificación no es válido o expiró.</p>;
    actions = <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PrimaryBtn onClick={onRestart}>Volver a registrarme</PrimaryBtn>
      <TextBtn onClick={onGoLogin}>Ir a iniciar sesión</TextBtn>
    </div>;
  }

  return (
    <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <CenterCard maxWidth={520} className="reveal" iconNode={iconNode} title={title}>
        {body}
        {actions}
      </CenterCard>
      {/* Demo: previsualizar estados */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 11.5, color: '#a08bbd' }}>
        <span>Vista previa:</span>
        {[['loading', 'Verificando'], ['success', 'Éxito'], ['error', 'Error']].map(([s, lab]) => (
          <button key={s} type="button" onClick={() => setState(s)} style={{
            border: `1px solid ${state === s ? '#d6c8ea' : 'transparent'}`, borderRadius: 999,
            background: state === s ? '#fff' : 'transparent', color: state === s ? AME : '#a08bbd',
            fontSize: 11.5, fontWeight: 600, padding: '3px 10px', cursor: 'pointer',
          }}>{lab}</button>
        ))}
      </div>
    </div>
  );
}

// --- Orquestador ---
function RegistroFlow() {
  const startVerify = typeof window !== 'undefined' && /verify|verificar/i.test(window.location.hash);
  const [screen, setScreen] = React.useState(startVerify ? 'verify' : 'form'); // form | check | verify
  const [email, setEmail] = React.useState('tu correo');

  const goLogin = () => { window.location.href = 'Login.html'; };
  const restart = () => { window.location.hash = ''; setScreen('form'); };

  if (screen === 'form') {
    return (
      <RegShell>
        <div key="form" className="reveal" style={{ width: '100%', height: '100%', display: 'flex' }}>
          <RegisterForm onSuccess={(em) => { setEmail(em); setScreen('check'); }} />
        </div>
      </RegShell>
    );
  }
  if (screen === 'check') {
    return (
      <RegShell footerCenter>
        <CheckEmailScreen email={email} onGoLogin={goLogin} onSimulateLink={() => setScreen('verify')} />
      </RegShell>
    );
  }
  return (
    <RegShell footerCenter>
      <VerifyScreen onGoLogin={goLogin} onRestart={restart} />
    </RegShell>
  );
}

window.RegistroFlow = RegistroFlow;
