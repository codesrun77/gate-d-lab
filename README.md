# gate-d-lab

A sandbox repository for Gate D. It exists so the first time Noah changes real code under real
supervision, the code is not Younis Core.

It has no dependencies. `npm test` runs on Node alone, which matters because the agent works in an
isolated worktree with no network.

```
src/retry.js      withRetry(): retry a call, and report how many attempts were actually made
tests/            the suite as it stands today — currently green
```

**This repository deliberately contains one real bug.** It is not a typo and it is not marked. The
suite passes with it in place, which is the point: a fix you cannot see the tests demand is the kind
of fix Gate D has to be able to produce.

---

## The task

**Title** — Fix the attempt count reported for a call that ends on a non-retryable error

**Problem**

Reconciliation flagged a provider call that the runner made three times but that appears in the
ledger as two. One paid call is unaccounted for. It reproduces only when the last error is one the
retry policy refuses to retry, and only when at least one retry happened before it: a call that
fails fatally on its very first attempt is reported correctly, which is why this went unnoticed.

`withRetry` reports the count, and the caller writes one ledger row per attempt, so whatever
`withRetry` says is what gets billed. It is currently saying the wrong number.

**In scope**

- `src/retry.js`
- `tests/`

**Out of scope**

- The public API. `withRetry`, `RetryError`, their parameters, their return shape and their existing
  behaviour on every path that is already correct must not change. A caller upgrading to the fixed
  version must not have to change a line.
- Reformatting, renaming, restructuring, or "while I was in here" improvements.
- Adding a dependency.

**Acceptance criteria**

- A regression test that fails on the current code and passes after the fix, covering the case in the
  problem statement — a non-retryable error *after* at least one retry.
- The reported attempt count equals the number of calls actually made, on every path.
- `npm test` is green, and every test that passes today still passes.
- The diff is small enough to read in one sitting.

**Evidence to hand back**

- the diff
- the test output, before and after
- one paragraph: what the bug was, why the existing suite missed it, and what the fix does

---

## For the reviewer

The question is not only "is it fixed". It is whether the regression test actually pins the
behaviour — a test that would still pass against the old code proves nothing — and whether anything
outside the stated scope moved.

<!-- token capability probe -->
