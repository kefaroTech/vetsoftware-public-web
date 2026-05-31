/* global React, VetIcons, VetModalShell,
   VetBaseField, VetBaseInput, VetBaseSelect,
   VET_SHOP_CATEGORIES, VET_SHOP_CAT_TONE, VET_SHOP_PAY, VET_SHOP_TAX_RATE,
   vetShopStockState, VET_SHOP_PRODUCTS_INITIAL, VET_SHOP_SALES_INITIAL, VET_SHOP_SERVICES,
   VET_PROMOS_INITIAL,
   vetMoney, vetShopCustomerName, VET_MOCK_OWNERS,
   useVetToast, VetPatientCascadePicker */

// ============================================================================
// Shop store (compartido entre POS, Inventario, Servicios y Promociones)
// ============================================================================

function useVetShopState() {
  const toast = useVetToast();
  const [products, setProducts] = React.useState(VET_SHOP_PRODUCTS_INITIAL);
  const [services, setServices] = React.useState(VET_SHOP_SERVICES);
  const [promos, setPromos] = React.useState(VET_PROMOS_INITIAL);
  const [sales, setSales] = React.useState(VET_SHOP_SALES_INITIAL);

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

  return { products, services, promos, sales, upsertProduct, restock, upsertService, removeService, upsertPromo, removePromo, togglePromo, registerSale };
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

function VetShopPayModal({ open, total, onClose, onConfirm }) {
  const [method, setMethod] = React.useState('EFECTIVO');
  const [received, setReceived] = React.useState('');
  React.useEffect(() => { if (open) { setMethod('EFECTIVO'); setReceived(''); } }, [open]);

  const recv = Number(received) || 0;
  const change = method === 'EFECTIVO' ? Math.max(0, recv - total) : 0;
  const canConfirm = method !== 'EFECTIVO' || recv >= total;

  return (
    <VetModalShell
      open={open} onClose={onClose}
      title="Cobrar venta"
      subtitle={`Total a pagar: ${vetMoney(total)}`}
      icon={VetIcons.Receipt} accent="amatista" width={460}
      footerActions={
        <>
          <button type="button" className="vet-btn-ghost-modal" onClick={onClose}>Cancelar</button>
          <button type="button" className="vet-btn-primary-modal"
            disabled={!canConfirm}
            style={!canConfirm ? { opacity: 0.5, cursor: 'not-allowed' } : null}
            onClick={() => onConfirm({ method, received: recv })}>
            Confirmar pago
          </button>
        </>
      }
    >
      <div className="vet-action-modal-body">
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
    </VetModalShell>
  );
}

// ============================================================================
// Receipt modal
// ============================================================================

function VetShopReceiptModal({ open, sale, products, onClose }) {
  if (!open || !sale) return null;
  const lines = sale.items.map((it) => {
    const name = it.name ?? (products.find((x) => x.id === (it.id ?? it.productId)) || {}).name ?? '—';
    return { name, kind: it.kind, qty: it.qty, unitPrice: it.unitPrice, total: it.qty * it.unitPrice };
  });
  const subtotal = lines.reduce((a, l) => a + l.total, 0);
  const tax = Math.round((subtotal - sale.discount) * VET_SHOP_TAX_RATE);
  const total = subtotal - sale.discount + tax;

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
          <div><span>Subtotal</span><span>{vetMoney(subtotal)}</span></div>
          {sale.discount > 0 && <div><span>Descuento</span><span>−{vetMoney(sale.discount)}</span></div>}
          {sale.savings > 0 && <div className="vet-shop-receipt-savings"><span>Ahorro por promociones</span><span>−{vetMoney(sale.savings)}</span></div>}
          <div><span>IVA (19%)</span><span>{vetMoney(tax)}</span></div>
          <div className="vet-shop-receipt-grand"><span>Total</span><span>{vetMoney(total)}</span></div>
        </div>
      </div>
    </VetModalShell>
  );
}

Object.assign(window, {
  useVetShopState, VetShopProductCard, VetShopServiceCard, VetShopPayModal, VetShopReceiptModal,
});
