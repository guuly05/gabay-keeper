# Gabay Keeper Security Specification

## 1. Data Invariants
- **Poem Ownership**: A poem document (`/poems/{poemId}`) must have an `ownerId` field that strictly matches the `request.auth.uid`.
- **Integrity**: Every poem must contain `title`, `originalText`, `ownerId`, and `createdAt`.
- **Immutability**: `ownerId` and `createdAt` must never change after creation.
- **Size Constraints**: `title` <= 200 chars, `originalText` <= 50,000 chars, `translatedText` <= 50,000 chars.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing**: `create` with `ownerId: "someone_else_uid"`.
2. **Privileged Edit**: `update` a poem document with a different `ownerId` than the current user.
3. **Ghost Fields**: `create` with an additional `isSystemApproved: true` field not in schema.
4. **Denial of Wallet (ID)**: Attempting to create a document with a 2MB string as ID.
5. **Denial of Wallet (Title)**: Attempting to update `title` with a 1MB string.
6. **Immutable Breach**: Attempting to update `ownerId` or `createdAt` fields.
7. **Orphaned Write**: Creating a poem without a description or text.
8. **PII Leak**: Attempting a `list` query that skips ownership checks (rules must block).
9. **State Shortcut**: If `status` existed, skipping "draft" to "published".
10. **Email Spoofing**: Rule bypass if `email_verified` is not checked.
11. **Shadow Update**: Updating `translatedText` while also sneaking in an `ownerId` change.
12. **Malicious Query**: Trying to list all poems without the `where("ownerId", "==", uid)` clause being enforced by rules.

## 3. Test Runner (Mock)
A `firestore.rules.test.ts` would verify these. In this environment, we'll implement the rules and verify via analysis.
