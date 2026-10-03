import { useState, type FormEvent, type ReactNode } from "react";
import type { PromotionReceipt } from "@workspace/api-client-react";

export type BizState = { receipt: PromotionReceipt | null; error: string; pending: boolean };
export function useBizSubmit<T>(fn: (body: T) => Promise<PromotionReceipt>) {
  const [s, setS] = useState<BizState>({ receipt: null, error: "", pending: false });
  async function submit(body: T) {
    setS({ receipt: null, error: "", pending: true });
    try { setS({ receipt: await fn(body), error: "", pending: false }); return true; }
    catch (e) { setS({ receipt: null, error: e instanceof Error ? e.message : "Something went wrong. Please try again.", pending: false }); return false; }
  }
  return { ...s, submit };
}
export function BizShell({ state, onSubmit, children, submitLabel, testid }: { state: BizState; onSubmit: (e: FormEvent<HTMLFormElement>) => void; children: ReactNode; submitLabel: string; testid: string }) {
  if (state.receipt) return <div className="pw-state" role="status" data-testid={`receipt-${testid}`}><h3>Received</h3><p>{state.receipt.message}</p><p className="small-print">Reference {state.receipt.id}. Your details were saved for review. No email was sent, no listing was changed and no placement was booked.</p></div>;
  return (
    <form className="pw-form" onSubmit={onSubmit} data-testid={`form-${testid}`}>
      {children}
      <div className="pw-hp" aria-hidden="true"><label>Fax<input name="fax" tabIndex={-1} autoComplete="off" /></label></div>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <button className="pw-btn" type="submit" disabled={state.pending}>{state.pending ? "Sending…" : submitLabel}</button>
    </form>
  );
}
