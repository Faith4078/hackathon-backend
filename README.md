# Hackathon Backend

A NestJS REST API for running hackathons. Admins create and manage hackathons, and participants sign up, browse hackathons, and join or leave them.

## Tech stack

- NestJS 12 on the Express adapter, written in TypeScript as native ES modules
- PostgreSQL, accessed through Prisma 7 with the `@prisma/adapter-pg` driver adapter
- Better Auth for email and password authentication, integrated through `@thallesp/nestjs-better-auth`
- `class-validator` and `class-transformer` for request validation
- Arcjet for shield, bot detection and rate limiting
- Vitest for unit and end to end tests, Oxlint and Prettier for code quality
- pnpm as the package manager

## Getting started

### Prerequisites

- Node.js 22.18 or newer (22.16 works but prints an engine warning)
- pnpm
- A PostgreSQL database, local or hosted

### Install

```bash
pnpm install
```

### Configure the environment

Copy `.env.example` to `.env` and fill in the values.

```bash
cp .env.example .env
```

Environment variables:

- `DATABASE_URL`: PostgreSQL connection string, for example `postgresql://user:password@localhost:5432/hackathon`
- `BETTER_AUTH_SECRET`: secret used for encryption and hashing. It must be at least 32 characters. Generate one with `openssl rand -base64 32`
- `BETTER_AUTH_URL`: base URL of this API, for example `http://localhost:3000`. Better Auth trusts this origin by default
- `ARCJET_KEY`: your Arcjet site key
- `PORT`: optional, defaults to 3000

### Set up the database

```bash
pnpm db:migrate
pnpm db:generate
```

`db:migrate` applies the migrations in `prisma/migrations` and prompts for a name when the schema has changed. `db:generate` builds the Prisma client into `src/generated/prisma`, which is git ignored, so run it after every fresh install and every schema change.

### Run the app

```bash
pnpm start:dev
```

The API listens on http://localhost:3000. Check that auth is mounted with `GET /api/auth/ok`.

## Scripts

Application:

- `pnpm start`: start the app
- `pnpm start:dev`: start in watch mode
- `pnpm start:debug`: start in debug and watch mode
- `pnpm build`: compile to `dist`
- `pnpm start:prod`: run the compiled app

Quality:

- `pnpm lint`: run Oxlint with type aware rules
- `pnpm format`: run Prettier on `src` and `test`
- `pnpm test`: run unit tests once
- `pnpm test:watch`: run unit tests in watch mode
- `pnpm test:cov`: run unit tests with coverage
- `pnpm test:e2e`: run end to end tests

Database:

- `pnpm db:generate`: generate the Prisma client
- `pnpm db:migrate`: create and apply a development migration
- `pnpm db:format`: format `prisma/schema.prisma`
- `pnpm db:studio`: open Prisma Studio in the browser

These scripts call the Prisma version pinned in `package.json` (7.10). Avoid `pnpm dlx prisma`, because it downloads the latest release, which is a different major version without the `generate` and `studio` commands.

## Project structure

```
prisma/
  schema.prisma          Data model
  migrations/            SQL migrations
prisma.config.ts         Prisma CLI configuration
src/
  main.ts                Bootstrap, global pipe and interceptor
  app.module.ts          Root module
  common/
    decorators/          ResponseMessage decorator
    interceptors/        ResponseInterceptor
    pipes/               Validation pipe factory
  lib/
    auth.ts              Better Auth instance
    database/            PrismaModule, PrismaService, client factory
  module/
    user/                User endpoints
    hackathon/           Hackathon endpoints and DTOs
  generated/prisma/      Generated Prisma client (git ignored)
```

Conventions:

- Every infrastructure integration gets its own module and service under `src/lib`, marked `@Global()` and imported once in `AppModule`
- Feature modules live in `src/module/<name>`
- Shared decorators, interceptors and pipes live in `src/common`
- Services are injected through constructors and never created with `new`. The one exception is the Prisma client used by Better Auth, which is configured outside Nest's container

## Authentication and authorization

Authentication is handled by Better Auth, mounted at `/api/auth`. Sessions are cookie based and stored in PostgreSQL.

The package registers an `AuthGuard` globally, so every route requires a session unless it opts out. Routes use these decorators from `@thallesp/nestjs-better-auth`:

- `@AllowAnonymous()`: make a route public
- `@OptionalAuth()`: work with or without a session
- `@Roles(['ADMIN'])`: restrict a route to users whose role matches exactly
- `@Session()`: inject the current session into a handler

Nest's built in body parser is disabled in `main.ts` because Better Auth needs the raw request body. The package restores body parsing for the other routes.

### Roles

Every user has a role, either `PARTICIPANT` (the default) or `ADMIN`. The role cannot be set at sign up. The field is configured with `input: false`, so any value sent by a client is ignored. To make someone an admin, change their `role` directly in the database, for example in Prisma Studio.

### Auth endpoints

All auth endpoints take JSON and live under `/api/auth`.

- `POST /api/auth/sign-up/email` with `name`, `email` and `password`
- `POST /api/auth/sign-in/email` with `email` and `password`
- `GET /api/auth/get-session`
- `POST /api/auth/sign-out`
- `GET /api/auth/ok`

Passwords must be 8 to 128 characters. Sign up and sign in return `{ token, user }` and set the session cookie.

### Calling the API from a client

- Send requests with credentials included so the session cookie is stored and returned
- Better Auth rejects requests without an `Origin` header (error `MISSING_OR_NULL_ORIGIN`). Browsers send it automatically, but tools such as curl and Postman need `Origin: http://localhost:3000`
- A frontend on a different origin must be added to `trustedOrigins` in `src/lib/auth.ts`, otherwise requests get a 403

## API reference

Responses from the application routes below use the envelope described in the next section. The `/api/auth` routes keep Better Auth's own response shapes.

### Users

- `GET /user/all`: list all users, newest first. Admin only
- `GET /user/:id`: get one user. Returns 404 if the user does not exist. Any signed in user

### Hackathons

- `POST /hackathon`: create a hackathon. Admin only. The author is set from the signed in user
- `GET /hackathon`: list hackathons, latest start date first. Any signed in user
- `GET /hackathon/:id`: get one hackathon. Returns 404 if not found. Any signed in user
- `PATCH /hackathon/:id`: update a hackathon. Admin only. All fields are optional
- `DELETE /hackathon/:id`: delete a hackathon and its participants. Admin only. Returns 404 if not found
- `POST /hackathon/:id/join`: join a hackathon. Participants only
- `DELETE /hackathon/:id/leave`: leave a hackathon. Participants only. Returns 404 if you have not joined

Create and update body:

```json
{
  "name": "Spring Build Weekend",
  "description": "Ship something in 48 hours.",
  "startsAt": "2026-12-01T09:00:00.000Z",
  "endsAt": "2026-12-03T17:00:00.000Z",
  "isActive": true
}
```

Validation rules:

- `name`: required string, at least 3 characters
- `description`: optional, 10 to 1000 characters
- `startsAt` and `endsAt`: required on create, must be valid dates in the future
- `isActive`: optional boolean, defaults to true
- Unknown properties are rejected

Join rules, checked in this order:

1. The hackathon must exist, otherwise 404
2. It must be active, otherwise 400
3. It must not have ended, otherwise 400
4. It must not have started, because registration closes at the start date, otherwise 400
5. You must not have joined already, otherwise 400. This is enforced by the unique constraint on the hackathon and user pair, so simultaneous requests cannot create duplicates

Joining returns the created participant record.

## Response format

Successful responses are wrapped by a global interceptor:

```json
{
  "statusCode": 200,
  "message": "Hackathons retrieved successfully",
  "data": []
}
```

`statusCode` is the real HTTP status. `message` defaults to `"Success"` and can be set per handler or controller with the `@ResponseMessage('...')` decorator. A handler that returns nothing gives `data: null`.

Validation failures return 400 with an array of field errors. Nested properties use a dotted path.

```json
{
  "message": [
    { "property": "name", "message": "name must be longer than or equal to 3 characters" }
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

Other errors, such as 401, 403 and 404, use Nest's default error body and are not wrapped in the envelope.

## Data model

Defined in `prisma/schema.prisma`:

- `User`: Better Auth user with an added `role` enum (`PARTICIPANT` or `ADMIN`, default `PARTICIPANT`)
- `Session`, `Account`, `Verification`: Better Auth tables
- `Hackathon`: `name`, optional `description`, `startDate`, `endDate`, `isActive` (default true), and an author relation to `User`. Deleting a user who authored a hackathon is blocked
- `HackathonParticipant`: links a user to a hackathon with `joinedAt`, and a unique constraint on `hackathonId` plus `userId`. Rows are removed automatically when the hackathon or the user is deleted

Note that the API accepts `startsAt` and `endsAt`, which the service maps to the model's `startDate` and `endDate`.

## Security notes

- Arcjet runs on every route through a global `ArcjetGuard` (registered as `APP_GUARD` in `AppModule`). Rules: shield (live), bot detection (dry run, search engines allowed) and a sliding window rate limit of 100 requests per minute per client (live). A denied request gets a 403. The limit covers the whole API, including `/api/auth/*`
- Keep `BETTER_AUTH_SECRET` out of version control
- Better Auth's CSRF and origin checks are enabled. Do not disable them

## Contributing workflow

- Plan non trivial features before building
- Use the Nest CLI to generate modules, services and controllers
- Run `pnpm lint`, `pnpm test` and `pnpm build` before opening a pull request
"# hackathon-backend" 
