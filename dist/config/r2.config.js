"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('r2', () => ({
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucketName: process.env.R2_BUCKET_NAME ?? '',
    publicUrl: process.env.R2_PUBLIC_URL ?? '',
    signedUrlExpiresIn: parseInt(process.env.R2_SIGNED_URL_EXPIRES_IN ?? '3600', 10),
    requestTimeoutMs: parseInt(process.env.R2_REQUEST_TIMEOUT_MS ?? '30000', 10),
}));
//# sourceMappingURL=r2.config.js.map