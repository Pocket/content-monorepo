# Plain Terraform for section-manager-lambda, converted from the CDKTF stack
# (cdktf synth JSON, NODE_ENV=development and production). Resource addresses
# and output names keep the CDKTF logical IDs so they match existing state.
#
# local.environment ("Dev" | "Prod") comes from {dev,prod}_backend.tfvars,
# which CI copies to backend.tf. Locally:
#   cp dev_backend.tfvars backend.tf && terraform init -backend=false

terraform {
  required_version = ">= 1.6.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.83.1"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "2.7.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = local.tags
  }
}

provider "archive" {}
