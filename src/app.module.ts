import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  ArcjetModule,
  detectBot,
  shield,
  slidingWindow,
  ArcjetGuard,
} from '@arcjet/nest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth.js';
import { PrismaModule } from './lib/database/prisma.module.js';
import { UserModule } from './module/user/user.module.js';
import { HackathonModule } from './module/hackathon/hackathon.module.js';

import 'dotenv/config';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    HackathonModule,
    AuthModule.forRoot({ auth }),
    ArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY!,
      rules: [
        // Blocks common attacks e.g. SQL injection, XSS.
        shield({ mode: 'LIVE' }),
        // Start in DRY_RUN while tuning; switch to LIVE once verified.
        detectBot({
          mode: 'DRY_RUN',
          allow: ['CATEGORY:SEARCH_ENGINE'],
        }),
        slidingWindow({
          mode: 'LIVE',
          max: 100,
          interval: 60,
        }),
      ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ArcjetGuard }],
})
export class AppModule {}
