/**
 * Retry a call that may fail transiently, and report how many attempts were actually made.
 *
 * The attempt count is not decoration. The caller writes one ledger row per attempt, so an
 * under-count is a call that was paid for and never billed to anyone.
 */

export class RetryError extends Error {
  /**
   * @param {number} attempts how many times the call was actually made
   * @param {unknown} cause the last error the call threw
   */
  constructor(attempts, cause) {
    super(`call failed after ${attempts} attempt${attempts === 1 ? '' : 's'}`);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.cause = cause;
  }
}

/**
 * @template T
 * @param {(attempt: number) => Promise<T>} fn called with the 1-based attempt number
 * @param {{
 *   attempts: number,
 *   shouldRetry?: (error: unknown) => boolean,
 *   onAttempt?: (attempt: number) => void,
 * }} options
 * @returns {Promise<{ value: T, attempts: number }>}
 */
export async function withRetry(fn, options) {
  const budget = options?.attempts;
  if (!Number.isInteger(budget) || budget < 1) {
    throw new TypeError('attempts must be a positive integer');
  }
  const shouldRetry = options.shouldRetry ?? (() => true);
  const onAttempt = options.onAttempt ?? (() => {});

  let failed = 0;
  let lastError;

  while (failed < budget) {
    onAttempt(failed + 1);
    try {
      const value = await fn(failed + 1);
      return { value, attempts: failed + 1 };
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error)) {
        // A fatal error on the very first call is one attempt.
        throw new RetryError(failed === 0 ? 1 : failed, error);
      }
      failed += 1;
    }
  }

  throw new RetryError(failed, lastError);
}
