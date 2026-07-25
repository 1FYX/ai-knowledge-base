import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';

// signOptions.expiresIn expects ms's StringValue; process.env is widened to
// `string`, so we narrow it via the proper type from @types/ms.
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '7d') as StringValue;

@Module({
  imports: [
    PrismaModule,
    // global: true makes JwtService available to JwtAuthGuard in every module
    // without each module needing to import JwtModule/AuthModule explicitly.
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: jwtExpiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
