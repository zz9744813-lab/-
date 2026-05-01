import { MAJOR_UPDATE_KEYWORDS_JA, MAJOR_UPDATE_KEYWORDS_ZH } from "./sources";

export type ClassificationResult = {
  impactLevel: "low" | "medium" | "high" | "critical";
  isMajorUpdate: boolean;
  matchedKeywords: string[];
};

export function classifyIntelItem(
  text: string,
  sourceAuthorityLevel: string,
  sourceCategory: string,
): ClassificationResult {
  const normalizedText = text.toLowerCase();
  const matchedKeywords: string[] = [];

  const allKeywords = [...MAJOR_UPDATE_KEYWORDS_JA, ...MAJOR_UPDATE_KEYWORDS_ZH];
  for (const kw of allKeywords) {
    if (normalizedText.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
    }
  }

  let impactLevel: ClassificationResult["impactLevel"] = "low";
  let isMajorUpdate = false;

  // Official source + policy change keywords → high
  if (sourceAuthorityLevel === "official") {
    const policyKeywords = ["制度改正", "施行", "変更", "新設", "廃止", "制度修改", "变更", "新增", "废止"];
    if (policyKeywords.some((kw) => normalizedText.includes(kw))) {
      impactLevel = "high";
      isMajorUpdate = true;
    }
  }

  // Visa-related + status change keywords → high
  if (sourceCategory.includes("visa") || sourceCategory.includes("visa-cn")) {
    const visaKeywords = ["受付開始", "停止", "変更", "在留資格", "开始受理", "暂停", "在留资格"];
    if (visaKeywords.some((kw) => normalizedText.includes(kw))) {
      impactLevel = "high";
      isMajorUpdate = true;
    }
  }

  // Exam-related keywords → medium
  if (sourceCategory.includes("exam")) {
    const examKeywords = ["申込", "締切", "試験日", "結果", "报名", "截止", "考试日"];
    if (examKeywords.some((kw) => normalizedText.includes(kw))) {
      if (impactLevel === "low") impactLevel = "medium";
    }
  }

  // Job-related keywords → medium
  if (sourceCategory.includes("jobs") || sourceCategory.includes("company-jobs")) {
    const jobKeywords = ["採用", "募集中", "締切", "新卒", "中途", "招聘", "截止"];
    if (jobKeywords.some((kw) => normalizedText.includes(kw))) {
      if (impactLevel === "low") impactLevel = "medium";
    }
  }

  // If many keywords matched, bump to medium at least
  if (matchedKeywords.length >= 3 && impactLevel === "low") {
    impactLevel = "medium";
  }

  // Critical: scholarship deadlines, visa status changes with deadlines
  const criticalKeywords = ["締切", "受付終了", "停止", "截止", "停止受理"];
  if (criticalKeywords.some((kw) => normalizedText.includes(kw)) && isMajorUpdate) {
    impactLevel = "critical";
  }

  return { impactLevel, isMajorUpdate, matchedKeywords };
}

export function computeContentHash(sourceId: string, title: string, url: string, publishedAt: string | null): string {
  const input = `${sourceId}|${title}|${url}|${publishedAt ?? ""}`;
  // Simple hash for browser/server compat
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}
