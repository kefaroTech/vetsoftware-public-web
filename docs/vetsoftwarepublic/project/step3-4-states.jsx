// Paso 3 — Datos de consulta + Paso 4 — Resumen + estados extra

function ContextHeader({ owner, pet }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', marginBottom: 18,
      background: flowTokens.surface,
      border: `1px solid ${flowTokens.border}`,
      borderRadius: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: flowTokens.accentBg, color: flowTokens.accent,
        display: 'grid', placeItems: 'center',
      }}><IconPaw size={18} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          {pet.name}
          <span style={{ fontSize: 11.5, color: flowTokens.textSubtle, fontWeight: 400 }}>· {pet.specie} · {pet.breed} · {pet.age}</span>
        </div>
        <div style={{ fontSize: 11.5, color: flowTokens.textSubtle, marginTop: 1 }}>
          Propietario: {owner.name} · {owner.doc}
        </div>
      </div>
      <Chip variant="success">Pasos 1-2 ✓</Chip>
    </div>
  );
}

function Step3Consultation() {
  const owner = { name: 'Carla Mendoza Ríos', doc: 'DNI 45.231.908' };
  const pet = { name: 'Luna', specie: 'Felino', breed: 'Mestizo', age: '4 años' };
  return (
    <WizardShell step={3}>
      <ContentWrap maxWidth={920}>
        <ContextHeader owner={owner} pet={pet} />
        <PageHeading title="Datos de la consulta" subtitle="Solo el tipo y la anamnesis son obligatorios. Lo demás puedes completarlo durante la atención." />

        <SectionCard icon={IconStethoscope} accent title="Información general">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            <Field label="Fecha" required>
              <Input value="2 / 05 / 2026" icon={IconCalendar} />
            </Field>
            <Field label="Tipo de consulta" required>
              <Select value="Control de rutina" />
            </Field>
          </div>
        </SectionCard>

        <div style={{ height: 14 }} />

        <SectionCard icon={IconConsulta} title="Anamnesis" subtitle="Lo que reporta el dueño · Antecedentes">
          <Textarea
            value="La dueña reporta que Luna lleva 3 días con menor apetito y se esconde más de lo habitual. No hay vómitos ni diarrea. Última vacuna triple felina hace 11 meses. Convive con otro gato sano."
            rows={4}
          />
        </SectionCard>

        <div style={{ height: 14 }} />

        <SectionCard icon={IconAlert} title="Diagnóstico" subtitle="Presuntivo o definitivo · Diferenciales">
          <Textarea
            placeholder="Diagnóstico presuntivo, diagnósticos diferenciales considerados…"
            rows={3}
          />
        </SectionCard>

        <div style={{ height: 14 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <SectionCard icon={IconFlask} title="Plan diagnóstico" subtitle="Exámenes complementarios">
            <Textarea placeholder="Hemograma, bioquímica, ecografía abdominal…" rows={4} />
          </SectionCard>
          <SectionCard icon={IconPill} title="Plan terapéutico" subtitle="Tratamiento e indicaciones">
            <Textarea placeholder="Medicación, indicaciones para el dueño, dieta…" rows={4} />
          </SectionCard>
        </div>

        <div style={{ height: 14 }} />

        <SectionCard icon={IconCalendar} title="Próximo control" subtitle="Opcional">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            <Field label="Fecha sugerida">
              <Input placeholder="dd / mm / aaaa" icon={IconCalendar} />
            </Field>
            <Field label="Notas para el control">
              <Input placeholder="Ej. revisar evolución del apetito, control de peso" />
            </Field>
          </div>
        </SectionCard>

        <div style={{ height: 14 }} />

        <SectionCard icon={IconSparkles} title="Acciones rápidas" subtitle="Genera registros vinculados a esta consulta">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { Ico: IconPill, label: 'Receta', sub: 'Medicamentos' },
              { Ico: IconFlask, label: 'Examen laboratorio', sub: 'Solicitud' },
              { Ico: IconScan, label: 'Imagen diagnóstica', sub: 'Rayos X / Eco' },
              { Ico: IconVacuna, label: 'Vacunación', sub: 'Aplicar dosis' },
              { Ico: IconBed, label: 'Hospitalización', sub: 'Internar paciente' },
              { Ico: IconShield, label: 'Desparasitación', sub: 'Interna / externa' },
              { Ico: IconScalpel, label: 'Cirugía', sub: 'Programar pabellón' },
            ].map(a => (
              <button key={a.label} style={{
                background: flowTokens.surface,
                border: `1px solid ${flowTokens.border}`,
                borderRadius: 10, padding: '12px 14px',
                fontFamily: 'inherit', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                textAlign: 'left',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: flowTokens.accentBg2, color: flowTokens.accent,
                  display: 'grid', placeItems: 'center',
                }}><a.Ico size={15} /></div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: flowTokens.text }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: flowTokens.textSubtle, marginTop: 1 }}>{a.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </ContentWrap>
      <WizardFooter nextLabel="Revisar resumen" />
    </WizardShell>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: '8px 0', borderBottom: `1px solid ${flowTokens.border}` }}>
      <div style={{ fontSize: 11.5, color: flowTokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: flowTokens.text, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function Step4Summary() {
  return (
    <WizardShell step={4}>
      <ContentWrap maxWidth={880}>
        <PageHeading title="Revisa antes de guardar" subtitle="Verifica que todo esté correcto. Puedes editar cualquier sección antes de confirmar." />

        <SectionCard
          icon={IconUser}
          title="Propietario"
          accent
          action={<button style={ghostBtn}><IconEdit size={12}/> Editar</button>}
        >
          <SummaryRow label="Nombre" value="Carla Mendoza Ríos" />
          <SummaryRow label="Documento" value="DNI 45.231.908" />
          <SummaryRow label="Contacto" value="+51 987 654 321 · carla.mendoza@gmail.com" />
          <div style={{ borderBottom: 'none', display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: '8px 0' }}>
            <div style={{ fontSize: 11.5, color: flowTokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 2 }}>Dirección</div>
            <div style={{ fontSize: 13, color: flowTokens.text }}>Av. Salaverry 2580, Dpto 502 · Lima, Perú</div>
          </div>
        </SectionCard>

        <div style={{ height: 14 }} />

        <SectionCard
          icon={IconPaw}
          title="Mascota"
          action={<button style={ghostBtn}><IconEdit size={12}/> Editar</button>}
        >
          <SummaryRow label="Nombre" value="Luna · VTR-0182" />
          <SummaryRow label="Especie / Raza" value="Felino · Mestizo doméstico" />
          <SummaryRow label="Datos" value="Hembra · 4 años · 4.2 kg · Esterilizada" />
          <div style={{ borderBottom: 'none', display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: '8px 0' }}>
            <div style={{ fontSize: 11.5, color: flowTokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 2 }}>Color</div>
            <div style={{ fontSize: 13, color: flowTokens.text }}>Atigrado gris</div>
          </div>
        </SectionCard>

        <div style={{ height: 14 }} />

        <SectionCard
          icon={IconStethoscope}
          title="Consulta"
          action={<button style={ghostBtn}><IconEdit size={12}/> Editar</button>}
        >
          <SummaryRow label="Fecha · Tipo" value="2 de mayo, 2026 · Control de rutina" />
          <SummaryRow
            label="Anamnesis"
            value="La dueña reporta que Luna lleva 3 días con menor apetito y se esconde más de lo habitual. No hay vómitos ni diarrea. Última vacuna triple felina hace 11 meses."
          />
          <SummaryRow label="Diagnóstico" value={<span style={{ color: flowTokens.textSubtle, fontStyle: 'italic' }}>Sin completar</span>} />
          <SummaryRow label="Plan diagnóstico" value={<span style={{ color: flowTokens.textSubtle, fontStyle: 'italic' }}>Sin completar</span>} />
          <SummaryRow label="Plan terapéutico" value={<span style={{ color: flowTokens.textSubtle, fontStyle: 'italic' }}>Sin completar</span>} />
          <div style={{ borderBottom: 'none', display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: '8px 0' }}>
            <div style={{ fontSize: 11.5, color: flowTokens.textSubtle, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 2 }}>Próximo control</div>
            <div style={{ fontSize: 13, color: flowTokens.text }}>9 de mayo, 2026</div>
          </div>
        </SectionCard>

        <div style={{ height: 14 }} />

        <div style={{
          padding: '14px 16px', display: 'flex', gap: 12,
          background: 'oklch(96% 0.04 80)',
          border: '1px solid oklch(88% 0.07 80)',
          borderRadius: 10,
          fontSize: 12.5, color: 'oklch(35% 0.10 80)',
        }}>
          <IconAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Diagnóstico y planes están vacíos. Puedes guardar la consulta así y completarlos durante la atención.
          </span>
        </div>
      </ContentWrap>
      <WizardFooter
        nextLabel="Guardar consulta"
        nextVariant="success"
        extra={
          <button style={{
            background: 'transparent',
            border: `1px solid ${flowTokens.border}`,
            padding: '9px 14px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            color: flowTokens.text, cursor: 'pointer',
          }}>Guardar y crear otra</button>
        }
      />
    </WizardShell>
  );
}

const ghostBtn = {
  background: 'transparent',
  border: `1px solid ${flowTokens.border}`,
  padding: '5px 10px', borderRadius: 6,
  fontSize: 11.5, fontWeight: 500, fontFamily: 'inherit',
  color: flowTokens.textMuted, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 5,
};

// ─── Estado: cancelar (modal de confirmación overlay) ───
function StateCancel() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <Step3Consultation />
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(30, 20, 50, 0.45)',
        display: 'grid', placeItems: 'center',
        backdropFilter: 'blur(2px)',
      }}>
        <div style={{
          width: 440, background: flowTokens.surface,
          borderRadius: 16, padding: 28,
          boxShadow: '0 20px 60px rgba(40,20,80,0.3)',
          fontFamily: flowTokens.font,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'oklch(94% 0.06 25)', color: 'oklch(50% 0.18 25)',
            display: 'grid', placeItems: 'center', marginBottom: 14,
          }}><IconAlert size={22} /></div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6, letterSpacing: '-0.01em' }}>
            ¿Descartar esta consulta?
          </div>
          <div style={{ fontSize: 13.5, color: flowTokens.textMuted, lineHeight: 1.55, marginBottom: 22 }}>
            Perderás todos los datos ingresados de Luna. Esta acción no se puede deshacer.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={{
              background: 'transparent', border: `1px solid ${flowTokens.border}`,
              padding: '9px 16px', borderRadius: 8,
              fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
              color: flowTokens.text, cursor: 'pointer',
            }}>Seguir editando</button>
            <button style={{
              background: 'oklch(50% 0.18 25)', color: 'white',
              border: 'none', padding: '9px 16px', borderRadius: 8,
              fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <IconTrash size={13}/> Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Estado: guardado exitoso ───
function StateSuccess() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: flowTokens.bg,
      fontFamily: flowTokens.font,
      display: 'grid', placeItems: 'center',
    }}>
      <div style={{
        textAlign: 'center', maxWidth: 440,
        padding: 40,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'oklch(92% 0.06 145)',
          color: 'oklch(45% 0.15 145)',
          display: 'grid', placeItems: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 32px -8px oklch(50% 0.15 145 / 0.4)',
        }}>
          <IconCheck size={34} stroke={2} />
        </div>
        <div style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: 36, lineHeight: 1.1,
          color: flowTokens.text,
          marginBottom: 8,
        }}>
          Consulta guardada
        </div>
        <div style={{ fontSize: 14, color: flowTokens.textMuted, marginBottom: 4 }}>
          Luna · Carla Mendoza Ríos
        </div>
        <div style={{ fontSize: 13, color: flowTokens.textSubtle, marginBottom: 28 }}>
          2 de mayo, 2026 · Control de rutina · #C-2026-0184
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button style={{
            background: flowTokens.accent, color: 'white',
            border: 'none', padding: '10px 18px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            Ver detalle <IconArrowRight size={13}/>
          </button>
          <button style={{
            background: flowTokens.surface,
            border: `1px solid ${flowTokens.border}`,
            padding: '10px 18px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            color: flowTokens.text, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <IconPlus size={13}/> Crear otra consulta
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Step3Consultation, Step4Summary, StateCancel, StateSuccess });
