# Compliance Workflow

Compliance checks normalize provider results into:

```txt
CLEAR
VERIFIED
MATCH
NO_MATCH
REFERRED
FAILED
ERROR
```

Checks that return `MATCH`, `REFERRED`, `FAILED`, or `REVIEW_REQUIRED` create review work. Review decisions are:

```txt
APPROVED
REJECTED
ESCALATED
FALSE_POSITIVE
TRUE_MATCH
```

## Review Queue

Use `/compliance/review-queue` to inspect open review items. Reviewers can mark a match as false positive, true match, rejected, approved, escalated, or expire a check.

## KYC Approval Blocking

KYC approval requires current counterparty checks for:

```txt
BUSINESS_VERIFICATION
SANCTIONS
PEP
ADVERSE_MEDIA
```

Approval is blocked when the latest required check is missing, failed, referred, matched, or still review-required. `FALSE_POSITIVE` or `APPROVED` review decisions clear the blocker. Users with `compliance:override` can bypass the block.

Active UBO records must have person verification and screening evidence before counterparty approval.

## Manual Test Flow

1. Create a normal counterparty.
2. Run KYB and screening.
3. Confirm `VERIFIED` and `CLEAR` checks.
4. Create a counterparty containing `SANCTION`.
5. Run screening.
6. Confirm review queue entry and workflow case.
7. Confirm KYC approval is blocked.
8. Review the sanctions check as `FALSE_POSITIVE`.
9. Approve KYC.
10. Repeat UBO KYC/screening with normal and `PEP` names.
