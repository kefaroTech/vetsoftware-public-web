// ============ REGISTRO · Pantalla 1 — Formulario ============
// Dos secciones (Empresa · Usuario administrador), validación reactiva,
// cascada País→Depto→Ciudad con loading, reCAPTCHA, banner global.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-()]{6,29}$/;

function validateField(key, v, form) {
  switch (key) {
    case 'docNumber': {
      if (!v.trim()) return 'Ingresa el número de documento.';
      if (form.docType === '31') {
        if (!/^\d{5,15}$/.test(v)) return 'Para NIT debe ser numérico, 5 a 15 dígitos.';
      } else {
        if (!/^[a-zA-Z0-9]{4,20}$/.test(v)) return 'Alfanumérico, 4 a 20 caracteres.';
      }
      return '';
    }
    case 'razonSocial': return v.trim() ? '' : 'Ingresa la razón social.';
    case 'taxRegime': return v ? '' : 'Selecciona el régimen tributario.';
    case 'fiscalEmail':
      if (!v.trim()) return 'Ingresa el correo fiscal.';
      return EMAIL_RE.test(v) ? '' : 'Correo no válido.';
    case 'phone':
      if (!v.trim()) return '';
      return PHONE_RE.test(v) ? '' : 'Teléfono no válido (7–15 dígitos).';
    case 'country': return v ? '' : 'Selecciona el país.';
    case 'department': return v ? '' : 'Selecciona el departamento.';
    case 'city': return v ? '' : 'Selecciona la ciudad.';
    case 'adminName': return v.trim() ? '' : 'Ingresa el nombre completo.';
    case 'adminEmail':
      if (!v.trim()) return 'Ingresa el correo.';
      return EMAIL_RE.test(v) ? '' : 'Correo no válido.';
    case 'password':
      if (!v) return 'Ingresa una contraseña.';
      return v.length >= 8 ? '' : 'Mínimo 8 caracteres.';
    default: return '';
  }
}

const REQUIRED_KEYS = ['docNumber', 'razonSocial', 'taxRegime', 'fiscalEmail', 'country', 'department', 'city', 'adminName', 'adminEmail', 'password'];

function RegisterForm({ onSuccess }) {
  const [form, setForm] = React.useState({
    docType: '31', docNumber: '', razonSocial: '', taxRegime: '', fiscalEmail: '',
    address: '', phone: '', country: '', department: '', city: '',
    adminName: '', adminEmail: '', password: '',
  });
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});
  const [recaptcha, setRecaptcha] = React.useState(false);
  const [recaptchaTouched, setRecaptchaTouched] = React.useState(false);
  const [loadingDept, setLoadingDept] = React.useState(false);
  const [loadingCity, setLoadingCity] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [globalError, setGlobalError] = React.useState('');
  const cardRef = React.useRef(null);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const blur = (key) => {
    setTouched(t => ({ ...t, [key]: true }));
    setErrors(e => ({ ...e, [key]: validateField(key, form[key], form) }));
  };

  const docHint = form.docType === '31'
    ? 'El dígito de verificación se calcula automáticamente.'
    : 'Debe ser único en todo el sistema.';

  // Cascada: país → depto
  const onCountry = (val) => {
    setForm(f => ({ ...f, country: val, department: '', city: '' }));
    setErrors(e => ({ ...e, country: '', department: '', city: '' }));
    if (val) {
      setLoadingDept(true);
      setTimeout(() => setLoadingDept(false), 650);
    }
  };
  const onDepartment = (val) => {
    setForm(f => ({ ...f, department: val, city: '' }));
    setErrors(e => ({ ...e, department: '', city: '' }));
    if (val) {
      setLoadingCity(true);
      setTimeout(() => setLoadingCity(false), 650);
    }
  };

  const deptOptions = form.country ? Object.keys(GEO[form.country] || {}) : [];
  const cityOptions = (form.country && form.department) ? (GEO[form.country]?.[form.department] || []) : [];

  const submit = (e) => {
    e.preventDefault();
    setGlobalError('');
    const next = {};
    REQUIRED_KEYS.forEach(k => { const msg = validateField(k, form[k], form); if (msg) next[k] = msg; });
    // phone opcional pero validable
    const phoneMsg = validateField('phone', form.phone, form); if (phoneMsg) next.phone = phoneMsg;
    setErrors(next);
    setTouched(Object.fromEntries([...REQUIRED_KEYS, 'phone'].map(k => [k, true])));
    setRecaptchaTouched(true);

    if (Object.keys(next).length || !recaptcha) {
      if (cardRef.current) cardRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      if (Object.keys(next).length) setGlobalError('Revisa los campos marcados en rojo antes de continuar.');
      return;
    }

    // Demo: documento ya en uso
    if (form.docNumber === '900000000') {
      setErrors(er => ({ ...er, docNumber: 'El número de documento ya está en uso.' }));
      setGlobalError('El número de documento ya está en uso.');
      if (cardRef.current) cardRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // POST /register → { status: "PENDING_VERIFICATION" }, sin token, sin login.
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSuccess(form.adminEmail || 'tu correo');
    }, 1500);
  };

  const err = (k) => (touched[k] ? errors[k] : '') || '';

  return (
    <div ref={cardRef} className="reg-scroll" style={{ width: '100%', maxWidth: 720, maxHeight: '100%', overflowY: 'auto', margin: '0 auto' }}>
      <form onSubmit={submit} noValidate style={{
        background: '#fff', borderRadius: 16, border: '1px solid #ece5f4',
        boxShadow: '0 24px 48px -18px rgba(91,33,182,.18), 0 4px 12px -4px rgba(91,33,182,.07)',
        padding: 'clamp(24px,4vw,40px)',
      }}>
        {/* Encabezado */}
        <div style={{ fontSize: 11, fontWeight: 600, color: AME, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>VetSoftware</div>
        <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 30, fontWeight: 400, margin: 0, letterSpacing: '-.02em', lineHeight: 1.08 }}>Crear cuenta</h1>
        <p style={{ fontSize: 13.5, color: '#6b5b80', margin: '9px 0 0', lineHeight: 1.5 }}>Registra tu empresa y tu primer usuario administrador.</p>

        {globalError && (
          <div style={{ marginTop: 20 }}>
            <Banner tone="error" onClose={() => setGlobalError('')}>{globalError}</Banner>
          </div>
        )}

        {/* ---- Sección Empresa ---- */}
        <div style={{ marginTop: 28 }}>
          <SectionHead icon="IconBuilding" title="Empresa" desc="Datos fiscales y ubicación del centro veterinario." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 18 }}>
            <div className="reg-grid-2">
              <Field label="Tipo de documento" required>
                <SelectInput id="docType" value={form.docType}
                  onChange={(e) => { set('docType', e.target.value); setErrors(er => ({ ...er, docNumber: touched.docNumber ? validateField('docNumber', form.docNumber, { ...form, docType: e.target.value }) : '' })); }}
                  options={DOC_TYPES.map(d => ({ value: d.code, label: `${d.label} (${d.code})` }))} />
              </Field>
              <Field label="Número de documento" required hint={docHint} error={err('docNumber')}
                counter={`${form.docNumber.length}/20`}>
                <TextInput id="docNumber" placeholder={form.docType === '31' ? '900123456' : 'ABC12345'}
                  value={form.docNumber} maxLength={20}
                  onChange={(e) => set('docNumber', e.target.value)} onBlur={() => blur('docNumber')}
                  invalid={!!err('docNumber')} icon="IconFileText" />
              </Field>
            </div>

            <Field label="Razón social" required error={err('razonSocial')} counter={`${form.razonSocial.length}/100`}>
              <TextInput id="razonSocial" placeholder="Clínica Veterinaria Patitas S.A.S."
                value={form.razonSocial} maxLength={100}
                onChange={(e) => set('razonSocial', e.target.value)} onBlur={() => blur('razonSocial')}
                invalid={!!err('razonSocial')} icon="IconBuilding" />
            </Field>

            <div className="reg-grid-2">
              <Field label="Régimen tributario" required error={err('taxRegime')}>
                <SelectInput id="taxRegime" value={form.taxRegime} placeholder="Selecciona…"
                  onChange={(e) => { set('taxRegime', e.target.value); setErrors(er => ({ ...er, taxRegime: '' })); }}
                  onBlur={() => blur('taxRegime')} invalid={!!err('taxRegime')}
                  options={TAX_REGIMES} />
              </Field>
              <Field label="Correo fiscal" required error={err('fiscalEmail')}
                hint="Correo donde llegan las facturas y documentos electrónicos.">
                <TextInput id="fiscalEmail" type="email" placeholder="facturacion@clinica.com"
                  value={form.fiscalEmail} maxLength={255}
                  onChange={(e) => set('fiscalEmail', e.target.value)} onBlur={() => blur('fiscalEmail')}
                  invalid={!!err('fiscalEmail')} icon="IconReceipt" />
              </Field>
            </div>

            <div className="reg-grid-2">
              <Field label="Dirección" hint="Opcional">
                <TextInput id="address" placeholder="Cra 12 # 34-56"
                  value={form.address} maxLength={200}
                  onChange={(e) => set('address', e.target.value)} icon="IconMapPin" />
              </Field>
              <Field label="Teléfono de contacto" hint="Opcional" error={err('phone')}>
                <TextInput id="phone" type="tel" placeholder="+57 601 234 5678"
                  value={form.phone} maxLength={30}
                  onChange={(e) => set('phone', e.target.value)} onBlur={() => blur('phone')}
                  invalid={!!err('phone')} icon="IconPhone" />
              </Field>
            </div>

            <div className="reg-grid-3">
              <Field label="País" required error={err('country')}>
                <SelectInput id="country" value={form.country} placeholder="Selecciona…"
                  onChange={(e) => onCountry(e.target.value)} onBlur={() => blur('country')}
                  invalid={!!err('country')} options={Object.keys(GEO)} />
              </Field>
              <Field label="Departamento" required error={err('department')}>
                <SelectInput id="department" value={form.department} placeholder="Selecciona…"
                  onChange={(e) => onDepartment(e.target.value)} onBlur={() => blur('department')}
                  invalid={!!err('department')} disabled={!form.country} loading={loadingDept}
                  options={deptOptions} />
              </Field>
              <Field label="Ciudad" required error={err('city')}>
                <SelectInput id="city" value={form.city} placeholder="Selecciona…"
                  onChange={(e) => { set('city', e.target.value); setErrors(er => ({ ...er, city: '' })); }}
                  onBlur={() => blur('city')} invalid={!!err('city')}
                  disabled={!form.department} loading={loadingCity} options={cityOptions} />
              </Field>
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ height: 1, background: '#f0eaf7', margin: '28px 0' }} />

        {/* ---- Sección Usuario administrador ---- */}
        <div>
          <SectionHead icon="IconUserPlus" title="Usuario administrador" desc="La persona que gestionará la cuenta." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 18 }}>
            <Field label="Nombre completo" required error={err('adminName')} counter={`${form.adminName.length}/100`}>
              <TextInput id="adminName" placeholder="Dr. Ana Martínez"
                value={form.adminName} maxLength={100}
                onChange={(e) => set('adminName', e.target.value)} onBlur={() => blur('adminName')}
                invalid={!!err('adminName')} icon="IconUsers" />
            </Field>
            <div className="reg-grid-2">
              <Field label="Email" required error={err('adminEmail')}
                hint="A este correo llega el enlace de verificación.">
                <TextInput id="adminEmail" type="email" placeholder="ana@clinica.com"
                  value={form.adminEmail} maxLength={100}
                  onChange={(e) => set('adminEmail', e.target.value)} onBlur={() => blur('adminEmail')}
                  invalid={!!err('adminEmail')} icon="IconMail" />
              </Field>
              <Field label="Contraseña" required error={err('password')} hint="Mínimo 8 caracteres.">
                <PasswordInput id="password" placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)} onBlur={() => blur('password')}
                  invalid={!!err('password')} />
              </Field>
            </div>
          </div>
        </div>

        {/* reCAPTCHA */}
        <div style={{ marginTop: 26 }}>
          <Recaptcha checked={recaptcha} onCheck={(v) => { setRecaptcha(v); }} invalid={recaptchaTouched && !recaptcha} />
          {recaptchaTouched && !recaptcha && (
            <p style={{ fontSize: 11.5, color: ERR, textAlign: 'center', margin: '8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <IconAlertCircle size={12} stroke={2} /> Completa la verificación para continuar.
            </p>
          )}
        </div>

        {/* Botón */}
        <button type="submit" disabled={submitting} style={{
          width: '100%', marginTop: 22, padding: '13px 16px', borderRadius: 9,
          background: submitting ? '#a78bce' : 'linear-gradient(180deg,#9333ea,#7e22ce)',
          color: '#fff', border: 'none', cursor: submitting ? 'wait' : 'pointer',
          fontSize: 14.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: submitting ? 'none' : '0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)',
          transition: 'transform .12s, box-shadow .15s, background .15s',
        }}
          onMouseEnter={(e) => { if (!submitting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(126,34,206,.5), inset 0 1px 0 rgba(255,255,255,.15)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = submitting ? 'none' : '0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)'; }}>
          {submitting
            ? <><span className="reg-spin" style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'block' }} /> Creando cuenta…</>
            : <>Crear cuenta <IconArrow size={14} stroke={2.2} /></>}
        </button>

        <p style={{ fontSize: 13, color: '#6b5b80', textAlign: 'center', margin: '18px 0 0' }}>
          ¿Ya tienes cuenta? <a href="Login.html" style={{ color: AME, fontWeight: 600, textDecoration: 'none' }}>Inicia sesión</a>
        </p>
      </form>
    </div>
  );
}

window.RegisterForm = RegisterForm;
