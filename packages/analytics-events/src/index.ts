/**
 * Collection War — analytics event contract.
 *
 * A shared, typed, versioned definition of every analytics event, imported by the clients
 * that emit them and by the API that receives them.
 *
 * Why a package rather than ad-hoc `track('some_string')` calls:
 *   - An event whose name or payload drifts silently destroys the historical series it
 *     belongs to, and the loss is only noticed months later when someone asks a question
 *     of the data.
 *   - Analytics payloads are a privacy surface. Centralising them makes it possible to
 *     state, and review, what leaves a player's device.
 *
 * PRIVACY RULE: analytics events carry pseudonymous ids and coarse categories only. Never
 * an email address, a display name, a raw IP, a device identifier, or precise location.
 * See docs/domains/analytics/README.md.
 */

export * from './events';
