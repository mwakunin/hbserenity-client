"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { GetResponse } from "@/lib/api/client";

import { recordRefund, runReconcile } from "@/app/admin/payments/actions";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/format";

/**
 * Straight off the generated schema rather than restated here. A hand-written
 * copy drifts silently: the API adding a `reason` the UI has no wording for,
 * or renaming a field, would still typecheck against a local interface.
 */
type AttentionItem = GetResponse<"/admin/payments/attention">["data"][number];

/** Written for a host, not a developer — these are the four states in plain words. */
const REASON: Record<string, { title: string; body: string }> = {
  paid_but_cancelled: {
    title: "Paid, then cancelled",
    body: "The guest paid but the booking was called off. They are owed this money back.",
  },
  possible_duplicate_charge: {
    title: "Possible double charge",
    body: "A prompt went out after the booking was already settled, so the guest may have paid twice.",
  },
  dispatched_without_reference: {
    title: "Prompt sent, no reference",
    body: "A payment prompt was delivered but its reference was never recorded, so it cannot be traced automatically. Check M-Pesa directly.",
  },
  stuck_pending: {
    title: "Stuck pending",
    body: "This attempt has been unresolved far longer than any callback should take.",
  },
};

export function AttentionList({ items }: { items: AttentionItem[] }) {
  const router = useRouter();
  const [sweep, setSweep] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reconcile() {
    setBusy(true);
    setSweep(null);
    try {
      const result = await runReconcile();

      if (result.status === "unauthenticated") {
        router.push("/sign-in?next=%2Fadmin%2Fpayments");
        return;
      }

      const s = result.summary;
      setSweep(
        `Examined ${s.examined}: ${s.paid} paid, ${s.failed} failed, ${s.unresolved} still unresolved. `
        + `${s.staysCompleted} stay${s.staysCompleted === 1 ? "" : "s"} marked completed.`,
      );
      router.refresh();
    }
    catch {
      // The sweep talks to Safaricom, so it is the slowest thing on the page
      // and the likeliest to time out. Leaving the button dead afterwards
      // would suggest one is still running.
      setSweep("The sweep could not be completed. Please try again.");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="rounded-lg bg-surface-container p-4">
        <p className="text-sm font-medium text-on-surface">Run reconciliation</p>
        <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
          Asks Safaricom about every unresolved attempt and settles what it can.
          Safe to run twice — every write is a compare-and-swap. This should
          also be on a schedule; running it by hand is a check, not the plan.
        </p>
        <Button
          onClick={reconcile}
          disabled={busy}
          className="mt-3 w-full bg-primary text-on-primary hover:bg-primary/90"
        >
          {busy ? "Sweeping…" : "Run now"}
        </Button>
        {sweep && <p className="mt-2 text-xs text-on-surface">{sweep}</p>}
      </div>

      <h2 className="mt-6 font-headline text-lg text-on-surface">Needs a human</h2>

      {items.length === 0
        ? (
            <p className="mt-2 rounded-lg bg-surface-container-lowest p-5 text-center text-sm text-on-surface-variant ring-1 ring-outline-variant/50">
              Nothing outstanding. Payments the sweep cannot resolve appear here.
            </p>
          )
        : (
            <ul className="mt-3 space-y-3">
              {items.map(item => (
                <AttentionRow key={item.paymentId} item={item} />
              ))}
            </ul>
          )}
    </div>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const router = useRouter();
  const copy = REASON[item.reason] ?? { title: item.reason, body: "" };

  const [open, setOpen] = useState(false);
  const [shillings, setShillings] = useState(String(item.amountCents / 100));
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await recordRefund(item.paymentId, {
        amountCents: Math.round(Number(shillings)) * 100,
        reason: reason.trim(),
        mpesaReference: reference.trim(),
      });

      if (result.status === "ok") {
        setOpen(false);
        router.refresh();
        return;
      }
      if (result.status === "unauthenticated") {
        router.push("/sign-in?next=%2Fadmin%2Fpayments");
        return;
      }
      setError(result.message);
    }
    catch {
      // Recording a refund is what clears money off this list, so a failure
      // that left both buttons dead and said nothing is the worst place for
      // one: the host cannot tell whether it was written down.
      setError("Something went wrong. Please try again.");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg bg-surface-container-lowest p-4 ring-1 ring-outline-variant/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-on-surface">{copy.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{copy.body}</p>
          {item.detail && (
            <p className="mt-1 text-[11px] text-on-surface-variant">{item.detail}</p>
          )}
          <p className="mt-2 text-[11px] text-on-surface-variant">
            {formatDate(item.createdAt.slice(0, 10))}
            {" · booking "}
            {item.bookingId.slice(0, 8)}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-on-surface">
          {formatMoney(item.amountCents)}
        </span>
      </div>

      {!open
        ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 text-xs text-primary underline"
            >
              Record a refund
            </button>
          )
        : (
            <form onSubmit={submit} className="mt-3 space-y-2 rounded-md bg-surface-container p-3">
              {/*
                Recording is not sending. The money moves in M-Pesa by hand;
                this writes down that it did, and clears the payment from this
                list — which is why the reference is required.
              */}
              <p className="text-[11px] leading-relaxed text-on-surface-variant">
                This records a refund you have already sent. It does not move
                money, and it removes this item from the list.
              </p>

              <label className="block text-xs text-on-surface-variant">
                Amount (KES)
                <input
                  required
                  type="number"
                  min={0}
                  value={shillings}
                  onChange={e => setShillings(e.target.value)}
                  className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
                />
              </label>

              <label className="block text-xs text-on-surface-variant">
                M-Pesa reference
                <input
                  required
                  value={reference}
                  placeholder="SDJ4H2K1LM"
                  onChange={e => setReference(e.target.value)}
                  className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
                />
                <span className="mt-0.5 block text-[11px]">
                  Required — proof the money actually moved.
                </span>
              </label>

              <label className="block text-xs text-on-surface-variant">
                Reason
                <input
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
                />
              </label>

              {error && <p className="text-xs text-error">{error}</p>}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={busy}
                  className="flex-1 bg-primary text-on-primary hover:bg-primary/90"
                >
                  {busy ? "Recording…" : "Record refund"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
    </li>
  );
}
