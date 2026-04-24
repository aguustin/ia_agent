"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const app_config_1 = require("./config/app.config");
const database_config_1 = require("./config/database.config");
const redis_config_1 = require("./config/redis.config");
const jwt_config_1 = require("./config/jwt.config");
const r2_config_1 = require("./config/r2.config");
const local_storage_config_1 = require("./config/local-storage.config");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const tenants_module_1 = require("./modules/tenants/tenants.module");
const projects_module_1 = require("./modules/projects/projects.module");
const documents_module_1 = require("./modules/documents/documents.module");
const analysis_module_1 = require("./modules/analysis/analysis.module");
const chat_module_1 = require("./modules/chat/chat.module");
const ai_module_1 = require("./providers/ai/ai.module");
const storage_module_1 = require("./providers/storage/storage.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default, database_config_1.default, redis_config_1.default, jwt_config_1.default, r2_config_1.default, local_storage_config_1.default],
                envFilePath: ['.env.local', '.env'],
                cache: true,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: database_config_1.databaseConfigFactory,
            }),
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: redis_config_1.redisConfigFactory,
            }),
            ai_module_1.AiModule,
            storage_module_1.StorageModule,
            auth_module_1.AuthModule,
            tenants_module_1.TenantsModule,
            users_module_1.UsersModule,
            projects_module_1.ProjectsModule,
            documents_module_1.DocumentsModule,
            analysis_module_1.AnalysisModule,
            chat_module_1.ChatModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map