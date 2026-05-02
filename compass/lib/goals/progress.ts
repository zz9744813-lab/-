export type GoalEvidence = {
  scheduleItems: Array<{
    id: string;
    title: string;
    description: string | null;
    evidence: string | null;
    status: string;
    completedAt: Date | null;
  }>;
  financeSnapshots: Array<{
    date: string;
    netWorth: number;
    cash: number;
  }>;
};

export type ProgressResult = {
  computedProgress: number;
  evidenceCount: number;
  doneScheduleCount: number;
  totalScheduleCount: number;
  sourceLabel: string;
  warnings: string[];
};

const FINANCE_KEYWORDS = ["财务", "存钱", "储蓄", "启动金", "日币", "金额", "攒钱", "存款", "基金"];
const STUDY_KEYWORDS = ["学习", "N2", "N1", "N3", "JLPT", "日语", "考试", "课程", "备考", "复习"];

function extractAmount(text: string): number | null {
  // Match patterns like 5万日币, 50000日元, ¥50000, 5万
  const patterns = [
    /(\d+(?:\.\d+)?)\s*万(?:日[币元]|元)/,
    /¥\s*(\d+(?:,\d{3})*)/,
    /(\d+(?:,\d{3})*)\s*(?:日[币元]|元)/,
    /(\d+(?:\.\d+)?)\s*万/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const raw = m[1].replace(/,/g, "");
      const num = parseFloat(raw);
      // If matched "万" pattern, multiply by 10000
      if (m[0].includes("万")) return num * 10000;
      return num;
    }
  }
  return null;
}

function matchesGoalKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function isRelatedToGoal(
  item: { title: string; description: string | null; evidence: string | null },
  goalTitle: string,
  goalDescription: string | null,
): boolean {
  // Extract key words from goal title (2+ char segments)
  const goalWords = goalTitle
    .split(/[\s,，、/／·\-]+/)
    .filter((w) => w.length >= 2)
    .map((w) => w.toLowerCase());

  const itemText = `${item.title} ${item.description ?? ""} ${item.evidence ?? ""}`.toLowerCase();

  // Check if any goal keyword appears in item
  return goalWords.some((w) => itemText.includes(w));
}

export function computeGoalProgress(
  goal: { title: string; description: string | null; dimension: string; progress: number | null },
  evidence: GoalEvidence,
): ProgressResult {
  const warnings: string[] = [];
  const goalText = `${goal.title} ${goal.description ?? ""} ${goal.dimension}`;
  const legacyProgress = goal.progress ?? 0;

  // Finance goals
  if (matchesGoalKeywords(goalText, FINANCE_KEYWORDS)) {
    const targetAmount = extractAmount(goalText);
    if (targetAmount && targetAmount > 0) {
      // Use latest finance snapshot
      const sorted = [...evidence.financeSnapshots].sort((a, b) => b.date.localeCompare(a.date));
      if (sorted.length > 0) {
        const latest = sorted[0];
        const currentAmount = latest.cash + latest.netWorth;
        const progress = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
        return {
          computedProgress: progress,
          evidenceCount: 1,
          doneScheduleCount: 0,
          totalScheduleCount: 0,
          sourceLabel: `基于财务快照 ${latest.date}，当前 ${Math.round(currentAmount)} / 目标 ${targetAmount}`,
          warnings,
        };
      }
      warnings.push("缺少财务证据，请添加财务快照或让 Hermes 同步财务数据");
      return {
        computedProgress: 0,
        evidenceCount: 0,
        doneScheduleCount: 0,
        totalScheduleCount: 0,
        sourceLabel: "目标金额已识别，但缺少财务数据",
        warnings,
      };
    }
    warnings.push("无法从目标中解析目标金额，请在标题中注明具体金额");
  }

  // Study/learning goals - match related schedule items
  const relatedItems = evidence.scheduleItems.filter((item) =>
    isRelatedToGoal(item, goal.title, goal.description),
  );

  if (relatedItems.length > 0) {
    const done = relatedItems.filter((i) => i.status === "done").length;
    const total = relatedItems.length;
    const progress = Math.round((done / total) * 100);
    return {
      computedProgress: progress,
      evidenceCount: total,
      doneScheduleCount: done,
      totalScheduleCount: total,
      sourceLabel: `基于已完成日程 ${done}/${total}`,
      warnings,
    };
  }

  // No evidence found - fall back to legacy progress
  if (legacyProgress > 0) {
    warnings.push("当前进度来自旧手动字段，建议通过日程/财务/复盘建立证据");
    return {
      computedProgress: legacyProgress,
      evidenceCount: 0,
      doneScheduleCount: 0,
      totalScheduleCount: 0,
      sourceLabel: "旧手动进度",
      warnings,
    };
  }

  warnings.push("尚未关联执行证据，请创建关联日程或让 Hermes 拆解目标");
  return {
    computedProgress: 0,
    evidenceCount: 0,
    doneScheduleCount: 0,
    totalScheduleCount: 0,
    sourceLabel: "缺少执行证据",
    warnings,
  };
}
