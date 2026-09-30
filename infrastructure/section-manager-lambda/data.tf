# PocketVPC lookups (only the ones this stack uses).
data "aws_ssm_parameter" "pocket-vpc_vpc_ssm_param_17802658" {
  name = "/Shared/Vpc"
}

data "aws_vpc" "pocket-vpc_2587E211" {
  filter {
    name   = "vpc-id"
    values = [data.aws_ssm_parameter.pocket-vpc_vpc_ssm_param_17802658.value]
  }
}

data "aws_ssm_parameter" "pocket-vpc_private_subnets_75BAFB11" {
  name = "/Shared/PrivateSubnets"
}

data "aws_subnets" "pocket-vpc_private_subnet_ids_73CCA71D" {
  filter {
    name   = "subnet-id"
    values = split(",", data.aws_ssm_parameter.pocket-vpc_private_subnets_75BAFB11.value)
  }
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.pocket-vpc_2587E211.id]
  }
}

data "aws_security_groups" "pocket-vpc_default_security_groups_1F0F3778" {
  filter {
    name   = "group-name"
    values = ["default"]
  }
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.pocket-vpc_2587E211.id]
  }
}

data "aws_caller_identity" "pocket-vpc_current_identity_8303C1C9" {}
data "aws_region" "pocket-vpc_current_region_1602AAD6" {}

data "aws_ssm_parameter" "section-manager-sqs-lambda_sentry-dsn_935F5894" {
  name = "/${local.name}/${local.environment}/SENTRY_DSN"
}
