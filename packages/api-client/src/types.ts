import { z } from 'zod';
import { isoTimestampSchema } from '@collection-war/validation';

/**
 * Response schemas for the endpoints that exist at bootstrap.
 *
 * Responses are PARSED, not cast. `as HealthResponse` would compile happily against a
 * server that changed its contract, and the failure would surface later as an undefined
 * property somewhere unrelated. Parsing fails at the boundary, where the cause is obvious.
 */

export const dependencyHealthSchema = z.object({
  status: z.enum(['up', 'down']),
  latencyMs: z.number().int().min(0),
});

/** `GET /health` — liveness. Answers "is this process running?" and nothing more. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptimeSeconds: z.number().min(0),
  timestamp: isoTimestampSchema,
});

/**
 * `GET /ready` — readiness. Answers "can this process serve traffic?", which requires its
 * dependencies to be reachable.
 */
export const readinessResponseSchema = z.object({
  status: z.enum(['ready', 'degraded']),
  timestamp: isoTimestampSchema,
  dependencies: z.object({
    database: dependencyHealthSchema,
    redis: dependencyHealthSchema,
  }),
});

/**
 * `GET /api/v1/system/info`.
 *
 * Note what this deliberately does NOT expose: no versions of dependencies, no hostnames,
 * no configuration, no build paths. Reconnaissance data in a public endpoint is free
 * information for an attacker.
 */
export const systemInfoResponseSchema = z.object({
  name: z.literal('collection-war-api'),
  apiVersion: z.string(),
  environment: z.enum(['local', 'development', 'staging', 'production']),
  supportedLocales: z.array(z.enum(['tr-TR', 'en'])),
});

export type DependencyHealth = z.infer<typeof dependencyHealthSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
export type SystemInfoResponse = z.infer<typeof systemInfoResponseSchema>;
