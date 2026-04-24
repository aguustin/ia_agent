import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
export interface RefreshTokenPayload extends JwtPayload {
    refreshToken: string;
}
declare const JwtRefreshStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtRefreshStrategy extends JwtRefreshStrategy_base {
    constructor(config: ConfigService);
    validate(req: Request, payload: JwtPayload): RefreshTokenPayload;
}
export {};
