export function isBrokenQuestionText(value: string | null | undefined) {
  if (!value) return false;
  const compact = value.replace(/\s/g, "");
  return compact.length > 0 && /^(\?|？)+$/.test(compact);
}

export function formatReviewTitle(title: string | null | undefined, source: string | null | undefined) {
  const value = title?.trim() ?? "";
  if (!value || isBrokenQuestionText(value) || value.includes("?".repeat(4))) {
    return source === "hermes" ? "Hermes 自动复盘" : "手动复盘";
  }
  return value;
}

export function formatReviewBody(body: string | null | undefined) {
  const value = body?.trim() ?? "";
  if (!value) return "暂无内容";
  if (!value.startsWith("?")) return value;

  const stripped = value.replace(/^(\?|？)+/, "").trim();
  if (stripped.startsWith("调用 Hermes Bridge 失败")) {
    return `生成失败：${stripped}`;
  }
  return stripped || "历史记录内容无法识别";
}
