// Paso 1 — Propietario: 3 estados (búsqueda, resultados, seleccionado, crear)

function Step1OwnerSearch() {
  return (
    <WizardShell step={1}>
      <ContentWrap>
        <PageHeading title="¿Quién es el propietario?" subtitle="Busca por nombre, documento, teléfono o email. Si es nuevo, regístralo." />

        <SectionCard padded={false}>
          <div style={{ padding: 16, borderBottom: `1px solid ${flowTokens.border}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: flowTokens.surface2,
              border: `1px solid ${flowTokens.border}`,
              borderRadius: 10, padding: '12px 14px',
            }}>
              <IconSearch size={17} style={{ color: flowTokens.textMuted }} />
              <span style={{ flex: 1, fontSize: 14.5, color: flowTokens.textMuted }}>
                Buscar propietario…
              </span>
              <span style={{ fontSize: 11, color: flowTokens.textSubtle }}>0 resultados</span>
            </div>
          </div>

          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: flowTokens.accentBg2, color: flowTokens.accent,
              display: 'grid', placeItems: 'center',
              margin: '0 auto 14px',
            }}><IconUser size={26} /></div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Empieza buscando un propietario
            </div>
            <div style={{ fontSize: 13, color: flowTokens.textMuted, marginBottom: 18, maxWidth: 360, margin: '0 auto 18px' }}>
              Escribe el nombre, documento o teléfono. Si no existe, podrás crearlo desde aquí mismo.
            </div>
            <button style={{
              background: flowTokens.surface, border: `1px solid ${flowTokens.border}`,
              padding: '9px 16px', borderRadius: 8,
              fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
              color: flowTokens.text, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}>
              <IconPlus size={14} /> Registrar nuevo propietario
            </button>
          </div>
        </SectionCard>
      </ContentWrap>
      <WizardFooter nextDisabled={true} />
    </WizardShell>
  );
}

function Step1OwnerResults() {
  const results = [
    { name: 'Carla Mendoza Ríos', doc: 'DNI 45.231.908', phone: '+51 987 654 321', email: 'carla.mendoza@gmail.com', pets: 2 },
    { name: 'Carla Vásquez Soto',  doc: 'DNI 41.118.220', phone: '+51 998 112 304', email: 'cvasquez@outlook.com', pets: 1 },
    { name: 'Carlos Mendoza P.',   doc: 'DNI 47.882.011', phone: '+51 955 700 218', email: 'carlos.m@vetcorreo.com', pets: 3 },
  ];
  return (
    <WizardShell step={1}>
      <ContentWrap>
        <PageHeading title="¿Quién es el propietario?" subtitle="Busca por nombre, documento, teléfono o email." />

        <SectionCard padded={false}>
          <div style={{ padding: 16, borderBottom: `1px solid ${flowTokens.border}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: flowTokens.surface,
              border: `1.5px solid ${flowTokens.accent}`,
              borderRadius: 10, padding: '12px 14px',
              boxShadow: `0 0 0 3px ${flowTokens.accentBg2}`,
            }}>
              <IconSearch size={17} style={{ color: flowTokens.accent }} />
              <span style={{ flex: 1, fontSize: 14.5, color: flowTokens.text }}>
                Carla
              </span>
              <span style={{ fontSize: 11, color: flowTokens.textMuted }}>3 resultados</span>
            </div>
          </div>

          {results.map((r, i) => (
            <div key={i} style={{
              padding: '14px 18px',
              borderBottom: i < results.length - 1 ? `1px solid ${flowTokens.border}` : 'none',
              display: 'grid',
              gridTemplateColumns: '38px 1.5fr 1fr 1fr auto',
              gap: 16, alignItems: 'center',
              cursor: 'pointer',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))',
                color: 'white', fontWeight: 600, fontSize: 13,
                display: 'grid', placeItems: 'center',
              }}>{r.name.split(' ').map(p=>p[0]).slice(0,2).join('')}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: flowTokens.textSubtle, marginTop: 2 }}>{r.doc}</div>
              </div>
              <div style={{ fontSize: 12.5, color: flowTokens.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconPhone size={12} /> {r.phone}
              </div>
              <div style={{ fontSize: 12.5, color: flowTokens.textMuted }}>{r.email}</div>
              <Chip variant="accent">{r.pets} mascota{r.pets > 1 ? 's' : ''}</Chip>
            </div>
          ))}

          <div style={{
            padding: '14px 18px', display: 'flex',
            alignItems: 'center', gap: 10,
            background: flowTokens.surface2,
            color: flowTokens.text, fontSize: 13,
            cursor: 'pointer',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: flowTokens.accentBg, color: flowTokens.accent,
              display: 'grid', placeItems: 'center',
            }}><IconPlus size={15} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>¿No encuentras a "Carla"?</div>
              <div style={{ fontSize: 12, color: flowTokens.textMuted, marginTop: 1 }}>Registra un propietario nuevo</div>
            </div>
            <IconArrowRight size={14} style={{ color: flowTokens.textSubtle }} />
          </div>
        </SectionCard>
      </ContentWrap>
      <WizardFooter nextDisabled={true} />
    </WizardShell>
  );
}

function Step1OwnerSelected() {
  return (
    <WizardShell step={1}>
      <ContentWrap>
        <PageHeading title="¿Quién es el propietario?" subtitle="Confirma los datos del propietario seleccionado." />

        <SectionCard
          icon={IconUser}
          accent
          title="Carla Mendoza Ríos"
          subtitle="DNI 45.231.908 · Cliente desde marzo 2024"
          action={
            <button style={{
              background: 'transparent', border: `1px solid ${flowTokens.border}`,
              padding: '6px 12px', borderRadius: 7,
              fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
              color: flowTokens.text, cursor: 'pointer',
            }}>Cambiar</button>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <FieldRow icon={IconPhone} label="Teléfono" value="+51 987 654 321" />
            <FieldRow icon={IconMail} label="Email" value="carla.mendoza@gmail.com" />
            <FieldRow icon={IconMapPin} label="Dirección" value="Av. Salaverry 2580, Dpto 502" />
            <FieldRow icon={IconMapPin} label="Ciudad" value="Lima · Lima · Perú" />
          </div>

          <div style={{
            marginTop: 18, padding: '12px 14px',
            background: flowTokens.accentBg2,
            border: `1px solid ${flowTokens.accentBg}`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 12.5,
          }}>
            <IconSparkles size={14} style={{ color: flowTokens.accent, flexShrink: 0 }} />
            <span style={{ color: flowTokens.text }}>
              <strong>2 mascotas</strong> registradas a su nombre. Las verás en el siguiente paso.
            </span>
          </div>
        </SectionCard>
      </ContentWrap>
      <WizardFooter />
    </WizardShell>
  );
}

function FieldRow({ icon: Ico, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: flowTokens.surface2, color: flowTokens.textMuted,
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}><Ico size={13} /></div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: flowTokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 13, color: flowTokens.text, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

function Step1OwnerCreate() {
  return (
    <WizardShell step={1}>
      <ContentWrap>
        <PageHeading title="Registrar nuevo propietario" subtitle="Completa los datos. Podrás editarlos después desde su ficha." />

        <SectionCard icon={IconUser} title="Datos personales" accent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <Field label="Nombre completo" required>
              <Input placeholder="Ej. Carla Mendoza Ríos" icon={IconUser} />
            </Field>
            <Field label="Documento de identidad" required>
              <Input placeholder="DNI / RUC / Pasaporte" icon={IconId} />
            </Field>
            <Field label="Teléfono" required>
              <Input placeholder="+51 …" icon={IconPhone} />
            </Field>
            <Field label="Email" hint="Opcional · usado para recordatorios">
              <Input placeholder="correo@ejemplo.com" icon={IconMail} />
            </Field>
          </div>
        </SectionCard>

        <div style={{ height: 16 }} />

        <SectionCard icon={IconMapPin} title="Dirección">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Field label="País" required><Select value="Perú" /></Field>
            <Field label="Estado / Departamento" required><Select value="Lima" /></Field>
            <Field label="Ciudad" required><Select value="Lima" /></Field>
          </div>
          <Field label="Dirección" hint="Calle, número, departamento, referencia">
            <Input placeholder="Ej. Av. Salaverry 2580, Dpto 502" />
          </Field>
        </SectionCard>
      </ContentWrap>
      <WizardFooter
        extra={
          <button style={{
            background: 'transparent', border: 'none',
            color: flowTokens.textMuted, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Descartar</button>
        }
        nextLabel="Guardar y continuar"
      />
    </WizardShell>
  );
}

Object.assign(window, { Step1OwnerSearch, Step1OwnerResults, Step1OwnerSelected, Step1OwnerCreate });
