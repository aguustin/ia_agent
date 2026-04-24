import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: JwtPayload): AuthenticatedUser;
}
export {};
