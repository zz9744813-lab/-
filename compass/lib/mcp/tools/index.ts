import { cancelScheduleItemTool } from "@/lib/mcp/tools/cancel-schedule-item";
import { createCaptureTool } from "@/lib/mcp/tools/create-capture";
import { createFinanceTransactionTool } from "@/lib/mcp/tools/create-finance-transaction";
import { createGoalTool } from "@/lib/mcp/tools/create-goal";
import { createJournalEntryTool } from "@/lib/mcp/tools/create-journal-entry";
import { createScheduleItemTool } from "@/lib/mcp/tools/create-schedule-item";
import { getCapturesTool } from "@/lib/mcp/tools/get-captures";
import { getFinanceSnapshotTool } from "@/lib/mcp/tools/get-finance-snapshot";
import { getGoalProgressTool } from "@/lib/mcp/tools/get-goal-progress";
import { listScheduleItemsTool } from "@/lib/mcp/tools/list-schedule-items";
import { queryJournalTool } from "@/lib/mcp/tools/query-journal";
import { saveInsightTool } from "@/lib/mcp/tools/save-insight";
import { saveReviewTool } from "@/lib/mcp/tools/save-review";
import { searchNotesTool } from "@/lib/mcp/tools/search-notes";
import type { McpTool } from "@/lib/mcp/tools/types";
import { updateGoalTool } from "@/lib/mcp/tools/update-goal";
import { updateGoalProgressTool } from "@/lib/mcp/tools/update-goal-progress";
import { updateJournalEntryTool } from "@/lib/mcp/tools/update-journal-entry";
import { updateScheduleItemTool } from "@/lib/mcp/tools/update-schedule-item";

export const compassTools: McpTool[] = [
  // Read tools
  getCapturesTool,
  getGoalProgressTool,
  queryJournalTool,
  getFinanceSnapshotTool,
  searchNotesTool,
  listScheduleItemsTool,

  // Write tools — Hermes calls these to persist chat/upload conclusions
  createCaptureTool,
  createGoalTool,
  updateGoalTool,
  updateGoalProgressTool,
  createJournalEntryTool,
  updateJournalEntryTool,
  createFinanceTransactionTool,
  createScheduleItemTool,
  updateScheduleItemTool,
  cancelScheduleItemTool,
  saveReviewTool,
  saveInsightTool,
];
