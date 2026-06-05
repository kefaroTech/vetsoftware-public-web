// Pasos 1-4 interactivos (con state real)

const { useState: useStateS, useMemo: useMemoS } = React;
const OWNERS = window.OWNERS;

// ─── PASO 1 ──────────────────────────────────────────
function Step1Interactive({ owner, setOwner }) {
  const [q, setQ] = useStateS('');
  const matches = useMemoS(() => {
    if (q.trim().length < 1) return [];
    const t = q.toLowerCase();
    return OWNERS.filter(o =>
      o.name.toLowerCase().includes(t) ||
      o.doc.toLowerCase().includes(t) ||
      o.phone.includes(t) ||
      o.email.toLowerCase().includes(t)
    );
  }, [q]);

  if (owner) {
    return (
      <ContentWrap>
        <PageHeading title="¿Quién es el propietario?" subtitle="Confirma los datos del propietario seleccionado." />
        <SectionCard
          icon={IconUser} accent
          title={owner.name}
          subtitle={`${owner.doc} · Cliente desde ${owner.since}`}
          action={
            <button onClick={() => setOwner(null)} style={{
              background:'transparent', border:`1px solid ${flowTokens.border}`,
              padding:'6px 12px', borderRadius:7, fontSize:12, fontWeight:500,
              fontFamily:'inherit', color:flowTokens.text, cursor:'pointer',
            }}>Cambiar</button>
          }
        >
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16 }}>
            <FieldRowI icon={IconPhone} label="Teléfono" value={owner.phone} />
            <FieldRowI icon={IconMail} label="Email" value={owner.email} />
            <FieldRowI icon={IconMapPin} label="Dirección" value={owner.address} />
            <FieldRowI icon={IconMapPin} label="Ciudad" value={owner.city} />
          </div>
          <div style={{
            marginTop:18, padding:'12px 14px',
            background:flowTokens.accentBg2,
            border:`1px solid ${flowTokens.accentBg}`,
            borderRadius:10, display:'flex', alignItems:'center', gap:10, fontSize:12.5,
          }}>
            <IconSparkles size={14} style={{ color:flowTokens.accent, flexShrink:0 }} />
            <span><strong>{owner.pets.length} mascota{owner.pets.length!==1?'s':''}</strong> registrada{owner.pets.length!==1?'s':''} a su nombre. Las verás en el siguiente paso.</span>
          </div>
        </SectionCard>
      </ContentWrap>
    );
  }

  return (
    <ContentWrap>
      <PageHeading title="¿Quién es el propietario?" subtitle="Busca por nombre, documento, teléfono o email. Si es nuevo, regístralo." />
      <SectionCard padded={false}>
        <div style={{ padding:16, borderBottom:`1px solid ${flowTokens.border}` }}>
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background: q ? flowTokens.surface : flowTokens.surface2,
            border:`${q ? 1.5 : 1}px solid ${q ? flowTokens.accent : flowTokens.border}`,
            boxShadow: q ? `0 0 0 3px ${flowTokens.accentBg2}` : 'none',
            borderRadius:10, padding:'12px 14px',
          }}>
            <IconSearch size={17} style={{ color: q ? flowTokens.accent : flowTokens.textMuted }} />
            <input
              autoFocus value={q} onChange={e=>setQ(e.target.value)}
              placeholder="Buscar propietario… (prueba 'carla' o 'carlos')"
              style={{
                flex:1, fontSize:14.5, color:flowTokens.text,
                fontFamily:'inherit', background:'transparent',
                border:'none', outline:'none',
              }}
            />
            <span style={{ fontSize:11, color:flowTokens.textSubtle }}>
              {q ? `${matches.length} resultados` : '0 resultados'}
            </span>
          </div>
        </div>

        {!q && (
          <div style={{ padding:'40px 20px', textAlign:'center' }}>
            <div style={{
              width:56, height:56, borderRadius:16,
              background:flowTokens.accentBg2, color:flowTokens.accent,
              display:'grid', placeItems:'center', margin:'0 auto 14px',
            }}><IconUser size={26} /></div>
            <div style={{ fontSize:15, fontWeight:500, marginBottom:4 }}>Empieza buscando un propietario</div>
            <div style={{ fontSize:13, color:flowTokens.textMuted, marginBottom:18, maxWidth:360, margin:'0 auto 18px' }}>
              Escribe el nombre, documento o teléfono. Si no existe, podrás crearlo desde aquí mismo.
            </div>
          </div>
        )}

        {q && matches.map((r, i) => (
          <div key={r.id} onClick={() => setOwner(r)} style={{
            padding:'14px 18px',
            borderBottom: i < matches.length-1 ? `1px solid ${flowTokens.border}` : 'none',
            display:'grid', gridTemplateColumns:'38px 1.5fr 1fr 1fr auto',
            gap:16, alignItems:'center', cursor:'pointer',
            transition:'background .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = flowTokens.surface2}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width:38, height:38, borderRadius:'50%',
              background:'linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))',
              color:'white', fontWeight:600, fontSize:13,
              display:'grid', placeItems:'center',
            }}>{r.name.split(' ').map(p=>p[0]).slice(0,2).join('')}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:500 }}>{r.name}</div>
              <div style={{ fontSize:12, color:flowTokens.textSubtle, marginTop:2 }}>{r.doc}</div>
            </div>
            <div style={{ fontSize:12.5, color:flowTokens.textMuted, display:'flex', alignItems:'center', gap:6 }}>
              <IconPhone size={12} /> {r.phone}
            </div>
            <div style={{ fontSize:12.5, color:flowTokens.textMuted }}>{r.email}</div>
            <Chip variant="accent">{r.pets.length} mascota{r.pets.length!==1?'s':''}</Chip>
          </div>
        ))}

        {q && matches.length === 0 && (
          <div style={{ padding:'30px 20px', textAlign:'center', fontSize:13, color:flowTokens.textMuted }}>
            Sin resultados para "{q}".
          </div>
        )}

        {q && (
          <div style={{
            padding:'14px 18px', display:'flex',
            alignItems:'center', gap:10,
            background:flowTokens.surface2,
            color:flowTokens.text, fontSize:13, cursor:'pointer',
          }}>
            <div style={{
              width:32, height:32, borderRadius:8,
              background:flowTokens.accentBg, color:flowTokens.accent,
              display:'grid', placeItems:'center',
            }}><IconPlus size={15} /></div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:500 }}>¿No encuentras a "{q}"?</div>
              <div style={{ fontSize:12, color:flowTokens.textMuted, marginTop:1 }}>Registra un propietario nuevo</div>
            </div>
            <IconArrowRight size={14} style={{ color:flowTokens.textSubtle }} />
          </div>
        )}
      </SectionCard>
    </ContentWrap>
  );
}

function FieldRowI({ icon: Ico, label, value }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
      <div style={{
        width:28, height:28, borderRadius:7,
        background:flowTokens.surface2, color:flowTokens.textMuted,
        display:'grid', placeItems:'center', flexShrink:0,
      }}><Ico size={13} /></div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:11, color:flowTokens.textSubtle, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
        <div style={{ fontSize:13, color:flowTokens.text, marginTop:2 }}>{value}</div>
      </div>
    </div>
  );
}

// ─── PASO 2 ──────────────────────────────────────────
function Step2Interactive({ owner, pet, setPet, onEditOwner }) {
  return (
    <ContentWrap>
      <OwnerHeaderI owner={owner} onEdit={onEditOwner} />
      <PageHeading title="Selecciona la mascota" subtitle="Elige la mascota que será atendida en esta consulta." />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
        {owner.pets.map(p => (
          <div key={p.id} onClick={() => setPet(p)}>
            <PetCardI pet={p} selected={pet?.id === p.id} />
          </div>
        ))}
        <button style={{
          background:'transparent', border:`1.5px dashed ${flowTokens.borderStrong}`,
          borderRadius:12, padding:16, cursor:'pointer', fontFamily:'inherit',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          gap:8, minHeight:175, color:flowTokens.textMuted,
        }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:flowTokens.accentBg, color:flowTokens.accent,
            display:'grid', placeItems:'center',
          }}><IconPlus size={18} /></div>
          <div style={{ fontSize:13, fontWeight:500, color:flowTokens.text }}>Nueva mascota</div>
          <div style={{ fontSize:11.5, textAlign:'center', maxWidth:160 }}>Registrar mascota a nombre de {owner.name.split(' ')[0]}</div>
        </button>
      </div>
    </ContentWrap>
  );
}

function OwnerHeaderI({ owner, onEdit }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'11px 16px', marginBottom:18,
      background:flowTokens.surface, border:`1px solid ${flowTokens.border}`,
      borderRadius:10,
    }}>
      <div style={{
        width:32, height:32, borderRadius:'50%',
        background:'linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))',
        color:'white', fontWeight:600, fontSize:12,
        display:'grid', placeItems:'center',
      }}>{owner.name.split(' ').map(p=>p[0]).slice(0,2).join('')}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>{owner.name}</div>
        <div style={{ fontSize:11.5, color:flowTokens.textSubtle, marginTop:1 }}>{owner.doc} · {owner.pets.length} mascota{owner.pets.length!==1?'s':''}</div>
      </div>
      <div style={{
        fontSize:11, padding:'3px 8px',
        background:flowTokens.surface2, color:flowTokens.textMuted,
        borderRadius:6, letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:500,
      }}>Paso 1 ✓</div>
      <button onClick={onEdit} style={{
        background:'transparent', border:'none', color:flowTokens.accent,
        fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
      }}>Editar</button>
    </div>
  );
}

function PetCardI({ pet, selected }) {
  return (
    <div style={{
      background:flowTokens.surface,
      border:`${selected ? 1.5 : 1}px solid ${selected ? flowTokens.accent : flowTokens.border}`,
      boxShadow: selected ? `0 0 0 3px ${flowTokens.accentBg2}` : 'none',
      borderRadius:12, padding:16, cursor:'pointer', position:'relative',
      transition:'all .15s',
    }}>
      {selected && (
        <div style={{
          position:'absolute', top:12, right:12,
          width:22, height:22, borderRadius:'50%',
          background:flowTokens.accent, color:'white',
          display:'grid', placeItems:'center',
        }}><IconCheck size={12} /></div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        <div style={{
          width:44, height:44, borderRadius:11,
          background:flowTokens.accentBg, color:flowTokens.accent,
          display:'grid', placeItems:'center',
        }}><IconPaw size={22} /></div>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:15, fontWeight:500 }}>{pet.name}</div>
          <div style={{ fontSize:12, color:flowTokens.textSubtle, marginTop:2 }}>{pet.specie} · {pet.breed}</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:11.5 }}>
        {[['Edad', pet.age], ['Género', pet.gender], ['Peso', pet.weight], ['Última consulta', pet.lastVisit]].map(([k,v]) => (
          <div key={k}>
            <div style={{ color:flowTokens.textSubtle, textTransform:'uppercase', letterSpacing:'0.04em', fontSize:10 }}>{k}</div>
            <div style={{ color:flowTokens.text, marginTop:2, fontSize:12.5, fontWeight:500 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PASO 3 ──────────────────────────────────────────
function Step3Interactive({ owner, pet, data, setData, onOpenAction, onEditOwner, onEditPet }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const types = ['Control', 'Urgencia', 'Cirugía', 'Vacunación', 'Desparasitación', 'Chequeo geriátrico', 'Control post-operatorio', 'Eutanasia', 'Telemedicina', 'Otra'];
  const recetaCount = data.actions.filter(a=>a.kind==='receta').reduce((n,a)=>n + (a.payload?.medicaments?.length || 1), 0);

  return (
    <ContentWrap>
      <ContextBarI owner={owner} pet={pet} onEditOwner={onEditOwner} onEditPet={onEditPet} />
      <PageHeading title="Datos de la consulta" subtitle="Completa la información clínica. Solo el tipo y la anamnesis son obligatorios." />

      <SectionCard icon={IconClipboard} accent title="Información general">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Field label="Fecha y hora" required>
            <Input value="15 / 01 / 2025 · 14:30" icon={IconCalendar} />
          </Field>
          <Field label="Tipo de consulta" required>
            <SearchableSelect
              value={data.type}
              onChange={v => set('type', v)}
              placeholder="Seleccione tipo de consulta…"
              options={types}
            />
          </Field>
        </div>
      </SectionCard>
      <div style={{ height:14 }} />

      <SectionCard icon={IconNotes} title="Anamnesis" subtitle="Motivo de consulta y síntomas referidos por el propietario.">
        <textarea
          value={data.anamnesis}
          onChange={e => set('anamnesis', e.target.value)}
          placeholder="Ej. La mascota presenta vómitos desde hace 2 días. No ha querido comer..."
          rows={4}
          style={{
            width:'100%', background:flowTokens.surface,
            border:`1px solid ${flowTokens.border}`,
            borderRadius:8, padding:'10px 12px',
            fontSize:13.5, lineHeight:1.55, color:flowTokens.text,
            fontFamily:'inherit', resize:'vertical', outline:'none',
          }}
        />
      </SectionCard>
      <div style={{ height:14 }} />

      <SectionCard icon={IconStethoscope} title="Diagnóstico" subtitle="Hallazgos del examen y diagnóstico presuntivo o definitivo.">
        <textarea
          value={data.diagnosis}
          onChange={e => set('diagnosis', e.target.value)}
          placeholder="Ej. Gastroenteritis aguda inespecífica. Buen estado general, mucosas pálidas..."
          rows={3}
          style={{
            width:'100%', background:flowTokens.surface,
            border:`1px solid ${flowTokens.border}`,
            borderRadius:8, padding:'10px 12px',
            fontSize:13.5, lineHeight:1.55, color:flowTokens.text,
            fontFamily:'inherit', resize:'vertical', outline:'none',
          }}
        />
      </SectionCard>
      <div style={{ height:14 }} />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <SectionCard icon={IconBeaker} title="Plan diagnóstico">
          <Textarea value={data.planDx} placeholder="Estudios complementarios solicitados…" rows={3} />
        </SectionCard>
        <SectionCard icon={IconPill} title="Plan terapéutico">
          <Textarea value={data.planTx} placeholder="Tratamiento, medicamentos, indicaciones…" rows={3} />
        </SectionCard>
      </div>
      <div style={{ height:14 }} />

      {/* Acciones rápidas */}
      <SectionCard icon={IconBolt} accent title="Acciones rápidas" subtitle="Genera registros vinculados a esta consulta.">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
          <ActionTile
            icon={IconPill} label="Receta" sub="Medicamentos"
            count={recetaCount} highlight
            onClick={() => onOpenAction('receta')}
          />
          <ActionTile icon={IconBeaker} label="Examen lab." sub="Solicitud"
            count={data.actions.filter(a=>a.kind==='lab').reduce((n,a)=>n+(a.payload?.tests?.length||0),0) || undefined}
            onClick={() => onOpenAction('lab')} />
          <ActionTile icon={IconImage}  label="Imagen Dx" sub="Rayos X / Eco"
            count={data.actions.filter(a=>a.kind==='imaging').length || undefined}
            onClick={() => onOpenAction('imaging')} />
          <ActionTile icon={IconShield} label="Vacunación" sub="Aplicar dosis"
            count={data.actions.filter(a=>a.kind==='vaccine').reduce((n,a)=>n+(a.payload?.items?.length||0),0) || undefined}
            onClick={() => onOpenAction('vaccine')} />
          <ActionTile icon={IconBed}    label="Hospitalización" sub="Internar paciente"
            count={data.actions.filter(a=>a.kind==='hosp').length || undefined}
            onClick={() => onOpenAction('hosp')} />
          <ActionTile icon={IconBug}    label="Desparasitación" sub="Interna / externa"
            count={data.actions.filter(a=>a.kind==='deworm').length || undefined}
            onClick={() => onOpenAction('deworm')} />
          <ActionTile icon={IconScalpel} label="Cirugía" sub="Programar pabellón"
            count={data.actions.filter(a=>a.kind==='surgery').length || undefined}
            onClick={() => onOpenAction('surgery')} />
          <ActionTile icon={IconPlus}   label="Más" sub="Otras acciones" muted />
        </div>
        {data.actions.length > 0 && (
          <div style={{
            marginTop:14, padding:'10px 12px',
            background:flowTokens.accentBg2,
            border:`1px solid ${flowTokens.accentBg}`,
            borderRadius:10, fontSize:12.5,
            display:'flex', alignItems:'center', gap:8,
          }}>
            <IconSparkles size={13} style={{ color:flowTokens.accent }} />
            <span><strong>{data.actions.length}</strong> acción{data.actions.length>1?'es':''} generada{data.actions.length>1?'s':''} · se guardarán al confirmar la consulta.</span>
          </div>
        )}
      </SectionCard>
    </ContentWrap>
  );
}

function ContextBarI({ owner, pet, onEditOwner, onEditPet }) {
  return (
    <div style={{
      display:'flex', gap:10, marginBottom:18,
      padding:'10px 14px', background:flowTokens.surface,
      border:`1px solid ${flowTokens.border}`, borderRadius:10,
      alignItems:'center',
    }}>
      <div style={{
        width:30, height:30, borderRadius:'50%',
        background:'linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350))',
        color:'white', fontWeight:600, fontSize:11,
        display:'grid', placeItems:'center',
      }}>{owner.name.split(' ').map(p=>p[0]).slice(0,2).join('')}</div>
      <div style={{ fontSize:12.5 }}>
        <span style={{ fontWeight:500 }}>{owner.name}</span>
        <span style={{ color:flowTokens.textSubtle }}> · {owner.doc}</span>
      </div>
      <button onClick={onEditOwner} style={{ background:'none', border:'none', color:flowTokens.accent, fontSize:11.5, cursor:'pointer', fontFamily:'inherit' }}>Editar</button>
      <div style={{ width:1, height:18, background:flowTokens.border }} />
      <div style={{
        width:28, height:28, borderRadius:8,
        background:flowTokens.accentBg, color:flowTokens.accent,
        display:'grid', placeItems:'center',
      }}><IconPaw size={14} /></div>
      <div style={{ fontSize:12.5 }}>
        <span style={{ fontWeight:500 }}>{pet.name}</span>
        <span style={{ color:flowTokens.textSubtle }}> · {pet.specie} · {pet.breed} · {pet.age} · {pet.weight}</span>
      </div>
      <button onClick={onEditPet} style={{ background:'none', border:'none', color:flowTokens.accent, fontSize:11.5, cursor:'pointer', fontFamily:'inherit' }}>Editar</button>
    </div>
  );
}

function ActionTile({ icon: Ico, label, sub, count, highlight, muted, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: count > 0 ? flowTokens.accentBg2 : flowTokens.surface,
      border: `${count > 0 ? 1.5 : 1}px solid ${count > 0 ? flowTokens.accent : flowTokens.border}`,
      borderRadius:11, padding:'12px 12px',
      cursor:'pointer', fontFamily:'inherit', textAlign:'left',
      display:'flex', flexDirection:'column', gap:8,
      opacity: muted ? 0.55 : 1,
      position:'relative',
    }}>
      <div style={{
        width:34, height:34, borderRadius:9,
        background: count > 0 ? flowTokens.accent : flowTokens.accentBg,
        color: count > 0 ? 'white' : flowTokens.accent,
        display:'grid', placeItems:'center',
      }}><Ico size={17} /></div>
      <div>
        <div style={{ fontSize:13, fontWeight:500, color:flowTokens.text }}>{label}</div>
        <div style={{ fontSize:11.5, color:flowTokens.textSubtle, marginTop:2 }}>
          {count > 0 ? `${count} medicamento${count>1?'s':''} · click para editar` : sub}
        </div>
      </div>
      {count > 0 && (
        <div style={{
          position:'absolute', top:10, right:10,
          minWidth:20, height:20, padding:'0 6px', borderRadius:10,
          background:flowTokens.accent, color:'white',
          fontSize:11, fontWeight:600,
          display:'grid', placeItems:'center',
        }}>{count}</div>
      )}
    </button>
  );
}

// ─── PASO 4 — Resumen ────────────────────────────────
function Step4Interactive({ owner, pet, data, setStep }) {
  const recetas = data.actions.filter(a=>a.kind==='receta');
  return (
    <ContentWrap>
      <PageHeading title="Resumen de la consulta" subtitle="Revisa todo antes de guardar. Puedes volver a cualquier paso para editar." />

      <SectionCard
        icon={IconUser} title={owner.name} subtitle={owner.doc}
        action={<button onClick={() => setStep(1)} style={{
          background:'transparent', border:'none', color:flowTokens.accent,
          fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
        }}>Editar</button>}
      >
        <div style={{ fontSize:12.5, color:flowTokens.textMuted }}>
          {owner.phone} · {owner.email} · {owner.city}
        </div>
      </SectionCard>
      <div style={{ height:12 }} />

      <SectionCard
        icon={IconPaw} title={`${pet.name} · ${pet.specie}`}
        subtitle={`${pet.breed} · ${pet.age} · ${pet.gender} · ${pet.weight}`}
        action={<button onClick={() => setStep(2)} style={{
          background:'transparent', border:'none', color:flowTokens.accent,
          fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
        }}>Editar</button>}
      />
      <div style={{ height:12 }} />

      <SectionCard
        icon={IconClipboard} title={`Consulta · ${data.type || '—'}`}
        subtitle="15 de enero, 2025 · 14:30"
        action={<button onClick={() => setStep(3)} style={{
          background:'transparent', border:'none', color:flowTokens.accent,
          fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
        }}>Editar</button>}
      >
        <div style={{ display:'grid', gap:12 }}>
          <SummaryBlock label="Anamnesis" value={data.anamnesis} />
          {data.diagnosis && <SummaryBlock label="Diagnóstico" value={data.diagnosis} />}
          {data.planDx && <SummaryBlock label="Plan diagnóstico" value={data.planDx} />}
          {data.planTx && <SummaryBlock label="Plan terapéutico" value={data.planTx} />}
        </div>
      </SectionCard>

      {recetas.length > 0 && (
        <>
          <div style={{ height:12 }} />
          <SectionCard icon={IconPill} accent title="Recetas vinculadas" subtitle={`${recetas.reduce((n,r)=>n+r.payload.medicaments.length,0)} medicamento(s) · se imprimirán al guardar`}>
            {recetas.map((r, idx) => (
              <div key={idx} style={{ display:'grid', gap:8 }}>
                {r.payload.medicaments.map((m, i) => (
                  <div key={i} style={{
                    padding:'10px 12px', background:flowTokens.surface2,
                    borderRadius:8, fontSize:12.5,
                    display:'flex', gap:10, alignItems:'flex-start',
                  }}>
                    <div style={{
                      width:26, height:26, borderRadius:7,
                      background:flowTokens.accentBg, color:flowTokens.accent,
                      display:'grid', placeItems:'center', flexShrink:0,
                    }}><IconPill size={13} /></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:500 }}>{m.name} <span style={{ color:flowTokens.textSubtle, fontWeight:400 }}>· {m.presentation}</span></div>
                      <div style={{ color:flowTokens.textMuted, marginTop:2 }}>Cant. {m.quantity} · {m.posology}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </SectionCard>
        </>
      )}
    </ContentWrap>
  );
}

function SummaryBlock({ label, value }) {
  return (
    <div>
      <div style={{ fontSize:11, color:flowTokens.textSubtle, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:13, color:flowTokens.text, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{value || <em style={{ color:flowTokens.textSubtle }}>Sin datos</em>}</div>
    </div>
  );
}

// ─── Estados auxiliares ──────────────────────────────
function CancelDialog({ onKeep, onCancel }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(20,15,22,0.55)',
      backdropFilter:'blur(4px)', zIndex:50,
      display:'grid', placeItems:'center',
    }}>
      <div style={{
        width:420, background:flowTokens.surface,
        borderRadius:14, padding:24,
        border:`1px solid ${flowTokens.border}`,
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          width:44, height:44, borderRadius:11,
          background:'oklch(94% 0.05 30)', color:'oklch(48% 0.18 25)',
          display:'grid', placeItems:'center', marginBottom:14,
        }}><IconAlert size={22} /></div>
        <div style={{ fontFamily:'Instrument Serif, serif', fontSize:24, marginBottom:6 }}>¿Descartar la consulta?</div>
        <div style={{ fontSize:13, color:flowTokens.textMuted, lineHeight:1.55, marginBottom:20 }}>
          Perderás todos los datos ingresados hasta ahora. Esta acción no se puede deshacer.
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onKeep} style={{
            background:'transparent', border:`1px solid ${flowTokens.border}`,
            padding:'9px 16px', borderRadius:8, fontSize:13, fontWeight:500,
            fontFamily:'inherit', color:flowTokens.text, cursor:'pointer',
          }}>Seguir editando</button>
          <button onClick={onCancel} style={{
            background:'oklch(50% 0.18 25)', color:'white',
            border:'none', padding:'9px 16px', borderRadius:8,
            fontSize:13, fontWeight:500, fontFamily:'inherit', cursor:'pointer',
          }}>Sí, descartar</button>
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ owner, pet, data, onNew }) {
  const recetas = data.actions.filter(a=>a.kind==='receta').reduce((n,r)=>n+r.payload.medicaments.length,0);
  return (
    <div style={{
      width:'100vw', height:'100vh', background:flowTokens.bg,
      fontFamily:flowTokens.font, display:'grid', placeItems:'center',
    }}>
      <div style={{
        width:520, background:flowTokens.surface,
        borderRadius:18, padding:36, textAlign:'center',
        border:`1px solid ${flowTokens.border}`,
      }}>
        <div style={{
          width:72, height:72, borderRadius:20,
          background:'oklch(92% 0.10 145)', color:'oklch(45% 0.15 145)',
          display:'grid', placeItems:'center', margin:'0 auto 18px',
        }}><IconCheck size={38} /></div>
        <div style={{ fontFamily:'Instrument Serif, serif', fontSize:32, marginBottom:6 }}>Consulta guardada</div>
        <div style={{ fontSize:14, color:flowTokens.textMuted, marginBottom:24 }}>
          {pet.name} · {owner.name} · {data.type}
          {recetas > 0 && <><br/>{recetas} medicamento{recetas>1?'s':''} en receta vinculada.</>}
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button onClick={onNew} style={{
            background:'transparent', border:`1px solid ${flowTokens.border}`,
            padding:'10px 18px', borderRadius:9, fontSize:13.5, fontWeight:500,
            fontFamily:'inherit', color:flowTokens.text, cursor:'pointer',
          }}>Crear otra consulta</button>
          <button onClick={onNew} style={{
            background:flowTokens.accent, color:'white',
            border:'none', padding:'10px 18px', borderRadius:9,
            fontSize:13.5, fontWeight:500, fontFamily:'inherit', cursor:'pointer',
          }}>Ir al inicio</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Step1Interactive, Step2Interactive, Step3Interactive, Step4Interactive,
  CancelDialog, SuccessScreen, OWNERS,
});
