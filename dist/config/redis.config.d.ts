import { ConfigService } from '@nestjs/config';
import { SharedBullConfigurationFactory } from '@nestjs/bullmq';
declare const _default: (() => {
    host: string;
    port: number;
    password: string | undefined;
    tls: boolean;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    host: string;
    port: number;
    password: string | undefined;
    tls: boolean;
}>;
export default _default;
export declare const redisConfigFactory: (config: ConfigService) => ReturnType<SharedBullConfigurationFactory["createSharedConfiguration"]>;
