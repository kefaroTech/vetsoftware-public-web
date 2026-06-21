/* global React, VetIcons, VetModalShell,
   VetBaseField, VetBaseInput, VetBaseSelect,
   VET_SHOP_CATEGORIES, VET_SHOP_CAT_TONE, VET_SHOP_PAY, VET_SHOP_TAX_RATE,
   VET_TAX_RATES, VET_TAX_CONFIG_DEFAULT, vetComputeTotals,
   vetShopStockState, VET_SHOP_PRODUCTS_INITIAL, VET_SHOP_SALES_INITIAL, VET_SHOP_SERVICES, VET_SHOP_SERVICE_CATEGORIES,
   VET_PROMOS_INITIAL,
   vetMoney, vetShopCustomerName, VET_MOCK_OWNERS,
   useVetToast, VetPatientCascadePicker */

// ============================================================================
// Shop store (POS, Inventario, Servicios, Promociones, Impuestos)
// ============================================================================

function useVetShopState() {
  const toast = useVetToast();
  const [products, setProducts] = React.useState(VET_SHOP_PRODUCTS_INITIAL);
  const [services, setServices] = React.useState(VET_SHOP_SERVICES);
  const [promos, setPromos] = React.useState(VET_PROMOS_INITIAL);
  const [taxRates, setTaxRates] = React.useState(VET_TAX_RATES);
  const [taxConfig, setTaxConfig] = React.useState(VET_TAX_CONFIG_DEFAULT);
  const [sales, setSales] = React.useState(VET_SHOP_SALES_INITIAL);
  const [prodCats, setProdCats] = React.useState(VET_SHOP_CATEGORIES);
  const [svcCats, setSvcCats] = React.useState(VET_SHOP_SERVICE_CATEGORIES);

  function upsertProdCat(data) {
    if (data.id) { setProdCats((a) => a.map((c) => c.id === data.id ? { ...c, ...data } : c)); toast.success('Categoría actualizada', data.name); }
    else { const id = 'pc' + Date.now().toString(36); setProdCats((a) => [...a, { id, name: data.name }]); toast.success('Categoría creada', data.name); }
  }
  function removeProdCat(id) {
    if (products.some((p) => p.category === id)) { toast.warn('No se puede eliminar', 'Hay productos en esta categoría.'); return; }
    setProdCats((a) => a.filter((c) => c.id !== id)); toast.info('Categoría eliminada', '');
  }
  function upsertSvcCat(data) {
    if (data.id) { setSvcCats((a) => a.map((c) => c.id === data.id ? { ...c, ...data } : c)); toast.success('Categoría actualizada', data.name); }
    else { const id = 'sc' + Date.now().toString(36); setSvcCats((a) => [...a, { id, name: data.name }]); toast.success('Categoría creada', data.name); }
  }
  function removeSvcCat(id) {
    if (services.some((s) => s.category === id)) { toast.warn('No se puede eliminar', 'Hay servicios en esta categoría.'); return; }
    setSvcCats((a) => a.filter((c) => c.id !== id)); toast.info('Categoría eliminada', '');
  }

  function setPricesIncludeTax(v) {
    setTaxConfig({ pricesIncludeTax: v });
  }
  function upsertTaxRate(data) {
    if (data.id) {
      setTaxRates((arr) => arr.map((t) => t.id === data.id ? { ...t, ...data } : t));
      toast.success('Impuesto actualizado', data.name);
    } else {
      const id = 'tax' + Date.now().toString(36);
      setTaxRates((arr) => [...arr, { ...data, id }]);
      toast.success('Impuesto creado', `${data.name} disponible para asignar.`);
    }
  }
  function removeTaxRate(id) {
    setTaxRates((arr) => arr.filter((t) => t.id !== id));
    toast.info('Impuesto eliminado', 'Ya no aparece en las fichas.');
  }

  function upsertPromo(data) {
    if (data.id) {
      setPromos((arr) => arr.map((p) => p.id === data.id ? { ...p, ...data } : p));
      toast.success('Promoción actualizada', data.name);
    } else {
      const id = Math.max(0, ...promos.map((p) => p.id)) + 1;
      setPromos((arr) => [...arr, { ...data, id }]);
      toast.success('Promoción creada', `${data.name} disponible.`);
    }
  }
  function removePromo(id) {
    setPromos((arr) => arr.filter((p) => p.id !== id));
    toast.info('Promoción eliminada', 'Ya no aplica en el punto de venta.');
  }
  function togglePromo(id, active) {
    setPromos((arr) => arr.map((p) => p.id === id ? { ...p, active } : p));
  }

  function upsertProduct(data) {
    if (data.id) {
      setProducts((arr) => arr.map((p) => p.id === data.id ? { ...p, ...data } : p));
      toast.success('Producto actualizado', data.name);
    } else {
      const id = Math.max(0, ...products.map((p) => p.id)) + 1;
      setProducts((arr) => [...arr, { ...data, id }]);
      toast.success('Producto creado', `${data.name} añadido al inventario.`);
    }
  }
  function restock(id, qty) {
    setProducts((arr) => arr.map((p) => p.id === id ? { ...p, stock: p.stock + qty } : p));
    toast.success('Stock actualizado', `+${qty} unidades.`);
  }

  function upsertService(data) {
    if (data.id) {
      setServices((arr) => arr.map((s) => s.id === data.id ? { ...s, ...data } : s));
      toast.success('Servicio actualizado', data.name);
    } else {
      const id = 's' + (Math.max(0, ...services.map((s) => Number(String(s.id).replace('s', '')) || 0)) + 1);
      setServices((arr) => [...arr, { ...data, id }]);
      toast.success('Servicio creado', `${data.name} disponible para la venta.`);
    }
  }
  function removeService(id) {
    setServices((arr) => arr.filter((s) => s.id !== id));
    toast.info('Servicio retirado', 'Ya no aparece en el punto de venta.');
  }

  function registerSale(sale) {
    const id = Math.max(0, ...sales.map((s) => s.id)) + 1;
    const n = String(sales.length + 513).padStart(4, '0');
    const code = `V-2026-${n}`;
    setSales((arr) => [{ ...sale, id, code }, ...arr]);
    // descontar stock solo de productos
    setProducts((arr) => arr.map((p) => {
      const line = sale.items.find((it) => (it.kind === 'product' || it.productId != null) && (it.id === p.id || it.productId === p.id));
      return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
    }));
    return code;
  }

  return { products, services, promos, taxRates, taxConfig, setPricesIncludeTax, upsertTaxRate, removeTaxRate, sales, upsertProduct, restock, upsertService, removeService, upsertPromo, removePromo, togglePromo, registerSale,
    prodCats, svcCats, upsertProdCat, removeProdCat, upsertSvcCat, removeSvcCat };
}

// ============================================================================
// Product card (catálogo POS)
// ============================================================================

function VetShopProductCard({ product, priceInfo, onAdd }) {
  const state = vetShopStockState(product);
  const tone = VET_SHOP_CAT_TONE[product.category];
  const disabled = state === 'AGOTADO';
  const hasPromo = priceInfo && priceInfo.promo;
  return (
    <button type="button" className={'vet-shop-pcard' + (disabled ? ' disabled' : '')}
      onClick={() => !disabled && onAdd(product)} disabled={disabled}>
      {hasPromo && <span className="vet-shop-promo-badge">Promo</span>}
      <div className="vet-shop-pcard-thumb" style={{ background: tone.bg, color: tone.fg }}>
        <VetIcons.Package size={22} strokeWidth={1.6} />
      </div>
      <div className="vet-shop-pcard-name">{product.name}</div>
      <div className="vet-shop-pcard-foot">
        <span className="vet-shop-pcard-price">
          {hasPromo && <span className="vet-shop-price-old">{vetMoney(priceInfo.original)}</span>}
          {vetMoney(hasPromo ? priceInfo.price : product.salePrice)}
        </span>
        <span className={'vet-shop-pcard-stock st-' + state}>
          {state === 'AGOTADO' ? 'Agotado' : `${product.stock} u`}
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// Service card (catálogo POS — servicios)
// ============================================================================

function VetShopServiceCard({ service, priceInfo, onAdd }) {
  const tone = (window.VET_SHOP_SVC_TONE || {})[service.category] || { bg: 'var(--warm-150)', fg: 'var(--warm-700)' };
  const hasPromo = priceInfo && priceInfo.promo;
  return (
    <button type="button" className="vet-shop-pcard" onClick={() => onAdd(service)}>
      {hasPromo && <span className="vet-shop-promo-badge">Promo</span>}
      <div className="vet-shop-pcard-thumb" style={{ background: tone.bg, color: tone.fg }}>
        <VetIcons.Stethoscope size={22} strokeWidth={1.6} />
      </div>
      <div className="vet-shop-pcard-name">{service.name}</div>
      <div className="vet-shop-pcard-foot">
        <span className="vet-shop-pcard-price">
          {hasPromo && <span className="vet-shop-price-old">{vetMoney(priceInfo.original)}</span>}
          {vetMoney(hasPromo ? priceInfo.price : service.salePrice)}
        </span>
        <span className="vet-shop-pcard-svc">Servicio</span>
      </div>
    </button>
  );
}

// ============================================================================
// Payment modal
// ============================================================================

function VetShopPayModal({ open, total, customer, onSelectCustomer, onUpdateCustomer, onClose, onConfirm }) {
  const [method, setMethod] = React.useState('EFECTIVO');
  const [received, setReceived] = React.useState('');
  const [fiscalOpen, setFiscalOpen] = React.useState(false);
  React.useEffect(() => { if (open) { setMethod('EFECTIVO'); setReceived(''); setFiscalOpen(false); } }, [open]);

  const recv = Number(received) || 0;
  const change = method === 'EFECTIVO' ? Math.max(0, recv - total) : 0;
  const overUvt = vetFeOverThreshold(total);
  const checklist = overUvt ? vetFeCustomerChecklist(customer) : { complete: true };
  const cashOk = method !== 'EFECTIVO' || recv >= total;
  const canConfirm = cashOk && (!overUvt || (customer && checklist.complete));

  const confirmLabel = overUvt ? 'Emitir factura electrónica' : 'Confirmar pago';

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title={overUvt ? 'Cobrar y facturar' : 'Cobrar venta'}
      subtitle={`Total a pagar: ${vetMoney(total)}`}
      icon={VetIcons.Receipt} accent="amatista" width={overUvt ? 560 : 460}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal"
            disabled={!canConfirm}
            style={!canConfirm ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onConfirm({ method, received: recv, electronic: overUvt })}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
        {overUvt && <VetFeThresholdBanner total={total} />}

        {overUvt && (
          <>
            <div className="vet-fe-doctypesel">
              <div className="vet-fe-doctype on"><VetIcons.FileText size={15} strokeWidth={1.8} /> Factura electrónica</div>
              <div className="vet-fe-doctype off" title="No disponible por encima de 5 UVT">
                <VetIcons.ShieldCheck size={14} strokeWidth={1.8} style={{ opacity: 0.5 }} /> Documento POS
                <span className="vet-fe-lock"><VetIcons.X size={11} strokeWidth={2.4} /></span>
              </div>
            </div>
            <VetFeCustomerBlock customer={customer}
              onSelect={onSelectCustomer}
              onComplete={() => setFiscalOpen(true)} />
          </>
        )}

        <VetBaseField label="Método de pago" required>
          {({ id }) => <VetBaseSelect id={id} value={method} onChange={setMethod}
            options={Object.entries(VET_SHOP_PAY).map(([k, v]) => ({ value: k, label: v }))} />}
        </VetBaseField>
        {method === 'EFECTIVO' && (
          <>
            <VetBaseField label="Monto recibido" required>
              {({ id }) => <VetBaseInput id={id} type="number" value={received} onChange={setReceived} placeholder={String(total)} />}
            </VetBaseField>
            <div className="vet-shop-change">
              <span>Cambio</span>
              <strong>{vetMoney(change)}</strong>
            </div>
          </>
        )}
      </div>

      <VetFeCustomerFiscalModal open={fiscalOpen} customer={customer}
        onClose={() => setFiscalOpen(false)}
        onSave={(c) => { onUpdateCustomer && onUpdateCustomer(c); setFiscalOpen(false); }} />
    </VetModalShell>
  );
}

// ============================================================================
// Receipt modal
// ============================================================================

function VetShopReceiptModal({ open, sale, products, taxConfig, onClose }) {
  if (!open || !sale) return null;
  const lines = sale.items.map((it) => {
    const name = it.name ?? (products.find((x) => x.id === (it.id ?? it.productId)) || {}).name ?? '—';
    return { name, kind: it.kind, qty: it.qty, unitPrice: it.unitPrice, taxId: it.taxId, total: it.qty * it.unitPrice };
  });
  const T = vetComputeTotals(lines, sale.discount, sale.taxConfig ?? taxConfig);

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title="Venta registrada"
      subtitle={`${sale.code} · ${VET_SHOP_PAY[sale.paymentMethod]}`}
      icon={VetIcons.Check} accent="amatista" width={440}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cerrar</button>
          <button type="button" className="vet-btn-primary-modal" onClick={onClose}>
            <VetIcons.Download size={14} strokeWidth={1.7} /> Imprimir recibo
          </button>
        </>
      }
    >
      <div className="vet-shop-receipt">
        {sale.customerId && (
          <div className="vet-shop-receipt-cust">Cliente: {vetShopCustomerName(sale.customerId)}</div>
        )}
        <div className="vet-shop-receipt-lines">
          {lines.map((l, i) => (
            <div key={i} className="vet-shop-receipt-line">
              <span>{l.qty}× {l.name}{l.kind === 'service' ? ' (servicio)' : ''}</span>
              <span>{vetMoney(l.total)}</span>
            </div>
          ))}
        </div>
        <div className="vet-shop-receipt-totals">
          <div><span>Subtotal (base)</span><span>{vetMoney(T.base)}</span></div>
          {sale.discount > 0 && <div><span>Descuento</span><span>−{vetMoney(sale.discount)}</span></div>}
          {sale.savings > 0 && <div className="vet-shop-receipt-savings"><span>Ahorro por promociones</span><span>−{vetMoney(sale.savings)}</span></div>}
          {T.byRate.filter((r) => r.amount > 0).map((r) => (
            <div key={r.id}><span>{r.name}</span><span>{vetMoney(r.amount)}</span></div>
          ))}
          <div className="vet-shop-receipt-grand"><span>Total</span><span>{vetMoney(T.total)}</span></div>
        </div>
      </div>
    </VetModalShell>
  );
}

Object.assign(window, {
  useVetShopState, VetShopProductCard, VetShopServiceCard, VetShopPayModal, VetShopReceiptModal,
});
