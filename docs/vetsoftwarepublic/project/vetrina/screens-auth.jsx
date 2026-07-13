/* global React, VetIcons, useVetRouter, useVetRoute */

// =====================================================================
// Zona pública / auth — espejo de src/components/public/* + features/auth
// + features/registration + features/landing.
// Sistema visual "pub-scope": amatista + Inter, títulos Instrument Serif.
// =====================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s\-()]{6,29}$/;

// ---------- PublicLayout ----------
function VetPublicLayout({ topRight, footerCenter = false, children }) {
  const router = useVetRouter();
  return (
    <div className="pub-scope pub-shell">
      <div className="pub-blob" style={{
        top: -160, right: -140, width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(192,132,252,0.24), transparent 60%)',
      }} />
      <div className="pub-blob" style={{
        bottom: -160, left: -140, width: 460, height: 460,
        background: 'radial-gradient(circle, rgba(168,85,247,0.16), transparent 62%)',
      }} />

      <header className="pub-topbar">
        <a className="pub-brand" href="#/" onClick={(e) => { e.preventDefault(); router.push({ name: 'landing' }); }}>
          <span className="pub-brand-mark"><VetIcons.PawPrint size={16} /></span>
          <span className="pub-brand-word">VetSoftware</span>
        </a>
        <div className="pub-topbar-right">{topRight}</div>
      </header>

      <main className="pub-main">{children}</main>

      <footer className={'pub-footer' + (footerCenter ? ' pub-footer-center' : '')}>
        <span>© 2026 VetSoftware · Colombia</span>
        {!footerCenter && (
          <a className="pub-footer-back" href="#/" onClick={(e) => { e.preventDefault(); router.push({ name: 'landing' }); }}>
            <VetIcons.ArrowLeft size={13} /> Volver al inicio
          </a>
        )}
      </footer>
    </div>
  );
}

// ---------- AuthField ----------
function VetAuthField({ label, required, hint, error, counter, children }) {
  return (
    <div className="pub-field">
      {label && (
        <div className="pub-field-head">
          <label className="pub-field-label">
            {label}{required && <span className="pub-field-req">*</span>}
          </label>
          {counter != null && <span className="pub-field-counter">{counter}</span>}
        </div>
      )}
      {children}
      {error
        ? <span className="pub-field-error"><VetIcons.AlertCircle size={12} /> {error}</span>
        : hint ? <span className="pub-field-hint">{hint}</span> : null}
    </div>
  );
}

// ---------- AuthInput ----------
function VetAuthInput({
  value, onChange, type = 'text', placeholder, icon: Icon, invalid = false,
  maxLength, autoComplete, inputMode, disabled = false, autoFocus, onBlur,
}) {
  const [focused, setFocused] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const isPassword = type === 'password';
  const realType = isPassword ? (show ? 'text' : 'password') : type;
  return (
    <div className={'pub-input' + (focused ? ' is-focused' : '') + (invalid ? ' is-invalid' : '') + (disabled ? ' is-disabled' : '')}>
      {Icon && <span className="pub-input-ico"><Icon size={15} /></span>}
      <input
        type={realType}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur && onBlur(); }}
      />
      {isPassword && (
        <button type="button" className="pub-input-eye" onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {show ? <VetIcons.EyeOff size={16} /> : <VetIcons.Eye size={16} />}
        </button>
      )}
    </div>
  );
}

// ---------- AuthSelect ----------
function VetAuthSelect({ value, onChange, options, placeholder, invalid = false, disabled = false, loading = false, onBlur }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div className={'pub-select' + (focused ? ' is-focused' : '') + (invalid ? ' is-invalid' : '')}>
      <select
        className={!value ? 'is-placeholder' : ''}
        value={value}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur && onBlur(); }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span className="pub-select-tail">
        {loading ? <span className="pub-select-spin" /> : <VetIcons.ChevronDown size={15} />}
      </span>
    </div>
  );
}

// ---------- PrimaryButton ----------
function VetPrimaryButton({ type = 'button', loading = false, loadingText = 'Cargando…', onClick, children }) {
  return (
    <button type={type} className={'pub-btn' + (loading ? ' pub-btn--loading' : '')} disabled={loading} onClick={onClick}>
      {loading ? <><span className="pub-btn-spin" /> {loadingText}</> : children}
    </button>
  );
}

// ---------- AuthBanner ----------
function VetAuthBanner({ tone = 'error', closable = true, onClose, children }) {
  return (
    <div className={'pub-banner pub-banner--' + tone} role="alert">
      <span className="pub-banner-ico">
        {tone === 'warning' ? <VetIcons.AlertTriangle size={17} /> : <VetIcons.AlertCircle size={17} />}
      </span>
      <div className="pub-banner-body">{children}</div>
      {closable && (
        <button type="button" className="pub-banner-close" aria-label="Cerrar" onClick={onClose}>
          <VetIcons.X size={15} />
        </button>
      )}
    </div>
  );
}

// ---------- SectionHead ----------
function VetSectionHead({ icon: Icon, title, desc }) {
  return (
    <div className="pub-sechead">
      <div className="pub-sechead-chip"><Icon size={17} /></div>
      <div>
        <div className="pub-sechead-title">{title}</div>
        {desc && <div className="pub-sechead-desc">{desc}</div>}
      </div>
    </div>
  );
}

// ---------- cooldown hook ----------
function useVetCooldown(seconds = 60) {
  const [left, setLeft] = React.useState(0);
  const ref = React.useRef(null);
  const stop = () => { if (ref.current) { clearInterval(ref.current); ref.current = null; } };
  const start = () => {
    stop();
    setLeft(seconds);
    ref.current = setInterval(() => {
      setLeft((v) => { if (v <= 1) { stop(); return 0; } return v - 1; });
    }, 1000);
  };
  React.useEffect(() => stop, []);
  return [left, start];
}

// =====================================================================
// Landing (/)
// =====================================================================
const VET_TRUST = [
  { icon: VetIcons.Building2, label: 'Multiclínica' },
  { icon: VetIcons.Users, label: 'Gestión de equipo' },
  { icon: VetIcons.ShieldCheck, label: 'Datos cifrados' },
];

function VetLandingView() {
  const router = useVetRouter();
  const stageRef = React.useRef(null);
  const [glow, setGlow] = React.useState('radial-gradient(560px circle at 50% 30%, rgba(168,85,247,.18), transparent 62%)');

  function onMove(e) {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const x = 50 + (px - 0.5) * 40;
    const y = 30 + (py - 0.5) * 30;
    setGlow(`radial-gradient(560px circle at ${x}% ${y}%, rgba(168,85,247,.18), transparent 62%)`);
  }
  const go = (name) => (e) => { e.preventDefault(); router.push({ name }); };

  return (
    <div ref={stageRef} className="pub-scope land-stage" onMouseMove={onMove}>
      <div className="land-glow" style={{ background: glow }} />
      <div className="pub-blob pub-drift" style={{ top: -160, right: -120, width: 480, height: 480, animationDelay: '0s', background: 'radial-gradient(circle, rgba(192,132,252,.3), transparent 60%)' }} />
      <div className="pub-blob pub-drift" style={{ bottom: -180, left: -140, width: 520, height: 520, animationDelay: '-7s', background: 'radial-gradient(circle, rgba(147,51,234,.2), transparent 62%)' }} />
      <div className="pub-blob pub-drift" style={{ top: '40%', left: '52%', width: 340, height: 340, animationDelay: '-3.5s', background: 'radial-gradient(circle, rgba(216,180,254,.28), transparent 60%)' }} />
      <div className="pub-grid-bg" />

      <header className="land-topbar">
        <div className="land-brand">
          <span className="land-brand-mark"><VetIcons.PawPrint size={17} /></span>
          <span className="land-brand-word">VetSoftware</span>
        </div>
        <a className="land-login-btn" href="#/login" onClick={go('login')}>
          Iniciar sesión <VetIcons.ArrowRight size={13} />
        </a>
      </header>

      <main className="land-main">
        <div className="land-eyebrow pub-reveal" style={{ animationDelay: '0.05s' }}>
          <VetIcons.Sparkles size={13} /> Plataforma de gestión veterinaria
        </div>
        <h1 className="land-h1 pub-reveal" style={{ animationDelay: '0.12s' }}>
          Todo tu centro veterinario,<br />
          <span className="land-h1-em">en un solo panel.</span>
        </h1>
        <p className="land-sub pub-reveal" style={{ animationDelay: '0.19s' }}>
          Administra clínicas, empleados, membresías y permisos desde una sola plataforma clara y
          segura. Comienza en segundos.
        </p>

        <div className="land-cards pub-reveal" style={{ animationDelay: '0.28s' }}>
          <a className="land-card land-card--primary" href="#/registro" onClick={go('signup')}>
            <div className="land-card-glow" />
            <div className="land-card-icon"><VetIcons.Sparkles size={20} /></div>
            <div className="land-card-kicker">Nuevo aquí</div>
            <div className="land-card-title">Crear cuenta</div>
            <div className="land-card-desc">Registra tu centro y empieza a operar hoy mismo.</div>
            <div className="land-card-cta">Registrarme <span className="land-card-arrow"><VetIcons.ArrowRight size={14} /></span></div>
          </a>
          <a className="land-card land-card--secondary" href="#/login" onClick={go('login')}>
            <div className="land-card-icon"><VetIcons.ShieldCheck size={20} /></div>
            <div className="land-card-kicker">Ya tengo cuenta</div>
            <div className="land-card-title">Iniciar sesión</div>
            <div className="land-card-desc">Accede a tu panel administrativo de siempre.</div>
            <div className="land-card-cta">Entrar <span className="land-card-arrow"><VetIcons.ArrowRight size={14} /></span></div>
          </a>
        </div>

        <div className="land-trust pub-reveal" style={{ animationDelay: '0.38s' }}>
          {VET_TRUST.map((t) => (
            <span key={t.label} className="land-trust-item"><t.icon size={15} /> {t.label}</span>
          ))}
        </div>
      </main>

      <footer className="land-footer">
        <span>© 2026 VetSoftware</span>
        <div className="land-footer-links">
          <a href="#" onClick={(e) => e.preventDefault()}>Privacidad</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Términos</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Soporte</a>
        </div>
      </footer>
    </div>
  );
}

// =====================================================================
// Login (/login)
// =====================================================================
function VetLoginView() {
  const router = useVetRouter();
  const [form, setForm] = React.useState({ employeeCode: '', password: '' });
  const [touched, setTouched] = React.useState({ employeeCode: false, password: false });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState(null);

  const err = (k) => touched[k] && !form[k].trim() ? 'Campo requerido' : undefined;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));
  const go = (name) => (e) => { e.preventDefault(); router.push({ name }); };

  function submit(e) {
    e.preventDefault();
    setSubmitError(null);
    setTouched({ employeeCode: true, password: true });
    if (!form.employeeCode.trim() || !form.password.trim()) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); router.push({ name: 'home' }); }, 700);
  }

  return (
    <VetPublicLayout topRight={<>¿Eres nuevo? <a href="#/registro" onClick={go('signup')}>Crea una cuenta</a></>}>
      <div className="pub-card pub-reveal">
        <div className="pub-eyebrow">Panel administrativo</div>
        <h1 className="pub-card-title">Inicia sesión</h1>
        <p className="pub-card-sub">Accede al panel para administrar VetSoftware.</p>

        <form className="pub-form" noValidate onSubmit={submit}>
          {submitError && (
            <div className="pub-banner-wrap">
              <VetAuthBanner tone="error" onClose={() => setSubmitError(null)}>{submitError}</VetAuthBanner>
            </div>
          )}

          <VetAuthField label="Empleado" required error={err('employeeCode')}>
            <VetAuthInput value={form.employeeCode} onChange={(v) => set('employeeCode', v)}
              icon={VetIcons.CreditCard} placeholder="ADMIN-001" maxLength={50} autoComplete="username"
              invalid={!!err('employeeCode')} onBlur={() => touch('employeeCode')} />
          </VetAuthField>

          <VetAuthField label="Contraseña" required error={err('password')}>
            <VetAuthInput value={form.password} onChange={(v) => set('password', v)} type="password"
              icon={VetIcons.Lock} placeholder="••••••••" maxLength={100} autoComplete="current-password"
              invalid={!!err('password')} onBlur={() => touch('password')} />
          </VetAuthField>

          <div className="login-forgot">
            <a href="#/recuperar-codigo" onClick={go('recuperar-codigo')}>¿Olvidaste tu código?</a>
            <span className="login-forgot-sep">·</span>
            <a href="#/recuperar-contrasena" onClick={go('recuperar-contrasena')}>¿Olvidaste tu contraseña?</a>
          </div>

          <VetPrimaryButton type="submit" loading={submitting} loadingText="Ingresando…">
            Iniciar sesión <VetIcons.ArrowRight size={14} />
          </VetPrimaryButton>
        </form>

        <div className="login-divider">
          <span className="login-divider-line" />
          <span className="login-divider-word">o</span>
          <span className="login-divider-line" />
        </div>

        <a href="#/registro" className="login-secondary" onClick={go('signup')}>
          <VetIcons.Sparkles size={15} /> Crear una cuenta nueva
        </a>
      </div>
    </VetPublicLayout>
  );
}

// =====================================================================
// Signup (/registro) — RegisterForm + CheckEmailPanel
// =====================================================================
const VET_DOCTYPE_OPTS = [
  { value: 'NIT', label: 'NIT (31)' },
  { value: 'CEDULA_CIUDADANIA', label: 'Cédula (13)' },
  { value: 'CEDULA_EXTRANJERIA', label: 'C. extranjería (22)' },
  { value: 'PASAPORTE', label: 'Pasaporte (41)' },
];
const VET_REGIME_OPTS = [
  { value: 'RESPONSABLE_IVA', label: 'Responsable de IVA' },
  { value: 'NO_RESPONSABLE_IVA', label: 'No responsable de IVA' },
];
const VET_GEO_COUNTRIES = [{ value: '1', label: 'Colombia' }, { value: '2', label: 'México' }, { value: '3', label: 'Perú' }];
const VET_GEO_STATES = {
  '1': [{ value: '11', label: 'Cundinamarca' }, { value: '12', label: 'Antioquia' }, { value: '13', label: 'Valle del Cauca' }],
  '2': [{ value: '21', label: 'CDMX' }, { value: '22', label: 'Jalisco' }],
  '3': [{ value: '31', label: 'Lima' }],
};
const VET_GEO_CITIES = {
  '11': [{ value: '111', label: 'Bogotá' }, { value: '112', label: 'Soacha' }],
  '12': [{ value: '121', label: 'Medellín' }, { value: '122', label: 'Envigado' }],
  '13': [{ value: '131', label: 'Cali' }],
  '21': [{ value: '211', label: 'Ciudad de México' }],
  '22': [{ value: '221', label: 'Guadalajara' }],
  '31': [{ value: '311', label: 'Lima' }],
};

function VetRegisterForm({ onSuccess }) {
  const router = useVetRouter();
  const [form, setForm] = React.useState({
    documentType: 'NIT', companyIdentifier: '', companyName: '', taxRegime: '',
    fiscalEmail: '', companyAddress: '', companyContactNumber: '',
    countryId: '', stateId: '', cityId: '',
    employeeName: '', employeeEmail: '', password: '',
  });
  const [touched, setTouched] = React.useState({});
  const [globalError, setGlobalError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [captcha, setCaptcha] = React.useState(false);
  const [captchaTouched, setCaptchaTouched] = React.useState(false);

  const isNit = form.documentType === 'NIT';
  const docHint = isNit ? 'El dígito de verificación se calcula automáticamente.' : 'Debe ser único en todo el sistema.';
  const stateOpts = form.countryId ? (VET_GEO_STATES[form.countryId] || []) : [];
  const cityOpts = form.stateId ? (VET_GEO_CITIES[form.stateId] || []) : [];

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));

  function validate(key) {
    const v = String(form[key] ?? '');
    switch (key) {
      case 'companyIdentifier':
        if (!v.trim()) return 'Ingresa el número de documento.';
        return isNit ? (/^\d{5,15}$/.test(v) ? null : 'Para NIT debe ser numérico, 5 a 15 dígitos.')
          : (/^[a-zA-Z0-9]{4,20}$/.test(v) ? null : 'Alfanumérico, 4 a 20 caracteres.');
      case 'companyName': return v.trim() ? null : 'Ingresa la razón social.';
      case 'taxRegime': return v ? null : 'Selecciona el régimen tributario.';
      case 'fiscalEmail': return !v.trim() ? 'Ingresa el correo fiscal.' : (EMAIL_RE.test(v) ? null : 'Correo no válido.');
      case 'companyContactNumber': return !v.trim() ? null : (PHONE_RE.test(v) ? null : 'Teléfono no válido (7–15 dígitos).');
      case 'countryId': return v ? null : 'Selecciona el país.';
      case 'stateId': return v ? null : 'Selecciona el departamento.';
      case 'cityId': return v ? null : 'Selecciona la ciudad.';
      case 'employeeName': return v.trim() ? null : 'Ingresa el nombre completo.';
      case 'employeeEmail': return !v.trim() ? 'Ingresa el correo.' : (EMAIL_RE.test(v) ? null : 'Correo no válido.');
      case 'password': return !v ? 'Ingresa una contraseña.' : (v.length >= 8 ? null : 'Mínimo 8 caracteres.');
      default: return null;
    }
  }
  const REQUIRED = ['companyIdentifier', 'companyName', 'taxRegime', 'fiscalEmail', 'countryId', 'stateId', 'cityId', 'employeeName', 'employeeEmail', 'password'];
  const err = (k) => touched[k] ? validate(k) || undefined : undefined;

  function onCountry(v) { set({ countryId: v, stateId: '', cityId: '' }); }
  function onState(v) { set({ stateId: v, cityId: '' }); }

  function submit(e) {
    e.preventDefault();
    setGlobalError(null);
    setCaptchaTouched(true);
    const nt = {};
    [...REQUIRED, 'companyContactNumber'].forEach((k) => { nt[k] = true; });
    setTouched(nt);
    const hasErrors = [...REQUIRED, 'companyContactNumber'].some((k) => validate(k));
    if (hasErrors || !captcha) {
      if (hasErrors) setGlobalError('Revisa los campos marcados en rojo antes de continuar.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); onSuccess(form.employeeEmail.trim()); }, 800);
  }

  return (
    <div className="reg-scroll pub-reveal">
      <form className="reg-card" noValidate onSubmit={submit}>
        <div className="reg-eyebrow">VetSoftware</div>
        <h1 className="reg-title">Crear cuenta</h1>
        <p className="reg-sub">Registra tu empresa y tu primer usuario administrador.</p>

        {globalError && (
          <div className="reg-banner-wrap">
            <VetAuthBanner tone="error" onClose={() => setGlobalError(null)}>{globalError}</VetAuthBanner>
          </div>
        )}

        <section className="reg-section">
          <VetSectionHead icon={VetIcons.Building2} title="Empresa" desc="Datos fiscales y ubicación del centro veterinario." />
          <div className="reg-fields">
            <div className="reg-grid-2">
              <VetAuthField label="Tipo de documento" required>
                <VetAuthSelect value={form.documentType} onChange={(v) => set({ documentType: v })} options={VET_DOCTYPE_OPTS} />
              </VetAuthField>
              <VetAuthField label="Número de documento" required hint={docHint} error={err('companyIdentifier')} counter={`${form.companyIdentifier.length}/20`}>
                <VetAuthInput value={form.companyIdentifier}
                  onChange={(v) => set({ companyIdentifier: v.replace(/[^A-Za-z0-9]/g, '') })}
                  placeholder={isNit ? '900123456' : 'ABC12345'} maxLength={20}
                  inputMode={isNit ? 'numeric' : 'text'} icon={VetIcons.FileText}
                  invalid={!!err('companyIdentifier')} onBlur={() => touch('companyIdentifier')} />
              </VetAuthField>
            </div>

            <VetAuthField label="Razón social" required error={err('companyName')} counter={`${form.companyName.length}/100`}>
              <VetAuthInput value={form.companyName} onChange={(v) => set({ companyName: v })}
                placeholder="Clínica Veterinaria Patitas S.A.S." maxLength={100} icon={VetIcons.Building2}
                invalid={!!err('companyName')} onBlur={() => touch('companyName')} />
            </VetAuthField>

            <div className="reg-grid-2">
              <VetAuthField label="Régimen tributario" required error={err('taxRegime')}>
                <VetAuthSelect value={form.taxRegime} onChange={(v) => set({ taxRegime: v })} options={VET_REGIME_OPTS}
                  placeholder="Selecciona…" invalid={!!err('taxRegime')} onBlur={() => touch('taxRegime')} />
              </VetAuthField>
              <VetAuthField label="Correo fiscal" required error={err('fiscalEmail')} hint="Correo donde llegan las facturas y documentos electrónicos.">
                <VetAuthInput value={form.fiscalEmail} onChange={(v) => set({ fiscalEmail: v })} type="email"
                  placeholder="facturacion@clinica.com" maxLength={255} icon={VetIcons.Receipt}
                  invalid={!!err('fiscalEmail')} onBlur={() => touch('fiscalEmail')} />
              </VetAuthField>
            </div>

            <div className="reg-grid-2">
              <VetAuthField label="Dirección" hint="Opcional">
                <VetAuthInput value={form.companyAddress} onChange={(v) => set({ companyAddress: v })}
                  placeholder="Cra 12 # 34-56" maxLength={200} icon={VetIcons.MapPin} />
              </VetAuthField>
              <VetAuthField label="Teléfono de contacto" hint="Opcional" error={err('companyContactNumber')}>
                <VetAuthInput value={form.companyContactNumber}
                  onChange={(v) => set({ companyContactNumber: v.replace(/[^+\d\s\-()]/g, '') })} type="tel"
                  placeholder="+57 601 234 5678" maxLength={30} icon={VetIcons.Phone}
                  invalid={!!err('companyContactNumber')} onBlur={() => touch('companyContactNumber')} />
              </VetAuthField>
            </div>

            <div className="reg-grid-3">
              <VetAuthField label="País" required error={err('countryId')}>
                <VetAuthSelect value={form.countryId} onChange={onCountry} options={VET_GEO_COUNTRIES}
                  placeholder="Selecciona…" invalid={!!err('countryId')} onBlur={() => touch('countryId')} />
              </VetAuthField>
              <VetAuthField label="Departamento" required error={err('stateId')}>
                <VetAuthSelect value={form.stateId} onChange={onState} options={stateOpts}
                  placeholder="Selecciona…" disabled={!form.countryId} invalid={!!err('stateId')} onBlur={() => touch('stateId')} />
              </VetAuthField>
              <VetAuthField label="Ciudad" required error={err('cityId')}>
                <VetAuthSelect value={form.cityId} onChange={(v) => set({ cityId: v })} options={cityOpts}
                  placeholder="Selecciona…" disabled={!form.stateId} invalid={!!err('cityId')} onBlur={() => touch('cityId')} />
              </VetAuthField>
            </div>
          </div>
        </section>

        <div className="reg-divider" />

        <section>
          <VetSectionHead icon={VetIcons.User} title="Usuario administrador" desc="La persona que gestionará la cuenta." />
          <div className="reg-fields">
            <VetAuthField label="Nombre completo" required error={err('employeeName')} counter={`${form.employeeName.length}/100`}>
              <VetAuthInput value={form.employeeName} onChange={(v) => set({ employeeName: v })}
                placeholder="Dr. Ana Martínez" maxLength={100} icon={VetIcons.Users}
                invalid={!!err('employeeName')} onBlur={() => touch('employeeName')} />
            </VetAuthField>
            <div className="reg-grid-2">
              <VetAuthField label="Email" required error={err('employeeEmail')} hint="A este correo llega el enlace de verificación.">
                <VetAuthInput value={form.employeeEmail} onChange={(v) => set({ employeeEmail: v })} type="email"
                  placeholder="ana@clinica.com" maxLength={100} icon={VetIcons.Mail}
                  invalid={!!err('employeeEmail')} onBlur={() => touch('employeeEmail')} />
              </VetAuthField>
              <VetAuthField label="Contraseña" required error={err('password')} hint="Mínimo 8 caracteres.">
                <VetAuthInput value={form.password} onChange={(v) => set({ password: v })} type="password"
                  placeholder="••••••••" maxLength={100} icon={VetIcons.Lock}
                  invalid={!!err('password')} onBlur={() => touch('password')} />
              </VetAuthField>
            </div>
          </div>
        </section>

        <div className="reg-recaptcha">
          <div className="reg-recaptcha-widget">
            <div className="reg-recaptcha-box">
              <span className={'reg-recaptcha-check' + (captcha ? ' checked' : '')}
                onClick={() => { setCaptcha((v) => !v); setCaptchaTouched(true); }}>
                <VetIcons.Check size={18} strokeWidth={3} />
              </span>
              <span>No soy un robot</span>
              <span className="reg-recaptcha-logo">reCAPTCHA<br />Privacidad · Términos</span>
            </div>
          </div>
          {captchaTouched && !captcha && (
            <p className="pub-field-error" style={{ justifyContent: 'center', marginTop: 8 }}>
              <VetIcons.AlertCircle size={12} /> Completa la verificación para continuar.
            </p>
          )}
        </div>

        <div className="reg-submit">
          <VetPrimaryButton type="submit" loading={submitting} loadingText="Creando cuenta…">
            Crear cuenta <VetIcons.ArrowRight size={14} />
          </VetPrimaryButton>
        </div>

        <p className="reg-foot">
          ¿Ya tienes cuenta? <a href="#/login" onClick={(e) => { e.preventDefault(); router.push({ name: 'login' }); }}>Inicia sesión</a>
        </p>
      </form>
    </div>
  );
}

function VetCheckEmailPanel({ email }) {
  const router = useVetRouter();
  return (
    <div className="check-card pub-reveal">
      <div className="check-icon"><VetIcons.MailCheck size={36} /></div>
      <h1 className="check-title">Revisa tu correo</h1>
      <p className="check-text">
        Te enviamos un enlace de verificación a <strong>{email}</strong>. Ábrelo para activar tu
        cuenta; después podrás iniciar sesión.
      </p>
      <p className="check-note">¿No lo ves? Revisa la carpeta de spam. El enlace vence en unas horas.</p>
      <div className="check-actions">
        <VetPrimaryButton onClick={() => router.push({ name: 'login' })}>Ir a iniciar sesión</VetPrimaryButton>
      </div>
    </div>
  );
}

function VetSignupView() {
  const router = useVetRouter();
  const [screen, setScreen] = React.useState('form');
  const [email, setEmail] = React.useState('');
  const go = (name) => (e) => { e.preventDefault(); router.push({ name }); };
  return (
    <VetPublicLayout
      footerCenter={screen === 'check'}
      topRight={<>¿Ya tienes cuenta? <a href="#/login" onClick={go('login')}>Inicia sesión</a></>}
    >
      {screen === 'form'
        ? <VetRegisterForm onSuccess={(em) => { setEmail(em); setScreen('check'); }} />
        : <VetCheckEmailPanel email={email} />}
    </VetPublicLayout>
  );
}

// =====================================================================
// Verify email (/verify-email) — loading → success ; ?state=error
// =====================================================================
function VetVerifyEmailView() {
  const route = useVetRoute();
  const router = useVetRouter();
  const forced = route.query.state; // 'success' | 'error'
  const [state, setState] = React.useState(forced || 'loading');
  React.useEffect(() => {
    if (forced) return;
    const t = setTimeout(() => setState('success'), 1400);
    return () => clearTimeout(t);
  }, [forced]);

  return (
    <VetPublicLayout footerCenter>
      <div className="check-card narrow pub-reveal">
        {state === 'loading' && (
          <>
            <div className="check-icon round plain"><span className="pub-spin-lg" /></div>
            <h1 className="check-title">Verificando tu cuenta…</h1>
            <p className="check-text">Un momento, estamos confirmando tu correo.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="check-icon round ok"><VetIcons.CheckCircle size={40} /></div>
            <h1 className="check-title">¡Cuenta verificada!</h1>
            <p className="check-text">Tu correo quedó confirmado. Ya puedes iniciar sesión.</p>
            <div className="check-actions">
              <VetPrimaryButton onClick={() => router.push({ name: 'login' })}>Iniciar sesión</VetPrimaryButton>
            </div>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="check-icon round err"><VetIcons.AlertCircle size={40} /></div>
            <h1 className="check-title">No pudimos verificar</h1>
            <p className="check-text">El enlace de verificación no es válido o expiró.</p>
            <div className="check-actions stack">
              <VetPrimaryButton onClick={() => router.push({ name: 'signup' })}>Volver a registrarme</VetPrimaryButton>
              <button type="button" className="pub-textbtn" onClick={() => router.push({ name: 'login' })}>Ir a iniciar sesión</button>
            </div>
          </>
        )}
      </div>
    </VetPublicLayout>
  );
}

// =====================================================================
// Recuperar código (/recuperar-codigo)
// =====================================================================
function VetRecuperarCodigoView() {
  const router = useVetRouter();
  const [email, setEmail] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [cooldown, startCooldown] = useVetCooldown(60);
  const go = (name) => (e) => { e.preventDefault(); router.push({ name }); };

  const err = () => {
    if (!touched) return undefined;
    if (!email.trim()) return 'Campo requerido';
    if (!EMAIL_RE.test(email.trim())) return 'Correo inválido';
    return undefined;
  };
  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (!email.trim() || !EMAIL_RE.test(email.trim())) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setSent(true); startCooldown(); }, 700);
  }
  function resend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setTimeout(() => { setResending(false); startCooldown(); }, 700);
  }

  return (
    <VetPublicLayout topRight={<>¿Ya lo recordaste? <a href="#/login" onClick={go('login')}>Inicia sesión</a></>}>
      <div className="pub-card pub-reveal">
        {!sent ? (
          <>
            <div className="pub-eyebrow">Recuperar código</div>
            <h1 className="pub-card-title sm">¿Olvidaste tu código?</h1>
            <p className="pub-card-sub tall">
              Escribe tu <strong>correo</strong> y te enviaremos tu código de usuario (y el de cada veterinaria si tienes más de una cuenta).
            </p>
            <form className="pub-form" noValidate onSubmit={submit}>
              <VetAuthField label="Correo" required error={err()}>
                <VetAuthInput value={email} onChange={setEmail} type="email" icon={VetIcons.Mail}
                  placeholder="tu@correo.com" maxLength={100} autoComplete="email"
                  invalid={!!err()} onBlur={() => setTouched(true)} />
              </VetAuthField>
              <VetPrimaryButton type="submit" loading={submitting} loadingText="Enviando…">
                Enviar código <VetIcons.ArrowRight size={14} />
              </VetPrimaryButton>
            </form>
          </>
        ) : (
          <>
            <div className="pub-state-icon ok"><VetIcons.MailCheck size={38} /></div>
            <h1 className="pub-card-title sm">Revisa tu correo</h1>
            <p className="pub-card-sub tall">
              Si <strong>{email.trim()}</strong> tiene cuentas en Vetrina, te enviamos tu(s) código(s) de usuario.
            </p>
            <div className="pub-resend">
              <span>¿No lo recibiste?</span>
              {cooldown > 0
                ? <span className="pub-resend-wait">Podrás reenviar en {cooldown} s</span>
                : <button type="button" className="pub-resend-btn" disabled={resending} onClick={resend}>{resending ? 'Reenviando…' : 'Reenviar correo'}</button>}
            </div>
            <div className="pub-actions">
              <a className="pub-link" href="#/login" onClick={go('login')}>Volver a iniciar sesión</a>
            </div>
          </>
        )}
      </div>
    </VetPublicLayout>
  );
}

// =====================================================================
// Recuperar contraseña (/recuperar-contrasena)
// =====================================================================
function VetRecuperarContrasenaView() {
  const router = useVetRouter();
  const [code, setCode] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [cooldown, startCooldown] = useVetCooldown(60);
  const go = (name) => (e) => { e.preventDefault(); router.push({ name }); };

  const err = () => touched && !code.trim() ? 'Campo requerido' : undefined;
  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (!code.trim()) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setSent(true); startCooldown(); }, 700);
  }
  function resend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setTimeout(() => { setResending(false); startCooldown(); }, 700);
  }

  return (
    <VetPublicLayout topRight={<>¿Ya la recordaste? <a href="#/login" onClick={go('login')}>Inicia sesión</a></>}>
      <div className="pub-card pub-reveal">
        {!sent ? (
          <>
            <div className="pub-eyebrow">Recuperar contraseña</div>
            <h1 className="pub-card-title sm">¿Olvidaste tu contraseña?</h1>
            <p className="pub-card-sub tall">
              Escribe tu <strong>código de usuario</strong> y te enviaremos un enlace al correo registrado para crear una contraseña nueva.
            </p>
            <form className="pub-form" noValidate onSubmit={submit}>
              <VetAuthField label="Código de usuario" required error={err()}>
                <VetAuthInput value={code} onChange={setCode} icon={VetIcons.CreditCard}
                  placeholder="ADMIN-001" maxLength={50} autoComplete="username"
                  invalid={!!err()} onBlur={() => setTouched(true)} />
              </VetAuthField>
              <VetPrimaryButton type="submit" loading={submitting} loadingText="Enviando…">
                Enviar enlace <VetIcons.ArrowRight size={14} />
              </VetPrimaryButton>
            </form>
          </>
        ) : (
          <>
            <div className="pub-state-icon ok"><VetIcons.MailCheck size={38} /></div>
            <h1 className="pub-card-title sm">Revisa tu correo</h1>
            <p className="pub-card-sub tall">
              Si el código <strong>{code.trim()}</strong> corresponde a una cuenta, enviamos un enlace al correo registrado. El enlace vence en 1 hora.
            </p>
            <div className="pub-resend">
              <span>¿No lo recibiste?</span>
              {cooldown > 0
                ? <span className="pub-resend-wait">Podrás reenviar en {cooldown} s</span>
                : <button type="button" className="pub-resend-btn" disabled={resending} onClick={resend}>{resending ? 'Reenviando…' : 'Reenviar correo'}</button>}
            </div>
            <div className="pub-actions">
              <a className="pub-link" href="#/login" onClick={go('login')}>Volver a iniciar sesión</a>
            </div>
          </>
        )}
      </div>
    </VetPublicLayout>
  );
}

// =====================================================================
// Restablecer contraseña (/restablecer-contrasena?token=) — loading→form; ?state=success/invalid
// =====================================================================
function VetRestablecerContrasenaView() {
  const route = useVetRoute();
  const router = useVetRouter();
  const forced = route.query.state;
  const [state, setState] = React.useState(forced || 'loading');
  const [form, setForm] = React.useState({ password: '', confirm: '' });
  const [touched, setTouched] = React.useState({ password: false, confirm: false });
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (forced) return;
    const t = setTimeout(() => setState('form'), 1100);
    return () => clearTimeout(t);
  }, [forced]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));
  function err(k) {
    if (!touched[k]) return undefined;
    if (k === 'password') {
      if (!form.password) return 'La contraseña es requerida';
      if (form.password.length < 8) return 'Mínimo 8 caracteres';
      return undefined;
    }
    if (!form.confirm) return 'Confirma la contraseña';
    if (form.confirm !== form.password) return 'Las contraseñas no coinciden';
    return undefined;
  }
  function submit(e) {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    const pe = !form.password ? 'x' : (form.password.length < 8 ? 'x' : null);
    const ce = !form.confirm ? 'x' : (form.confirm !== form.password ? 'x' : null);
    if (pe || ce) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setState('success'); }, 800);
  }

  return (
    <VetPublicLayout topRight={<a href="#/login" onClick={(e) => { e.preventDefault(); router.push({ name: 'login' }); }}>Iniciar sesión</a>}>
      <div className="pub-card pub-reveal">
        {state === 'loading' && (
          <div className="pub-center">
            <span className="pub-spin-lg" />
            <p className="pub-card-sub" style={{ margin: 0 }}>Validando el enlace…</p>
          </div>
        )}
        {state === 'form' && (
          <>
            <div className="pub-eyebrow">Restablecer contraseña</div>
            <h1 className="pub-card-title sm">Crea una contraseña nueva</h1>
            <p className="pub-card-sub tall">Elige una contraseña nueva para tu cuenta. La usarás cada vez que inicies sesión.</p>
            <form className="pub-form" noValidate onSubmit={submit}>
              <VetAuthField label="Nueva contraseña" required error={err('password')}>
                <VetAuthInput value={form.password} onChange={(v) => set('password', v)} type="password"
                  icon={VetIcons.Lock} placeholder="••••••••" maxLength={100} autoComplete="new-password"
                  invalid={!!err('password')} onBlur={() => touch('password')} />
              </VetAuthField>
              <VetAuthField label="Confirmar contraseña" required error={err('confirm')}>
                <VetAuthInput value={form.confirm} onChange={(v) => set('confirm', v)} type="password"
                  icon={VetIcons.ShieldCheck} placeholder="••••••••" maxLength={100} autoComplete="new-password"
                  invalid={!!err('confirm')} onBlur={() => touch('confirm')} />
              </VetAuthField>
              <VetPrimaryButton type="submit" loading={submitting} loadingText="Guardando…">
                Guardar contraseña <VetIcons.ArrowRight size={14} />
              </VetPrimaryButton>
            </form>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="pub-state-icon ok"><VetIcons.CheckCircle size={38} /></div>
            <h1 className="pub-card-title sm">Contraseña actualizada</h1>
            <p className="pub-card-sub tall">Tu contraseña quedó cambiada. Ya puedes iniciar sesión con la nueva.</p>
            <div className="pub-actions"><VetPrimaryButton onClick={() => router.push({ name: 'login' })}>Iniciar sesión</VetPrimaryButton></div>
          </>
        )}
        {state === 'invalid' && (
          <>
            <div className="pub-state-icon err"><VetIcons.AlertCircle size={38} /></div>
            <h1 className="pub-card-title sm">Enlace no válido</h1>
            <p className="pub-card-sub tall">El enlace de restablecimiento no es válido, expiró o ya se usó. Solicita uno nuevo.</p>
            <div className="pub-actions stack">
              <VetPrimaryButton onClick={() => router.push({ name: 'recuperar-contrasena' })}>Solicitar uno nuevo</VetPrimaryButton>
              <button type="button" className="pub-textbtn" onClick={() => router.push({ name: 'login' })}>Ir a iniciar sesión</button>
            </div>
          </>
        )}
      </div>
    </VetPublicLayout>
  );
}

// =====================================================================
// Cambiar contraseña (/cambiar-contrasena) — primer ingreso staff invitado
// =====================================================================
function VetCambiarContrasenaView() {
  const router = useVetRouter();
  const [form, setForm] = React.useState({ password: '', confirm: '' });
  const [touched, setTouched] = React.useState({ password: false, confirm: false });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState(null);
  const firstName = 'Mariana';

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));
  function err(k) {
    if (!touched[k]) return undefined;
    if (k === 'password') {
      if (!form.password) return 'La contraseña es requerida';
      if (form.password.length < 8) return 'Mínimo 8 caracteres';
      return undefined;
    }
    if (!form.confirm) return 'Confirma la contraseña';
    if (form.confirm !== form.password) return 'Las contraseñas no coinciden';
    return undefined;
  }
  function submit(e) {
    e.preventDefault();
    setSubmitError(null);
    setTouched({ password: true, confirm: true });
    const pe = !form.password || form.password.length < 8;
    const ce = !form.confirm || form.confirm !== form.password;
    if (pe || ce) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); router.push({ name: 'home' }); }, 800);
  }

  return (
    <VetPublicLayout topRight={<a href="#/login" onClick={(e) => { e.preventDefault(); router.push({ name: 'login' }); }}>Cerrar sesión</a>}>
      <div className="pub-card pub-reveal">
        <div className="pub-eyebrow">Primer ingreso</div>
        <h1 className="pub-card-title">Crea tu contraseña</h1>
        <p className="pub-card-sub">
          Hola {firstName}. Por seguridad, define una contraseña nueva para tu cuenta. La necesitarás cada vez que inicies sesión.
        </p>
        <form className="pub-form" noValidate onSubmit={submit}>
          {submitError && (
            <div className="pub-banner-wrap">
              <VetAuthBanner tone="error" onClose={() => setSubmitError(null)}>{submitError}</VetAuthBanner>
            </div>
          )}
          <VetAuthField label="Nueva contraseña" required error={err('password')}>
            <VetAuthInput value={form.password} onChange={(v) => set('password', v)} type="password"
              icon={VetIcons.Lock} placeholder="••••••••" maxLength={100} autoComplete="new-password"
              invalid={!!err('password')} onBlur={() => touch('password')} />
          </VetAuthField>
          <VetAuthField label="Confirmar contraseña" required error={err('confirm')}>
            <VetAuthInput value={form.confirm} onChange={(v) => set('confirm', v)} type="password"
              icon={VetIcons.ShieldCheck} placeholder="••••••••" maxLength={100} autoComplete="new-password"
              invalid={!!err('confirm')} onBlur={() => touch('confirm')} />
          </VetAuthField>
          <VetPrimaryButton type="submit" loading={submitting} loadingText="Guardando…">
            Guardar y entrar <VetIcons.ArrowRight size={14} />
          </VetPrimaryButton>
        </form>
      </div>
    </VetPublicLayout>
  );
}

Object.assign(window, {
  VetPublicLayout, VetAuthField, VetAuthInput, VetAuthSelect, VetPrimaryButton, VetAuthBanner, VetSectionHead,
  VetLandingView, VetLoginView, VetSignupView, VetVerifyEmailView,
  VetRecuperarCodigoView, VetRecuperarContrasenaView, VetRestablecerContrasenaView, VetCambiarContrasenaView,
});
