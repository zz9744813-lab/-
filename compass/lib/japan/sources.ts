// Japan Intel authoritative source whitelist
// Only official government, institution, exam, and company career pages

export type JapanSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  authorityLevel: "official" | "trusted-platform" | "company-official";
  notes: string;
};

export const JAPAN_GOV_SOURCES: JapanSource[] = [
  {
    id: "moj-isa",
    name: "出入国在留管理庁",
    url: "https://www.moj.go.jp/isa/",
    category: "visa",
    authorityLevel: "official",
    notes: "在留资格、入管制度、外国人相关政策核心来源",
  },
  {
    id: "mofa-jp",
    name: "外務省",
    url: "https://www.mofa.go.jp/",
    category: "visa-policy",
    authorityLevel: "official",
    notes: "签证、外交、入境政策",
  },
  {
    id: "mhlw",
    name: "厚生労働省",
    url: "https://www.mhlw.go.jp/",
    category: "work-labor",
    authorityLevel: "official",
    notes: "劳动、就业、社会保险、外国人材相关政策",
  },
  {
    id: "meti",
    name: "経済産業省",
    url: "https://www.meti.go.jp/",
    category: "industry",
    authorityLevel: "official",
    notes: "产业政策、IT 人才、创业政策",
  },
  {
    id: "digital-agency",
    name: "デジタル庁",
    url: "https://www.digital.go.jp/",
    category: "digital-policy",
    authorityLevel: "official",
    notes: "数字化政策、行政服务变化",
  },
  {
    id: "kantei",
    name: "首相官邸",
    url: "https://www.kantei.go.jp/",
    category: "policy",
    authorityLevel: "official",
    notes: "重大政策发布",
  },
];

export const CHINA_JAPAN_OFFICIAL_SOURCES: JapanSource[] = [
  {
    id: "japan-embassy-cn",
    name: "日本国驻华大使馆",
    url: "https://www.cn.emb-japan.go.jp/",
    category: "visa-cn",
    authorityLevel: "official",
    notes: "中国申请人赴日签证信息",
  },
  {
    id: "china-embassy-jp",
    name: "中国驻日本大使馆",
    url: "http://jp.china-embassy.gov.cn/",
    category: "consular",
    authorityLevel: "official",
    notes: "在日中国公民通知、领事服务",
  },
];

export const JAPAN_STUDY_SOURCES: JapanSource[] = [
  {
    id: "jasso",
    name: "JASSO 日本学生支援機構",
    url: "https://www.jasso.go.jp/",
    category: "study",
    authorityLevel: "official",
    notes: "留学、奖学金、学生支援",
  },
  {
    id: "mext",
    name: "文部科学省",
    url: "https://www.mext.go.jp/",
    category: "education-policy",
    authorityLevel: "official",
    notes: "教育政策、奖学金、大学相关",
  },
  {
    id: "jlpt",
    name: "JLPT 日本語能力試験",
    url: "https://www.jlpt.jp/",
    category: "exam",
    authorityLevel: "official",
    notes: "JLPT 报名、考试、成绩",
  },
  {
    id: "eju",
    name: "EJU 日本留学試験",
    url: "https://www.jasso.go.jp/ryugaku/eju/",
    category: "exam",
    authorityLevel: "official",
    notes: "EJU 考试信息",
  },
];

export const JAPAN_JOB_SOURCES: JapanSource[] = [
  {
    id: "hellowork",
    name: "ハローワークインターネットサービス",
    url: "https://www.hellowork.mhlw.go.jp/",
    category: "jobs",
    authorityLevel: "official",
    notes: "日本政府公共职业安定所招聘信息",
  },
  {
    id: "jetro",
    name: "JETRO",
    url: "https://www.jetro.go.jp/",
    category: "business-jobs",
    authorityLevel: "official",
    notes: "对日投资、企业、海外人才相关信息",
  },
  {
    id: "japan-dev",
    name: "Japan Dev",
    url: "https://japan-dev.com/",
    category: "tech-jobs",
    authorityLevel: "trusted-platform",
    notes: "非政府；只作为技术岗位线索",
  },
  {
    id: "tokyodev",
    name: "TokyoDev",
    url: "https://www.tokyodev.com/",
    category: "tech-jobs",
    authorityLevel: "trusted-platform",
    notes: "非政府；只作为技术岗位线索",
  },
];

export const TARGET_COMPANY_CAREER_SOURCES: JapanSource[] = [
  {
    id: "mercari-careers",
    name: "Mercari Careers",
    url: "https://careers.mercari.com/",
    category: "company-jobs",
    authorityLevel: "company-official",
    notes: "企业官方招聘页",
  },
  {
    id: "line-yahoo-careers",
    name: "LINE Yahoo Careers",
    url: "https://www.lycorp.co.jp/en/recruit/",
    category: "company-jobs",
    authorityLevel: "company-official",
    notes: "企业官方招聘页",
  },
  {
    id: "rakuten-careers",
    name: "Rakuten Careers",
    url: "https://corp.rakuten.co.jp/careers/",
    category: "company-jobs",
    authorityLevel: "company-official",
    notes: "企业官方招聘页",
  },
  {
    id: "smartnews-careers",
    name: "SmartNews Careers",
    url: "https://careers.smartnews.com/",
    category: "company-jobs",
    authorityLevel: "company-official",
    notes: "企业官方招聘页",
  },
];

export const ALL_JAPAN_SOURCES: JapanSource[] = [
  ...JAPAN_GOV_SOURCES,
  ...CHINA_JAPAN_OFFICIAL_SOURCES,
  ...JAPAN_STUDY_SOURCES,
  ...JAPAN_JOB_SOURCES,
  ...TARGET_COMPANY_CAREER_SOURCES,
];

// Keywords for detecting major updates
export const MAJOR_UPDATE_KEYWORDS_JA = [
  "visa", "在留資格", "高度専門職", "特定技能", "技能実習", "育成就労",
  "永住", "入国", "出入国", "留学", "日本語能力試験", "JLPT", "EJU",
  "奨学金", "就職", "転職", "外国人材", "制度改正", "施行",
  "受付開始", "受付終了", "締切", "停止", "変更", "新設", "廃止",
];

export const MAJOR_UPDATE_KEYWORDS_ZH = [
  "签证", "在留资格", "高度人才", "特定技能", "技能实习", "育成就劳",
  "永住", "入境", "出入境", "留学", "日语能力考试", "奖学金",
  "就职", "转职", "外国人才", "制度修改", "开始受理", "截止",
  "暂停", "变更", "新增", "废止",
];
