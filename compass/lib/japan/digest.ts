import { db } from "@/lib/db/client";
import { japanIntelItems, japanIntelDigests } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function generateWeeklyDigest(periodStart: string, periodEnd: string): Promise<{
  title: string;
  bodyMarkdown: string;
  itemIds: string[];
}> {
  const items = await db
    .select()
    .from(japanIntelItems)
    .where(
      and(
        eq(japanIntelItems.isArchived, false),
        gte(japanIntelItems.createdAt, new Date(periodStart)),
        lte(japanIntelItems.createdAt, new Date(periodEnd)),
      ),
    )
    .orderBy(desc(japanIntelItems.impactLevel), desc(japanIntelItems.createdAt));

  if (items.length === 0) {
    return {
      title: `[Compass 日本情报] 本周赴日摘要：${periodStart} - ${periodEnd}`,
      bodyMarkdown: "本周没有新的日本情报更新。",
      itemIds: [],
    };
  }

  const majorItems = items.filter((i) => i.isMajorUpdate);
  const policyItems = items.filter((i) => i.category.includes("visa") || i.category.includes("policy"));
  const studyItems = items.filter((i) => i.category.includes("exam") || i.category.includes("study"));
  const jobItems = items.filter((i) => i.category.includes("jobs") || i.category.includes("company-jobs"));

  let md = `# 本周日本情报摘要\n\n`;
  md += `**期间**: ${periodStart} - ${periodEnd}\n\n`;

  // Key conclusions
  md += `## 重点结论\n\n`;
  if (majorItems.length > 0) {
    md += `- 本周有 **${majorItems.length} 条重大更新**\n`;
    for (const item of majorItems.slice(0, 3)) {
      md += `- ${item.title}\n`;
    }
  } else {
    md += `- 本周无重大更新\n`;
  }
  md += `\n`;

  // Major updates section
  if (majorItems.length > 0) {
    md += `## 重大更新\n\n`;
    for (const item of majorItems) {
      md += `### ${item.title}\n`;
      md += `- **影响级别**: ${item.impactLevel}\n`;
      if (item.summaryZh) md += `- **摘要**: ${item.summaryZh}\n`;
      md += `- **原文**: ${item.url}\n\n`;
    }
  }

  // Policy section
  if (policyItems.length > 0) {
    md += `## 政策 / 签证\n\n`;
    for (const item of policyItems) {
      md += `- **${item.title}**${item.summaryZh ? ` — ${item.summaryZh}` : ""}\n  ${item.url}\n`;
    }
    md += `\n`;
  }

  // Study section
  if (studyItems.length > 0) {
    md += `## 留学 / 考试\n\n`;
    for (const item of studyItems) {
      md += `- **${item.title}**${item.summaryZh ? ` — ${item.summaryZh}` : ""}\n  ${item.url}\n`;
    }
    md += `\n`;
  }

  // Jobs section
  if (jobItems.length > 0) {
    md += `## 招聘\n\n`;
    for (const item of jobItems) {
      md += `- **${item.title}**${item.summaryZh ? ` — ${item.summaryZh}` : ""}\n  ${item.url}\n`;
    }
    md += `\n`;
  }

  md += `## 下周建议\n\n`;
  md += `- 关注重大更新的后续进展\n`;
  md += `- 检查是否有新的截止日期\n`;

  const title = `[Compass 日本情报] 本周赴日政策/招聘摘要：${periodStart} - ${periodEnd}`;

  return {
    title,
    bodyMarkdown: md,
    itemIds: items.map((i) => i.id),
  };
}

export function generateMajorAlertMarkdown(item: { title: string; url: string; summaryZh: string | null; impactLevel: string }): string {
  let md = `# 重大更新\n\n`;
  md += `## 发生了什么\n\n${item.title}\n\n`;
  md += `## 为什么重要\n\n影响级别: ${item.impactLevel}\n\n`;
  if (item.summaryZh) {
    md += `## 摘要\n\n${item.summaryZh}\n\n`;
  }
  md += `## 建议你现在做什么\n\n`;
  md += `- 查看原文了解详情\n`;
  md += `- 评估对你当前目标的影响\n`;
  md += `- 必要时调整计划\n\n`;
  md += `## 原始来源\n\n${item.url}\n`;
  return md;
}
