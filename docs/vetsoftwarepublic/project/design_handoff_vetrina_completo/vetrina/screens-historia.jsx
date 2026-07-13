/* global React, VetIcons,
   useVetRoute, useVetRouter,
   useVetHistoriaSelection,
   VetBreadcrumbStep, VetMonthTimelineGroup, VetEventDetailModal, VetPawLoader,
   VET_EVENT_TYPES, VET_TYPE_COLORS, VET_EVENT_TYPE_DETAILABLE,
   VET_MOCK_OWNERS, VET_MOCK_PETS, VET_MOCK_EVENTS,
   vetInitialsFromName */

// ============================================================================
// OwnerSearchList — components/OwnerSearchList.vue
// ============================================================================

function VetOwnerSearchList({ onSelect }) {
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const trimmed = query.trim();

  React.useEffect(() => {
    if (!trimmed) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      const q = trimmed.toLowerCase();
      const matches = VET_MOCK_OWNERS.filter((o) =>
        o.name.toLowerCase().includes(q)
        || o.document.toLowerCase().includes(q)
        || o.phone.toLowerCase().includes(q)
        || o.email.toLowerCase().includes(q),
      );
      setResults(matches);
      setLoading(false);
    }, 280);
    return () => clearTimeout(t);
  }, [trimmed]);

  const hasQuery = trimmed.length > 0;

  return (
    <div className="vet-owner-search">
      <div className="vet-owner-search-box">
        <VetIcons.Search size={16} strokeWidth={1.7} style={{ color: 'var(--warm-500)', flexShrink: 0 }} />
        <input
          className="vet-owner-search-input"
          type="text" autoFocus
          placeholder="Buscar por nombre, documento, email o teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && <VetPawLoader size={22} />}
      </div>

      {hasQuery ? (
        <div className="vet-owner-results">
          {!loading && results.length === 0 ? (
            <div className="vet-owner-status">
              Sin coincidencias para "<strong>{trimmed}</strong>"
            </div>
          ) : (
            results.map((o, i) => (
              <button
                key={o.id}
                type="button"
                className={'vet-owner-row' + (i % 2 === 1 ? ' striped' : '')}
                onClick={() => onSelect(o)}
              >
                <div className="vet-owner-avatar">{vetInitialsFromName(o.name)}</div>
                <div className="vet-owner-info">
                  <div className="vet-owner-name">{o.name}</div>
                  <div className="vet-owner-meta">
                    <span>{o.document}</span>
                    {o.phone && <><span className="vet-owner-dot">·</span><span>{o.phone}</span></>}
                    {o.email && <><span className="vet-owner-dot">·</span><span>{o.email}</span></>}
                  </div>
                </div>
                <VetIcons.ChevronRight size={16} strokeWidth={1.6} style={{ color: 'var(--warm-400)', flexShrink: 0 }} />
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="vet-owner-hint">Empieza a escribir para buscar al propietario.</div>
      )}
    </div>
  );
}

// ============================================================================
// PetCard — components/PetCard.vue
// ============================================================================

function VetPetCard({ pet, onSelect }) {
  const initials = vetInitialsFromName(pet.name);
  const sex = pet.gender === 'FEMALE' ? 'Hembra' : 'Macho';
  const unit = pet.weightType === 'GRAMS' ? 'g' : pet.weightType === 'POUNDS' ? 'lb' : 'kg';
  return (
    <button type="button" className="vet-pet-card" onClick={() => onSelect(pet)}>
      <div className="vet-pet-avatar">{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="vet-pet-name">{pet.name}</div>
        <div className="vet-pet-taxa">{pet.specie.name} · {pet.breed.name}</div>
        <div className="vet-pet-row">
          <span className="vet-pet-muted">Sexo:</span> {sex}
          <span className="vet-pet-sep">·</span>
          <span className="vet-pet-muted">Peso:</span> {pet.weight} {unit}
        </div>
        {pet.bod && (
          <div className="vet-pet-row">
            <span className="vet-pet-muted">Nacimiento:</span> {pet.bod}
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// HistoriaShell — views/HistoriaClinicaView.vue
// ============================================================================

function VetHistoriaShell({ children }) {
  const route = useVetRoute();
  const router = useVetRouter();
  const sel = useVetHistoriaSelection();

  const step = route.name === 'consulta-historial-detail' ? 3
             : route.name === 'consulta-historial-pet' ? 2 : 1;

  function jumpTo(target) {
    if (target === 1) router.push({ name: 'consulta-historial' });
    else if (target === 2 && sel.owner) {
      router.push({ name: 'consulta-historial-pet', params: { ownerId: sel.owner.id } });
    }
  }

  return (
    <div className="vet-historia-shell">
      <header className="vet-historia-crumbs">
        <VetBreadcrumbStep
          index={1} label="Propietario"
          active={step === 1} done={step > 1}
          value={sel.owner?.name ?? null}
          onClick={() => jumpTo(1)}
        />
        <span className="vet-historia-sep">›</span>
        <VetBreadcrumbStep
          index={2} label="Mascota"
          active={step === 2} done={step > 2}
          disabled={!sel.owner}
          value={sel.pet?.name ?? null}
          onClick={() => jumpTo(2)}
        />
        <span className="vet-historia-sep">›</span>
        <VetBreadcrumbStep
          index={3} label="Historia clínica"
          active={step === 3} done={false}
          disabled={!sel.pet}
        />
      </header>
      {children}
    </div>
  );
}

// ============================================================================
// OwnerStep — views/OwnerStep.vue
// ============================================================================

function VetOwnerStepInner() {
  const router = useVetRouter();
  const sel = useVetHistoriaSelection();

  // entrar al paso 1 limpia selección previa
  React.useEffect(() => { sel.reset(); }, []); // eslint-disable-line

  function pick(owner) {
    sel.setOwner(owner);
    router.push({ name: 'consulta-historial-pet', params: { ownerId: owner.id } });
  }

  return (
    <VetHistoriaShell>
      <div className="vet-step">
        <div className="vet-step-label">Paso 1 de 3</div>
        <h1 className="vet-step-title">¿De quién es la mascota?</h1>
        <p className="vet-step-sub">Busca al propietario por nombre, documento, email o teléfono.</p>
        <VetOwnerSearchList onSelect={pick} />
      </div>
    </VetHistoriaShell>
  );
}

// ============================================================================
// PetStep — views/PetStep.vue
// ============================================================================

function VetPetStepInner() {
  const route = useVetRoute();
  const router = useVetRouter();
  const sel = useVetHistoriaSelection();
  const ownerId = route.params.ownerId;

  // Hidratar owner si no está cargado
  React.useEffect(() => {
    if (!ownerId) return;
    if (!sel.owner || sel.owner.id !== ownerId) {
      const owner = VET_MOCK_OWNERS.find((o) => o.id === ownerId);
      if (owner) sel.setOwner(owner);
    }
  }, [ownerId]); // eslint-disable-line

  const pets = VET_MOCK_PETS[ownerId] ?? [];
  const firstName = sel.owner?.name.split(' ')[0] ?? '';
  const countLabel = pets.length === 0 ? 'Sin mascotas registradas'
    : `${pets.length} ${pets.length === 1 ? 'mascota registrada' : 'mascotas registradas'}`;

  function pick(pet) {
    sel.setPet(pet);
    router.push({ name: 'consulta-historial-detail', params: { ownerId, petId: pet.id } });
  }

  function back() { router.push({ name: 'consulta-historial' }); }

  return (
    <VetHistoriaShell>
      <div className="vet-step" style={{ maxWidth: 1040 }}>
        <button type="button" className="vet-back-btn" onClick={back}>
          <VetIcons.ArrowLeft size={14} strokeWidth={1.7} />
          Cambiar propietario
        </button>

        <div className="vet-step-label">
          Paso 2 de 3
          {sel.owner && <> · {sel.owner.name}</>}
        </div>
        <h1 className="vet-step-title">¿Qué mascota quieres consultar?</h1>
        {sel.owner && (
          <p className="vet-step-sub">
            {countLabel}{firstName && <> a nombre de {firstName}</>}.
          </p>
        )}

        {pets.length === 0 ? (
          <div className="vet-empty-card">
            Este propietario aún no tiene mascotas registradas.
          </div>
        ) : (
          <div className="vet-pet-grid">
            {pets.map((p) => <VetPetCard key={p.id} pet={p} onSelect={pick} />)}
          </div>
        )}
      </div>
    </VetHistoriaShell>
  );
}

// ============================================================================
// HistoryStep — views/HistoryStep.vue
// ============================================================================

function VetHistoryStepInner() {
  const route = useVetRoute();
  const router = useVetRouter();
  const sel = useVetHistoriaSelection();
  const { ownerId, petId } = route.params;

  // Hidratar
  React.useEffect(() => {
    if (!sel.owner || sel.owner.id !== ownerId) {
      const o = VET_MOCK_OWNERS.find((x) => x.id === ownerId);
      if (o) sel.setOwner(o);
    }
    if (!sel.pet || sel.pet.id !== petId) {
      const pets = VET_MOCK_PETS[ownerId] ?? [];
      const p = pets.find((x) => x.id === petId);
      if (p) sel.setPet(p);
    }
  }, [ownerId, petId]); // eslint-disable-line

  const allEvents = React.useMemo(() => {
    const evs = VET_MOCK_EVENTS[petId] ?? [];
    return [...evs].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  }, [petId]);

  const [filter, setFilter] = React.useState('ALL');
  const [search, setSearch] = React.useState('');

  const typeCounts = React.useMemo(() => {
    const counts = {};
    for (const ev of allEvents) counts[ev.eventType] = (counts[ev.eventType] ?? 0) + 1;
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [allEvents]);

  const filtered = React.useMemo(() => {
    return allEvents.filter((ev) => {
      if (filter !== 'ALL' && ev.eventType !== filter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return ev.summary.toLowerCase().includes(q)
        || VET_EVENT_TYPES[ev.eventType].label.toLowerCase().includes(q);
    });
  }, [allEvents, filter, search]);

  const grouped = React.useMemo(() => {
    const map = new Map();
    for (const ev of filtered) {
      const key = ev.eventDate.slice(0, 7);
      const arr = map.get(key);
      if (arr) arr.push(ev); else map.set(key, [ev]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const [detailEvent, setDetailEvent] = React.useState(null);

  const detailChildren = React.useMemo(() => {
    if (!detailEvent || detailEvent.eventType !== 'CONSULTATION') return [];
    return allEvents.filter((e) =>
      e.eventType !== 'CONSULTATION' && e.consultationId === detailEvent.sourceId
    );
  }, [detailEvent, allEvents]);

  function openEvent(ev) {
    if (!VET_EVENT_TYPE_DETAILABLE.has(ev.eventType)) return;
    setDetailEvent(ev);
  }

  function tokensFor(type) { return VET_TYPE_COLORS[VET_EVENT_TYPES[type].color]; }

  const pet = sel.pet;
  const owner = sel.owner;
  const sexLabel = pet?.gender === 'FEMALE' ? 'Hembra' : 'Macho';
  const unit = pet?.weightType === 'GRAMS' ? 'g' : pet?.weightType === 'POUNDS' ? 'lb' : 'kg';

  function back() { router.push({ name: 'consulta-historial-pet', params: { ownerId } }); }
  function goNueva() {
    router.push({ name: 'consulta-nueva', query: { paso: '3' } });
  }

  return (
    <VetHistoriaShell>
      <div className="vet-step" style={{ maxWidth: '100%', padding: 0 }}>
        <header className="vet-patient-head">
          <button type="button" className="vet-back-btn" onClick={back}>
            <VetIcons.ArrowLeft size={14} strokeWidth={1.7} />
            Cambiar mascota
          </button>

          {pet && (
            <div className="vet-patient">
              <div className="vet-patient-avatar">{pet.name.slice(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 className="vet-patient-name">{pet.name}</h1>
                <div className="vet-patient-pills">
                  <span className="vet-pill">{pet.specie.name}</span>
                  <span className="vet-pill">{pet.breed.name}</span>
                  <span className="vet-pill">{sexLabel}</span>
                  <span className="vet-pill">{pet.weight} {unit}</span>
                  {pet.color && <span className="vet-pill">{pet.color}</span>}
                </div>
                {owner && (
                  <div className="vet-owner-line">
                    Propietario: <strong>{owner.name}</strong>
                    {owner.phone && <> · {owner.phone}</>}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button type="button" className="vet-historia-btn-ghost">
                  <VetIcons.Download size={14} strokeWidth={1.7} />
                  Exportar PDF
                </button>
                <button type="button" className="vet-historia-btn-primary" onClick={goNueva}>
                  <VetIcons.Plus size={14} strokeWidth={1.8} />
                  Nueva consulta
                </button>
              </div>
            </div>
          )}
        </header>

        <div className="vet-filters">
          <div className="vet-chips">
            <button
              type="button"
              className={'vet-chip' + (filter === 'ALL' ? ' active' : '')}
              onClick={() => setFilter('ALL')}
            >
              Todos · {allEvents.length}
            </button>
            {typeCounts.map((row) => {
              const isActive = filter === row.type;
              const t = tokensFor(row.type);
              return (
                <button
                  key={row.type}
                  type="button"
                  className={'vet-chip' + (isActive ? ' active' : '')}
                  style={isActive ? { background: t.bg, color: t.fg, borderColor: t.dot } : null}
                  onClick={() => setFilter(row.type)}
                >
                  <span style={{ fontSize: 13 }}>{VET_EVENT_TYPES[row.type].icon}</span>
                  {VET_EVENT_TYPES[row.type].label} · {row.count}
                </button>
              );
            })}
          </div>

          <div className="vet-history-search">
            <VetIcons.Search size={14} strokeWidth={1.7} style={{ color: 'var(--warm-500)', flexShrink: 0 }} />
            <input
              className="vet-history-search-input"
              placeholder="Buscar en eventos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="vet-timeline-wrap">
          {filtered.length === 0 ? (
            <div className="vet-empty-card">
              {allEvents.length === 0
                ? 'Sin historia clínica registrada todavía.'
                : 'Ningún evento coincide con los filtros.'}
            </div>
          ) : (
            grouped.map(([key, items]) => (
              <VetMonthTimelineGroup
                key={key}
                monthKey={key}
                events={items}
                onSelect={openEvent}
              />
            ))
          )}
        </div>

        <VetEventDetailModal
          open={!!detailEvent}
          event={detailEvent}
          children={detailChildren}
          onClose={() => setDetailEvent(null)}
        />
      </div>
    </VetHistoriaShell>
  );
}

Object.assign(window, {
  VetOwnerStepInner, VetPetStepInner, VetHistoryStepInner,
  VetHistoriaShell, VetOwnerSearchList, VetPetCard,
});
