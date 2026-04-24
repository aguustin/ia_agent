import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FILE_STORAGE_SERVICE } from './file-storage.interface';
import { LocalFilesController } from './local-files.controller';
import { LocalStorageService } from './local.provider';
import { R2StorageService } from './r2.provider';

/**
 * Global storage module. Selects the active provider via STORAGE_PROVIDER env var:
 *   - "local" (default): stores files on disk — suitable for local dev and MVP.
 *   - "r2": Cloudflare R2 — requires R2_* environment variables.
 *
 * Both providers are always instantiated so NestJS lifecycle hooks run, but
 * only the selected one is exposed as FILE_STORAGE_SERVICE.
 */
@Global()
@Module({
  controllers: [LocalFilesController],
  providers: [
    R2StorageService,
    LocalStorageService,
    {
      provide: FILE_STORAGE_SERVICE,
      inject: [ConfigService, R2StorageService, LocalStorageService],
      useFactory: (
        config: ConfigService,
        r2: R2StorageService,
        local: LocalStorageService,
      ) => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'local');
        return provider === 'r2' ? r2 : local;
      },
    },
  ],
  exports: [FILE_STORAGE_SERVICE],
})
export class StorageModule {}
