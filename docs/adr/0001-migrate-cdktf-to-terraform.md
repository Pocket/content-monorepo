# Migrate Backend Infrastructure from CDKTF to Terraform

* **Status:** Proposed
* **Deciders:** J, Herraj Luhano, Mathijs Miermans
* **Date:** 2026-09-29

## Context and Problem Statement

The AWS infrastructure for three New Tab backend services is defined in CDK for Terraform (CDKTF), mostly through the `@pocket-tools/terraform-modules` construct library:
- **curated-corpus-api** - ECS behind an ALB, Aurora and alarms (67 resources, including PagerDuty resources we'll remove first)
- **section-manager-lambda** - SQS → Lambda (21 resources)
- **curation-admin-tools** - ECS behind an ALB, deployed by a CodePipeline that the same stack manages (49 resources)

CDKTF "synthesizes" TypeScript into Terraform JSON. Terraform tracks each resource by its *address* in state, so as long as addresses and settings stay the same, rewriting the configuration changes nothing in AWS.

HashiCorp archived CDKTF on 2025-12-10 [1]. Our stacks are on cdktf 0.20.11, which caps the AWS provider at 5.83.1. curation-admin-tools is on 0.11.2 with AWS provider 4.21.0. No fixes are coming, and the toolchain already fails to install on Node 24.

collection-api, prospect-api and prospect-translation-lambda are being decommissioned and are out of scope. corpus-scheduler-lambda is optional; it follows section-manager-lambda's pattern.

How do we move to plain Terraform without changing any deployed resource?

## Decision Drivers

1. No change to deployed resources, beyond an explicit allowlist of changes that today's CDKTF plans already show.
2. Low risk for a small team whose in-scope infrastructure changes rarely (7 commits in the last 12 months).
3. Plain Terraform (HCL) that the team can review, with readability improving over time.
4. We can roll back to CDKTF if a cutover goes wrong.

## Considered Options

|       | Option | Summary | Pros | Cons |
| ----- | ------ | ------- | ---- | ---- |
| **A** | **Convert synthesized JSON to HCL (preferred)** | Generate HCL from `cdktf synth` JSON with a small converter; keep resource addresses | Output matches CDKTF; works for both cdktf versions | We own a small converter |
| **B** | **CDKTF's `synth --hcl` export** | Use CDKTF's built-in HCL export and repair its output | No custom tooling | Unparseable output; silently alters strings; missing in cdktf 0.11 |
| **C** | **Stay on CDKTF** | Keep 0.20.11 and 0.11.2 | No work now; infra rarely changes | Frozen provider versions, archived toolchain |

We looked at three more options and rejected them early:
- **The CDK Terrain fork** [2]: we'd have to port and own `@pocket-tools/terraform-modules`, and its governance is still forming.
- **Hand-written HCL on modules:** every resource moves in state, so proving there's no change becomes manual.
- **Committing the synthesized JSON as `main.tf.json`:** Terraform can run it, but nobody can maintain it by hand.

## Decision Outcome

Proposed option:

* **A.** Convert CDKTF's synthesized JSON to HCL, one stack at a time, on Terraform 1.6.6.

We check the result mechanically: we compare the Terraform plan of the new code with the plan of today's CDKTF code against the same state. So far:
- **section-manager-lambda:** matches on 21 of 21 resources in dev.
- **curated-corpus-api:** matches on the 58 of 67 resources a read-only role can read. The plan doesn't complete yet: 8 of the other 9 are PagerDuty resources, which a separate PR removes first, and the last is a secret the read-only role can't read.
- **curation-admin-tools:** today's CDKTF plan runs cleanly in dev; the HCL compare is still to do.
- **Prod:** each cutover PR's own CI plan runs the new code against prod with the read-only CI role, before anything is applied.

At cutover, the code gets only changes we can check with a plan compare:
- **Split each stack into files by concern** (`alb.tf`, `ecs.tf`, `rds.tf`, ...).
- **Write the ECS container definitions with `jsonencode()`** instead of a 2,400-character escaped string. This only goes in if the plan stays a no-op.
- **Use `${local.environment}` in names**, plus one per-environment map for the ~11 values that really differ between dev and prod.
- **Add `prevent_destroy` on Aurora.** The committed password is a placeholder (the real one lives only in state), so a re-created cluster would get the placeholder.

Resource addresses and output names stay as CDKTF generated them. That is what keeps rollback possible, and the deploy jobs read the output names. We also chose one Terraform root per stack rather than Mozilla's `dev/`/`prod/`/`modules/` layout in webservices-infra. That layout would put a `module.` prefix on every address and break rollback; we can converge on it later with `moved` blocks.

We stay on Terraform 1.6.6, the version CI pins today, so the config source is the only thing that changes. OpenTofu, which Mozilla's shared Terraform CI uses, is a separate follow-up decision.

### Positive Consequences

* About 580 MB of dependencies and a TypeScript build step go away.
* Infrastructure diffs show real AWS resources instead of construct properties.
* Provider upgrades become possible again, one PR per stack after the migration.
* CI checks formatting and validity of every migrated stack for both environments on every PR (a content-monorepo job, and one in curation-admin-tools).

### Negative Consequences

* The code is verbose (curated-corpus-api is ~1,900 lines) and keeps hashed names such as `aws_iam_role.application_ecs_service_ecs-iam_ecs-execution-role_FB754BAA`.
* curation-admin-tools stays on AWS provider 4.21.0 until a separate upgrade.
* A per-stack `concurrency` group has to land before any cutover, and each stack has a 30-day change freeze after its cutover (release strategy [3], principle 5).
* Rollback is a single revert. It ends at that stack's first provider upgrade or at the CDKTF cleanup, whichever comes first.

## Pros and Cons of the Options

### A. Convert synthesized JSON to HCL

A 149-line converter reads the `cdktf synth` JSON and the provider schemas, and writes HCL with the same resources and addresses. content-monorepo stacks switch to the shared workflow's existing `raw-terraform` mode. curation-admin-tools keeps its CodePipeline, and only its `buildspec.yml` changes.

#### Pros

* The same tool covers cdktf 0.20 and 0.11, so curation-admin-tools needs no special path.
* Can move towards idiomatic modules later, one `moved` block at a time.

#### Cons

* The converter is custom code, although it's only run once per stack.
* The output is verbose, with hashed names.

### B. CDKTF's `synth --hcl` export

This was our starting assumption: CDKTF ships an HCL export, so it should do most of the work.

#### Pros

* Built in, with no custom tooling.

#### Cons

* Unparseable for every in-scope stack: JSON strings that contain references (container definitions, secrets, SQS redrive policies) come out garbled.
* Silently alters escaped strings. On curated-corpus-api, a synthetic canary's GraphQL query changed but still passed `terraform validate`; only a structural comparison caught it.
* Not available in cdktf 0.11, so curation-admin-tools would need a separate conversion anyway.

### C. Stay on CDKTF

Keep the current versions and change nothing.

#### Pros

* No work or risk now, and the infrastructure rarely changes.

#### Cons

* Provider upgrades are blocked, and the toolchain no longer installs on current Node.
* The cost arrives later, at a worse time, e.g. when we need a provider 6.x feature.

## Risks

* **Silent non-deploy:** the deploy step only runs when the `ecs-task-containerName` output is present. Renaming it skips prod deploys while CI stays green.
* **Every stack applies at once:** deleting the CDKTF packages rewrites `pnpm-lock.yaml`, which triggers every stack's prod apply. That cleanup waits until every stack's rollback window has closed.

## Implementation Impact

* **Rollout:** one stack at a time, dev before prod, gated on plan comparisons. See the release strategy [3].
* **prospect-api teardown:** section-manager-lambda attaches its SQS policy to an IAM user that prospect-api owns, and the ML team uses that user's access key. Adopting the user needs either a manual `state rm` or a Terraform 1.7+ upgrade first. Open: which of the two, and the ML team needs a heads-up.

## Open Questions

* Who can run a complete dev plan of curated-corpus-api (it needs secret read access)?
* Confirm nobody relies on the curated-corpus-api PagerDuty services before we remove them.
* Who owns the `CurationAdminTools-{Dev,Prod}` CodeBuild projects, which no stack defines?
* Is curation-admin-tools' prod state at `env:/Prod/CurationAdminTools`?

## Links

* [1]: https://github.com/hashicorp/terraform-cdk (archived 2025-12-10)
* [2]: https://github.com/open-constructs/cdk-terrain
* [3]: [Release strategy](cdktf-to-terraform-release-strategy.md)
* Precedent: `infrastructure/user-list-search` in pocket-monorepo used the `raw-terraform` workflow mode, but its workflow is archived and that path hasn't run in a long time. The SML cutover PR's own plan is its first real run.
