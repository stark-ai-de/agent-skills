# <Product or feature> blueprint

> Derived working template, not an accepted ADR or evidence of implementation. Use only relevant sections. Replace placeholders; do not invent facts to fill them.

## Overview

**Purpose and audience:** <problem, user, intended benefit>.
**Agreed target breadth:** <all essential capabilities and core journeys>.
**Current state:** <what exists, with evidence>.
**Non-goals:** <explicit exclusions>.
**Next usable increment:** <complete bounded user promise>.
**Important uncertainty:** <risks and unresolved decisions visible at this level>.

Navigation: [Structure](#structure) · [Delivery](#delivery) · [Contracts](#contracts) · [Evidence and decisions](#evidence-and-decisions)

## Structure

| ID | Responsibility | Interactions | Authoritative contract |
| --- | --- | --- | --- |
| <M-01> | <one coherent responsibility> | <required inputs/outputs and other module IDs> | <link> |

Describe one central end-to-end journey. A diagram may clarify the same relationships; do not introduce undocumented modules or hide external dependencies in it.

## Delivery

| Increment | Complete user promise | Included journey and dependencies | Excluded variants | Acceptance and recovery |
| --- | --- | --- | --- | --- |
| <R-01> | <independently useful outcome> | <existing + this increment only> | <scope boundaries> | <demonstration, failures, recovery, environment> |
| <R-02> | <next useful outcome> | <R-01 plus new work> | <deferred scope> | <planned proof, not a result> |

**Closure check:** Does any increment need a later increment to fulfill its own promise? Fix the slice or narrow the promise before calling it an MVP.

**Enablers/POCs:** <question or dependency, consuming increment, effort limit, stop/cleanup condition>. These are not automatically product increments.

## Contracts

### <M-01: name>

**Parent and responsibility:** <ID, purpose, exclusions>.
**Interface:** <inputs, observable outputs, errors, side effects>.
**Required behavior:** <invariants and conditions>.
**Dependencies:** <required guarantees and cross-cutting constraints>.
**Decision status:** <proposed/accepted, source and owner>.
**Evidence:** <claim, source, revision, environment, result, limitations; or not available>.
**Planned acceptance:** <scenarios not yet run>.
**Open risks:** <decision-relevant assumptions and questions>.
**Drill-down:** <links; deferred details and revisit triggers>.

## Evidence and decisions

| Claim or requirement | Kind | Owning contract/journey | Decision or evidence reference | Limitation / next check |
| --- | --- | --- | --- | --- |
| <statement> | <requirement/assumption/proposal/accepted decision/observed fact> | <ID> | <reference or missing> | <scope and uncertainty> |

**Consistency review:** <coverage, composition, conflicts, invalidated evidence>.
**Still unknown:** <material unanswered questions only>.
**Next bounded action:** <selected slice or missing prerequisite>.
**Persistence:** <requested/not requested/pending/saved with read-back; no implied implementation approval>.
