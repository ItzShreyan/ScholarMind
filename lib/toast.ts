/**
 * Toast store.
 *
 * Deliberately React-free so any code path — an upload handler, a failed
 * save, a rejected AI call — can report a failure from anywhere, including
 * outside a component. `components/ui/Toast.tsx` subscribes to it and
 * `hooks/useToast.ts` is the React-facing wrapper.
 *
 * Rule: every error path in the app shows a toast. A silent failure is a bug.
 */

export type ToastVariant = "success" | "error" | "info";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  action?: ToastAction;
  /** Milliseconds before auto-dismiss. Errors stay longer; 0 means never. */
  durationMs: number;
};

export const TOAST_DURATION_MS: Record<ToastVariant, number> = {
  success: 4000,
  info: 5000,
  error: 8000
};

/** Hard cap so a loop of failures can never flood the screen. */
export const MAX_VISIBLE_TOASTS = 3;

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let sequence = 0;

function emit() {
  const snapshot = toasts;
  for (const listener of listeners) listener(snapshot);
}

function nextId(): string {
  sequence += 1;
  return `toast-${sequence}`;
}

export function getToasts(): ToastItem[] {
  return toasts;
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: string): void {
  const next = toasts.filter((item) => item.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

export function dismissAllToasts(): void {
  if (!toasts.length) return;
  toasts = [];
  emit();
}

export type PushToastInput = {
  variant: ToastVariant;
  title: string;
  description?: string;
  action?: ToastAction;
  durationMs?: number;
};

export function pushToast(input: PushToastInput): string {
  const id = nextId();
  const item: ToastItem = {
    id,
    variant: input.variant,
    title: input.title,
    description: input.description,
    action: input.action,
    durationMs: input.durationMs ?? TOAST_DURATION_MS[input.variant]
  };

  toasts = [...toasts, item].slice(-MAX_VISIBLE_TOASTS);
  emit();
  return id;
}

/**
 * The API used by the rest of the app.
 *
 *   toast.error("Upload failed", { description: "…", action: { label: "Retry", onClick } })
 */
export const toast = {
  success(title: string, options?: Omit<PushToastInput, "variant" | "title">) {
    return pushToast({ variant: "success", title, ...options });
  },
  error(title: string, options?: Omit<PushToastInput, "variant" | "title">) {
    return pushToast({ variant: "error", title, ...options });
  },
  info(title: string, options?: Omit<PushToastInput, "variant" | "title">) {
    return pushToast({ variant: "info", title, ...options });
  },
  dismiss: dismissToast,
  dismissAll: dismissAllToasts
};

/**
 * Turn an unknown thrown value into a toast-safe message. Never returns an
 * empty string, so the UI can never render an empty error.
 */
export function toastMessageFrom(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
