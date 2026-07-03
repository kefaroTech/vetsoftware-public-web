/* global React, VetIcons, VetModalShell, VetBaseField, VetBaseSelect,
   VET_FE_DOC_TYPE, VET_FE_STATUS, VET_FE_COMPANY_DOCTYPE, VET_FE_PAYMENT_MEANS,
   VET_FE_CREDIT_REASON, VET_FE_DEBIT_REASON, VET_FE_TAX_PROFILE, VET_FE_TAX_REGIME,
   VetFeStatusPill, vetFeMoney, vetFeCan, useVetToast */

// ============================================================================
// Facturación electrónica — Detalle de documento
// ============================================================================

const VET_FE_TIMELINE = {
  PENDIENTE:    ['Emitido', 'Validando DIAN'],
  VALIDADO:     ['Emitido', 'Validado DIAN', 'Disponible'],
  RECHAZADO:    ['Emitido', 'Rechazado DIAN'],
  CONTINGENCIA: ['Emitido', 'En contingencia'],
  NO_ELECTRONICO: ['Guardado local'],
};

function VetFeDocDetail({ doc, onBack, onChange, onAddNote }) {
  const toast = useVetToast();
  const [noteModal, setNoteModal] = React.useState(null); // 'credit' | 'debit' | null
  const isFE = doc.documentType === 'FE_VENTA';
  const hasReten = doc.reteFuente > 0 || doc.reteIva > 0 || doc.reteIca > 0;
  const validated = doc.dianStatus === 'VALIDADO';
  const idNum = doc.cufe ? 'CUFE' : 'CUDE';
  const idVal = doc.cufe || doc.cude;

  function refresh() {
    if (doc.dianStatus !== 'PENDIENTE') return;
    onChange({ ...doc, dianStatus: 'VALIDADO', cufe: isFE ? 'a1f4c8e7d2b9605143fae8c7' + doc.id : null, cude: !isFE ? 'b8c7d6e5f4a3920183cde7f6' + doc.id : null, qrUrl: 'qr', pdfRepresentation: doc.prefix.toLowerCase() + '-' + doc.consecutive + '.pdf', dianValidationDate: '2026-06-16T12:01:00' });
    toast.success('Documento validado', 'La DIAN validó el documento.');
  }
  function retransmit() { toast.info('Re-transmitiendo', 'Reintentando ante el proveedor…'); }
  function convert() { toast.success('Convertido a factura', 'Se generó una FE sobre la misma venta.'); }
  function issueNote(kind, reason) {
    onChange({ ...doc, reversed: kind === 'credit' ? true : doc.reversed });
    toast.success(kind === 'credit' ? 'Nota crédito emitida' : 'Nota débito emitida', 'Sigue su propio ciclo de validación.');
    setNoteModal(null);
  }

  const steps = VET_FE_TIMELINE[doc.dianStatus] || [];

  return (
    <div className="vet-fe-detail">
      <button type="button" className="vet-hosp-back" onClick={onBack}><VetIcons.ArrowLeft size={15} strokeWidth={1.7} /> Volver a documentos</button>

      <div className="vet-fe-detail-head">
        <div>
          <div className="vet-fe-detail-num">{doc.prefix}-{doc.consecutive}</div>
          <h1 className="vet-fe-detail-type">{VET_FE_DOC_TYPE[doc.documentType].label}</h1>
          <div className="vet-fe-detail-meta">Emitido {doc.issueDate} {doc.issueTime?.slice(0, 5)} · Res. {doc.resolutionNumber}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <VetFeStatusPill status={doc.dianStatus} size="lg" />
          {doc.reversed && <span className="vet-fe-reversed lg">Anulada por nota crédito</span>}
        </div>
      </div>

      {/* Timeline + acciones por estado */}
      <div className="vet-fe-statusbar">
        <div className="vet-fe-timeline">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className={'vet-fe-tlstep' + (i === steps.length - 1 ? ' last' : ' done') + (doc.dianStatus === 'RECHAZADO' && i === steps.length - 1 ? ' err' : '')}>
                <span className="vet-fe-tldot">{i < steps.length - 1 || validated ? <VetIcons.Check size={11} strokeWidth={2.6} /> : i + 1}</span>
                <span className="vet-fe-tllbl">{s}</span>
              </div>
              {i < steps.length - 1 && <span className="vet-fe-tlbar" />}
            </React.Fragment>
          ))}
        </div>
        <div className="vet-fe-statusactions">
          {doc.dianStatus === 'PENDIENTE' && <button type="button" className="vet-historia-btn-ghost" onClick={refresh}><VetIcons.History size={14} strokeWidth={1.8} /> Refrescar estado</button>}
          {doc.dianStatus === 'CONTINGENCIA' && vetFeCan('electronicDocument.transmit') && <button type="button" className="vet-historia-btn-ghost" onClick={retransmit}><VetIcons.History size={14} strokeWidth={1.8} /> Re-transmitir</button>}
          {validated && <button type="button" className="vet-historia-btn-ghost" onClick={() => toast.success('PDF descargado', doc.pdfRepresentation)}><VetIcons.Download size={14} strokeWidth={1.8} /> Descargar PDF</button>}
          {validated && doc.documentType === 'DOC_EQUIV_POS' && <button type="button" className="vet-historia-btn-ghost" onClick={convert}>Convertir a factura</button>}
        </div>
      </div>

      {doc.dianStatus === 'RECHAZADO' && (
        <div className="vet-fe-rejectbox">
          <VetIcons.X size={15} strokeWidth={2} />
          <div><strong>Documento rechazado por la DIAN.</strong><div>{doc.rejectReason}</div></div>
          {validated === false && <button type="button" className="vet-fe-rejbtn" onClick={() => setNoteModal('credit')}>Corregir con nota crédito</button>}
        </div>
      )}
      {doc.dianStatus === 'NO_ELECTRONICO' && (
        <div className="vet-fe-noelecbox"><VetIcons.FileText size={15} strokeWidth={1.8} /> Este registro no se envió a la DIAN porque el plan no incluye facturación electrónica.</div>
      )}

      <div className="vet-fe-detail-grid">
        {/* Emisor / Adquiriente */}
        <div className="vet-fe-card">
          <div className="vet-fe-card-title">Emisor</div>
          <VetFeParty p={{ documentType: VET_FE_TAX_PROFILE.documentType, documentId: VET_FE_TAX_PROFILE.companyDocumentId, verificationDigit: VET_FE_TAX_PROFILE.companyDocumentVerificationDigit, legalName: VET_FE_TAX_PROFILE.legalName, email: VET_FE_TAX_PROFILE.fiscalEmail, taxRegime: VET_FE_TAX_REGIME[VET_FE_TAX_PROFILE.taxRegime] }} />
        </div>
        <div className="vet-fe-card">
          <div className="vet-fe-card-title">Adquiriente</div>
          <VetFeParty p={{ documentType: doc.customer.documentType, documentId: doc.customer.documentId, verificationDigit: doc.customer.verificationDigit, legalName: doc.customer.legalName || doc.customer.name, email: doc.customer.email, personType: doc.customer.personType }} />
        </div>
      </div>

      {/* CUFE/QR */}
      {validated && (
        <div className="vet-fe-card vet-fe-cufebox">
          <div className="vet-fe-qr"><VetIcons.ScanLine size={48} strokeWidth={1.2} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="vet-fe-card-title">{idNum}</div>
            <div className="vet-fe-cufeval">{idVal}</div>
            <button type="button" className="vet-fe-copybtn" onClick={() => toast.success('Copiado', idNum)}><VetIcons.FileText size={12} strokeWidth={1.8} /> Copiar {idNum}</button>
            <div className="vet-fe-detail-meta" style={{ marginTop: 6 }}>Validado {doc.dianValidationDate?.replace('T', ' ').slice(0, 16)} · UUID {doc.uuid}</div>
          </div>
        </div>
      )}

      {/* Líneas */}
      {doc.lines.length > 0 && (
        <div className="vet-fe-card">
          <div className="vet-fe-card-title">Detalle</div>
          <table className="vet-fe-lines">
            <thead><tr><th>Descripción</th><th>Cant.</th><th style={{ textAlign: 'right' }}>V. unit.</th><th>Imp.</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {doc.lines.map((l) => (
                <tr key={l.lineNumber}>
                  <td>{l.description}</td><td>{l.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{vetFeMoney(l.unitPrice)}</td>
                  <td><span className="vet-fe-taxchip">{l.taxScheme} {l.taxRate}%</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{vetFeMoney(l.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totales */}
      <div className="vet-fe-card vet-fe-totals">
        <div className="vet-fe-tot-row"><span>Subtotal (base)</span><span>{vetFeMoney(doc.base)}</span></div>
        {doc.iva > 0 && <div className="vet-fe-tot-row"><span>IVA</span><span>{vetFeMoney(doc.iva)}</span></div>}
        {doc.inc > 0 && <div className="vet-fe-tot-row"><span>INC</span><span>{vetFeMoney(doc.inc)}</span></div>}
        <div className="vet-fe-tot-row vet-fe-tot-sub"><span>Total a pagar</span><span>{vetFeMoney(doc.payable)}</span></div>
        {hasReten && (
          <>
            <div className="vet-fe-tot-reten-head">Retenciones del adquiriente</div>
            {doc.reteFuente > 0 && <div className="vet-fe-tot-row reten"><span>ReteFuente</span><span>−{vetFeMoney(doc.reteFuente)}</span></div>}
            {doc.reteIva > 0 && <div className="vet-fe-tot-row reten"><span>ReteIVA</span><span>−{vetFeMoney(doc.reteIva)}</span></div>}
            {doc.reteIca > 0 && <div className="vet-fe-tot-row reten"><span>ReteICA</span><span>−{vetFeMoney(doc.reteIca)}</span></div>}
            <div className="vet-fe-tot-row vet-fe-tot-net"><span>Neto a pagar</span><span>{vetFeMoney(doc.netPayable)}</span></div>
          </>
        )}
        <div className="vet-fe-tot-pay">{doc.paymentForm === 'CONTADO' ? 'Contado' : 'Crédito'} · {VET_FE_PAYMENT_MEANS[doc.paymentMeans]}{doc.paymentDueDate ? ` · vence ${doc.paymentDueDate}` : ''}</div>
      </div>

      {/* Acciones de nota (solo FE validada, no reversada) */}
      {isFE && validated && !doc.reversed && vetFeCan('electronicDocument.emit') && (
        <div className="vet-fe-noteactions">
          <button type="button" className="vet-historia-btn-ghost" onClick={() => setNoteModal('credit')}><VetIcons.FileText size={14} strokeWidth={1.8} /> Emitir nota crédito</button>
          <button type="button" className="vet-historia-btn-ghost" onClick={() => setNoteModal('debit')}><VetIcons.FilePlus size={14} strokeWidth={1.8} /> Emitir nota débito</button>
        </div>
      )}

      <VetFeNoteModal open={!!noteModal} kind={noteModal} onClose={() => setNoteModal(null)} onIssue={issueNote} />
    </div>
  );
}

function VetFeParty({ p }) {
  return (
    <div className="vet-fe-party">
      <div className="vet-fe-party-name">{p.legalName}</div>
      <div className="vet-fe-party-rows">
        <div><span>Documento</span><span>{VET_FE_COMPANY_DOCTYPE[p.documentType]?.split(' ')[0] || p.documentType} {p.documentId}{p.verificationDigit ? '-' + p.verificationDigit : ''}</span></div>
        {p.taxRegime && <div><span>Régimen</span><span>{p.taxRegime}</span></div>}
        {p.personType && <div><span>Tipo</span><span>{p.personType === 'JURIDICA' ? 'Jurídica' : 'Natural'}</span></div>}
        <div><span>Correo</span><span>{p.email || '—'}</span></div>
      </div>
    </div>
  );
}

function VetFeNoteModal({ open, kind, onClose, onIssue }) {
  const isCredit = kind === 'credit';
  const reasons = isCredit ? VET_FE_CREDIT_REASON : VET_FE_DEBIT_REASON;
  const [reason, setReason] = React.useState('');
  React.useEffect(() => { if (open) setReason(''); }, [open, kind]);

  return (
    <VetModalShell open={open} onClose={onClose} title={isCredit ? 'Emitir nota crédito' : 'Emitir nota débito'}
      subtitle={isCredit ? 'Anulación, devolución o rebaja sobre la factura' : 'Aumento sobre la factura'}
      icon={VetIcons.FileText} accent={isCredit ? 'danger' : 'amatista'} width={460}
      footerActions={<><button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
        <button type="button" className="vet-btn-primary-modal" disabled={!reason} style={!reason ? { opacity: 0.5, cursor: 'not-allowed' } : null}
          onClick={() => onIssue(kind, reason)}>Emitir nota</button></>}>
      <div className="vet-action-modal-body">
        <VetBaseField label="Motivo" required>
          {({ id }) => <VetBaseSelect id={id} value={reason} onChange={setReason} placeholder="Selecciona un motivo"
            options={Object.entries(reasons).map(([k, v]) => ({ value: k, label: v }))} />}
        </VetBaseField>
        <p className="vet-pauta-help">{isCredit ? 'La nota crédito anula/corrige la factura validada y reversa la cartera. Sigue su propio ciclo de validación DIAN.' : 'La nota débito aumenta el valor de la factura. No reversa cartera.'}</p>
      </div>
    </VetModalShell>
  );
}

Object.assign(window, { VetFeDocDetail });
