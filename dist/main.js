"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug'],
    });
    const config = app.get(config_1.ConfigService);
    const port = config.get('app.port', 3000);
    const prefix = config.get('app.apiPrefix', 'api');
    const nodeEnv = config.get('app.nodeEnv', 'development');
    app.setGlobalPrefix(prefix);
    app.enableVersioning({ type: common_1.VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor(), new common_1.ClassSerializerInterceptor(app.get(core_1.Reflector)));
    app.enableCors({
        origin: config.get('app.corsOrigins', '*'),
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
    });
    if (nodeEnv !== 'production') {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('Obras Validator API')
            .setDescription('SaaS platform for AI-powered construction project pre-validation')
            .setVersion('1.0')
            .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup(`${prefix}/docs`, app, document, {
            swaggerOptions: { persistAuthorization: true },
        });
    }
    await app.listen(port);
    console.log(`Application running on port ${port} [${nodeEnv}]`);
}
bootstrap();
//# sourceMappingURL=main.js.map