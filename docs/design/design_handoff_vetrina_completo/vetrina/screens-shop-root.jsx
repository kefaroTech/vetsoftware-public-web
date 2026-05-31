/* global React, VetIcons, useVetShopState, VetShopPOSView, VetShopInventoryView, VetShopServicesView, VetShopPromosView */

// Wrapper que comparte el store entre POS, Inventario, Servicios y Promociones
function VetShopView({ tab }) {
  const shop = useVetShopState();
  if (tab === 'inventario') return <VetShopInventoryView shop={shop} />;
  if (tab === 'servicios')  return <VetShopServicesView shop={shop} />;
  if (tab === 'promociones') return <VetShopPromosView shop={shop} />;
  return <VetShopPOSView shop={shop} />;
}

Object.assign(window, { VetShopView });
