# Copied to backend.tf by pocket-monorepo/.github/actions/raw-terraform on the
# `main` branch. Despite the extension this is HCL, not a tfvars file. The
# backend and the environment name are the only things that differ per env;
# everything else is derived from local.environment (locals.tf).
terraform {
  backend "s3" {
    bucket         = "mozilla-content-team-prod-terraform-state"
    dynamodb_table = "mozilla-content-team-prod-terraform-state"
    key            = "SectionManagerLambda"
    region         = "us-east-1"
  }
}

locals {
  environment = "Prod"
}
