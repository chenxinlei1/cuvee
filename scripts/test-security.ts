import assert from "node:assert/strict";
import { createDownloadToken, verifyDownloadToken } from "../src/lib/reports/download-token";
import { isSameOrigin } from "../src/lib/auth/request-security";
process.env.CUVEE_DOWNLOAD_SECRET="test-download-secret-that-is-long-enough";
const token=createDownloadToken("11111111-1111-4111-a111-111111111111","22222222-2222-4222-a222-222222222222",60);
assert.deepEqual(verifyDownloadToken(token),{reportId:"11111111-1111-4111-a111-111111111111",userId:"22222222-2222-4222-a222-222222222222"});
assert.equal(verifyDownloadToken(`${token}tampered`),null);
assert.equal(
  isSameOrigin(new Request("http://internal-pod:3000/api/auth/login", {
    headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
  })),
  true,
  "port-forwarded requests should use the public Host header",
);
assert.equal(
  isSameOrigin(new Request("http://internal-pod:3000/api/auth/login", {
    headers: { host: "127.0.0.1:3000", origin: "https://attacker.example" },
  })),
  false,
  "cross-origin requests must be rejected",
);
assert.equal(
  isSameOrigin(new Request("http://internal-pod:3000/api/auth/login", {
    headers: {
      host: "internal-pod:3000",
      origin: "http://cuvee.example.com",
      "x-forwarded-host": "cuvee.example.com",
      "x-forwarded-proto": "https",
    },
  })),
  false,
  "forwarded protocol must match the browser origin",
);
console.log("Security token checks passed.");
