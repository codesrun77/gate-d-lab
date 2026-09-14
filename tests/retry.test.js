import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RetryError, withRetry } from '../src/index.js';

/** A call that fails `failures` times and then succeeds, recording every attempt it saw. */
function flaky(failures, error = new Error('temporarily unavailable')) {
  const seen = [];
  const fn = async (attempt) => {
    seen.push(attempt);
    if (seen.length <= failures) throw error;
    return 'ok';
  };
  return { fn, seen };
}

test('a call that succeeds first time is one attempt', async () => {
  const { fn, seen } = flaky(0);
  const r = await withRetry(fn, { attempts: 3 });
  assert.deepEqual([r.value, r.attempts], ['ok', 1]);
  assert.deepEqual(seen, [1]);
});

test('a call that succeeds after two transient failures is three attempts', async () => {
  const { fn, seen } = flaky(2);
  const r = await withRetry(fn, { attempts: 5 });
  assert.deepEqual([r.value, r.attempts], ['ok', 3]);
  assert.deepEqual(seen, [1, 2, 3]);
});

test('a call that never succeeds spends exactly its budget', async () => {
  const { fn, seen } = flaky(Infinity);
  await assert.rejects(
    withRetry(fn, { attempts: 4 }),
    (e) => e instanceof RetryError && e.attempts === 4,
  );
  assert.deepEqual(seen, [1, 2, 3, 4]);
});

test('a budget of one means one attempt and no retry', async () => {
  const { fn, seen } = flaky(Infinity);
  await assert.rejects(withRetry(fn, { attempts: 1 }), (e) => e.attempts === 1);
  assert.deepEqual(seen, [1]);
});

test('an error the policy refuses to retry stops immediately', async () => {
  const fatal = new Error('unauthorized');
  const { fn, seen } = flaky(Infinity, fatal);
  await assert.rejects(
    withRetry(fn, { attempts: 5, shouldRetry: (e) => e !== fatal }),
    (e) => e instanceof RetryError && e.attempts === 1 && e.cause === fatal,
  );
  assert.deepEqual(seen, [1], 'and makes no further calls');
});

test('onAttempt sees every attempt, in order, before it is made', async () => {
  const { fn } = flaky(2);
  const announced = [];
  await withRetry(fn, { attempts: 5, onAttempt: (n) => announced.push(n) });
  assert.deepEqual(announced, [1, 2, 3]);
});

test('a budget that is not a positive integer is refused before anything is called', async () => {
  const { fn, seen } = flaky(0);
  for (const bad of [0, -1, 1.5, '3', undefined, null, NaN]) {
    await assert.rejects(withRetry(fn, { attempts: bad }), TypeError);
  }
  assert.deepEqual(seen, [], 'nothing was called');
});
