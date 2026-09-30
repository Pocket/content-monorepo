# local.environment comes from <env>_backend.tfvars; locally:
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
