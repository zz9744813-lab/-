import { db } from "@/lib/db/client";
import { financeTransactions } from "@/lib/db/schema";
import { localDateString } from "@/lib/datetime";
import type { McpTool } from "@/lib/mcp/tools/types";

const TYPES = new Set(["income", "expense"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const createFinanceTransactionTool: McpTool = {
  name: "compass.create_finance_transaction",
  description:
    "Persist an income or expense transaction. Hermes parses receipts, screenshots, or descriptions; Compass stores the row.",
  async execute(params) {
    const type = String(params.type ?? "expense").trim();
    if (!TYPES.has(type)) throw new Error("type must be income or expense");

    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be a positive number");

    const dateRaw = params.date ? String(params.date).trim() : "";
    const date = dateRaw && DATE_RE.test(dateRaw) ? dateRaw : localDateString();

    const category = (() => {
      const raw = params.category;
      if (!raw) return null;
      const text = String(raw).trim();
      return text || null;
    })();

    const note = (() => {
      const raw = params.note;
      if (!raw) return null;
      const text = String(raw).trim();
      return text || null;
    })();

    const inserted = await db
      .insert(financeTransactions)
      .values({ type, amount, category, note, date })
      .returning({ id: financeTransactions.id });

    return { ok: true, id: inserted[0]?.id };
  },
};
