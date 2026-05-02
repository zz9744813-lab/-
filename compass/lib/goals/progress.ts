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

function extractKeywords(text: string): string[] {
  const keywords: string[] = [];

  // Extract alphanumeric terms (N2, JLPT, etc.)
  const alphanum = text.match(/[A-Za-z]\w+/g);
  if (alphanum) keywords.push(...alphanum.map((w) => w.toLowerCase()));

  // Extract Chinese segments (2+ chars)
  const chinese = text.match(/[一-鿿]{2,}/g);
  if (chinese) keywords.push(...chinese);

  // Extract numbers with units (5万, 50000)
  const numbers = text.match(/\d+(?:\.\d+)?(?:万|千)?/g);
  if (numbers) keywords.push(...numbers);

  return [...new Set(keywords)];
}

// Synonym groups for matching
const STUDY_SYNONYMS = ["日语", "日文", "japanese", "jlpt", "n1", "n2", "n3", "n4", "n5", "eju", "备考", "复习", "学习"];
const FINANCE_SYNONYMS = ["启动金", "日币", "日元", "存钱", "储蓄", "攒钱", "存款", "基金", "yen"];

function hasSynonymOverlap(goalKeywords: string[], itemText: string): boolean {
  const lower = itemText.toLowerCase();

  // Check if goal has study-related keywords and item also has them
  const goalStudy = goalKeywords.some((k) => STUDY_SYNONYMS.includes(k));
  const itemStudy = STUDY_SYNONYMS.some((s) => lower.includes(s));
  if (goalStudy && itemStudy) return true;

  // Check if goal has finance-related keywords and item also has them
  const goalFinance = goalKeywords.some((k) => FINANCE_SYNONYMS.includes(k));
  const itemFinance = FINANCE_SYNONYMS.some((s) => lower.includes(s));
  if (goalFinance && itemFinance) return true;

  return false;
}

function isRelatedToGoal(
  item: { title: string; description: string | null; evidence: string | null },
  goalTitle: string,
  goalDescription: string | null,
): boolean {
  const goalKeywords = extractKeywords(goalTitle);
  const itemText = `${item.title} ${item.description ?? ""} ${item.evidence ?? ""}`.toLowerCase();

  // Direct keyword match
  if (goalKeywords.some((w) => itemText.includes(w.toLowerCase()))) return true;

  // Synonym-based match
  if (hasSynonymOverlap(goalKeywords, itemText)) return true;

  return false;
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
        // Use cash for savings/启动金 goals, netWorth for net worth goals
        const isSavingsGoal = FINANCE_KEYWORDS.some((kw) => goalText.includes(kw) && ["存钱", "储蓄", "攒钱", "启动金", "日币"].some((s) => goalText.includes(s)));
        const currentAmount = isSavingsGoal ? latest.cash : latest.netWorth;
        const progress = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
        const口径 = isSavingsGoal ? "现金/储蓄" : "净资产";
        return {
          computedProgress: progress,
          evidenceCount: 1,
          doneScheduleCount: 0,
          totalScheduleCount: 0,
          sourceLabel: `基于财务快照 ${latest.date}（${口径}），当前 ${Math.round(currentAmount)} / 目标 ${targetAmount}`,
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
