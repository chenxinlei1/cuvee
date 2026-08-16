import assert from "node:assert/strict";
import { createDownloadToken, verifyDownloadToken } from "../src/lib/reports/download-token";
process.env.CUVEE_DOWNLOAD_SECRET="test-download-secret-that-is-long-enough";
const token=createDownloadToken("11111111-1111-4111-a111-111111111111","22222222-2222-4222-a222-222222222222",60);
assert.deepEqual(verifyDownloadToken(token),{reportId:"11111111-1111-4111-a111-111111111111",userId:"22222222-2222-4222-a222-222222222222"});
assert.equal(verifyDownloadToken(`${token}tampered`),null);
console.log("Security token checks passed.");
