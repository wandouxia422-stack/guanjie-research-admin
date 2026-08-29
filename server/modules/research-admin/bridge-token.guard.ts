import { timingSafeEqual } from 'node:crypto';

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class BridgeTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.GUANJIE_BRIDGE_TOKEN;
    if (!expected) throw new UnauthorizedException('服务端未配置 Bridge Token');
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.header('authorization');
    const supplied = request.header('x-guanjie-bridge-token') ||
      (authorization?.startsWith('Bearer ') ? authorization.slice(7) : '');
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      throw new UnauthorizedException('Bridge Token 无效');
    }
    return true;
  }
}
