"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/Provider";
import type { DictKey } from "@/lib/i18n/dict";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { canAccessTrade, canAccessVineyard } from "@/lib/auth/types";

interface StrategyItem {
  label: DictKey;
  title: DictKey;
  body: DictKey;
  evidence: DictKey[];
}

interface ProductRecord {
  id: string;
  titleKey: DictKey;
  subtitleKey: DictKey;
  regionKey: DictKey;
  batchKey: DictKey;
  statusKey: DictKey;
  evidenceKeys: DictKey[];
  uploadedEvidence: string[];
  timelineKeys: DictKey[];
}

const wineryProof: StrategyItem[] = [
  {
    label: "provenance.winery.authority.label",
    title: "provenance.winery.authority.title",
    body: "provenance.winery.authority.body",
    evidence: [
      "provenance.evidence.estate_registration",
      "provenance.evidence.aoc_declaration",
      "provenance.evidence.authorized_seller",
    ],
  },
  {
    label: "provenance.winery.batch.label",
    title: "provenance.winery.batch.title",
    body: "provenance.winery.batch.body",
    evidence: [
      "provenance.evidence.lot_number",
      "provenance.evidence.bottling_sheet",
      "provenance.evidence.release_note",
    ],
  },
];

const tradeProof: StrategyItem[] = [
  {
    label: "provenance.trade.movement.label",
    title: "provenance.trade.movement.title",
    body: "provenance.trade.movement.body",
    evidence: [
      "provenance.evidence.supplier_invoice",
      "provenance.evidence.warehouse_receipt",
      "provenance.evidence.shipping_handoff",
    ],
  },
  {
    label: "provenance.trade.document.label",
    title: "provenance.trade.document.title",
    body: "provenance.trade.document.body",
    evidence: [
      "provenance.evidence.invoice",
      "provenance.evidence.customs_document",
      "provenance.evidence.temperature_log",
    ],
  },
];

const workflow: Array<[string, DictKey]> = [
  ["01", "provenance.workflow.create_card"],
  ["02", "provenance.workflow.authority"],
  ["03", "provenance.workflow.batch"],
  ["04", "provenance.workflow.trade_docs"],
  ["05", "provenance.workflow.publish_qr"],
];

const MODE_DEFAULTS: Record<"winery" | "trade", ProductRecord[]> = {
  winery: [
    {
      id: "w-1",
      titleKey: "provenance.sample.winery.name",
      subtitleKey: "provenance.card.winery",
      regionKey: "provenance.sample.winery.region",
      batchKey: "provenance.sample.winery.batch",
      statusKey: "provenance.status.winery",
      evidenceKeys: [
        "provenance.evidence.estate_registration",
        "provenance.evidence.aoc_declaration",
        "provenance.evidence.lot_number",
      ],
      uploadedEvidence: [],
      timelineKeys: [
        "provenance.timeline.harvest",
        "provenance.timeline.bottling",
        "provenance.timeline.release",
      ],
    },
    {
      id: "w-2",
      titleKey: "provenance.sample.winery.alt_name",
      subtitleKey: "provenance.card.winery",
      regionKey: "provenance.sample.winery.alt_region",
      batchKey: "provenance.sample.winery.alt_batch",
      statusKey: "provenance.status.partial",
      evidenceKeys: [
        "provenance.evidence.bottling_sheet",
        "provenance.evidence.authorized_seller",
        "provenance.evidence.release_note",
      ],
      uploadedEvidence: [],
      timelineKeys: [
        "provenance.timeline.harvest",
        "provenance.timeline.cellar",
        "provenance.timeline.release",
      ],
    },
  ],
  trade: [
    {
      id: "t-1",
      titleKey: "provenance.sample.trade.name",
      subtitleKey: "provenance.card.trade",
      regionKey: "provenance.sample.trade.region",
      batchKey: "provenance.sample.trade.batch",
      statusKey: "provenance.status.trade",
      evidenceKeys: [
        "provenance.evidence.supplier_invoice",
        "provenance.evidence.warehouse_receipt",
        "provenance.evidence.invoice",
      ],
      uploadedEvidence: [],
      timelineKeys: [
        "provenance.timeline.supplier",
        "provenance.timeline.warehouse",
        "provenance.timeline.buyer",
      ],
    },
    {
      id: "t-2",
      titleKey: "provenance.sample.trade.alt_name",
      subtitleKey: "provenance.card.trade",
      regionKey: "provenance.sample.trade.alt_region",
      batchKey: "provenance.sample.trade.alt_batch",
      statusKey: "provenance.status.partial",
      evidenceKeys: [
        "provenance.evidence.shipping_handoff",
        "provenance.evidence.customs_document",
        "provenance.evidence.temperature_log",
      ],
      uploadedEvidence: [],
      timelineKeys: [
        "provenance.timeline.shipment",
        "provenance.timeline.customs",
        "provenance.timeline.reception",
      ],
    },
  ],
};

export function ProvenanceContent() {
  const t = useT();
  const { user, ready } = useCurrentUser();
  const canWinery = Boolean(user && canAccessVineyard(user));
  const canTrade = Boolean(user && canAccessTrade(user));
  const availableModes = useMemo(
    () =>
      (canWinery && canTrade ? ["winery", "trade"] : canTrade ? ["trade"] : ["winery"]) as Array<
        "winery" | "trade"
      >,
    [canTrade, canWinery],
  );
  const [mode, setMode] = useState<"winery" | "trade">("winery");
  const activeMode = availableModes.includes(mode) ? mode : (availableModes[0] ?? "winery");
  const activeItems = activeMode === "winery" ? wineryProof : tradeProof;
  const [products, setProducts] = useState<ProductRecord[]>(MODE_DEFAULTS.winery);
  const [selectedId, setSelectedId] = useState("w-1");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (!ready) return;
    const nextMode = availableModes[0] ?? "winery";
    if (!availableModes.includes(mode)) setMode(nextMode);
  }, [availableModes, mode, ready]);

  useEffect(() => {
    const defaults = MODE_DEFAULTS[activeMode];
    setProducts(defaults);
    setSelectedId(defaults[0]?.id ?? "");
  }, [activeMode]);

  const selected = products.find((item) => item.id === selectedId) ?? products[0];
  const proofCount = selected?.evidenceKeys.length ?? 0;

  useEffect(() => {
    if (!selected && products[0]) setSelectedId(products[0].id);
  }, [products, selected]);

  const addProduct = () => {
    const nextIndex = products.length + 1;
    const next: ProductRecord =
      activeMode === "winery"
        ? {
            id: `${activeMode}-${nextIndex}`,
            titleKey: "provenance.sample.winery.name",
            subtitleKey: "provenance.card.winery",
            regionKey: "provenance.sample.winery.region",
            batchKey: "provenance.sample.winery.batch",
            statusKey: "provenance.status.partial",
            evidenceKeys: ["provenance.evidence.lot_number", "provenance.evidence.release_note"],
            uploadedEvidence: [],
            timelineKeys: [
              "provenance.timeline.harvest",
              "provenance.timeline.bottling",
              "provenance.timeline.release",
            ],
          }
        : {
            id: `${activeMode}-${nextIndex}`,
            titleKey: "provenance.sample.trade.name",
            subtitleKey: "provenance.card.trade",
            regionKey: "provenance.sample.trade.region",
            batchKey: "provenance.sample.trade.batch",
            statusKey: "provenance.status.partial",
            evidenceKeys: ["provenance.evidence.invoice", "provenance.evidence.shipping_handoff"],
            uploadedEvidence: [],
            timelineKeys: [
              "provenance.timeline.supplier",
              "provenance.timeline.warehouse",
              "provenance.timeline.buyer",
            ],
          };
    setProducts((current) => [...current, next]);
    setSelectedId(next.id);
  };

  const removeProduct = (id: string) => {
    setProducts((current) => {
      const next = current.filter((item) => item.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? "");
      return next.length ? next : MODE_DEFAULTS[activeMode];
    });
  };

  const addEvidenceFiles = (files: FileList | null) => {
    if (!selected || !files?.length) return;
    const names = Array.from(files).map((file) => file.name);
    setProducts((current) =>
      current.map((item) =>
        item.id === selected.id
          ? { ...item, uploadedEvidence: [...item.uploadedEvidence, ...names] }
          : item,
      ),
    );
  };

  const shareSelectedCard = async () => {
    if (!selected) return;
    setShareState("loading");
    try {
      const response = await fetch("/api/provenance/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: activeMode,
          title: t(selected.titleKey),
          region: t(selected.regionKey),
          batch: t(selected.batchKey),
          status: t(selected.statusKey),
          evidence: selected.evidenceKeys.map((key) => t(key)),
          timeline: selected.timelineKeys.map((key) => t(key)),
          uploadedEvidence: selected.uploadedEvidence,
        }),
      });
      const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !data?.url) throw new Error(data?.error ?? "share_failed");
      setShareUrl(data.url);
      setShareState("done");
    } catch {
      setShareState("error");
    }
  };

  const selectedIsLast = products.length <= 1;

  return (
    <main className="container mx-auto max-w-6xl px-7 py-12">
      <header className="max-w-3xl">
        <p className="kicker">{t("provenance.eyebrow")}</p>
        <h1 className="mt-3 font-serif text-5xl font-medium tracking-tight">
          {t("provenance.title")}
        </h1>
        <p className="text-soft mt-4 text-sm leading-relaxed">{t("provenance.subtitle")}</p>
      </header>

      {ready && user && availableModes.length > 1 ? (
        <section className="mt-8 flex flex-wrap gap-2">
          <ModeButton active={activeMode === "winery"} onClick={() => setMode("winery")}>
            {t("provenance.mode.winery")}
          </ModeButton>
          <ModeButton active={activeMode === "trade"} onClick={() => setMode("trade")}>
            {t("provenance.mode.trade")}
          </ModeButton>
        </section>
      ) : null}

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="card-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="kicker">{t(`provenance.card.${activeMode}` as DictKey)}</p>
              <h2 className="mt-2 font-serif text-3xl">
                {t(`provenance.sample.${activeMode}.name` as DictKey)}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip bg-foreground text-background" onClick={addProduct}>
                {t("provenance.product.add")}
              </button>
              <button type="button" className="chip border border-line bg-surface-1" onClick={shareSelectedCard}>
                {shareState === "loading" ? t("provenance.public.generating") : t("provenance.public.generate")}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label={t("provenance.product.total")} value={products.length} />
            <Stat label={t("provenance.product.active")} value={selected ? 1 : 0} />
            <Stat label={t("provenance.product.proof")} value={proofCount} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((item, index) => {
              const active = item.id === selected?.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelectedId(item.id);
                  }}
                  className={
                    `group relative rounded-card border p-4 text-left transition-all ` +
                    (active
                      ? "border-foreground bg-foreground/5 shadow-lg shadow-foreground/10"
                      : "border-line bg-surface-1 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md")
                  }
                >
                  <div className="flex items-start justify-between gap-3 pr-6">
                    <div>
                      <p className="text-soft text-xs uppercase tracking-[0.18em]">
                        {t(item.subtitleKey)} · {index + 1}
                      </p>
                      <h3 className="mt-2 font-serif text-xl">{t(item.titleKey)}</h3>
                    </div>
                    <span className="chip text-[10px]">{t(item.statusKey)}</span>
                  </div>
                  <p className="text-soft mt-3 text-sm leading-relaxed">{t(item.regionKey)}</p>
                  <p className="mt-1 text-sm font-medium">{t(item.batchKey)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.evidenceKeys.slice(0, 2).map((evidence) => (
                      <span key={evidence} className="chip bg-surface-3 text-[11px]">
                        {t(evidence)}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/60 pt-3">
                    <span className="text-soft text-xs">{t("provenance.product.card_hint")}</span>
                    <button
                      type="button"
                      disabled={selectedIsLast}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProduct(item.id);
                      }}
                      className="rounded-pill border border-line px-2.5 py-1 text-[11px] text-soft transition hover:border-foreground/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t("provenance.product.remove")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <aside className="space-y-6">
          <article className="card-lg overflow-hidden p-0">
            <div className="bg-gradient-to-br from-foreground/8 to-surface-1 p-6">
              <p className="kicker">{t("provenance.product.selected")}</p>
              <h2 className="mt-2 font-serif text-3xl">{selected ? t(selected.titleKey) : "—"}</h2>
              <p className="text-soft mt-2 text-sm">{selected ? t(selected.regionKey) : ""}</p>
            </div>
            <div className="p-6">
              {selected ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Fact label={t("provenance.field.region")} value={t(selected.regionKey)} />
                    <Fact label={t("provenance.field.batch")} value={t(selected.batchKey)} />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Fact label={t("provenance.field.vintage")} value="2024" />
                    <Fact label={t("provenance.field.proof_model")} value={t("provenance.proof_model")} />
                  </div>
                  <div className="mt-5 rounded-xl border border-line bg-surface-1 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="kicker">{t("provenance.evidence.title")}</p>
                      <label className="chip cursor-pointer bg-foreground text-background">
                        {t("provenance.evidence.upload")}
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            addEvidenceFiles(event.currentTarget.files);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.evidenceKeys.map((evidence) => (
                        <span key={evidence} className="chip bg-surface-3">
                          {t(evidence)}
                        </span>
                      ))}
                      {selected.uploadedEvidence.map((evidence, index) => (
                        <span key={`${evidence}-${index}`} className="chip bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          {evidence}
                        </span>
                      ))}
                    </div>
                    {selected.uploadedEvidence.length ? (
                      <p className="text-soft mt-3 text-xs">{t("provenance.evidence.local_note")}</p>
                    ) : null}
                  </div>

                  {shareUrl ? (
                    <div className="mt-5 rounded-xl border border-line bg-surface-1 p-4">
                      <p className="kicker">{t("provenance.public.title")}</p>
                      <p className="text-soft mt-2 text-sm">{t("provenance.public.subtitle")}</p>
                      <div className="mt-3 rounded-xl border border-dashed border-line p-3 text-sm break-all">
                        {shareUrl}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={shareUrl} target="_blank" rel="noreferrer" className="chip bg-foreground text-background">
                          {t("provenance.public.open")}
                        </a>
                        <button
                          type="button"
                          className="chip border border-line bg-surface-1"
                          onClick={async () => {
                            await navigator.clipboard.writeText(shareUrl);
                          }}
                        >
                          {t("provenance.public.copy")}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 rounded-xl border border-line bg-surface-1 p-4">
                    <p className="kicker">{t("provenance.timeline.title")}</p>
                    <ol className="mt-3 space-y-3">
                      {selected.timelineKeys.map((item, index) => (
                        <li key={item} className="flex gap-3">
                          <span className="text-soft font-mono text-xs">{`0${index + 1}`}</span>
                          <span className="text-sm">{t(item)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="mt-5 rounded-xl border border-line bg-surface-1 p-4">
                    <p className="kicker">{t("provenance.verification.title")}</p>
                    <p className="text-soft mt-2 text-sm leading-relaxed">
                      {t("provenance.verification.body")}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </article>

          <article className="card-lg p-6">
            <p className="kicker">{t("provenance.workflow.title")}</p>
            <ol className="mt-5 space-y-4">
              {workflow.map(([index, key]) => (
                <li key={key} className="flex gap-4">
                  <span className="text-soft font-mono text-xs">{index}</span>
                  <span className="text-sm">{t(key)}</span>
                </li>
              ))}
            </ol>
          </article>
        </aside>
      </section>

      <section className="mt-8">
        <StrategyCard
          eyebrow={activeMode === "winery" ? t("provenance.winery.strategy") : t("provenance.trade.strategy")}
          title={activeMode === "winery" ? t("provenance.winery.title") : t("provenance.trade.title")}
          items={activeItems}
        />
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/" className="chip inline-flex">
          {t("common.back_home")}
        </Link>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "chip bg-foreground text-background"
          : "chip bg-surface-1 text-foreground hover:bg-surface-3"
      }
    >
      {children}
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <dt className="kicker">{label}</dt>
      <dd className="mt-2 text-sm">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-1 px-4 py-3">
      <div className="text-soft text-xs uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-2 font-serif text-2xl">{value}</div>
    </div>
  );
}

function StrategyCard({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: StrategyItem[];
}) {
  const t = useT();
  return (
    <article className="card-lg p-6">
      <p className="kicker">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl">{title}</h2>
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <section key={item.label} className="rounded-xl border border-line bg-surface-1 p-4">
            <p className="kicker">{t(item.label)}</p>
            <h3 className="mt-2 font-semibold">{t(item.title)}</h3>
            <p className="text-soft mt-2 text-sm leading-relaxed">{t(item.body)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.evidence.map((evidence) => (
                <span key={evidence} className="chip bg-surface-3">
                  {t(evidence)}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
