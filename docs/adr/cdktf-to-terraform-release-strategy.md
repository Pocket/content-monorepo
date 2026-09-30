# Release strategy: CDKTF → Terraform cutover

Scope: section-manager-lambda (SML), curated-corpus-api (CCA), curation-admin-tools (CAT). corpus-scheduler-lambda is optional and follows SML's recipe. There are no dates or effort estimates here; the team schedules the work.

Commands for every gate are in [`scripts/cdktf-to-terraform/README.md`](../../scripts/cdktf-to-terraform/README.md). Plan allowlists are in [`scripts/cdktf-to-terraform/allowlists/<stack>.txt`](../../scripts/cdktf-to-terraform/allowlists/): exact addresses, each with a reason, each also present in today's CDKTF plan.

## Principles

1. **One stack per cutover, dev before prod.** CAT shares no repo, CI, state or lockfile with the others, so it can run in parallel.
2. **The cutover PR changes no infrastructure.** Resource addresses, output names and the workflow `name:` stay the same. The only other changes are ones the gates show as no-ops.
3. **Gates are tools that fail closed**, and an errored plan is a failure. The one exception is the prod gate, a CI plan log that a person reads. It has a fixed checklist.
4. **No cutovers** during Mozilla work weeks (team offsites), on Fridays, or the day before a day off.
5. **No infrastructure changes to a stack for 30 days after its prod cutover**, apart from a fix-forward during an incident. GitHub allows re-running a workflow run for up to 30 days, and a re-run of a pre-cutover run would apply the old CDKTF config. That's harmless only while both configs are identical. Alternative: delete that workflow's pre-cutover runs (`gh run delete`), at the cost of losing their logs.

## Phase 0: prerequisites (no infrastructure change)

| # | Item | Why |
|---|---|---|
| 0.1 | Merge the per-stack `concurrency` PR (`cancel-in-progress: false`) as a normal release, **and let it reach `dev`**, before any cutover. Note: changing a workflow file triggers a prod redeploy of SML and CCA. | Stops an old CDKTF run and a new HCL run of the same stack from overlapping. It doesn't order them, and a newer pending run cancels an older one, which is why the freeze and principle 5 still apply. |
| 0.2 | Merge the migration tools PR (`scripts/cdktf-to-terraform/`) | The gates depend on it |
| 0.3 | **CCA only:** merge the PagerDuty-removal PR and apply it to dev and prod as a normal release. Then regenerate the CCA baseline, overrides and allowlist from the post-removal `main`. | Otherwise CCA's cutover plans show the PagerDuty destroys |
| 0.4 | **CCA only:** get a dev role or session that can `secretsmanager:GetSecretValue` on the CCA RDS secret, for the dev gate | Without it, the dev plan errors and the gate fails |
| 0.5 | Name an owner for `ProspectAPI-{env}-Queue-User`. Agree that prospect-api's teardown waits while any cutover or 30-day window is open, and that it's handled as a fix-forward in HCL. | ML uses its access key; deleting it breaks SML's apply and a CDKTF rollback |
| 0.6 | Create a "cutover freeze" ruleset on `main` and `dev` that restricts updates, with a bypass for repo admins (the three backend engineers). Leave it disabled. | `main` has `enforce_admins: true`, so a branch lock would block the cutover merge itself; `dev` has no protection |
| 0.7 | Merge the CI Terraform checks PR (fmt + validate for both envs) | Every PR then checks formatting and validity of each migrated stack for dev and prod, so CI stays at parity with CDKTF's build |

## Phase 1: per-stack cutover

Suggested order: **SML, then CCA**, and **CAT independently**.
- SML: smallest, proven in dev, and nothing consumes its outputs.
- CCA: its `ecs-*` outputs drive the deploy.
- CAT: the CDKTF dev baseline is clean, and the HCL compare is in its PR.

**Roles:** one engineer drives, a second reviews the gate output and watches the deploy.

1. **Offline gate:** `tfeq.js` exits 0 for dev and prod against a fresh synth of `main`, with the committed `overrides.json`.
2. **Dev gate:** read-only dev plans of the CDKTF baseline and the HCL. `strict-compare-plans.sh baseline candidate allowlist` exits 0.
3. **Cutover PR:**
   - Adds the HCL and `{dev,prod}_backend.tfvars`, switches to `raw-terraform: true` with `stack-output-path` at the stack root, and deletes `cdktf.json`.
   - `package.json`, `src/`, `pnpm-lock.yaml` and the workflow `name:` stay unchanged.
   - For CAT: `buildspec.yml` switches to terraform, keeps `TF_WORKSPACE` and fixes the `cp` path.
4. **Prod gate (human, checklist):**
   - **SML/CCA:** compare the cutover PR's CI prod plan with the CI prod plan of a no-infrastructure PR on the same `main`. The summary line and the set of changed addresses must be identical, and every changed address must be on the allowlist. Re-run the PR's plan right before merge.
   - **CAT** (its CI plan uses `-refresh=false`): a human runs refreshed prod plans of the CDKTF baseline and the HCL. That needs `aws configure export-credentials` for prod read-only, `TF_WORKSPACE=Prod`, `-lock=false`, and a Linux or Intel machine (the lockfile has no darwin_arm64 hash for null 2.1.2). Compare with the tool, then delete the plan files, because prod plan JSON holds secrets in plaintext.
5. **Freeze:**
   - Enable the freeze ruleset.
   - Check `dev` for other people's work in progress before resetting it.
   - Confirm there are no in-progress or queued runs of the stack's workflow. For CAT, confirm the last pipeline execution succeeded and nothing is in progress.
   - Renovate plans can still take the state lock. That fails safe: re-run the job.
6. **Dev cutover:** push the PR head to `dev`. Confirm:
   - the apply shows only allowlisted changes;
   - the deploy step ran rather than being skipped (CCA: `ecs-codedeploy`; SML: the Lambda code updated) and the running version is the new one;
   - a re-run of the infrastructure job plans only allowlisted changes (idempotency).
7. **Prod cutover:** merge to `main` with normal review and the required checks. Run the same confirmations, then disable the freeze.
8. **After cutover:** principle 5 applies. For CAT, no Retry and no manual `start-build` of pre-cutover pipeline executions. Reset `dev` to `main`, so a stale branch can't reintroduce CDKTF.
9. **Closing the rollback window:** at least one later prod apply whose deploy step actually ran, and 30 days since the prod cutover.

## Rollback

**Triggers:**
- a change that isn't on the allowlist;
- a skipped or failed deploy step;
- a missing output.

A state-lock error or a cancelled run is **not** a trigger: re-run the job.

**Action:**
- Keep the freeze and revert the cutover PR, with normal review and the required checks (including `test-integrations` for CCA).
- The revert alone restores CDKTF, for every stack.
- If prospect-api's IAM user is already gone, a rollback fails the same way the HCL does: fix forward.

## CCA env-named addresses

Two CCA resources have env-specific CDKTF addresses (`aws_s3_bucket_{ownership_controls,public_access_block}.pocket-curatedcorpusapi-{dev,prod}-images`). Terraform addresses can't be variables, so these two blocks live in `dev_backend.tfvars` and `prod_backend.tfvars`, which CI copies to `backend.tf`. Each env keeps its exact address: no `moved` blocks, and rollback stays one revert.

## Phase 2: cleanup (only migrated stacks)

- Remove the CDKTF packages and scripts of migrated stacks. The root `synth` then needs a turbo `--filter`, or the remaining CDKTF stacks must stay in the pipeline. `packages/infrastructure-common` and the `infrastructure/*` workspace entry stay while any CDKTF stack remains.
- The lockfile change triggers every stack and **redeploys every app in prod**. Run it as its own normal release.
- Provider bumps come after that, one PR per stack: AWS 5.83.1 → 6.x, and CAT 4.21.0 → 5, which replaces `aws_subnet_ids`. A stack's first provider bump ends its rollback option.
- Cleaning up collection-api's state belongs to its decommission.

## Communication

- Announce each freeze window in the team channel beforehand.
- Tell the ML team about the IAM-user plan before prospect-api's teardown.
- After each cutover, post the gate outputs and the deploy run links.
