#!/usr/bin/env node
import { migrateDatabase } from "../src/storage/migrations.mjs";

// Deliberately separate from server startup: this command modifies the configured database.
try {
  const deploymentEnvironment = process.env.ADS_DEPLOYMENT_ENVIRONMENT ?? "development";
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== deploymentEnvironment)
    throw new Error("The credential database deployment environment does not match this service.");
  const result = await migrateDatabase({
    databaseUrl: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
    deploymentEnvironment,
  });
  process.stdout.write(`${JSON.stringify({ migration: "complete", ...result })}\n`);
} catch (error) {
  // Never print a database URL, driver diagnostics, SQL values, or error causes.
  const safe = [
    "A DATABASE_URL PostgreSQL connection URL is required.",
    "A bounded, valid DATABASE_URL PostgreSQL connection URL is required.",
    "DATABASE_URL must use PostgreSQL.",
    "DATABASE_URL must include a host and database, without a fragment.",
    "DATABASE_URL contains an unsupported or duplicate connection parameter.",
    "DATABASE_URL options may only set a simple search_path.",
    "Remote DATABASE_URL connections require sslmode=verify-full.",
    "The credential database contains an unsupported newer schema migration.",
    "The credential database migration history is incomplete or unsupported.",
    "The credential database migration checksum does not match this release.",
    "A valid credential database deployment environment is required.",
    "The credential database deployment environment does not match this service.",
  ];
  process.stderr.write(
    `${safe.includes(error.message) ? error.message : "Credential database migration failed; check database connectivity, permissions and migration history."}\n`,
  );
  process.exitCode = 1;
}
