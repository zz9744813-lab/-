import { createCaptureTool } from "@/lib/mcp/tools/create-capture";
import { getCapturesTool } from "@/lib/mcp/tools/get-captures";
import { getFinanceSnapshotTool } from "@/lib/mcp/tools/get-finance-snapshot";
import { getGoalProgressTool } from "@/lib/mcp/tools/get-goal-progress";
import { getHabitStreakTool } from "@/lib/mcp/tools/get-habit-streak";
import { queryJournalTool } from "@/lib/mcp/tools/query-journal";
import { saveInsightTool } from "@/lib/mcp/tools/save-insight";
import { saveReviewTool } from "@/lib/mcp/tools/save-review";
import { searchNotesTool } from "@/lib/mcp/tools/search-notes";
import type { McpTool } from "@/lib/mcp/tools/types";
import { updateGoalProgressTool } from "@/lib/mcp/tools/update-goal-progress";

export const compassTools: McpTool[] = [
  getCapturesTool,
  createCaptureTool,
  getGoalProgressTool,
  updateGoalProgressTool,
  getHabitStreakTool,
  queryJournalTool,
  getFinanceSnapshotTool,
  searchNotesTool,
  saveReviewTool,
  saveInsightTool,
];
