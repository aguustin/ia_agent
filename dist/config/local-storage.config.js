"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('localStorage', () => ({
    path: process.env.STORAGE_LOCAL_PATH ?? './uploads',
    baseUrl: (process.env.STORAGE_LOCAL_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
}));
//# sourceMappingURL=local-storage.config.js.map