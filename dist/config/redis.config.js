"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConfigFactory = void 0;
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('redis', () => ({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
    tls: process.env.REDIS_TLS === 'true',
}));
const redisConfigFactory = (config) => ({
    connection: {
        host: config.get('redis.host'),
        port: config.get('redis.port'),
        password: config.get('redis.password') || undefined,
        tls: config.get('redis.tls') ? {} : undefined,
        maxRetriesPerRequest: null,
    },
});
exports.redisConfigFactory = redisConfigFactory;
//# sourceMappingURL=redis.config.js.map