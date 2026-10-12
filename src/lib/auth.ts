import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createPrismaClient } from './database/prisma.client.js';

// better-auth is configured outside Nest's DI container, so it owns its
// own client built by the same factory as PrismaService.
export const auth = betterAuth({
  database: prismaAdapter(createPrismaClient(), { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'PARTICIPANT',
        // input: false rejects a client-supplied role on sign-up/update.
        input: false,
      },
    },
  },
});
