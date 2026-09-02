import { redirect } from "next/navigation";

import { getAttention } from "@/app/admin/payments/actions";
import { AttentionList } from "@/components/admin/attention-list";
import { ApiError } from "@/lib/api/client";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Payments" };

/**
 * Money that needs a decision.
 *
 * The payment flow leaves an attempt pending whenever it cannot prove what
 * happened — that is deliberate, and reconciliation is what makes it safe.
 * Whatever the sweep cannot resolve ends up here.
 */
export default async function PaymentsPage() {
  await requireAdmin("/admin/payments");

  let attention;
  try {
    attention = await getAttention();
  }
  catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403))
      redirect("/sign-in?next=%2Fadmin%2Fpayments");
    throw error;
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-headline text-2xl text-on-surface">Payments</h1>
      <p className="mt-1 text-xs text-on-surface-variant">
        {attention.data.length === 0
          ? "Nothing needs attention."
          : `${attention.data.length} item${attention.data.length === 1 ? "" : "s"} need a decision.`}
      </p>

      <div className="mt-5">
        <AttentionList items={attention.data} />
      </div>
    </div>
  );
}
