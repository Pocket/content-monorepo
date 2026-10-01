locals {
  name   = "SectionManagerLambda"
  prefix = "${local.name}-${local.environment}"

  # Per-env values. Indexing fails on anything other than Dev/Prod, which is the guard.
  env = {
    Dev  = { node_env = "development" }
    Prod = { node_env = "production" }
  }[local.environment]

  tags = {
    service        = local.name
    environment    = local.environment
    app_code       = "content"
    component_code = "content-${lower(local.name)}"
    env_code       = lower(local.environment)
  }

  region     = data.aws_region.pocket-vpc_current_region_1602AAD6.name
  account_id = data.aws_caller_identity.pocket-vpc_current_identity_8303C1C9.account_id
}
