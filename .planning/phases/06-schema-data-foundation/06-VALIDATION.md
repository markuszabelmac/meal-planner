---
phase: 6
slug: schema-data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Prisma CLI + psql assertions |
| **Config file** | prisma/schema.prisma |
| **Quick run command** | `npx prisma validate && npx prisma db push --dry-run` |
| **Full suite command** | `npx prisma validate && npx prisma migrate status` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx prisma validate`
- **After every plan wave:** Run `npx prisma validate && npx prisma migrate status`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DB-01 | schema | `npx prisma validate` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | DB-02 | schema | `npx prisma validate` | ✅ | ⬜ pending |
| 06-01-03 | 01 | 1 | DB-03 | schema+migration | `npx prisma validate` | ✅ | ⬜ pending |
| 06-01-04 | 01 | 1 | DB-04 | migration | `npx prisma migrate status` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | DB-05 | seed | `npx prisma db seed` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Prisma schema validates with new models
- [ ] Migration runs without errors on dev database

*Existing infrastructure covers schema validation. Seed verification is manual (run seed, check row count).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| pg_trgm fuzzy search works | DB-04 | Requires running DB with extension | Run `SELECT similarity('Hackfleisch', name) FROM ingredients LIMIT 5` against seeded DB |
| USDA seed has German names | DB-05 | Data quality check | Spot-check 10 random ingredients for German name + English alias |
| MealPlan supports 2 meals/day | DB-03 | Constraint validation | Insert 2 MealPlan rows for same date+user with different mealTypes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
