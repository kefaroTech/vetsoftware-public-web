// Receta — 4 propuestas de UI con el data model real
// Prescription: date, diagnosis, observations, animal, consultation, createdBy
// MedicamentPrescription: name, presentation, quantity, posology

const PET_DEMO = { name:'Luna', specie:'Felino', breed:'Mestizo', weight:'4.2 kg' };
const OWNER_DEMO = { name:'Carla Mendoza Ríos', doc:'DNI 45.231.908' };

// Sample medicaments (estado pre-cargado)
const MEDS_DEMO = [
  { name:'Amoxicilina + Clavulánico', presentation:'Comprimido 250 mg', quantity:'14', posology:'1 comp. cada 12h por 7 días' },
  { name:'Maropitant',                 presentation:'Comprimido 16 mg',  quantity:'3',  posology:'1 comp. cada 24h por 3 días' },
  { name:'Sucralfato',                 presentation:'Suspensión 200 mg/ml', quantity:'1', posology:'1 ml cada 8h antes de comidas' },
];

// Mini "fondo" del paso 3 detrás del modal (para dar contexto)
function Step3Background() {
  return (
    <div style={{
      position:'absolute', inset:0, background:flowTokens.bg,
      padding:'18px 28px', overflow:'hidden',
      fontFamily:flowTokens.font, color:flowTokens.text,
    }}>
      <div style={{ height:42, display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <div style={{ fontFamily:'Instrument Serif, serif', fontSize:20 }}>Nueva consulta · Paso 3</div>
        <div style={{
          fontSize:10, padding:'2px 7px', borderRadius:999,
          background:flowTokens.accentBg, color:flowTokens.accent, letterSpacing:'0.04em', textTransform:'uppercase',
        }}>Borrador</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10 }}>
        <div style={{ height:80, background:flowTokens.surface, border:`1px solid ${flowTokens.border}`, borderRadius:10 }}/>
        <div style={{ height:80, background:flowTokens.surface, border:`1px solid ${flowTokens.border}`, borderRadius:10 }}/>
        <div style={{ height:120, gridColumn:'1 / -1', background:flowTokens.surface, border:`1px solid ${flowTokens.border}`, borderRadius:10 }}/>
        <div style={{ height:90, gridColumn:'1 / -1', background:flowTokens.surface, border:`1px solid ${flowTokens.border}`, borderRadius:10 }}/>
      </div>
    </div>
  );
}

// ─── A · Modal centrado clásico ─────────────────────────
function RecetaA() {
  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden' }}>
      <Step3Background />
      <div style={{ position:'absolute', inset:0, background:'rgba(20,15,22,0.55)' }}/>
      <div style={{
        position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
        width:760, maxHeight:'90%',
        background:flowTokens.surface, borderRadius:16,
        border:`1px solid ${flowTokens.border}`,
        boxShadow:'0 30px 80px rgba(0,0,0,0.35)',
        display:'flex', flexDirection:'column', overflow:'hidden',
        fontFamily:flowTokens.font, color:flowTokens.text,
      }}>
        <RecetaHeader />
        <div style={{ padding:'18px 24px', overflow:'auto', flex:1 }}>
          <RecetaTopFields />
          <RecetaMedList compact />
        </div>
        <RecetaFooter />
      </div>
    </div>
  );
}

// ─── B · Drawer lateral derecho ─────────────────────────
function RecetaB() {
  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden' }}>
      <Step3Background />
      <div style={{ position:'absolute', inset:0, background:'rgba(20,15,22,0.30)' }}/>
      <div style={{
        position:'absolute', top:0, right:0, bottom:0, width:560,
        background:flowTokens.surface,
        borderLeft:`1px solid ${flowTokens.border}`,
        boxShadow:'-20px 0 60px rgba(0,0,0,0.18)',
        display:'flex', flexDirection:'column', overflow:'hidden',
        fontFamily:flowTokens.font, color:flowTokens.text,
      }}>
        <RecetaHeader compact />
        <div style={{ padding:'16px 22px', overflow:'auto', flex:1 }}>
          <RecetaTopFields stacked />
          <RecetaMedList />
        </div>
        <RecetaFooter />
      </div>
    </div>
  );
}

// ─── C · Pantalla completa (form expandido) ─────────────
function RecetaC() {
  return (
    <div style={{
      width:'100%', height:'100%', background:flowTokens.bg,
      fontFamily:flowTokens.font, color:flowTokens.text,
      display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <div style={{
        height:60, padding:'0 28px', background:flowTokens.surface,
        borderBottom:`1px solid ${flowTokens.border}`,
        display:'flex', alignItems:'center', gap:14,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:flowTokens.textMuted, cursor:'pointer' }}>
          <IconArrowLeft size={15} /><span>Volver al paso 3</span>
        </div>
        <div style={{ width:1, height:22, background:flowTokens.border, margin:'0 6px' }}/>
        <div style={{ fontFamily:'Instrument Serif, serif', fontSize:22 }}>Nueva receta</div>
        <span style={{
          fontSize:11, padding:'3px 8px', borderRadius:999,
          background:flowTokens.accentBg, color:flowTokens.accent, letterSpacing:'0.04em', textTransform:'uppercase',
        }}>Vinculada a consulta #C-3471</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <button style={{ ...btnGhost2 }}>Cancelar</button>
          <button style={{ ...btnPrimary2 }}>Guardar receta</button>
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'28px 32px' }}>
        <div style={{ maxWidth:1080, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 320px', gap:22 }}>
          <div>
            <PageHeading title="Receta médica" subtitle={`Para ${PET_DEMO.name} · Hoy, 15 enero 2025 · Dr. Andrea Quispe`} />
            <SectionCard icon={IconStethoscope} accent title="Diagnóstico y observaciones">
              <div style={{ display:'grid', gap:14 }}>
                <Field label="Diagnóstico" required>
                  <Textarea value="Gastroenteritis aguda inespecífica con deshidratación leve. Buen estado general." rows={2}/>
                </Field>
                <Field label="Observaciones" hint="Indicaciones para el propietario">
                  <Textarea value="Dieta blanda 48h. Hidratación abundante. Volver si los síntomas persisten >72h o aparece sangre en heces." rows={2}/>
                </Field>
              </div>
            </SectionCard>
            <div style={{ height:14 }}/>
            <SectionCard icon={IconPill} title="Medicamentos prescritos" subtitle={`${MEDS_DEMO.length} en la receta`}>
              <RecetaMedList full/>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={IconPaw} accent title={PET_DEMO.name} subtitle={`${PET_DEMO.specie} · ${PET_DEMO.breed} · ${PET_DEMO.weight}`}>
              <div style={{ fontSize:12, color:flowTokens.textMuted, lineHeight:1.6 }}>
                <div><strong>Propietario</strong></div>
                <div>{OWNER_DEMO.name}</div>
                <div>{OWNER_DEMO.doc}</div>
              </div>
            </SectionCard>
            <div style={{ height:14 }}/>
            <SectionCard padded icon={IconSparkles} title="Sugerencias">
              <div style={{ fontSize:12, color:flowTokens.textMuted, lineHeight:1.55 }}>
                Para un felino de 4.2 kg con gastroenteritis se sugiere agregar <strong>Maropitant</strong> antiemético si hay vómitos persistentes. Calculadora de dosis disponible al hacer click en la posología.
              </div>
            </SectionCard>
            <div style={{ height:14 }}/>
            <SectionCard padded icon={IconBolt} title="Vista previa imprimible">
              <div style={{ background:flowTokens.surface2, borderRadius:8, padding:12, fontSize:11, color:flowTokens.textMuted, fontFamily:'JetBrains Mono, monospace', lineHeight:1.6 }}>
                VETRINA · Receta #R-8821<br/>
                15/01/2025 · Andrea Quispe<br/>
                Luna · Felino 4.2 kg<br/>
                Carla Mendoza · DNI 45.231.908
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── D · Inline (sub-sección expandida dentro del paso 3) ────
function RecetaD() {
  return (
    <div style={{
      position:'relative', width:'100%', height:'100%', overflow:'hidden',
      background:flowTokens.bg, fontFamily:flowTokens.font, color:flowTokens.text,
    }}>
      <div style={{ padding:'18px 28px', height:42, display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
        <div style={{ fontFamily:'Instrument Serif, serif', fontSize:20 }}>Nueva consulta · Paso 3</div>
        <div style={{
          fontSize:10, padding:'2px 7px', borderRadius:999,
          background:flowTokens.accentBg, color:flowTokens.accent, letterSpacing:'0.04em', textTransform:'uppercase',
        }}>Borrador</div>
      </div>

      <div style={{ padding:'0 28px 18px', display:'grid', gap:10 }}>
        <div style={{ height:60, background:flowTokens.surface, border:`1px solid ${flowTokens.border}`, borderRadius:10, padding:'14px 18px', fontSize:12, color:flowTokens.textMuted }}>Información general (colapsado)</div>
        <div style={{ background:flowTokens.surface, border:`1px solid ${flowTokens.border}`, borderRadius:10, padding:'14px 18px', fontSize:12, color:flowTokens.textMuted }}>
          Anamnesis · Diagnóstico · Plan diagnóstico · Plan terapéutico
        </div>
        {/* Acciones rápidas con la receta abierta */}
        <div style={{
          background:flowTokens.surface,
          border:`1.5px solid ${flowTokens.accent}`,
          boxShadow:`0 0 0 4px ${flowTokens.accentBg2}`,
          borderRadius:14, overflow:'hidden',
        }}>
          <div style={{
            padding:'14px 18px', borderBottom:`1px solid ${flowTokens.border}`,
            display:'flex', alignItems:'center', gap:12,
          }}>
            <div style={{
              width:34, height:34, borderRadius:9,
              background:flowTokens.accent, color:'white',
              display:'grid', placeItems:'center',
            }}><IconPill size={17}/></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>Receta · {MEDS_DEMO.length} medicamentos</div>
              <div style={{ fontSize:12, color:flowTokens.textMuted, marginTop:2 }}>Se vincula automáticamente a la consulta. Edita aquí mismo, sin salir del flujo.</div>
            </div>
            <button style={{ ...btnGhost2, padding:'7px 12px', fontSize:12 }}>Cerrar receta</button>
          </div>
          <div style={{ padding:18 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <Field label="Diagnóstico" required>
                <Input value="Gastroenteritis aguda inespecífica" />
              </Field>
              <Field label="Observaciones">
                <Input value="Dieta blanda 48h. Volver si persisten síntomas." />
              </Field>
            </div>
            <RecetaMedList compact full />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes compartidos ────────────────────────
function RecetaHeader({ compact }) {
  return (
    <div style={{
      padding: compact ? '14px 22px' : '18px 24px',
      borderBottom:`1px solid ${flowTokens.border}`,
      display:'flex', alignItems:'center', gap:14,
    }}>
      <div style={{
        width:38, height:38, borderRadius:10,
        background:flowTokens.accent, color:'white',
        display:'grid', placeItems:'center',
      }}><IconPill size={19}/></div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'Instrument Serif, serif', fontSize:22, lineHeight:1.1 }}>Receta médica</div>
        <div style={{ fontSize:12.5, color:flowTokens.textMuted, marginTop:2 }}>
          {PET_DEMO.name} · {PET_DEMO.specie} · {PET_DEMO.weight} · 15 ene 2025
        </div>
      </div>
      <button style={{
        background:'transparent', border:'none', cursor:'pointer',
        color:flowTokens.textMuted, padding:8, borderRadius:8,
      }}><IconX size={18}/></button>
    </div>
  );
}

function RecetaTopFields({ stacked }) {
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns: stacked ? '1fr' : '1fr 1fr',
      gap:14, marginBottom:18,
    }}>
      <Field label="Diagnóstico" required hint="Se imprime en la receta">
        <Textarea value="Gastroenteritis aguda inespecífica con deshidratación leve." rows={2}/>
      </Field>
      <Field label="Observaciones" hint="Indicaciones adicionales para el propietario">
        <Textarea value="Dieta blanda 48h. Volver si persisten síntomas." rows={2}/>
      </Field>
    </div>
  );
}

function RecetaMedList({ compact, full }) {
  const meds = full ? MEDS_DEMO : MEDS_DEMO.slice(0, compact ? 2 : 3);
  return (
    <>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:10,
      }}>
        <div style={{ fontSize:13, fontWeight:500 }}>Medicamentos prescritos</div>
        <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>{MEDS_DEMO.length} en la receta</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {meds.map((m, i) => (
          <div key={i} style={{
            background:flowTokens.surface,
            border:`1px solid ${flowTokens.border}`,
            borderRadius:11, padding:12,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{
                width:22, height:22, borderRadius:'50%',
                background:flowTokens.accentBg, color:flowTokens.accent,
                fontSize:11, fontWeight:600,
                display:'grid', placeItems:'center',
              }}>{i+1}</div>
              <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
              <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                <button style={{ ...iconBtn }}><IconEdit size={12}/></button>
                <button style={{ ...iconBtn }}><IconTrash size={12}/></button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:8, marginBottom:8 }}>
              <Field label="Presentación"><Input value={m.presentation}/></Field>
              <Field label="Cantidad"><Input value={m.quantity}/></Field>
            </div>
            <Field label="Posología" hint="Dosis, frecuencia y duración">
              <Input value={m.posology}/>
            </Field>
          </div>
        ))}
      </div>
      <button style={{
        marginTop:10, width:'100%',
        background:'transparent',
        border:`1.5px dashed ${flowTokens.borderStrong}`,
        borderRadius:10, padding:'9px 12px',
        fontSize:12.5, color:flowTokens.text, fontWeight:500,
        fontFamily:'inherit', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:7,
      }}>
        <IconPlus size={13}/> Agregar otro medicamento
      </button>
    </>
  );
}

function RecetaFooter() {
  return (
    <div style={{
      padding:'14px 24px',
      borderTop:`1px solid ${flowTokens.border}`,
      background:flowTokens.surface2,
      display:'flex', alignItems:'center', gap:10,
    }}>
      <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>
        Vinculada a consulta · firma digital incluida
      </div>
      <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
        <button style={btnGhost2}>Cancelar</button>
        <button style={btnPrimary2}>Guardar receta</button>
      </div>
    </div>
  );
}

const btnGhost2 = {
  background:'transparent', border:`1px solid ${flowTokens.border}`,
  padding:'9px 16px', borderRadius:8, fontSize:13, fontWeight:500,
  fontFamily:'inherit', color:flowTokens.text, cursor:'pointer',
};
const btnPrimary2 = {
  background:flowTokens.accent, color:'white',
  border:'none', padding:'9px 18px', borderRadius:8,
  fontSize:13, fontWeight:500, fontFamily:'inherit', cursor:'pointer',
};
const iconBtn = {
  background:'transparent', border:`1px solid ${flowTokens.border}`,
  width:24, height:24, borderRadius:6,
  display:'grid', placeItems:'center', cursor:'pointer',
  color:flowTokens.textMuted,
};

// ─── Canvas ─────────────────────────────────────────────
function RecetaApp() {
  const W = 1280, H = 820;
  const { DesignCanvas, DCSection, DCArtboard } = window;
  return (
    <DesignCanvas>
      <DCSection
        id="receta-options"
        title="Receta · 4 propuestas de UI"
        subtitle="Mismas funciones (diagnóstico, observaciones, lista de medicamentos), distintos contenedores. Datos basados en tu modelo Prescription + MedicamentPrescription."
      >
        <DCArtboard id="a" label="A · Modal centrado clásico" width={W} height={H}>
          <RecetaA/>
        </DCArtboard>
        <DCArtboard id="b" label="B · Drawer lateral (mantiene contexto)" width={W} height={H}>
          <RecetaB/>
        </DCArtboard>
        <DCArtboard id="c" label="C · Pantalla completa con asistente" width={W} height={H}>
          <RecetaC/>
        </DCArtboard>
        <DCArtboard id="d" label="D · Inline expandible (no abandona el paso 3)" width={W} height={H}>
          <RecetaD/>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<RecetaApp/>);
