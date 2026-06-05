/* global React, VetIcons */

// ============================================================================
// Toast system — global notifications
// ============================================================================

const VetToastCtx = React.createContext({ push: () => {} });

function VetToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);
  const idRef = React.useRef(0);

  const push = React.useCallback((toast) => {
    const id = ++idRef.current;
    const t = {
      id,
      kind: toast.kind || 'success',
      title: toast.title,
      message: toast.message,
      duration: toast.duration ?? 3000,
    };
    setToasts((arr) => [...arr, t]);
    if (t.duration > 0) {
      setTimeout(() => {
        setToasts((arr) => arr.filter((x) => x.id !== id));
      }, t.duration);
    }
    return id;
  }, []);

  const dismiss = React.useCallback((id) => {
    setToasts((arr) => arr.filter((x) => x.id !== id));
  }, []);

  return (
    <VetToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <VetToastStack toasts={toasts} onDismiss={dismiss} />
    </VetToastCtx.Provider>
  );
}

function useVetToast() {
  const { push } = React.useContext(VetToastCtx);
  return React.useMemo(() => ({
    success: (title, message, opts) => push({ kind: 'success', title, message, ...opts }),
    info:    (title, message, opts) => push({ kind: 'info',    title, message, ...opts }),
    warn:    (title, message, opts) => push({ kind: 'warn',    title, message, ...opts }),
    error:   (title, message, opts) => push({ kind: 'error',   title, message, ...opts }),
    push,
  }), [push]);
}

function VetToastStack({ toasts, onDismiss }) {
  return (
    <div className="vet-toast-stack" aria-live="polite" role="status">
      {toasts.map((t) => <VetToast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />)}
    </div>
  );
}

function VetToast({ toast, onDismiss }) {
  const Icon = {
    success: VetIcons.Check,
    info:    VetIcons.FileText,
    warn:    VetIcons.Bell,
    error:   VetIcons.X,
  }[toast.kind] ?? VetIcons.Check;

  return (
    <div className={`vet-toast vet-toast-${toast.kind}`} role="alert">
      <div className="vet-toast-icon">
        <Icon size={15} strokeWidth={2} />
      </div>
      <div className="vet-toast-body">
        <div className="vet-toast-title">{toast.title}</div>
        {toast.message && <div className="vet-toast-message">{toast.message}</div>}
      </div>
      <button type="button" className="vet-toast-close" aria-label="Cerrar" onClick={onDismiss}>
        <VetIcons.X size={13} strokeWidth={1.8} />
      </button>
    </div>
  );
}

Object.assign(window, { VetToastProvider, useVetToast });
