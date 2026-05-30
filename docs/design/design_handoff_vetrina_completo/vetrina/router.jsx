/* global React */
// Hash-based router — espejo de src/router/index.ts
//
// Cada ruta tiene: name, path (pattern con :params), component (string id), meta.
// path uses :param tokens which match a single segment.
// useRoute() and useRouter() hooks emulate vue-router.

const VET_ROUTES = [
  { name: 'login',                        path: '/',                                meta: { guestOnly: true } },
  { name: 'signup',                       path: '/signup',                          meta: { guestOnly: true } },
  { name: 'home',                         path: '/dashboard',                       meta: { requiresAuth: true } },
  { name: 'agenda',                       path: '/dashboard/agenda',                meta: { requiresAuth: true } },
  { name: 'laboratorio-interno',          path: '/dashboard/laboratorio',           meta: { requiresAuth: true } },
  { name: 'consulta-nueva',               path: '/dashboard/consulta/nueva',        meta: { requiresAuth: true, fullBleed: true, hideTopbar: true } },
  { name: 'consulta-nueva-exito',         path: '/dashboard/consulta/nueva/exito',  meta: { requiresAuth: true, fullBleed: true, hideTopbar: true } },
  { name: 'consulta-historial',           path: '/dashboard/consulta/historial',    meta: { requiresAuth: true, fullBleed: true, hideTopbar: true } },
  { name: 'consulta-historial-pet',       path: '/dashboard/consulta/historial/:ownerId/mascotas',         meta: { requiresAuth: true, fullBleed: true, hideTopbar: true } },
  { name: 'consulta-historial-detail',    path: '/dashboard/consulta/historial/:ownerId/mascotas/:petId',  meta: { requiresAuth: true, fullBleed: true, hideTopbar: true } },
  { name: 'consulta-vacunacion',          path: '/dashboard/consulta/vacunacion',   meta: { requiresAuth: true } },
  { name: 'consulta-hospital',            path: '/dashboard/consulta/hospital',     meta: { requiresAuth: true } },
  { name: 'acciones-laboratorio',         path: '/dashboard/acciones/laboratorio',  meta: { requiresAuth: true } },
  { name: 'acciones-imagen',              path: '/dashboard/acciones/imagen',       meta: { requiresAuth: true } },
  { name: 'acciones-vacunacion',          path: '/dashboard/acciones/vacunacion',   meta: { requiresAuth: true } },
  { name: 'acciones-hospitalizacion',     path: '/dashboard/acciones/hospitalizacion', meta: { requiresAuth: true } },
  { name: 'acciones-desparasitacion',     path: '/dashboard/acciones/desparasitacion', meta: { requiresAuth: true } },
  { name: 'acciones-cirugia',             path: '/dashboard/acciones/cirugia',      meta: { requiresAuth: true } },
  { name: 'acciones-spa',                 path: '/dashboard/acciones/spa',          meta: { requiresAuth: true } },
  { name: 'empleados',                    path: '/dashboard/empleados',             meta: { requiresAuth: true } },
  { name: 'roles',                        path: '/dashboard/roles',                 meta: { requiresAuth: true } },
];

function vetMatchRoute(path) {
  for (const r of VET_ROUTES) {
    const tokens = r.path.split('/').filter(Boolean);
    const segments = path.split('/').filter(Boolean);
    if (tokens.length !== segments.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].startsWith(':')) {
        params[tokens[i].slice(1)] = decodeURIComponent(segments[i]);
      } else if (tokens[i] !== segments[i]) {
        ok = false; break;
      }
    }
    if (ok) return { route: r, params };
  }
  return null;
}

function vetBuildPath(name, params = {}) {
  const r = VET_ROUTES.find((x) => x.name === name);
  if (!r) return '/dashboard';
  let path = r.path;
  for (const [k, v] of Object.entries(params)) {
    path = path.replace(':' + k, encodeURIComponent(v));
  }
  return path;
}

function vetParseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const query = {};
  if (qs) {
    qs.split('&').forEach((p) => {
      if (!p) return;
      const [k, v = ''] = p.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v);
    });
  }
  return { path, query };
}

const VetRouterCtx = React.createContext({ route: null, push: () => {}, back: () => {} });

function VetRouterProvider({ children }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const onHash = () => setTick((t) => t + 1);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const { path, query } = vetParseHash();
  const matched = vetMatchRoute(path) ?? vetMatchRoute('/');
  const route = matched
    ? { ...matched.route, params: matched.params, query, path }
    : { name: 'signup', params: {}, query: {}, path: '/', meta: {} };

  const push = React.useCallback((target) => {
    let path;
    if (typeof target === 'string') {
      path = target;
    } else if (target.name) {
      path = vetBuildPath(target.name, target.params);
      if (target.query) {
        const qs = Object.entries(target.query)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
        if (qs) path += '?' + qs;
      }
    } else {
      path = '/';
    }
    window.location.hash = path;
  }, []);

  const back = React.useCallback(() => window.history.back(), []);

  return (
    <VetRouterCtx.Provider value={{ route, push, back }}>
      {children}
    </VetRouterCtx.Provider>
  );
}

function useVetRoute()  { return React.useContext(VetRouterCtx).route; }
function useVetRouter() { return React.useContext(VetRouterCtx); }

function VetRouterLink({ to, className, activeClass, children, ...rest }) {
  const { push, route } = useVetRouter();
  const targetPath = typeof to === 'string' ? to : vetBuildPath(to.name, to.params);
  const isActive = route.path === targetPath;
  const cls = [className, isActive && activeClass].filter(Boolean).join(' ');
  return (
    <a
      href={'#' + targetPath}
      className={cls}
      onClick={(e) => { e.preventDefault(); push(to); }}
      {...rest}
    >
      {children}
    </a>
  );
}

Object.assign(window, {
  VET_ROUTES,
  vetBuildPath,
  vetMatchRoute,
  VetRouterProvider,
  useVetRoute,
  useVetRouter,
  VetRouterLink,
});
