// Variación 2 — CARD CENTRADA
// Card minimalista flotando sobre fondo amatista suave.
// Login limpio y enfocado.

function LoginCentered() {
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [showPwd, setShowPwd] = React.useState(false);
  const [focus, setFocus] = React.useState('');
  const [unverified, setUnverified] = React.useState(false);

  const submit = (e) => {
    if (e) e.preventDefault();
    // Estado extra: cuenta no verificada (demo → correo con "pendiente")
    setUnverified(/pendiente/i.test(email));
  };

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      position: 'relative',
      background: 'radial-gradient(ellipse at top, #f3e8ff 0%, #f5f1fa 50%, #ede8f4 100%)',
      fontFamily: "'Inter',sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: -150, right: -150,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(192,132,252,.25), transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -150, left: -150,
        width: 450, height: 450, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,.18), transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* Top bar */}
      <div style={{
        padding: '24px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #a855f7, #581c87)',
            display: 'grid', placeItems: 'center', color: '#fff',
            boxShadow: '0 2px 6px -1px rgba(126,34,206,.4)',
          }}>
            <IconPaw size={16} stroke={2} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em' }}>VetSoftware</span>
        </div>
        <div style={{ fontSize: 13, color: '#6b5b80' }}>
          ¿Eres nuevo? <a href="Registro.html" style={{ color: '#7e22ce', fontWeight: 600, textDecoration: 'none' }}>Crea una cuenta</a>
        </div>
      </div>

      {/* Card */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        position: 'relative',
      }}>
        <div style={{
          width: '100%', maxWidth: 440,
          background: '#fff',
          borderRadius: 16,
          padding: '40px 44px',
          border: '1px solid #ece5f4',
          boxShadow: '0 24px 48px -16px rgba(91,33,182,.18), 0 4px 12px -4px rgba(91,33,182,.08)',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#7e22ce',
            letterSpacing: '.1em', textTransform: 'uppercase',
            marginBottom: 8,
          }}>Panel administrativo</div>
          <h1 style={{
            fontFamily: "'Instrument Serif',serif",
            fontSize: 34, fontWeight: 400, margin: 0,
            letterSpacing: '-.02em', lineHeight: 1.05,
          }}>Inicia sesión</h1>
          <p style={{
            fontSize: 13, color: '#6b5b80',
            margin: '10px 0 28px', lineHeight: 1.5,
          }}>Accede al panel para administrar VetSoftware.</p>

          {unverified && (
            <div role="alert" style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px',
              margin: '0 0 20px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, color: '#b91c1c', fontSize: 13, lineHeight: 1.45,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
              <div style={{ flex: 1 }}>Tu cuenta aún no está verificada. Abre el enlace que te enviamos por correo para activarla. <a href="Registro.html#verify" style={{ color: '#b91c1c', fontWeight: 600 }}>Reenviar enlace</a></div>
              <button type="button" onClick={() => setUnverified(false)} aria-label="Cerrar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#b91c1c', opacity: .7, padding: 0, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField
              label="Correo electrónico"
              icon={IconMail}
              type="email"
              placeholder="admin@vetsoftware.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              focused={focus === 'email'}
              onFocus={() => setFocus('email')}
              onBlur={() => setFocus('')}
            />
            <FormField
              label="Contraseña"
              icon={IconLock}
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              focused={focus === 'pwd'}
              onFocus={() => setFocus('pwd')}
              onBlur={() => setFocus('')}
              action={null}
            />

            <button style={{
              marginTop: 6,
              padding: '12px 16px', borderRadius: 9,
              background: 'linear-gradient(180deg, #9333ea, #7e22ce)',
              color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)',
              transition: 'transform .12s, box-shadow .15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(126,34,206,.5), inset 0 1px 0 rgba(255,255,255,.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)'; }}
              onClick={submit}
            >
              Iniciar sesión
              <IconArrow size={14} stroke={2.2} />
            </button>
          </div>

          {/* Divisor + acceso a registro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 18px' }}>
            <div style={{ flex: 1, height: 1, background: '#ece5f4' }} />
            <span style={{ fontSize: 11, color: '#a08bbd', fontWeight: 500 }}>o</span>
            <div style={{ flex: 1, height: 1, background: '#ece5f4' }} />
          </div>
          <a href="Registro.html" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 16px', borderRadius: 9,
            border: '1px solid #ece5f4', background: '#fff',
            color: '#3d2e57', fontSize: 14, fontWeight: 600, textDecoration: 'none',
            transition: 'all .15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d6c8ea'; e.currentTarget.style.background = '#faf6ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ece5f4'; e.currentTarget.style.background = '#fff'; }}>
            <IconSparkle size={15} stroke={1.9} style={{ color: '#7e22ce' }} />
            Crear una cuenta nueva
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 12, color: '#6b5b80',
        position: 'relative',
      }}>
        <span>© 2026 VetSoftware</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="#" style={{ color: '#6b5b80', textDecoration: 'none' }}>Privacidad</a>
          <a href="#" style={{ color: '#6b5b80', textDecoration: 'none' }}>Términos</a>
          <a href="#" style={{ color: '#6b5b80', textDecoration: 'none' }}>Soporte</a>
        </div>
      </div>
    </div>
  );
}

window.LoginCentered = LoginCentered;
