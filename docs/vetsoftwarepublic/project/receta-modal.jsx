// Modal Receta — variante por defecto (overlay centrado, en uso por Flujo Interactivo)
// Basado en data model Prescription + MedicamentPrescription

const { useState: useStateR } = React;

// Sample medicament catalog
const MED_CATALOG = [
  { name:'Amoxicilina + Clavulánico', presentation:'Comprimido 250 mg', defaults:{ posology:'1 comp. cada 12h por 7 días', quantity:14 } },
  { name:'Meloxicam',                  presentation:'Suspensión oral 1.5 mg/ml', defaults:{ posology:'0.1 mg/kg cada 24h por 5 días', quantity:1 } },
  { name:'Metronidazol',               presentation:'Comprimido 250 mg', defaults:{ posology:'1 comp. cada 12h por 5 días', quantity:10 } },
  { name:'Omeprazol',                  presentation:'Cápsula 20 mg', defaults:{ posology:'1 cáp. cada 24h en ayunas por 10 días', quantity:10 } },
  { name:'Sucralfato',                 presentation:'Suspensión 200 mg/ml', defaults:{ posology:'1 ml cada 8h antes de las comidas', quantity:1 } },
  { name:'Maropitant',                 presentation:'Comprimido 16 mg', defaults:{ posology:'1 comp. cada 24h por 3 días', quantity:3 } },
];

function RecetaModal({ pet, existingDiagnosis, onClose, onSave }) {
  const [diagnosis, setDiagnosis] = useStateR(existingDiagnosis || '');
  const [observations, setObservations] = useStateR('');
  const [medicaments, setMedicaments] = useStateR([
    { name:'', presentation:'', quantity:'', posology:'' },
  ]);
  const [searchIdx, setSearchIdx] = useStateR(null);
  const [searchQ, setSearchQ] = useStateR('');

  const updateMed = (i, k, v) => {
    setMedicaments(arr => arr.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  };
  const addMed = () => setMedicaments(arr => [...arr, { name:'', presentation:'', quantity:'', posology:'' }]);
  const removeMed = (i) => setMedicaments(arr => arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr);
  const pickFromCatalog = (i, item) => {
    setMedicaments(arr => arr.map((m, idx) => idx === i ? {
      name: item.name, presentation: item.presentation,
      quantity: String(item.defaults.quantity), posology: item.defaults.posology,
    } : m));
    setSearchIdx(null); setSearchQ('');
  };

  const valid = diagnosis.trim().length > 2 && medicaments.every(m => m.name && m.posology && m.quantity);

  const today = new Date().toLocaleDateString('es-PE', { day:'numeric', month:'long', year:'numeric' });

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(20,15,22,0.55)',
      backdropFilter:'blur(4px)', zIndex:60,
      display:'grid', placeItems:'center',
      fontFamily:flowTokens.font, color:flowTokens.text,
      animation:'fadeIn .15s',
    }}>
      <div style={{
        width:'min(1600px, 80vw)', height:'80vh', maxHeight:'80vh',
        background:flowTokens.surface, borderRadius:16,
        boxShadow:'0 30px 80px rgba(20,15,30,0.35)',
        border:`1px solid ${flowTokens.border}`,
        display:'flex', flexDirection:'column',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding:'18px 24px', borderBottom:`1px solid ${flowTokens.border}`,
          display:'flex', alignItems:'center', gap:14,
        }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:flowTokens.accent, color:'white',
            display:'grid', placeItems:'center',
          }}><IconPill size={19} /></div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Instrument Serif, serif', fontSize:22, lineHeight:1.1 }}>Receta médica</div>
            <div style={{ fontSize:12.5, color:flowTokens.textMuted, marginTop:2 }}>
              {pet?.name} · {pet?.specie} · {pet?.weight} · Hoy, {today}
            </div>
          </div>
          <button onClick={onClose} style={{
            background:'transparent', border:'none', cursor:'pointer',
            color:flowTokens.textMuted, padding:8, borderRadius:8,
          }}><IconX size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding:'24px 32px', overflow:'auto', flex:1 }}>
          {/* Diagnóstico + Observaciones */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:22 }}>
            <Field label="Diagnóstico" required hint="Se imprime en la receta">
              <textarea value={diagnosis} onChange={e=>setDiagnosis(e.target.value)}
                placeholder="Ej. Gastroenteritis aguda inespecífica"
                rows={2} style={txtStyle}/>
            </Field>
            <Field label="Observaciones" hint="Indicaciones adicionales para el propietario">
              <textarea value={observations} onChange={e=>setObservations(e.target.value)}
                placeholder="Ej. Dieta blanda 48h. Volver si persisten síntomas."
                rows={2} style={txtStyle}/>
            </Field>
          </div>

          {/* Medicamentos */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:10,
          }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Medicamentos prescritos</div>
            <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>
              {medicaments.length} en la receta
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {medicaments.map((m, i) => (
              <div key={i} style={{
                background:flowTokens.surface,
                border:`1px solid ${flowTokens.border}`,
                borderRadius:11, padding:14,
                position:'relative',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{
                    width:24, height:24, borderRadius:'50%',
                    background:flowTokens.accentBg, color:flowTokens.accent,
                    fontSize:11, fontWeight:600,
                    display:'grid', placeItems:'center',
                  }}>{i+1}</div>
                  <div style={{ fontSize:12.5, fontWeight:500, color:flowTokens.textMuted }}>
                    {m.name || 'Nuevo medicamento'}
                  </div>
                  {medicaments.length > 1 && (
                    <button onClick={() => removeMed(i)} style={{
                      marginLeft:'auto', background:'transparent', border:'none',
                      color:flowTokens.textSubtle, cursor:'pointer', padding:4,
                    }}><IconTrash size={14} /></button>
                  )}
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 140px 2fr', gap:12, marginBottom:0, position:'relative' }}>
                  <Field label="Nombre del medicamento" required>
                    <div style={{ position:'relative' }}>
                      <input
                        value={m.name}
                        onChange={e => { updateMed(i, 'name', e.target.value); setSearchIdx(i); setSearchQ(e.target.value); }}
                        onFocus={() => { setSearchIdx(i); setSearchQ(m.name); }}
                        placeholder="Ej. Amoxicilina"
                        style={inpStyle}
                      />
                      {searchIdx === i && searchQ.length >= 1 && (
                        <div style={{
                          position:'absolute', top:'calc(100% + 4px)', left:0, right:0,
                          background:flowTokens.surface,
                          border:`1px solid ${flowTokens.borderStrong}`,
                          borderRadius:10, boxShadow:'0 12px 30px rgba(0,0,0,0.12)',
                          zIndex:10, maxHeight:220, overflow:'auto',
                        }}>
                          {MED_CATALOG.filter(c => c.name.toLowerCase().includes(searchQ.toLowerCase())).slice(0,5).map((c, idx) => (
                            <div key={idx} onMouseDown={() => pickFromCatalog(i, c)} style={{
                              padding:'10px 12px', cursor:'pointer',
                              borderBottom:`1px solid ${flowTokens.border}`,
                              fontSize:12.5,
                            }}
                              onMouseEnter={e => e.currentTarget.style.background = flowTokens.accentBg2}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ fontWeight:500 }}>{c.name}</div>
                              <div style={{ color:flowTokens.textSubtle, fontSize:11.5, marginTop:2 }}>{c.presentation}</div>
                            </div>
                          ))}
                          {MED_CATALOG.filter(c => c.name.toLowerCase().includes(searchQ.toLowerCase())).length === 0 && (
                            <div style={{ padding:'10px 12px', fontSize:12, color:flowTokens.textSubtle }}>
                              Sin coincidencias · se guardará como "{searchQ}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Field>
                  <Field label="Presentación" required>
                    <input value={m.presentation} onChange={e=>updateMed(i,'presentation',e.target.value)}
                      placeholder="Comprimido 250 mg" style={inpStyle}/>
                  </Field>
                  <Field label="Cantidad" required>
                    <input value={m.quantity} onChange={e=>updateMed(i,'quantity',e.target.value)}
                      placeholder="Ej. 14" style={inpStyle}/>
                  </Field>
                  <Field label="Posología" required hint="Dosis, frecuencia y duración del tratamiento">
                    <input value={m.posology} onChange={e=>updateMed(i,'posology',e.target.value)}
                      placeholder="1 comp. cada 12h por 7 días" style={inpStyle}/>
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addMed} style={{
            marginTop:10, width:'100%',
            background:'transparent',
            border:`1.5px dashed ${flowTokens.borderStrong}`,
            borderRadius:10, padding:'10px 12px',
            fontSize:13, color:flowTokens.text, fontWeight:500,
            fontFamily:'inherit', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:7,
          }}>
            <IconPlus size={14} /> Agregar otro medicamento
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding:'14px 24px',
          borderTop:`1px solid ${flowTokens.border}`,
          background:flowTokens.surface2,
          display:'flex', alignItems:'center', gap:10,
        }}>
          <div style={{ fontSize:11.5, color:flowTokens.textSubtle }}>
            Se vinculará a la consulta actual · firma digital del veterinario incluida
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={onClose} style={btnGhost}>Cancelar</button>
            <button disabled={!valid} onClick={() => onSave({ diagnosis, observations, medicaments })} style={{
              ...btnPrimary, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed',
            }}>Guardar receta</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inpStyle = {
  width:'100%', background:flowTokens.surface,
  border:`1px solid ${flowTokens.border}`,
  borderRadius:8, padding:'8px 12px',
  fontSize:13.5, fontFamily:'inherit', color:flowTokens.text,
  outline:'none',
};
const txtStyle = {
  ...inpStyle, lineHeight:1.55, resize:'vertical',
};
const btnGhost = {
  background:'transparent', border:`1px solid ${flowTokens.border}`,
  padding:'9px 16px', borderRadius:8, fontSize:13, fontWeight:500,
  fontFamily:'inherit', color:flowTokens.text, cursor:'pointer',
};
const btnPrimary = {
  background:flowTokens.accent, color:'white',
  border:'none', padding:'9px 18px', borderRadius:8,
  fontSize:13, fontWeight:500, fontFamily:'inherit',
};

Object.assign(window, { RecetaModal });
