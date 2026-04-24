import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
declare const _default: (() => {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    ssl: boolean;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    ssl: boolean;
}>;
export default _default;
export declare const databaseConfigFactory: (config: ConfigService) => TypeOrmModuleOptions;
