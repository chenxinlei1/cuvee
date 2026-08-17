import "server-only";
type MailKind = "verify" | "reset" | "invite";
export async function sendAuthMail(input: { to: string; name: string; url: string; kind: MailKind }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY, from = process.env.CUVEE_MAIL_FROM;
  const subject =
    input.kind === "verify"
      ? "Verify your Cuvée email"
      : input.kind === "invite"
        ? "Invitation to Cuvée"
        : "Reset your Cuvée password";
  const action =
    input.kind === "verify" ? "Verify email" : input.kind === "invite" ? "Accept invitation" : "Reset password";
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") console.info(`[Cuvée mail] ${subject}: ${input.url}`);
    else throw new Error("Email delivery is not configured");
    return;
  }
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [input.to], subject, html: `<p>Hello ${escapeHtml(input.name)},</p><p><a href="${input.url}">${action}</a></p><p>This link expires soon. If you did not request it, ignore this email.</p>` }) });
  if (!response.ok) throw new Error(`Email delivery failed (${response.status})`);
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}
