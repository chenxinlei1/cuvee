/**
 * Pure unit checks — no database, no network. Run with:
 *   pnpm test:unit
 */
import assert from "node:assert/strict";
import {
  canAccessTrade,
  canAccessVineyard,
  canManageReport,
  defaultAppPath,
  hasPermission,
  type AuthUser,
} from "../src/lib/auth/types";
import { cn } from "../src/lib/utils";
import { DICT } from "../src/lib/i18n/dict";
import { ZH_DICT } from "../src/lib/i18n/zh";
import { REGIONS } from "../src/lib/wine/regions";
import { PRODUCTS } from "../src/lib/wine/products";
import CHATEAUX from "../src/lib/wine/chateaux-static.json";
import { createDownloadToken, verifyDownloadToken } from "../src/lib/reports/download-token";
import { log } from "../src/lib/observability/logger";
import { gauge, increment, renderMetrics } from "../src/lib/observability/metrics";

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "unit-user",
    email: "unit@test.local",
    name: "Unit Tester",
    role: "wineryStaff",
    permissions: ["analysis:run", "workspace:vineyard", "report:read"],
    organizationId: "org-1",
    organizationType: "chateau",
    organizationName: "Test Château",
    ...overrides,
  };
}

// ── permission helpers ───────────────────────────────────────────────────
assert.equal(hasPermission(makeUser(), "analysis:run"), true);
assert.equal(hasPermission(makeUser(), "report:manage"), false);
assert.equal(canAccessVineyard(makeUser()), true);
assert.equal(canAccessTrade(makeUser()), false);
assert.equal(canAccessTrade(makeUser({ permissions: ["analysis:run", "workspace:trade"] })), true);

const owner = makeUser({ permissions: ["analysis:run", "workspace:vineyard", "report:read", "report:manage"] });
assert.equal(canManageReport(owner, "unit-user", "org-1"), true, "owner manages own report");
const orgManager = makeUser({
  id: "other-user",
  permissions: ["report:read", "report:manage"],
});
assert.equal(canManageReport(orgManager, "unit-user", "org-1"), true, "org manager manages org report");
const platformAdmin = makeUser({
  role: "platformAdmin",
  permissions: ["report:read:any", "report:manage", "user:manage"],
});
assert.equal(canManageReport(platformAdmin, "someone-else", "other-org"), true, "platform admin manages any report");
const outsider = makeUser({ id: "outsider", organizationId: "org-2" });
assert.equal(canManageReport(outsider, "unit-user", "org-1"), false, "outsider cannot manage");
assert.equal(defaultAppPath(makeUser()), "/vineyard");
assert.equal(defaultAppPath(makeUser({ role: "buyerStaff", permissions: ["analysis:run", "workspace:trade"] })), "/trade");
assert.equal(defaultAppPath(makeUser({ permissions: ["user:manage"] })), "/admin");

// ── download token (HMAC + expiry) ───────────────────────────────────────
process.env.CUVEE_DOWNLOAD_SECRET = "unit-test-download-secret-that-is-long-enough";
const reportId = "11111111-1111-4111-a111-111111111111";
const userId = "22222222-2222-4222-a222-222222222222";
const good = createDownloadToken(reportId, userId, 300);
assert.deepEqual(verifyDownloadToken(good), { reportId, userId });
assert.equal(verifyDownloadToken(`${good}tampered`), null, "tampered token must be rejected");
const [payload, signature] = good.split(".");
assert.equal(verifyDownloadToken(`${payload}.${"x".repeat(signature?.length ?? 0)}`), null, "bad signature must be rejected");
assert.equal(verifyDownloadToken(createDownloadToken(reportId, userId, -1)), null, "expired token must be rejected");

// ── structured logger redaction ──────────────────────────────────────────
const lines: string[] = [];
const original = { info: console.info, warn: console.warn, error: console.error };
console.info = (line: unknown) => lines.push(String(line));
console.warn = console.info;
console.error = console.info;
try {
  log("info", "test.event", {
    userId,
    apiKey: "sk-super-secret",
    password: "hunter2",
    note: "keep-me",
  });
} finally {
  console.info = original.info;
  console.warn = original.warn;
  console.error = original.error;
}
const entry = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
assert.equal(entry.event, "test.event");
assert.equal(entry.apiKey, "[REDACTED]");
assert.equal(entry.password, "[REDACTED]");
assert.equal(entry.note, "keep-me");

// ── metrics registry ─────────────────────────────────────────────────────
increment("cuvee_unit_test_total", "Unit test counter");
increment("cuvee_unit_test_total", "Unit test counter");
gauge("cuvee_unit_test_gauge", "Unit test gauge", 7);
const rendered = renderMetrics();
assert.match(rendered, /# HELP cuvee_unit_test_total Unit test counter/);
assert.match(rendered, /# TYPE cuvee_unit_test_total counter/);
assert.match(rendered, /^cuvee_unit_test_total 2$/m);
assert.match(rendered, /^cuvee_unit_test_gauge 7$/m);

// ── dataset integrity ────────────────────────────────────────────────────
const regionIds = new Set(REGIONS.map((region) => region.id));
assert.equal(regionIds.size, REGIONS.length, "region ids must be unique");
for (const region of REGIONS) {
  assert.ok(region.name.length > 0, "region name required");
  assert.ok(region.parent === "burgundy" || region.parent === "bordeaux");
  assert.ok(region.centroid.lat >= -90 && region.centroid.lat <= 90);
  assert.ok(region.centroid.lng >= -180 && region.centroid.lng <= 180);
}

const productIds = new Set(PRODUCTS.map((product) => product.id));
assert.equal(productIds.size, PRODUCTS.length, "product ids must be unique");
for (const product of PRODUCTS) {
  assert.ok(regionIds.has(product.region.id), `product "${product.id}" references missing region`);
  assert.ok(product.name.length > 0 && product.aoc.length > 0);
}

assert.ok(CHATEAUX.length >= 61, `expected >= 61 classed growths, got ${CHATEAUX.length}`);
const chateauNames = new Set(CHATEAUX.map((chateau) => chateau.name));
assert.equal(chateauNames.size, CHATEAUX.length, "château names must be unique");

// ── i18n completeness ────────────────────────────────────────────────────
for (const key of Object.keys(DICT) as Array<keyof typeof DICT>) {
  assert.ok(key in ZH_DICT, `zh translation missing for "${key}"`);
  assert.ok(DICT[key].en.length > 0, `en copy missing for "${key}"`);
  assert.ok(DICT[key].fr.length > 0, `fr copy missing for "${key}"`);
}

// ── util helpers ─────────────────────────────────────────────────────────
assert.equal(cn("a", false && "b", "c"), "a c");

console.log("Unit checks passed.");
