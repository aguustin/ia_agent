"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfigFactory = void 0;
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('database', () => ({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'obras_validator',
    ssl: process.env.DB_SSL === 'true',
}));
const databaseConfigFactory = (config) => ({
    type: 'postgres',
    host: config.get('database.host'),
    port: config.get('database.port'),
    username: config.get('database.user'),
    password: config.get('database.password'),
    database: config.get('database.name'),
    ssl: config.get('database.ssl') ? { rejectUnauthorized: false } : false,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
    autoLoadEntities: true,
    synchronize: config.get('app.nodeEnv') === 'development',
    logging: config.get('app.nodeEnv') === 'development' ? ['query', 'error'] : ['error'],
    extra: {
        max: 20,
        min: 2,
        acquire: 30000,
        idle: 10000,
    },
});
exports.databaseConfigFactory = databaseConfigFactory;
//# sourceMappingURL=database.config.js.map