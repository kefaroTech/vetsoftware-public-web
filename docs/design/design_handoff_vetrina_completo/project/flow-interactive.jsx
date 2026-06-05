// Flujo Nueva Consulta — versión INTERACTIVA con state real
// Click para navegar, buscar, seleccionar, abrir Receta, etc.

const { useState, useMemo, useEffect } = React;

// ─── Sample data ──────────────────────────────────────
window.OWNERS = [
  { id:'o1', name:'Carla Mendoza Ríos',  doc:'DNI 45.231.908', phone:'+51 987 654 321', email:'carla.mendoza@gmail.com',
    address:'Av. Salaverry 2580, Dpto 502', city:'Lima · Lima · Perú', since:'marzo 2024',
    pets:[
      { id:'p1', name:'Luna',  specie:'Felino', breed:'Mestizo doméstico', age:'4 años', gender:'Hembra', weight:'4.2 kg', lastVisit:'Hace 2 meses' },
      { id:'p2', name:'Rocco', specie:'Canino', breed:'Labrador retriever', age:'7 años', gender:'Macho',  weight:'32 kg', lastVisit:'Hace 8 meses' },
    ] },
  { id:'o2', name:'Carla Vásquez Soto',  doc:'DNI 41.118.220', phone:'+51 998 112 304', email:'cvasquez@outlook.com',
    address:'Calle Lima 123', city:'Arequipa · Arequipa · Perú', since:'enero 2024',
    pets:[ { id:'p3', name:'Niko', specie:'Canino', breed:'Beagle', age:'2 años', gender:'Macho', weight:'11 kg', lastVisit:'Hace 6 meses' } ] },
  { id:'o3', name:'Carlos Mendoza P.',   doc:'DNI 47.882.011', phone:'+51 955 700 218', email:'carlos.m@vetcorreo.com',
    address:'Jr. Cusco 401', city:'Lima · Lima · Perú', since:'agosto 2023',
    pets:[
      { id:'p4', name:'Toby',  specie:'Canino', breed:'Schnauzer mini', age:'5 años', gender:'Macho', weight:'8 kg', lastVisit:'Hace 1 mes' },
      { id:'p5', name:'Pepa',  specie:'Felino', breed:'Siamés', age:'3 años', gender:'Hembra', weight:'3.8 kg', lastVisit:'Hace 4 meses' },
      { id:'p6', name:'Bruno', specie:'Canino', breed:'Bulldog francés', age:'1 año', gender:'Macho', weight:'10 kg', lastVisit:'Hace 2 semanas' },
    ] },
];

// ─── Top-level interactive wizard ─────────────────────
function InteractiveWizard() {
  const [step, setStep] = useState(1);
  const [owner, setOwner] = useState(null);
  const [pet, setPet] = useState(null);
  const [data, setData] = useState({
    type:'', date:'2025-01-15', anamnesis:'', diagnosis:'', planDx:'', planTx:'', nextCheck:'',
    actions:[], // { kind:'receta', payload:{...} }
  });
  const [openAction, setOpenAction] = useState(null); // 'receta' | etc
  const [showCancel, setShowCancel] = useState(false);
  const [success, setSuccess] = useState(false);

  const goNext = () => setStep(s => Math.min(4, s+1));
  const goBack = () => setStep(s => Math.max(1, s-1));

  const canNext1 = !!owner;
  const canNext2 = !!pet;
  const canNext3 = !!data.type && data.anamnesis.trim().length > 5;

  const reset = () => {
    setStep(1); setOwner(null); setPet(null); setSuccess(false);
    setData({ type:'', date:'2025-01-15', anamnesis:'', diagnosis:'', planDx:'', planTx:'', nextCheck:'', actions:[] });
  };

  if (success) {
    return <SuccessScreen owner={owner} pet={pet} data={data} onNew={reset} />;
  }

  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden' }}>
      <InteractiveShell
        step={step}
        canBack={step>1}
        canNext={ step===1 ? canNext1 : step===2 ? canNext2 : step===3 ? canNext3 : true }
        onBack={goBack}
        onNext={ step===4 ? () => setSuccess(true) : goNext }
        nextLabel={ step===3 ? 'Revisar y continuar' : step===4 ? 'Guardar consulta' : 'Siguiente' }
        nextVariant={ step===4 ? 'success' : 'primary' }
        onCancel={() => setShowCancel(true)}
        onJumpStep={(n) => { if (n < step) setStep(n); }}
      >
        {step === 1 && <Step1Interactive owner={owner} setOwner={setOwner} />}
        {step === 2 && <Step2Interactive owner={owner} pet={pet} setPet={setPet} onEditOwner={()=>setStep(1)} />}
        {step === 3 && <Step3Interactive
          owner={owner} pet={pet} data={data} setData={setData}
          onOpenAction={setOpenAction} onEditOwner={()=>setStep(1)} onEditPet={()=>setStep(2)} />}
        {step === 4 && <Step4Interactive owner={owner} pet={pet} data={data} setStep={setStep} />}
      </InteractiveShell>

      {openAction === 'receta' && (
        <RecetaModal
          pet={pet}
          existingDiagnosis={data.diagnosis}
          onClose={() => setOpenAction(null)}
          onSave={(payload) => {
            setData(d => ({ ...d, actions:[...d.actions.filter(a=>a.kind!=='receta'), { kind:'receta', payload }] }));
            setOpenAction(null);
          }}
        />
      )}

      {openAction === 'lab' && (
        <LabTestModal pet={pet} onClose={() => setOpenAction(null)}
          onSave={(payload) => { setData(d => ({ ...d, actions:[...d.actions, { kind:'lab', payload }] })); setOpenAction(null); }} />
      )}
      {openAction === 'imaging' && (
        <ImagingModal pet={pet} onClose={() => setOpenAction(null)}
          onSave={(payload) => { setData(d => ({ ...d, actions:[...d.actions, { kind:'imaging', payload }] })); setOpenAction(null); }} />
      )}
      {openAction === 'vaccine' && (
        <VaccinationModal pet={pet} onClose={() => setOpenAction(null)}
          onSave={(payload) => { setData(d => ({ ...d, actions:[...d.actions, { kind:'vaccine', payload }] })); setOpenAction(null); }} />
      )}
      {openAction === 'hosp' && (
        <HospitalizationModal pet={pet} onClose={() => setOpenAction(null)}
          onSave={(payload) => { setData(d => ({ ...d, actions:[...d.actions, { kind:'hosp', payload }] })); setOpenAction(null); }} />
      )}
      {openAction === 'deworm' && (
        <DewormingModal pet={pet} onClose={() => setOpenAction(null)}
          onSave={(payload) => { setData(d => ({ ...d, actions:[...d.actions, { kind:'deworm', payload }] })); setOpenAction(null); }} />
      )}
      {openAction === 'surgery' && (
        <SurgeryModal pet={pet} onClose={() => setOpenAction(null)}
          onSave={(payload) => { setData(d => ({ ...d, actions:[...d.actions, { kind:'surgery', payload }] })); setOpenAction(null); }} />
      )}

      {showCancel && (
        <CancelDialog
          onKeep={() => setShowCancel(false)}
          onCancel={() => { setShowCancel(false); reset(); }}
        />
      )}
    </div>
  );
}

// ─── Interactive shell (full-bleed, with stepper) ─────
function InteractiveShell({ step, children, onBack, onNext, canBack, canNext, nextLabel, nextVariant, onCancel, onJumpStep }) {
  const steps = [
    { n:1, label:'Propietario' },
    { n:2, label:'Mascota' },
    { n:3, label:'Consulta' },
    { n:4, label:'Resumen' },
  ];
  return (
    <div style={{
      width:'100%', height:'100%', background:flowTokens.bg,
      fontFamily:flowTokens.font, color:flowTokens.text,
      display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      <header style={{
        height:60, padding:'0 28px', background:flowTokens.surface,
        borderBottom:`1px solid ${flowTokens.border}`,
        display:'flex', alignItems:'center', gap:16, flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, color:flowTokens.textMuted, fontSize:13, cursor:'pointer' }}>
          <IconArrowLeft size={15} /><span>Volver a inicio</span>
        </div>
        <div style={{ width:1, height:22, background:flowTokens.border, margin:'0 6px' }} />
        <div style={{ fontFamily:'Instrument Serif, serif', fontSize:22, letterSpacing:'-0.01em' }}>Nueva consulta</div>
        <div style={{
          fontSize:11, padding:'3px 8px', borderRadius:999,
          background:flowTokens.accentBg, color:flowTokens.accent,
          letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:500, marginLeft:4,
        }}>Borrador</div>
        <div style={{ marginLeft:'auto' }}>
          <button onClick={onCancel} style={{
            background:'transparent', border:'none', color:flowTokens.textMuted,
            fontSize:13, cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', gap:6, padding:'6px 10px',
          }}><IconX size={14} /> Cancelar</button>
        </div>
      </header>

      <div style={{ padding:'18px 28px 14px', background:flowTokens.surface, borderBottom:`1px solid ${flowTokens.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:0, maxWidth:780, margin:'0 auto' }}>
          {steps.map((s, i) => {
            const done = s.n < step, current = s.n === step, clickable = s.n < step;
            return (
              <React.Fragment key={s.n}>
                <div onClick={() => clickable && onJumpStep(s.n)}
                  style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0, cursor: clickable ? 'pointer' : 'default' }}>
                  <div style={{
                    width:26, height:26, borderRadius:'50%',
                    background: current ? flowTokens.accent : done ? flowTokens.accentBg : flowTokens.surface2,
                    color: current ? 'white' : done ? flowTokens.accent : flowTokens.textSubtle,
                    display:'grid', placeItems:'center', fontSize:12, fontWeight:600,
                    border: current ? 'none' : `1px solid ${done ? 'transparent' : flowTokens.border}`,
                    transition:'all .2s',
                  }}>
                    {done ? <IconCheck size={13} /> : s.n}
                  </div>
                  <div style={{
                    fontSize:13, fontWeight: current ? 600 : 400,
                    color: current ? flowTokens.text : done ? flowTokens.textMuted : flowTokens.textSubtle,
                  }}>{s.label}</div>
                </div>
                {i < steps.length-1 && (
                  <div style={{ flex:1, height:1, margin:'0 14px',
                    background: done ? flowTokens.accent : flowTokens.border,
                    opacity: done ? 0.4 : 1, minWidth:24 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
        {children}
      </div>

      <div style={{
        borderTop:`1px solid ${flowTokens.border}`, background:flowTokens.surface,
        padding:'14px 28px', display:'flex', alignItems:'center', gap:10, flexShrink:0,
      }}>
        {canBack && (
          <button onClick={onBack} style={{
            background:'transparent', border:`1px solid ${flowTokens.border}`,
            padding:'9px 16px', borderRadius:8, fontSize:13, fontWeight:500,
            fontFamily:'inherit', color:flowTokens.text, cursor:'pointer',
            display:'flex', alignItems:'center', gap:6,
          }}><IconArrowLeft size={13} /> Atrás</button>
        )}
        <div style={{ marginLeft:'auto' }}>
          <button onClick={canNext ? onNext : undefined} disabled={!canNext} style={{
            background: !canNext ? flowTokens.surface2 : nextVariant==='success' ? 'oklch(50% 0.15 145)' : flowTokens.accent,
            color: !canNext ? flowTokens.textSubtle : 'white',
            border:'none', padding:'9px 18px', borderRadius:8,
            fontSize:13, fontWeight:500, fontFamily:'inherit',
            cursor: canNext ? 'pointer' : 'not-allowed',
            display:'flex', alignItems:'center', gap:6,
          }}>{nextLabel} <IconArrowRight size={13} /></button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { InteractiveWizard });
