# Bounded Revision And Save

## Should Trigger

Yes.

## Prompt

The full plan and exact save path are known. The user says: Change the retry limit from three to two and save this version at the same approved path. Native Plan is inactive and the authorized file state is unchanged.

## Deterministic Assertions

- contains: bounded revision authorized
- contains: Persistence status: completed
- not_contains: approve the retry change again

## Expected Behavior

Make only the unambiguous named revision and save within the established scope. A new material ambiguity would require an affected question; this numeric instruction does not.
