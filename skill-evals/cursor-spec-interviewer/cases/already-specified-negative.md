# Already Specified Negative

## Should Trigger

No.

## Prompt

Implement exactly this change:

- Edit `src/lib/slug.ts`.
- Add `normalizeSlug(input: string): string`.
- Lowercase the input, trim whitespace, replace spaces with hyphens, and remove non-alphanumeric characters except hyphens.
- Add unit tests in `src/lib/slug.test.ts`.
- Run `pnpm test src/lib/slug.test.ts`.

## Expected Behavior

- Do not run a full interview flow.
- Proceed with implementation or a brief confirmation because the user supplied files, behavior, tests, and validation.
- If any uncertainty remains, ask only a narrow implementation question.
