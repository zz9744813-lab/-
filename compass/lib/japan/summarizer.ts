const CATEGORY_IMPACT: Record<string, string> = {
  visa: "签证/在留资格",
  "visa-policy": "签证政策",
  "visa-cn": "中国赴日签证",
  consular: "领事服务",
  "work-labor": "劳动/就业政策",
  industry: "产业/IT政策",
  "digital-policy": "数字化政策",
  policy: "宏观政策",
  study: "留学/奖学金",
  "education-policy": "教育政策",
  exam: "考试(JLPT/EJU)",
  jobs: "公共招聘",
  "business-jobs": "商务/投资相关就业",
  "tech-jobs": "技术岗位",
  "company-jobs": "企业官方招聘",
};

export function summarizeJapanIntelItem(input: {
  title: string;
  rawText: string;
  category: string;
  impactLevel: string;
  isMajorUpdate: boolean;
  url: string;
}): string {
  const { title, rawText, category, impactLevel, isMajorUpdate, url } = input;

  // Extract first 300-500 chars of content as base summary
  const cleanText = rawText.replace(/\s+/g, " ").trim();
  const excerpt = cleanText.length > 500 ? cleanText.slice(0, 500) + "…" : cleanText;

  const parts: string[] = [];

  // Title context
  parts.push(excerpt || title);

  // Category impact
  const catLabel = CATEGORY_IMPACT[category];
  if (catLabel) {
    parts.push(`涉及领域：${catLabel}`);
  }

  // Impact level note
  if (impactLevel === "critical" || impactLevel === "high") {
    parts.push("影响级别较高，建议关注。");
  }

  // Major update warning
  if (isMajorUpdate) {
    parts.push("建议尽快查看原文确认是否影响签证/考试/就业计划。");
  }

  // Always include source URL
  parts.push(`原文：${url}`);

  return parts.join("\n");
}
