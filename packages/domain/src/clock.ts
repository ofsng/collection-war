import type { Clock, IsoTimestamp } from '@collection-war/shared-types';

/**
 * Clock implementations.
 *
 * Domain code never calls `Date.now()` — the lint config forbids it. It receives a
 * `Clock`. That single indirection is what makes "the expedition finishes in 4 hours"
 * testable in four milliseconds, and what makes a battle replayable at the timestamp it
 * actually happened rather than the timestamp of the replay.
 */

/** Wall-clock time, in UTC. The implementation used in every running process. */
export function createSystemClock(): Clock {
  return {
    now: () => new Date().toISOString() as IsoTimestamp,
    nowMs: () => Date.now(),
  };
}

export interface FixedClockController extends Clock {
  /** Moves time forward. Never backward — a clock that can rewind hides ordering bugs. */
  advanceMs(milliseconds: number): void;
  set(timestamp: IsoTimestamp): void;
}

/**
 * A clock the test controls.
 *
 * `advanceMs` rejects negative input on purpose. Real time does not go backwards, so a
 * test that relies on it would be asserting behaviour that can never occur in production.
 */
export function createFixedClock(start: IsoTimestamp): FixedClockController {
  let currentMs = new Date(start).getTime();

  if (Number.isNaN(currentMs)) {
    throw new Error(`createFixedClock received an invalid timestamp: ${start}`);
  }

  return {
    now: () => new Date(currentMs).toISOString() as IsoTimestamp,
    nowMs: () => currentMs,
    advanceMs(milliseconds) {
      if (milliseconds < 0) {
        throw new Error('Time cannot move backwards. Construct a new clock instead.');
      }
      currentMs += milliseconds;
    },
    set(timestamp) {
      const next = new Date(timestamp).getTime();
      if (Number.isNaN(next)) throw new Error(`Invalid timestamp: ${timestamp}`);
      currentMs = next;
    },
  };
}
