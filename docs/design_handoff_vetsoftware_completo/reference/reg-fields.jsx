// ============ REGISTRO · controles compartidos + datos mock ============
// Paleta amatista, focus-ring, estados de error/hint/contador. Español (Colombia).

const AME = '#7e22ce';
const AME_HOVER = '#6b1fa8';
const ERR = '#dc2626';
const WARN_BG = '#fffbeb', WARN_BD = '#fde68a', WARN_TX = '#92600a';

// --- Catálogos ---
const DOC_TYPES = [
  { code: '31', label: 'NIT' },
  { code: '13', label: 'Cédula de ciudadanía' },
  { code: '22', label: 'Cédula de extranjería' },
  { code: '41', label: 'Pasaporte' },
];
const TAX_REGIMES = ['Responsable de IVA', 'No responsable de IVA'];

// Cascada País → Departamento → Ciudad (mock, se "cargan del backend")
const GEO = {
  Colombia: {
    'Antioquia': ['Medellín', 'Envigado', 'Bello', 'Itagüí', 'Rionegro'],
    'Cundinamarca': ['Bogotá D.C.', 'Soacha', 'Chía', 'Zipaquirá', 'Facatativá'],
    'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá'],
    'Atlántico': ['Barranquilla', 'Soledad', 'Malambo'],
    'Santander': ['Bucaramanga', 'Floridablanca', 'Girón'],
  },
  México: {
    'Ciudad de México': ['Ciudad de México'],
    'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque'],
    'Nuevo León': ['Monterrey', 'San Pedro Garza García'],
  },
  Ecuador: {
    'Pichincha': ['Quito', 'Sangolquí'],
    'Guayas': ['Guayaquil', 'Durán'],
  },
};

// --- Field wrapper (label + *, hint, error, contador) ---
function Field({ label, required, hint, error, counter, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#3d2e57', letterSpacing: '.01em' }}>
            {label}{required && <span style={{ color: ERR, marginLeft: 3 }}>*</span>}
          </label>
          {counter != null && (
            <span style={{ fontSize: 11, color: '#a08bbd', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{counter}</span>
          )}
        </div>
      )}
      {children}
      {error
        ? <span role="alert" style={{ fontSize: 11.5, color: ERR, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 5 }}><IconAlertCircle size={12} stroke={2} /> {error}</span>
        : hint ? <span style={{ fontSize: 11.5, color: '#8578a0', lineHeight: 1.4 }}>{hint}</span> : null}
    </div>
  );
}

// --- Text / email / tel input ---
function TextInput({ id, type = 'text', placeholder, value, onChange, onBlur, invalid, icon, maxLength, autoComplete, disabled }) {
  const [focused, setFocused] = React.useState(false);
  const Ico = icon ? window[icon] : null;
  const border = invalid ? ERR : focused ? '#a855f7' : '#ece5f4';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: disabled ? '#faf8fc' : '#fff', border: `1px solid ${border}`, borderRadius: 8,
      transition: 'border-color .15s, box-shadow .15s',
      boxShadow: focused ? (invalid ? '0 0 0 3px rgba(220,38,38,.10)' : '0 0 0 3px rgba(168,85,247,.14)') : 'none',
      opacity: disabled ? .6 : 1,
    }}>
      {Ico && <Ico size={15} stroke={1.7} style={{ color: focused ? AME : '#a89bbd', flexShrink: 0 }} />}
      <input
        id={id} type={type} placeholder={placeholder} value={value} disabled={disabled}
        maxLength={maxLength} autoComplete={autoComplete}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur && onBlur(); }}
        aria-invalid={!!invalid}
        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: '#1a1325', minWidth: 0, outline: 'none' }}
      />
    </div>
  );
}

// --- Password con mostrar/ocultar ---
function PasswordInput({ id, placeholder, value, onChange, onBlur, invalid }) {
  const [show, setShow] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const border = invalid ? ERR : focused ? '#a855f7' : '#ece5f4';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: '#fff', border: `1px solid ${border}`, borderRadius: 8,
      transition: 'border-color .15s, box-shadow .15s',
      boxShadow: focused ? (invalid ? '0 0 0 3px rgba(220,38,38,.10)' : '0 0 0 3px rgba(168,85,247,.14)') : 'none',
    }}>
      <IconLock size={15} stroke={1.7} style={{ color: focused ? AME : '#a89bbd', flexShrink: 0 }} />
      <input
        id={id} type={show ? 'text' : 'password'} placeholder={placeholder} value={value}
        maxLength={100} autoComplete="new-password"
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur && onBlur(); }}
        aria-invalid={!!invalid}
        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: '#1a1325', minWidth: 0, outline: 'none' }}
      />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#a89bbd', display: 'grid', placeItems: 'center', padding: 0 }}>
        {show ? <IconEyeOff size={16} stroke={1.7} /> : <IconEye size={16} stroke={1.7} />}
      </button>
    </div>
  );
}

// --- Select nativo estilizado (con estado loading) ---
function SelectInput({ id, value, onChange, onBlur, invalid, disabled, loading, placeholder, options }) {
  const [focused, setFocused] = React.useState(false);
  const border = invalid ? ERR : focused ? '#a855f7' : '#ece5f4';
  return (
    <div style={{ position: 'relative' }}>
      <select
        id={id} value={value} disabled={disabled || loading}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur && onBlur(); }}
        aria-invalid={!!invalid}
        style={{
          width: '100%', appearance: 'none', WebkitAppearance: 'none',
          padding: '10px 38px 10px 12px', fontSize: 14,
          color: value ? '#1a1325' : '#a89bbd',
          background: (disabled || loading) ? '#faf8fc' : '#fff',
          border: `1px solid ${border}`, borderRadius: 8, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
          outline: 'none', transition: 'border-color .15s, box-shadow .15s',
          boxShadow: focused ? (invalid ? '0 0 0 3px rgba(220,38,38,.10)' : '0 0 0 3px rgba(168,85,247,.14)') : 'none',
          opacity: (disabled) ? .6 : 1,
        }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => {
          const val = typeof o === 'string' ? o : o.value;
          const lab = typeof o === 'string' ? o : o.label;
          return <option key={val} value={val}>{lab}</option>;
        })}
      </select>
      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#a89bbd', display: 'grid', placeItems: 'center' }}>
        {loading
          ? <span className="reg-spin" style={{ width: 14, height: 14, border: '2px solid #e9d5ff', borderTopColor: AME, borderRadius: '50%', display: 'block' }} />
          : <IconChevron size={15} stroke={2} style={{ transform: 'rotate(90deg)' }} />}
      </div>
    </div>
  );
}

// --- Banner (error / warning) cerrable ---
function Banner({ tone = 'error', children, onClose }) {
  const c = tone === 'warning'
    ? { bg: WARN_BG, bd: WARN_BD, tx: WARN_TX, Ico: IconAlertTriangle }
    : { bg: '#fef2f2', bd: '#fecaca', tx: '#b91c1c', Ico: IconAlertCircle };
  const Ico = c.Ico;
  return (
    <div role="alert" style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px',
      background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 10, color: c.tx,
      fontSize: 13, lineHeight: 1.45,
    }}>
      <Ico size={17} stroke={1.9} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Cerrar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: c.tx, opacity: .7, padding: 0, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <IconX size={15} stroke={2} />
        </button>
      )}
    </div>
  );
}

// --- reCAPTCHA v2 mock (checkbox "No soy un robot") ---
function Recaptcha({ checked, onCheck, invalid }) {
  const [loading, setLoading] = React.useState(false);
  const toggle = () => {
    if (checked || loading) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onCheck(true); }, 900);
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: 302, display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', background: '#f9f9f9',
        border: `1px solid ${invalid ? ERR : '#d3d3d3'}`, borderRadius: 5,
        boxShadow: invalid ? '0 0 0 3px rgba(220,38,38,.10)' : '0 1px 2px rgba(0,0,0,.05)',
      }}>
        <button type="button" onClick={toggle} aria-checked={checked} role="checkbox"
          style={{
            width: 26, height: 26, borderRadius: 3, cursor: checked ? 'default' : 'pointer',
            border: `2px solid ${checked ? AME : '#c1c1c1'}`, background: checked ? AME : '#fff',
            display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all .15s', padding: 0,
          }}>
          {loading
            ? <span className="reg-spin" style={{ width: 15, height: 15, border: '2px solid #e0e0e0', borderTopColor: '#888', borderRadius: '50%', display: 'block' }} />
            : checked ? <IconCheck size={16} stroke={3} style={{ color: '#fff' }} /> : null}
        </button>
        <span style={{ fontSize: 14, color: '#3c4043', flex: 1 }}>No soy un robot</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: .8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: 'linear-gradient(135deg,#a855f7,#581c87)', display: 'grid', placeItems: 'center', color: '#fff' }}>
            <IconShieldCheck size={17} stroke={2} />
          </div>
          <span style={{ fontSize: 8, color: '#9aa0a6', letterSpacing: '.02em' }}>reCAPTCHA</span>
        </div>
      </div>
    </div>
  );
}

// --- Encabezado de sección ---
function SectionHead({ icon, title, desc }) {
  const Ico = window[icon];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 2 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)', border: '1px solid #ecd9fb', display: 'grid', placeItems: 'center', color: AME, flexShrink: 0 }}>
        <Ico size={17} stroke={1.9} />
      </div>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1325', letterSpacing: '-.01em' }}>{title}</div>
        {desc && <div style={{ fontSize: 12, color: '#8578a0', marginTop: 1 }}>{desc}</div>}
      </div>
    </div>
  );
}

Object.assign(window, {
  AME, AME_HOVER, ERR, DOC_TYPES, TAX_REGIMES, GEO,
  Field, TextInput, PasswordInput, SelectInput, Banner, Recaptcha, SectionHead,
});
