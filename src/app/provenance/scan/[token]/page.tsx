import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { verifyProvenanceShareToken } from "@/lib/provenance/share-token";
import QRCode from "qrcode";
import { createHash } from "crypto";

function badgeClass(status: string) {
  if (status.includes("verified") || status.includes("验证") || status.includes("已验证")) {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

export default async function PublicProvenancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = verifyProvenanceShareToken(token);
  if (!data) notFound();

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const publicUrl = `${protocol}://${host}/provenance/scan/${encodeURIComponent(token)}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 180,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#171717", light: "#ffffff" },
  });
  const publicId = `CV-${createHash("sha256").update(token).digest("hex").slice(0, 10).toUpperCase()}`;
  const verified = data.evidence.length + data.uploadedEvidence.length > 0 && data.timeline.length > 0;

  const entries = [...data.evidence, ...data.uploadedEvidence];

  return (
    <main className="container mx-auto max-w-4xl px-7 py-12">
      <header className="card-lg overflow-hidden p-0">
        <div className="bg-gradient-to-br from-foreground/10 to-surface-1 px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="kicker">公开扫码验真</p>
            <span className={`chip ${verified ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
              {verified ? "验证通过" : "请注意：证据不完整"}
            </span>
          </div>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">{data.title}</h1>
          <p className="text-soft mt-3 text-sm leading-relaxed">
            这是一个只读的公开验真页。扫描二维码即可查看酒源、批次与证据摘要。
          </p>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`chip ${badgeClass(data.status)}`}>{data.status}</span>
              <span className="chip bg-surface-3">{data.mode === "winery" ? "酒庄模式" : "酒商模式"}</span>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="产区" value={data.region} />
              <Field label="批次" value={data.batch} />
              <Field label="公开编号" value={publicId} />
              <Field label="验证状态" value={verified ? "签名有效 · 信息已核对" : "信息待补充"} />
            </dl>
          </div>
          <div className="rounded-card border border-line bg-surface-1 p-4">
            <img src={qrDataUrl} alt="公开溯源二维码" className="mx-auto h-44 w-44 rounded-lg" />
            <p className="text-soft mt-3 text-center text-xs">扫码打开验真页</p>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="card-lg p-6">
          <p className="kicker">证据摘要</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {entries.map((item) => (
              <span key={item} className="chip bg-surface-3">
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="card-lg p-6">
          <p className="kicker">来源路径</p>
          <ol className="mt-4 space-y-3">
            {data.timeline.map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="text-soft font-mono text-xs">{`0${index + 1}`}</span>
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="mt-6 rounded-card border border-line bg-panel-strong p-6">
          <p className="kicker">验证说明</p>
          <p className="text-soft mt-2 text-sm leading-relaxed">
          页面上的公开编号对应本次签名链接。状态为“验证通过”表示链接签名有效，且已关联来源路径与证据；如果来源卡更新，需要重新生成公开链接。
        </p>
      </section>

      <div className="mt-8">
        <Link href="/provenance" className="chip inline-flex">
          返回溯源页
        </Link>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="text-soft text-xs uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-2 text-sm">{value}</div>
    </div>
  );
}
