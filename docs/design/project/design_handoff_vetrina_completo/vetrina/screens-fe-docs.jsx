/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseSelect,
   VET_FE_DOCUMENTS, VET_FE_BILLABLE_ACCOUNTS, VET_FE_DOC_TYPE, VET_FE_STATUS,
   VET_FE_COMPANY_DOCTYPE, VET_FE_PAYMENT_MEANS, VET_FE_CREDIT_REASON, VET_FE_DEBIT_REASON,
   VET_FE_TAX_PROFILE, vetFeMoney, vetFeCan, useVetToast */

// ============================================================================
// Facturación electrónica — Documentos: listado, emitir, detalle
// ============================================================================

function VetFeStatusPill({ status, size = 'md' }) {
  const cfg = VET_FE_STATUS[status] || VET_FE_STATUS.PENDIENTE;
  return (
    <span className={'vet-fe-statpill size-' + size} style={{ background: cfg.tone.bg, color: cfg.tone.fg }}>
      <span className="vet-fe-statdot" style={{ background: cfg.tone.dot }} />
      {cfg.label}
    </span>
  );
}

function VetFeDocsView() {
  const [docs, setDocs] = React.useState(VET_FE_DOCUMENTS);
  const [openId, setOpenId] = React.useState(null);
  const [emitOpen, setEmitOpen] = React.useState(false);
  const [fType, setFType] = React.useState('');
  const [fStatus, setFStatus] = React.useState('');
  const toast = useVetToast();

  const current = openId ? docs.find((d) => d.id === openId) : null;
  if (current) return <VetFeDocDetail doc={current} onBack={() => setOpenId(null)} onChange={(nd) => setDocs((a) => a.map((x) => x.id === nd.id ? nd : x))} onAddNote={(note) => setDocs((a) => [note, ...a])} />;

  const filtered = docs.filter((d) => (!fType || d.documentType === fType) && (!fStatus || d.dianStatus === fStatus));

  function emit(acc, docType, finalConsumer) {
    const id = 6000 + Math.floor(Math.random() * 3000);
    const consec = Math.max(...docs.filter((d) => d.documentType === docType).map((d) => d.consecutive), 1000) + 1;
    const nd = {
      id, documentType: docType, prefix: docType === 'FE_VENTA' ? 'FE' : 'POS', consecutive: consec,
      resolutionNumber: docType === 'FE_VENTA' ? '18764003912345' : '18764003998877',
      issueDate: '2026-06-16', issueTime: '12:00:00-05:00', dianStatus: 'PENDIENTE',
      cufe: null, cude: null, uuid: 'MAT-NEW-' + id, reversed: false, qrUrl: null, pdfRepresentation: null, dianValidationDate: null,
      customer: finalConsumer
        ? { documentType: 'CEDULA_CIUDADANIA', documentId: '222222222222', verificationDigit: null, personType: 'NATURAL', legalName: null, name: 'Consumidor final', email: null }
        : { documentType: 'CEDULA_CIUDADANIA', documentId: '0000', verificationDigit: null, personType: 'NATURAL', legalName: null, name: acc.ownerName, email: '' },
      base: Math.round(acc.total / 1.19), iva: acc.total - Math.round(acc.total / 1.19), inc: 0, payable: acc.total, reteFuente: 0, reteIva: 0, reteIca: 0, netPayable: acc.total,
      paymentForm: 'CONTADO', paymentMeans: 'EFECTIVO', lines: [],
    };
    setDocs((a) => [nd, ...a]);
    setEmitOpen(false);
    toast.success('Documento emitido', 'Enviado a la DIAN · validando…');
    setOpenId(id);
  }

  return (
    <div className="vet-fe-docs">
      <div className="vet-fe-listhead">
        <div className="vet-fe-filters">
          <select className="vet-lab-filter-select" value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(VET_FE_DOC_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="vet-lab-filter-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(VET_FE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {vetFeCan('electronicDocument.emit') && (
          <button type="button" className="vet-historia-btn-ghost" onClick={() => setEmitOpen(true)}><VetIcons.Plus size={16} strokeWidth={2} /> Emisión manual</button>
        )}
      </div>

      <div className="vet-fe-autobanner">
        <VetIcons.History size={14} strokeWidth={1.8} />
        <span>La emisión es <strong>automática</strong> al cerrar/cobrar una venta. Usa <strong>Emisión manual</strong> solo para re-emitir o casos especiales.</span>
      </div>

      <table className="vet-fe-table">
        <thead><tr><th>Número</th><th>Tipo</th><th>Fecha</th><th>Cliente</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado</th><th>CUFE/CUDE</th><th /></tr></thead>
        <tbody>
          {filtered.map((d) => (
            <tr key={d.id} className="vet-fe-row" onClick={() => setOpenId(d.id)}>
              <td><span className="vet-fe-num">{d.prefix}-{d.consecutive}</span></td>
              <td>{VET_FE_DOC_TYPE[d.documentType].label}</td>
              <td className="vet-fe-date">{d.issueDate}</td>
              <td className="vet-fe-cust">{d.customer.legalName || d.customer.name}{d.reversed && <span className="vet-fe-reversed">Anulada</span>}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{vetFeMoney(d.payable)}</td>
              <td><VetFeStatusPill status={d.dianStatus} /></td>
              <td><span className="vet-fe-cufe">{(d.cufe || d.cude || '—').slice(0, 16)}{(d.cufe || d.cude) ? '…' : ''}</span></td>
              <td><VetIcons.ChevronRight size={15} strokeWidth={1.6} style={{ color: 'var(--warm-400)' }} /></td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={8} className="vet-fe-empty">Sin documentos para los filtros aplicados.</td></tr>}
        </tbody>
      </table>

      <VetFeEmitModal open={emitOpen} onClose={() => setEmitOpen(false)} onEmit={emit} />
    </div>
  );
}

// ---- Modal Emitir ----
function VetFeEmitModal({ open, onClose, onEmit }) {
  const [acc, setAcc] = React.useState(null);
  const [docType, setDocType] = React.useState('FE_VENTA');
  const [finalConsumer, setFinalConsumer] = React.useState(false);

  React.useEffect(() => { if (open) { setAcc(null); setDocType('FE_VENTA'); setFinalConsumer(false); } }, [open]);

  return (
    <VetModalShell open={open} onClose={onClose} title="Emisión manual" subtitle="Re-emitir desde una cuenta cerrada (saldo 0)"
      icon={VetIcons.Receipt} accent="amatista" width={620}
      footerActions={<><button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
        <button type="button" className="vet-btn-primary-modal" disabled={!acc} style={!acc ? { opacity: 0.5, cursor: 'not-allowed' } : null}
          onClick={() => onEmit(acc, docType, finalConsumer)}>Emitir</button></>}>
      <div className="vet-action-modal-body">
        <div>
          <div className="vet-acct-fieldlabel">Cuenta cerrada a facturar</div>
          <div className="vet-fe-acclist">
            {VET_FE_BILLABLE_ACCOUNTS.map((a) => (
              <button key={a.id} type="button" className={'vet-fe-accrow' + (acc?.id === a.id ? ' on' : '')} onClick={() => setAcc(a)}>
                <div className="vet-fe-acc-check">{acc?.id === a.id && <VetIcons.Check size={13} strokeWidth={2.6} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="vet-fe-acc-name">{a.ownerName}</div>
                  <div className="vet-fe-acc-meta">{a.pets} · {a.items} ítems · cerrada {a.closedAt}</div>
                </div>
                <span className="vet-fe-acc-total">{vetFeMoney(a.total)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="vet-form-grid-2">
          <VetBaseField label="Tipo de documento" required>
            {({ id }) => <VetBaseSelect id={id} value={docType} onChange={setDocType}
              options={[{ value: 'FE_VENTA', label: 'Factura electrónica' }, { value: 'DOC_EQUIV_POS', label: 'Documento POS' }]} />}
          </VetBaseField>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className={'vet-fe-toggle' + (finalConsumer ? ' on' : '')} onClick={() => setFinalConsumer((v) => !v)}>
              <span className="vet-fe-toggle-box">{finalConsumer && <VetIcons.Check size={12} strokeWidth={2.6} />}</span>
              Consumidor final
            </button>
          </div>
        </div>

        {!finalConsumer && acc && (
          <div className="vet-fe-clientwarn">
            <VetIcons.User size={14} strokeWidth={1.8} />
            <span>Se facturará a <strong>{acc.ownerName}</strong>. Verifica que tenga documento, tipo y ciudad completos en su ficha fiscal.</span>
          </div>
        )}
        <div className="vet-fe-asyncnote"><VetIcons.History size={13} strokeWidth={1.8} /> La validación DIAN es asíncrona: el documento nace <strong>Validando…</strong> y obtiene su CUFE en unos segundos.</div>
      </div>
    </VetModalShell>
  );
}

Object.assign(window, { VetFeDocsView, VetFeStatusPill });
