"use server";

import { revalidatePath } from "next/cache";

import { ApiError, apiGet, apiSend } from "@/lib/api/client";

/**
 * The payments a human has to deal with.
 *
 * Everything here exists because the payment flow deliberately fails closed:
 * when it cannot prove what happened, it leaves an attempt pending rather than
 * guessing. The sweep resolves what it can; this list is what it cannot.
 */

export async function getAttention() {
  return apiGet<"/admin/payments/attention">("/admin/payments/attention", {
    authenticated: true,
  });
}

export async function getRefunds(paymentId: string) {
  return apiGet<"/admin/payments/{id}/refunds">(
    `/admin/payments/${paymentId}/refunds`,
    { authenticated: true },
  );
}

export type RefundResult =
  | { status: "ok" }
  | { status: "refused"; message: string }
  | { status: "unauthenticated" };

export async function recordRefund(
  paymentId: string,
  input: { amountCents: number; reason: string; mpesaReference: string },
): Promise<RefundResult> {
  try {
    await apiSend(`/admin/payments/${paymentId}/refunds`, "POST", input);
    revalidatePath("/admin/payments");
    return { status: "ok" };
  }
  catch (error) {
    if (!(error instanceof ApiError))
      throw error;
    if (error.status === 401 || error.status === 403)
      return { status: "unauthenticated" };

    const body = error.body as {
      message?: string;
      error?: { issues?: { message: string }[] };
    } | null;

    // 409 is "you cannot return more than was taken", or a payment that never
    // succeeded. 422 is a missing reference — required because recording a
    // refund clears the payment from this list, and a record without proof the
    // money moved would erase a real debt.
    return {
      status: "refused",
      message: body?.error?.issues?.[0]?.message
        ?? body?.message
        ?? "That refund could not be recorded.",
    };
  }
}

export async function runReconcile() {
  try {
    const summary = await apiSend<{
      examined: number;
      paid: number;
      failed: number;
      alreadySettled: number;
      unresolved: number;
      releasedUndispatched: number;
      staysCompleted: number;
    }>("/admin/payments/reconcile", "POST");
    revalidatePath("/admin/payments");
    return { status: "ok" as const, summary };
  }
  catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403))
      return { status: "unauthenticated" as const };
    throw error;
  }
}
