"use client";

import Link from "next/link";
import { useI18n, useT } from "@/lib/i18n/Provider";
import type { Locale } from "@/lib/i18n/dict";

interface Stage { title: string; body: string; source: string }
interface QA { q: string; a: string }
interface PageCopy {
  kicker: string;
  title: string;
  intro: string;
  architecture: string;
  qa: string;
  stages: Stage[];
  faq: QA[];
}

const SOURCES = [
  "src/app/api/analyze/route.ts",
  "src/lib/agents/orchestrator.ts",
  "src/lib/agents/sub-agents/{weather,geo,tavily}.ts",
  "src/lib/agents/extraction.ts",
  "src/lib/agents/feature.ts",
  "src/lib/agents/sub-agents/backtest.ts",
  "src/lib/agents/orchestrator.ts · src/components/wine/*",
];

const COPY: Record<Locale, PageCopy> = {
  en: {
    kicker: "Cuvée · Engineering blog",
    title: "How Cuvée works",
    intro: "A multi-agent pipeline that turns climate, terroir, internal documents, and market signals into vintage-quality and risk forecasts for Burgundy and Bordeaux.",
    architecture: "Architecture",
    qa: "Q&A",
    stages: [
      ["Input layer", "The user submits region, persona and timeframe, plus an optional château, question and internal documents, through POST /api/analyze."],
      ["Orchestrator", "Plan-and-Execute dispatch: weather, geo and retrieval run in parallel; extraction follows; feature and historical backtest then run in parallel."],
      ["Sub-agents", "Weather reads ERA5/SEAS5 climate data, Geo reads the 1855 château dataset, and Retrieval searches public sources with a SQLite cache."],
      ["Extraction", "The LLM combines retrieved evidence with the wine-quality schema, applies gates and evidence calibration, then converts quality into a risk score."],
      ["Feature", "The selected LLM provider produces an executive summary, full report and email digest, with a deterministic fallback when necessary."],
      ["Historical backtest", "For past vintages, retrieval gathers critic scores and market reactions; the backtest agent compares them with the prediction."],
      ["Result and dashboard", "Structured JSON returns to the client and renders risk, terroir, charts, recommendations, trace, report history and backtest results."],
    ].map(([title, body], i) => ({ title: title!, body: body!, source: SOURCES[i]! })),
    faq: [
      { q: "What problem does Cuvée solve?", a: "It converts fragmented climate, terroir, internal and market evidence into a structured wine-vintage assessment for vineyard operators and trade buyers." },
      { q: "Why use multiple agents?", a: "Each evidence channel has a different source and failure mode. Specialized agents make collection, debugging, retries and upgrades independently observable." },
      { q: "Is this Plan-and-Execute or ReAct?", a: "The default path is deterministic Plan-and-Execute with a fixed dependency graph. A legacy LLM tool-calling loop remains available behind configuration." },
      { q: "Where does climate data come from?", a: "Weather Agent reads bundled DEM-downscaled ERA5 historical features and the ECMWF SEAS5 seasonal forecast ensemble, so normal climate reads do not require a network call." },
      { q: "How does private-document RAG work?", a: "Uploaded TXT/CSV content is bounded, chunked, ranked against the user question, and the top excerpts are injected into Extraction with filenames and prompt-injection safeguards." },
      { q: "What does Retrieval Agent do?", a: "It searches Tavily, Brave or SearXNG for public wine, policy and market evidence, then deduplicates, quality-weights and caches results in SQLite." },
      { q: "Which LLM providers are supported?", a: "OpenAI, Anthropic Claude, Alibaba Qwen, DeepSeek and local Ollama share one provider-neutral interface with structured-output validation." },
      { q: "What is historical backtesting?", a: "For a past vintage, the system retrieves real critic and market observations and compares them with the predicted quality score and band." },
      { q: "How does caching work?", a: "A 24-hour SQLite result cache keys the complete request, including language and document content. Retrieval queries also have their own persistent cache." },
      { q: "What happens when a provider fails?", a: "Agents have timeouts and abort signals; errors appear in the trace, and deterministic fallbacks keep the dashboard usable instead of returning a blank report." },
      { q: "How are the two dashboards different?", a: "Vineyard focuses on operational risks and internal documents. Trade focuses on allocation, pricing, château selection, market signals and buyer personas." },
      { q: "Is the system multilingual?", a: "Yes. The interface and LLM-generated report follow English, French or Simplified Chinese, while proper names, filenames, URLs and direct quotations remain unchanged." },
    ],
  },
  zh: {
    kicker: "Cuvée · 工程与架构",
    title: "Cuvée 如何工作",
    intro: "这是一个多智能体葡萄酒分析系统，将气候、风土、内部文档和市场信号转化为勃艮第与波尔多的年份质量预测和风险判断。",
    architecture: "系统架构",
    qa: "常见问题",
    stages: [
      ["输入层", "用户通过 POST /api/analyze 提交产区、角色和时间范围，也可以指定酒庄、分析问题并上传内部文档。"],
      ["编排器", "采用 Plan-and-Execute：Weather、Geo、Retrieval 并行执行，随后运行 Extraction，最后并行生成报告并进行历史回测。"],
      ["专业子智能体", "Weather 读取 ERA5/SEAS5 气候数据，Geo 读取 1855 列级庄数据，Retrieval 检索公开资料并使用 SQLite 缓存。"],
      ["证据提取与评分", "LLM 将检索证据与葡萄酒质量 Schema 结合，应用风险门控和证据校准，再将质量分转换为风险分。"],
      ["报告生成", "所选 LLM Provider 生成执行摘要、完整报告和邮件摘要；调用失败时使用确定性模板降级。"],
      ["历史回测", "分析历史年份时，系统检索真实酒评分数和市场反应，由 Backtest Agent 与预测结果进行比较。"],
      ["结果与看板", "后端返回结构化 JSON，前端展示风险、风土、图表、建议、Agent Trace、历史报告和回测结果。"],
    ].map(([title, body], i) => ({ title: title!, body: body!, source: SOURCES[i]! })),
    faq: [
      { q: "Cuvée 解决什么问题？", a: "它把分散的气候、风土、企业内部资料和市场证据整合成结构化的葡萄酒年份分析，服务葡萄园经营者和贸易采购人员。" },
      { q: "为什么采用多智能体？", a: "不同证据来自不同数据源，也有不同的失败方式。专业 Agent 可以独立检索、重试、调试和升级，执行过程也更透明。" },
      { q: "这是 Plan-and-Execute 还是 ReAct？", a: "默认使用确定性的 Plan-and-Execute，根据固定依赖图执行；配置中仍保留旧版 LLM 工具调用循环。" },
      { q: "气候数据来自哪里？", a: "Weather Agent 读取本地的 ERA5 历史特征和 ECMWF SEAS5 季节预测数据，因此常规气候分析不需要实时调用外部 API。" },
      { q: "内部文档 RAG 如何工作？", a: "系统限制 TXT/CSV 文件大小，对文本切块，根据用户问题排序并选取 Top-K 片段，再携带来源文件名注入 Extraction，同时防范文档中的提示词注入。" },
      { q: "Retrieval Agent 做什么？", a: "它通过 Tavily、Brave 或 SearXNG 检索酒评、政策和市场资料，并执行去重、质量加权和 SQLite 缓存。" },
      { q: "支持哪些大模型？", a: "支持 OpenAI、Anthropic Claude、阿里云 Qwen、DeepSeek 和本地 Ollama，统一通过 Provider 接口调用，并验证结构化输出。" },
      { q: "什么是历史回测？", a: "针对历史年份，系统检索真实酒评和市场数据，再与模型预测的质量分和等级比较，判断预测是否一致。" },
      { q: "缓存如何工作？", a: "SQLite 结果缓存保存 24 小时，Key 包含完整请求、语言和文档内容；外部检索查询还有独立的持久化缓存。" },
      { q: "Provider 调用失败怎么办？", a: "Agent 支持超时和中断信号，错误会显示在 Trace 中；确定性降级策略确保看板仍能返回可用结果。" },
      { q: "两个看板有什么区别？", a: "葡萄园端强调种植风险和内部文档；贸易端强调酒庄选择、配置、定价、市场信号和采购角色。" },
      { q: "系统支持多语言吗？", a: "支持。界面和 LLM 报告可使用中文、英文或法文，酒庄名称、文件名、URL 和原始引用保持原文。" },
    ],
  },
  fr: {
    kicker: "Cuvée · Blog d’ingénierie",
    title: "Comment fonctionne Cuvée",
    intro: "Un système multi-agent qui transforme le climat, le terroir, les documents internes et les signaux de marché en prévisions de qualité et de risque pour la Bourgogne et Bordeaux.",
    architecture: "Architecture du système",
    qa: "Questions fréquentes",
    stages: [
      ["Couche d’entrée", "L’utilisateur envoie région, profil et période via POST /api/analyze, avec éventuellement un château, une question et des documents internes."],
      ["Orchestrateur", "Plan-and-Execute : Weather, Geo et Retrieval s’exécutent en parallèle, puis Extraction, puis Feature et le backtest historique en parallèle."],
      ["Sous-agents spécialisés", "Weather lit ERA5/SEAS5, Geo le jeu des crus classés de 1855, et Retrieval recherche les sources publiques avec un cache SQLite."],
      ["Extraction et notation", "Le LLM combine les preuves avec le schéma qualité, applique les seuils et la calibration, puis convertit la qualité en score de risque."],
      ["Génération du rapport", "Le fournisseur LLM choisi produit synthèse, rapport complet et digest, avec un modèle déterministe de secours."],
      ["Backtest historique", "Pour un millésime passé, le système récupère notes critiques et réactions de marché, puis les compare à la prévision."],
      ["Résultat et tableau de bord", "Le JSON structuré alimente les cartes de risque et de terroir, les graphiques, recommandations, traces, historiques et résultats de backtest."],
    ].map(([title, body], i) => ({ title: title!, body: body!, source: SOURCES[i]! })),
    faq: [
      { q: "Quel problème Cuvée résout-il ?", a: "Il transforme des preuves dispersées — climat, terroir, données internes et marché — en une analyse structurée du millésime pour viticulteurs et acheteurs." },
      { q: "Pourquoi plusieurs agents ?", a: "Chaque canal possède ses propres sources et modes d’échec. Des agents spécialisés rendent la collecte, les reprises, le débogage et les évolutions observables séparément." },
      { q: "Plan-and-Execute ou ReAct ?", a: "Le chemin par défaut est un Plan-and-Execute déterministe avec un graphe de dépendances fixe. Une boucle d’outils LLM historique reste configurable." },
      { q: "D’où viennent les données climatiques ?", a: "Weather Agent lit les historiques ERA5 et l’ensemble saisonnier ECMWF SEAS5 fournis localement, sans appel réseau pour les lectures normales." },
      { q: "Comment fonctionne le RAG documentaire ?", a: "Les TXT/CSV sont limités, segmentés et classés selon la question. Les meilleurs extraits, avec leur fichier source, sont injectés dans Extraction avec des protections contre l’injection." },
      { q: "Que fait Retrieval Agent ?", a: "Il interroge Tavily, Brave ou SearXNG pour les preuves publiques, puis déduplique, pondère leur qualité et les met en cache dans SQLite." },
      { q: "Quels LLM sont pris en charge ?", a: "OpenAI, Anthropic Claude, Alibaba Qwen, DeepSeek et Ollama local partagent une interface neutre avec validation des sorties structurées." },
      { q: "Qu’est-ce que le backtest historique ?", a: "Pour un millésime passé, le système récupère les observations réelles des critiques et du marché, puis les compare à la qualité prédite." },
      { q: "Comment fonctionne le cache ?", a: "Le cache SQLite conserve le résultat 24 heures selon la requête complète, la langue et les documents. Les recherches publiques disposent aussi de leur propre cache." },
      { q: "Que se passe-t-il si un fournisseur échoue ?", a: "Les agents gèrent délais et signaux d’abandon ; les erreurs figurent dans la trace et des stratégies déterministes maintiennent un résultat exploitable." },
      { q: "Quelle différence entre les tableaux de bord ?", a: "Le mode Domaine privilégie les risques opérationnels et les documents internes ; le mode Négoce privilégie sélection, prix, marché et profils d’acheteurs." },
      { q: "Le système est-il multilingue ?", a: "Oui. Interface et rapport LLM suivent le français, l’anglais ou le chinois simplifié, tandis que noms propres, fichiers, URL et citations restent inchangés." },
    ],
  },
};

export function BlogContent() {
  const { locale } = useI18n();
  const t = useT();
  const copy = COPY[locale];
  return (
    <main className="container mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <p className="kicker">{copy.kicker}</p>
        <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight md:text-5xl">{copy.title}</h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-soft">{copy.intro}</p>
      </header>
      <section className="mb-16">
        <h2 className="mb-6 font-serif text-2xl font-medium tracking-tight">{copy.architecture}</h2>
        <ol className="space-y-4">
          {copy.stages.map((stage, i) => (
            <li key={stage.source} className="card-lg grid gap-3 p-5 md:grid-cols-[32px_1fr]">
              <span className="tabular font-mono text-sm text-soft">{i + 1}</span>
              <div className="min-w-0">
                <p className="font-medium">{stage.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-soft">{stage.body}</p>
                <p className="kicker mt-2 font-mono">{stage.source}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="mb-12">
        <h2 className="mb-6 font-serif text-2xl font-medium tracking-tight">{copy.qa}</h2>
        <div className="space-y-6">
          {copy.faq.map((item, i) => (
            <details key={item.q} className="group card-lg p-5 open:bg-surface-2">
              <summary className="cursor-pointer list-none font-medium text-foreground">
                <span className="tabular mr-3 font-mono text-xs text-soft">{String(i + 1).padStart(2, "0")}</span>
                {item.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
      <nav className="border-t border-line pt-8">
        <ul className="kicker flex flex-wrap gap-6">
          <li><Link href="/" className="hover:text-foreground">{t("common.back_home")}</Link></li>
          <li><Link href="/vineyard" className="hover:text-foreground">{t("nav.vineyard")}</Link></li>
          <li><Link href="/trade" className="hover:text-foreground">{t("nav.trade")}</Link></li>
          <li><Link href="/scaffold" className="hover:text-foreground">{t("common.config")}</Link></li>
        </ul>
      </nav>
    </main>
  );
}
