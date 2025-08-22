// Simple imperative toast utility that survives component unmounts
export type ShowToastType = 'success' | 'error' | 'info';

export function showToast(message: string, type: ShowToastType = 'info', durationMs: number = 2000) {
  if (typeof window === 'undefined' || !message) return;
  const containerId = 'global-toast-container';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'fixed';
    container.style.top = '16px';
    container.style.right = '16px';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    document.body.appendChild(container);
  }

  const bg = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#111827';
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.background = bg;
  toast.style.color = '#fff';
  toast.style.padding = '8px 12px';
  toast.style.borderRadius = '6px';
  toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
  toast.style.fontSize = '14px';

  container.appendChild(toast);
  const id = window.setTimeout(() => {
    try { container?.removeChild(toast); } catch {}
    if (container && container.childElementCount === 0) {
      try { document.body.removeChild(container); } catch {}
    }
  }, Math.max(1000, durationMs));

  return () => {
    window.clearTimeout(id);
    try { container?.removeChild(toast); } catch {}
  };
}


