import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
export declare class LocalFilesController {
    private readonly storagePath;
    private readonly isActive;
    constructor(config: ConfigService);
    serveFile(key: string, res: Response): void;
}
