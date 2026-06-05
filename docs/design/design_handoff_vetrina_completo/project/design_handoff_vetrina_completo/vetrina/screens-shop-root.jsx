/* global React, VetIcons, useVetShopState, VetShopPOSView, VetShopInventoryView, VetShopServicesView, VetShopPromosView, VetShopTaxesView */

// Wrapper que comparte el store entre todas las secciones de Tienda
function VetShopView({ tab }) {
  const shop = useVetShopState();
  if (tab === 'inventario') return <VetShopInventoryView shop={shop} />;
  if (tab === 'servicios')  return <VetShopServicesView shop={shop} />;
  if (tab === 'promociones') return <VetShopPromosView shop={shop} />;
  if (tab === 'impuestos') return <VetShopTaxesView shop={shop} />;
  return <VetShopPOSView shop={shop} />;
}

Object.assign(window, { VetShopView });
