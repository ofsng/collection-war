# Workflow: `/handoff-task`

**Purpose:** hand over work that is not finished, so the next person does not restart it.

## When

The session is ending mid-task · the work is blocked · it needs a different agent or a
different model tier · you have hit an escalation condition.

## Write into the task packet

### State

- What is done, and **verified by which command**
- What is done but **unverified**
- What is not started

Keep those three separate. Merging them is how "mostly done" becomes a week of rework.

### The next concrete action

Not "continue the implementation". Something like:

> `packages/domain/src/wallet.ts` has `spend()` implemented and tested. The next step is
> `transfer()`, which must debit and credit inside one transaction and reject a currency-kind
> mismatch — mirror the structure of `spend()`.

### Decisions made

Anything chosen that is not obvious from the code. If it has lasting consequences, it needs
an ADR, not just a note.

### Blockers

- What is blocked
- **Who or what can unblock it**
- What you did instead while waiting

### Warnings

The things that will cost the next person an hour:

- A subtlety that looks like a bug but is not
- A dependency that behaves unexpectedly
- **A dead end already tried, and why it failed** — this is the most valuable item here, and
  the most often omitted
- A test that is slow or order-dependent

### Model note

If a preferred model tier was unavailable and a weaker one was used, **say so**, and flag any
high-risk decision made on it for review.

## Verify before handing off

```bash
pnpm verify
git status --short
```

Report the real result and leave the working tree in a state that is either green or clearly
and deliberately not.

## Never

- Hand off with an unstated broken state
- Describe unverified work as done
- Omit a failed approach — the next person will try it too
- Leave a decision undocumented because it "felt obvious at the time"
