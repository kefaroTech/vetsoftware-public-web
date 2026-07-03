// Paso 2 — Mascota: lista, lista vacía, crear

function OwnerHeader({ name, doc, pets }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 16px', marginBottom: 18,
      background: flowTokens.surface,
      border: `1px solid ${flowTokens.border}`,
      borderRadius: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))',
        color: 'white', fontWeight: 600, fontSize: 12,
        display: 'grid', placeItems: 'center',
      }}>{name.split(' ').map(p=>p[0]).slice(0,2).join('')}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11.5, color: flowTokens.textSubtle, marginTop: 1 }}>{doc} · {pets} mascota{pets !== 1 ? 's' : ''}</div>
      </div>
      <div style={{
        fontSize: 11, padding: '3px 8px',
        background: flowTokens.surface2, color: flowTokens.textMuted,
        borderRadius: 6, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500,
      }}>Paso 1 ✓</div>
      <button style={{
        background: 'transparent', border: 'none',
        color: flowTokens.accent, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>Editar</button>
    </div>
  );
}

function PetCard({ pet, selected }) {
  return (
    <div style={{
      background: flowTokens.surface,
      border: `${selected ? 1.5 : 1}px solid ${selected ? flowTokens.accent : flowTokens.border}`,
      boxShadow: selected ? `0 0 0 3px ${flowTokens.accentBg2}` : 'none',
      borderRadius: 12,
      padding: 16,
      cursor: 'pointer',
      position: 'relative',
      opacity: pet.deceased ? 0.7 : 1,
    }}>
      {selected && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: 22, height: 22, borderRadius: '50%',
          background: flowTokens.accent, color: 'white',
          display: 'grid', placeItems: 'center',
        }}><IconCheck size={12} /></div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 11,
          background: flowTokens.accentBg, color: flowTokens.accent,
          display: 'grid', placeItems: 'center',
        }}><IconPaw size={22} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            {pet.name}
            {pet.deceased && <Chip variant="neutral">Fallecido</Chip>}
          </div>
          <div style={{ fontSize: 12, color: flowTokens.textSubtle, marginTop: 2 }}>
            {pet.specie} · {pet.breed}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11.5 }}>
        <div>
          <div style={{ color: flowTokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>Edad</div>
          <div style={{ color: flowTokens.text, marginTop: 2, fontSize: 12.5, fontWeight: 500 }}>{pet.age}</div>
        </div>
        <div>
          <div style={{ color: flowTokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>Género</div>
          <div style={{ color: flowTokens.text, marginTop: 2, fontSize: 12.5, fontWeight: 500 }}>{pet.gender}</div>
        </div>
        <div>
          <div style={{ color: flowTokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>Peso</div>
          <div style={{ color: flowTokens.text, marginTop: 2, fontSize: 12.5, fontWeight: 500 }}>{pet.weight}</div>
        </div>
        <div>
          <div style={{ color: flowTokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>Última consulta</div>
          <div style={{ color: flowTokens.text, marginTop: 2, fontSize: 12.5, fontWeight: 500 }}>{pet.lastVisit}</div>
        </div>
      </div>
    </div>
  );
}

function Step2PetSelect() {
  const pets = [
    { name: 'Luna', specie: 'Felino', breed: 'Mestizo doméstico', age: '4 años', gender: 'Hembra', weight: '4.2 kg', lastVisit: 'Hace 2 meses', deceased: false },
    { name: 'Rocco', specie: 'Canino', breed: 'Labrador retriever', age: '7 años', gender: 'Macho', weight: '32 kg', lastVisit: 'Hace 8 meses', deceased: false },
  ];
  return (
    <WizardShell step={2}>
      <ContentWrap>
        <OwnerHeader name="Carla Mendoza Ríos" doc="DNI 45.231.908" pets={2} />

        <PageHeading title="Selecciona la mascota" subtitle="Elige la mascota que será atendida en esta consulta, o registra una nueva." />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <PetCard pet={pets[0]} selected={true} />
          <PetCard pet={pets[1]} selected={false} />
          <button style={{
            background: 'transparent',
            border: `1.5px dashed ${flowTokens.borderStrong}`,
            borderRadius: 12,
            padding: 16,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, minHeight: 175,
            color: flowTokens.textMuted,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: flowTokens.accentBg, color: flowTokens.accent,
              display: 'grid', placeItems: 'center',
            }}><IconPlus size={18} /></div>
            <div style={{ fontSize: 13, fontWeight: 500, color: flowTokens.text }}>Nueva mascota</div>
            <div style={{ fontSize: 11.5, textAlign: 'center', maxWidth: 160 }}>Registrar mascota a nombre de Carla</div>
          </button>
        </div>
      </ContentWrap>
      <WizardFooter />
    </WizardShell>
  );
}

function Step2PetEmpty() {
  return (
    <WizardShell step={2}>
      <ContentWrap>
        <OwnerHeader name="Andrés Pizarro Vega" doc="DNI 73.001.288" pets={0} />

        <PageHeading title="Selecciona la mascota" subtitle="Este propietario aún no tiene mascotas registradas." />

        <SectionCard padded={false}>
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: flowTokens.accentBg2, color: flowTokens.accent,
              display: 'grid', placeItems: 'center',
              margin: '0 auto 16px',
            }}><IconPaw size={30} /></div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
              Sin mascotas registradas
            </div>
            <div style={{ fontSize: 13, color: flowTokens.textMuted, marginBottom: 22, maxWidth: 380, margin: '0 auto 22px' }}>
              Registra la primera mascota de Andrés para poder iniciar la consulta.
            </div>
            <button style={{
              background: flowTokens.accent, color: 'white',
              border: 'none', padding: '10px 20px', borderRadius: 8,
              fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}>
              <IconPlus size={14} /> Registrar primera mascota
            </button>
          </div>
        </SectionCard>
      </ContentWrap>
      <WizardFooter nextDisabled={true} />
    </WizardShell>
  );
}

function Step2PetCreate() {
  return (
    <WizardShell step={2}>
      <ContentWrap>
        <OwnerHeader name="Carla Mendoza Ríos" doc="DNI 45.231.908" pets={2} />
        <PageHeading title="Registrar nueva mascota" subtitle="Datos básicos para crear el expediente. Los detalles clínicos se agregan en cada consulta." />

        <SectionCard icon={IconPaw} accent title="Identificación">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <Field label="Nombre" required>
              <Input placeholder="Ej. Mishi" icon={IconPaw} />
            </Field>
            <Field label="Código" hint="Se autogenera si lo dejas vacío">
              <Input placeholder="VTR-0247" icon={IconId} />
            </Field>
            <Field label="Especie" required><Select value="Felino" /></Field>
            <Field label="Raza" required><Select placeholder="Selecciona después de la especie" value="Mestizo doméstico" /></Field>
            <Field label="Género" required><Select value="Hembra" /></Field>
            <Field label="Color"><Select placeholder="Atigrado, blanco, etc." /></Field>
            <Field label="Fecha de nacimiento" required hint="Aproximada si no se conoce con exactitud">
              <Input placeholder="dd / mm / aaaa" icon={IconCalendar} value="14 / 03 / 2022" />
            </Field>
            <Field label="Tipo">
              <Select value="Mascota común" />
            </Field>
          </div>
        </SectionCard>

        <div style={{ height: 16 }} />

        <SectionCard icon={IconScale} title="Características físicas y reproductivas">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Field label="Peso" required>
              <Input placeholder="Ej. 4.2" suffix={<span style={{ fontSize: 11, color: flowTokens.textSubtle }}>kg</span>} />
            </Field>
            <Field label="Unidad de peso" required>
              <Select value="Kilogramos" />
            </Field>
            <Field label="Tamaño (cm)" hint="Altura a la cruz">
              <Input placeholder="Ej. 28" />
            </Field>
          </div>
          <Field label="Estado reproductivo" required>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Esterilizada', 'No esterilizada', 'Desconocido'].map((opt, i) => (
                <div key={opt} style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: i === 0 ? flowTokens.accentBg : flowTokens.surface,
                  border: `1px solid ${i === 0 ? flowTokens.accent : flowTokens.border}`,
                  color: i === 0 ? flowTokens.accent : flowTokens.text,
                  fontSize: 12.5, fontWeight: i === 0 ? 500 : 400,
                  cursor: 'pointer',
                }}>{opt}</div>
              ))}
            </div>
          </Field>
        </SectionCard>
      </ContentWrap>
      <WizardFooter nextLabel="Guardar y continuar" />
    </WizardShell>
  );
}

Object.assign(window, { OwnerHeader, PetCard, Step2PetSelect, Step2PetEmpty, Step2PetCreate });
