import type { DuolingoConfig, DuolingoCourseSummary, DuolingoUserData } from "@/lib/duolingo/types";

export class JWTExpiredError extends Error {}
export class ParseError extends Error {}

const RETRIES = [300, 900, 2700] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCourses(courses: unknown): DuolingoCourseSummary[] {
  if (!Array.isArray(courses)) return [];

  const mapped: Array<DuolingoCourseSummary | null> = courses
    .map((course) => {
      if (!course || typeof course !== "object") return null;
      const c = course as Record<string, unknown>;
      const id = String(c.id ?? c.courseId ?? "").trim();
      const title = String(c.title ?? c.learningLanguageName ?? c.fromLanguage ?? "").trim();
      const fromLanguage = String(c.fromLanguage ?? c.fromLanguageName ?? "未知");
      const learningLanguage = String(c.learningLanguage ?? c.learningLanguageName ?? "未知");
      const xp = Number(c.xp ?? c.points ?? 0);
      const crowns = c.crowns !== undefined ? Number(c.crowns) : undefined;

      if (!id || !title || Number.isNaN(xp)) return null;
      return { id, title, fromLanguage, learningLanguage, xp, crowns: Number.isNaN(crowns ?? NaN) ? undefined : crowns };
    });

  return mapped.filter((item): item is DuolingoCourseSummary => item !== null);
}

function extractDailyXp(payload: Record<string, unknown>): number {
  const streakData = payload.streakData;
  if (streakData && typeof streakData === "object") {
    const data = streakData as Record<string, unknown>;
    const currentDay = Number(data.currentDayXP ?? data.currentDayXp ?? data.todayXp ?? 0);
    if (!Number.isNaN(currentDay)) return currentDay;
  }
  return 0;
}

function parseDuolingoPayload(payload: unknown): DuolingoUserData {
  if (!payload || typeof payload !== "object") {
    throw new ParseError("Duolingo 返回结构异常：非对象");
  }

  const data = payload as Record<string, unknown>;
  const streak = Number(data.streak ?? 0);
  const totalXp = Number(data.totalXp ?? 0);
  if (Number.isNaN(streak) || Number.isNaN(totalXp)) {
    throw new ParseError("Duolingo 返回结构异常：streak 或 totalXp 无效");
  }

  const courses = parseCourses(data.courses);
  const rawGains = Array.isArray(data.xpGains) ? data.xpGains : [];
  const xpGains = rawGains
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const time = Number(row.time ?? row.timestamp ?? 0);
      const xp = Number(row.xp ?? row.gain ?? 0);
      if (Number.isNaN(time) || Number.isNaN(xp) || time <= 0) return null;
      return {
        time,
        xp,
        skillId: row.skillId ? String(row.skillId) : undefined,
        courseId: row.courseId ? String(row.courseId) : undefined,
      };
    })
     .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    streak,
    totalXp,
    dailyXp: extractDailyXp(data),
    currentCourseId: data.currentCourseId ? String(data.currentCourseId) : undefined,
    courses,
    xpGains,
  };
}

export async function fetchDuolingoUser(config: DuolingoConfig): Promise<DuolingoUserData> {
  if (!config.jwt || !config.userId) {
    throw new ParseError("缺少 Duolingo JWT 或 User ID");
  }

  const url = `https://www.duolingo.com/2017-06-30/users/${config.userId}?fields=streak,totalXp,courses,xpGains,streakData,currentCourseId`;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= RETRIES.length; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${config.jwt}` },
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new JWTExpiredError("Duolingo JWT 已过期或无效");
      }

      if (!response.ok) {
        throw new Error(`Duolingo 请求失败：${response.status}`);
      }

      const payload = await response.json();
      return parseDuolingoPayload(payload);
    } catch (error) {
      if (error instanceof JWTExpiredError || error instanceof ParseError) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error("未知网络错误");
      if (attempt < RETRIES.length) {
        await sleep(RETRIES[attempt]);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Duolingo 网络请求失败");
}
