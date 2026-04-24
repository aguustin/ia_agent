import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Serves files stored by LocalStorageService.
 * Only active when STORAGE_PROVIDER=local (default).
 * Not intended for production — use R2 (or another CDN) instead.
 */
@Controller('storage/files')
export class LocalFilesController {
  private readonly storagePath: string;
  private readonly isActive: boolean;

  constructor(config: ConfigService) {
    this.storagePath = path.resolve(
      config.get<string>('localStorage.path', './uploads'),
    );
    this.isActive = config.get<string>('STORAGE_PROVIDER', 'local') === 'local';
  }

  @Get('*')
  serveFile(@Param('0') key: string, @Res() res: Response): void {
    if (!this.isActive) throw new NotFoundException();

    // Guard against path-traversal attacks before touching the filesystem.
    const resolved = path.resolve(path.join(this.storagePath, path.normalize(key)));
    const storageRoot = this.storagePath + path.sep;
    if (!resolved.startsWith(storageRoot)) {
      throw new ForbiddenException();
    }

    if (!fs.existsSync(resolved)) throw new NotFoundException();

    res.sendFile(resolved);
  }
}
