/* global React, VetIcons, useVetRouter */

// ===== Vuetify-style v-text-field =====
function VetTextField({ label, value, onChange, type = 'text', error, hint, maxLength, autoFocus, autoComplete }) {
  const [showPass, setShowPass] = React.useState(false);
  const realType = type === 'password' ? (showPass ? 'text' : 'password') : type;
  return (
    <div className="vet-tf">
      <label className="vet-tf-label">{label}</label>
      <div className={'vet-tf-input-wrap' + (error ? ' error' : '')}>
        <input
          type={realType}
          className="vet-tf-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
        />
        {type === 'password' && (
          <button
            type="button"
            className="vet-tf-icon-btn"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? 'Ocultar' : 'Mostrar'}
          >
            {showPass ? <VetIcons.EyeOff size={16} /> : <VetIcons.Eye size={16} />}
          </button>
        )}
      </div>
      {error && <div className="vet-tf-error">{error}</div>}
      {!error && hint && <div style={{ fontSize: 12, color: 'var(--warm-500)' }}>{hint}</div>}
    </div>
  );
}

// ===== Vuetify-style v-select (simple) =====
function VetSelect({ label, value, onChange, items, disabled, hint }) {
  return (
    <div className="vet-tf">
      <label className="vet-tf-label">{label}</label>
      <div className={'vet-tf-input-wrap' + (disabled ? ' disabled' : '')}
        style={disabled ? { opacity: 0.55 } : null}>
        <select
          className="vet-tf-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled}
          style={{ appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          <option value="">{disabled ? '—' : 'Selecciona...'}</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>{it.name}</option>
          ))}
        </select>
        <VetIcons.ChevronDown size={16} style={{ color: 'var(--warm-500)' }} />
      </div>
      {hint && <div style={{ fontSize: 12, color: 'var(--warm-500)' }}>{hint}</div>}
    </div>
  );
}

// ===== LoginView =====
function VetLoginView() {
  const router = useVetRouter();
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      router.push({ name: 'home' });
    }, 600);
  }

  return (
    <div className="vet-auth-shell">
      <form className="vet-auth-card" onSubmit={submit}>
        <h2 className="vet-auth-title">Iniciar sesión</h2>
        <p className="vet-auth-sub">Ingresa con tu código de empleado y contraseña.</p>

        <VetTextField
          label="Código de empleado"
          value={code} onChange={setCode}
          maxLength={50} autoFocus autoComplete="username"
        />
        <VetTextField
          label="Contraseña"
          type="password"
          value={password} onChange={setPassword}
          maxLength={100} autoComplete="current-password"
        />

        <button
          type="submit"
          className="vet-btn vet-btn-primary vet-btn-block vet-btn-large"
          style={{ marginTop: 8, background: 'var(--v-primary)' }}
          disabled={submitting}
        >
          {submitting ? 'Iniciando…' : 'Iniciar sesión'}
        </button>

        <div className="vet-auth-footer">
          ¿No tienes cuenta?{' '}
          <a href="#/signup" onClick={(e) => { e.preventDefault(); router.push({ name: 'signup' }); }}>
            Regístrate
          </a>
        </div>
      </form>
    </div>
  );
}

// ===== SignupView =====
const VET_MOCK_COUNTRIES = [
  { id: 1, name: 'Colombia' }, { id: 2, name: 'México' }, { id: 3, name: 'Perú' }, { id: 4, name: 'Chile' },
];
const VET_MOCK_STATES = {
  1: [{ id: 11, name: 'Cundinamarca' }, { id: 12, name: 'Antioquia' }, { id: 13, name: 'Valle del Cauca' }],
  2: [{ id: 21, name: 'CDMX' }, { id: 22, name: 'Jalisco' }],
  3: [{ id: 31, name: 'Lima' }, { id: 32, name: 'Arequipa' }],
  4: [{ id: 41, name: 'Metropolitana' }, { id: 42, name: 'Valparaíso' }],
};
const VET_MOCK_CITIES = {
  11: [{ id: 111, name: 'Bogotá' }, { id: 112, name: 'Soacha' }],
  12: [{ id: 121, name: 'Medellín' }, { id: 122, name: 'Envigado' }],
  13: [{ id: 131, name: 'Cali' }],
  21: [{ id: 211, name: 'Ciudad de México' }],
  22: [{ id: 221, name: 'Guadalajara' }],
  31: [{ id: 311, name: 'Lima' }],
  32: [{ id: 321, name: 'Arequipa' }],
  41: [{ id: 411, name: 'Santiago' }],
  42: [{ id: 421, name: 'Valparaíso' }],
};

function VetSignupView() {
  const router = useVetRouter();
  const [stage, setStage] = React.useState('form');
  const [form, setForm] = React.useState({
    companyName: '', companyIdentifier: '', companyAddress: '', companyContactNumber: '',
    countryId: null, stateId: null, cityId: null,
    employeeName: '', employeeEmail: '', password: '',
  });
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const states = form.countryId ? (VET_MOCK_STATES[form.countryId] || []) : [];
  const cities = form.stateId ? (VET_MOCK_CITIES[form.stateId] || []) : [];

  function submit(e) {
    e.preventDefault();
    setStage('success');
  }

  if (stage === 'success') {
    return (
      <div className="vet-auth-shell">
        <div className="vet-auth-card" style={{ maxWidth: 540, textAlign: 'center', padding: 40 }}>
          <div style={{
            margin: '0 auto 16px', width: 80, height: 80, borderRadius: '50%',
            background: 'color-mix(in oklab, var(--v-success) 14%, white)',
            color: 'var(--v-success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <VetIcons.Check size={42} strokeWidth={2} />
          </div>
          <h2 className="vet-auth-title" style={{ fontSize: 22 }}>¡Cuenta creada!</h2>
          <p style={{ fontSize: 14, color: 'var(--v-secondary)', lineHeight: 1.6, margin: '8px 0 24px' }}>
            Tu empresa fue registrada y tu código de empleado se generó automáticamente.
            Ya puedes iniciar sesión con tu email y contraseña.
          </p>
          <button
            className="vet-btn vet-btn-primary vet-btn-large"
            style={{ background: 'var(--v-primary)' }}
            onClick={() => router.push({ name: 'login' })}
          >
            Ir a iniciar sesión
            <VetIcons.ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vet-auth-shell">
      <form className="vet-auth-card" style={{ maxWidth: 720 }} onSubmit={submit}>
        <h2 className="vet-auth-title">Crear cuenta</h2>
        <p className="vet-auth-sub">Registra tu empresa y tu primer usuario administrador.</p>

        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--warm-800)', margin: '18px 0 12px' }}>Empresa</div>

        <VetTextField label="Nombre de la empresa" value={form.companyName}
          onChange={(v) => update({ companyName: v })} maxLength={100} />
        <VetTextField label="Identificador / NIT" value={form.companyIdentifier}
          onChange={(v) => update({ companyIdentifier: v })}
          maxLength={50} hint="Debe ser único en todo el sistema" />
        <VetTextField label="Dirección (opcional)" value={form.companyAddress}
          onChange={(v) => update({ companyAddress: v })} maxLength={200} />
        <VetTextField label="Teléfono de contacto (opcional)" value={form.companyContactNumber}
          onChange={(v) => update({ companyContactNumber: v })} maxLength={30} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <VetSelect
            label="País" value={form.countryId}
            onChange={(v) => update({ countryId: v, stateId: null, cityId: null })}
            items={VET_MOCK_COUNTRIES}
          />
          <VetSelect
            label="Estado / Departamento" value={form.stateId}
            onChange={(v) => update({ stateId: v, cityId: null })}
            items={states} disabled={!form.countryId}
          />
          <VetSelect
            label="Ciudad" value={form.cityId}
            onChange={(v) => update({ cityId: v })}
            items={cities} disabled={!form.stateId}
          />
        </div>

        <div style={{ height: 1, background: 'var(--warm-200)', margin: '20px 0' }} />

        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--warm-800)', margin: '0 0 12px' }}>Usuario administrador</div>

        <VetTextField label="Nombre completo" value={form.employeeName}
          onChange={(v) => update({ employeeName: v })} maxLength={100} />
        <VetTextField label="Email" type="email" value={form.employeeEmail}
          onChange={(v) => update({ employeeEmail: v })} maxLength={100} autoComplete="email" />
        <VetTextField label="Contraseña" type="password" value={form.password}
          onChange={(v) => update({ password: v })} maxLength={100}
          hint="Mínimo 8 caracteres" autoComplete="new-password" />

        <button
          type="submit"
          className="vet-btn vet-btn-primary vet-btn-block vet-btn-large"
          style={{ marginTop: 16, background: 'var(--v-primary)' }}
        >
          Crear cuenta
        </button>

        <div className="vet-auth-footer">
          ¿Ya tienes cuenta?{' '}
          <a href="#/" onClick={(e) => { e.preventDefault(); router.push({ name: 'login' }); }}>
            Inicia sesión
          </a>
        </div>
      </form>
    </div>
  );
}

Object.assign(window, { VetLoginView, VetSignupView, VetTextField, VetSelect });
