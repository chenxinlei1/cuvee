import { createHmac, timingSafeEqual } from "crypto";

type ProvenanceSharePayload = {
  mode: "winery" | "trade";
  title: string;
  region: string;
  batch: string;
  status: string;
  evidence: string[];
  timeline: string[];
  uploadedEvidence: string[];
};

const SECRET = () => {
  const value = process.env.CUVEE_AUTH_SECRET ?? process.env.CUVEE_DOWNLOAD_SECRET;
  if (!value) throw new Error("Missing provenance share secret");
  return value;
};

export function createProvenanceShareToken(payload: ProvenanceSharePayload, ttlSeconds = 7 * 24 * 60 * 60) {
  const body = Buffer.from(
    JSON.stringify({ payload, exp: Date.now() + ttlSeconds * 1000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", SECRET()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyProvenanceShareToken(token: string): ProvenanceSharePayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(createHmac("sha256", SECRET()).update(body).digest("base64url"));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      payload?: ProvenanceSharePayload;
      exp?: number;
    };
    return value.payload && value.exp && value.exp > Date.now() ? value.payload : null;
  } catch {
    return null;
  }
}
