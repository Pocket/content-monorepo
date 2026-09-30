# Lambda from PocketSQSWithLambdaTarget (@pocket-tools/terraform-modules 5.20.0).
# The SQS visibility timeout (sqs.tf) must stay >= the lambda timeout.

# Code bucket
resource "aws_s3_bucket" "section-manager-sqs-lambda_code-bucket_B7EF5E37" {
  bucket        = "pocket-${lower(local.prefix)}-sqs"
  force_destroy = true
  tags          = local.tags
}

resource "aws_s3_bucket_ownership_controls" "section-manager-sqs-lambda_code-bucket-ownership-controls_D9819A6E" {
  bucket = aws_s3_bucket.section-manager-sqs-lambda_code-bucket_B7EF5E37.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "section-manager-sqs-lambda_code-bucket-acl_A6EC0060" {
  acl        = "private"
  bucket     = aws_s3_bucket.section-manager-sqs-lambda_code-bucket_B7EF5E37.id
  depends_on = [aws_s3_bucket_ownership_controls.section-manager-sqs-lambda_code-bucket-ownership-controls_D9819A6E]
}

resource "aws_s3_bucket_public_access_block" "section-manager-sqs-lambda_code-bucket-public-access-block_B7A82248" {
  block_public_acls   = true
  block_public_policy = true
  bucket              = aws_s3_bucket.section-manager-sqs-lambda_code-bucket_B7EF5E37.id
}


# Lambda (code is deployed by CodeDeploy; terraform only creates a placeholder)
data "archive_file" "section-manager-sqs-lambda_lambda-default-file_9FFED07F" {
  output_path = "index.js.zip"
  type        = "zip"
  source {
    content  = "exports.handler = (event, context) => { console.log(event) }"
    filename = "index.js"
  }
}

resource "aws_lambda_function" "section-manager-sqs-lambda_D7365DAE" {
  filename                       = data.archive_file.section-manager-sqs-lambda_lambda-default-file_9FFED07F.output_path
  function_name                  = "${local.prefix}-SQS-Function"
  handler                        = "index.handler"
  memory_size                    = 512
  publish                        = true
  reserved_concurrent_executions = 1
  role                           = aws_iam_role.section-manager-sqs-lambda_execution-role_D23D53C9.arn
  runtime                        = "nodejs20.x"
  source_code_hash               = data.archive_file.section-manager-sqs-lambda_lambda-default-file_9FFED07F.output_base64sha256
  tags                           = local.tags
  timeout                        = 180

  environment {
    variables = {
      ENVIRONMENT = local.env.node_env
      JWT_KEY     = "${local.name}/${local.environment}/JWT_KEY"
      NODE_ENV    = local.env.node_env
      REGION      = local.region
      SENTRY_DSN  = data.aws_ssm_parameter.section-manager-sqs-lambda_sentry-dsn_935F5894.value
    }
  }

  vpc_config {
    security_group_ids = data.aws_security_groups.pocket-vpc_default_security_groups_1F0F3778.ids
    subnet_ids         = data.aws_subnets.pocket-vpc_private_subnet_ids_73CCA71D.ids
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash, publish]
  }
}

resource "aws_cloudwatch_log_group" "section-manager-sqs-lambda_log-group_00316439" {
  name              = "/aws/lambda/${aws_lambda_function.section-manager-sqs-lambda_D7365DAE.function_name}"
  retention_in_days = 14
  tags              = local.tags
  depends_on        = [aws_lambda_function.section-manager-sqs-lambda_D7365DAE]
}

resource "aws_lambda_alias" "section-manager-sqs-lambda_alias_3275471A" {
  function_name    = aws_lambda_function.section-manager-sqs-lambda_D7365DAE.function_name
  function_version = element(split(":", aws_lambda_function.section-manager-sqs-lambda_D7365DAE.qualified_arn), 7)
  name             = "DEPLOYED"

  lifecycle {
    ignore_changes = [function_version]
  }
  depends_on = [aws_lambda_function.section-manager-sqs-lambda_D7365DAE]
}


# CodeDeploy
resource "aws_codedeploy_app" "section-manager-sqs-lambda_lambda-code-deploy_code-deploy-app_600748B9" {
  compute_platform = "Lambda"
  name             = "${local.prefix}-SQS-Lambda"
}


resource "aws_codedeploy_deployment_group" "section-manager-sqs-lambda_lambda-code-deploy_code-deployment-group_AE66E4AC" {
  app_name               = aws_codedeploy_app.section-manager-sqs-lambda_lambda-code-deploy_code-deploy-app_600748B9.name
  deployment_config_name = "CodeDeployDefault.LambdaAllAtOnce"
  deployment_group_name  = aws_codedeploy_app.section-manager-sqs-lambda_lambda-code-deploy_code-deploy-app_600748B9.name
  service_role_arn       = aws_iam_role.section-manager-sqs-lambda_lambda-code-deploy_code-deploy-role_F5C93DC6.arn

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }
  depends_on = [aws_codedeploy_app.section-manager-sqs-lambda_lambda-code-deploy_code-deploy-app_600748B9]
}


resource "aws_lambda_event_source_mapping" "section-manager-sqs-lambda_lambda_event_source_mapping_B67750B1" {
  batch_size                         = 1
  event_source_arn                   = aws_sqs_queue.section-manager-sqs-lambda_lambda_sqs_queue_146756B6.arn
  function_name                      = aws_lambda_alias.section-manager-sqs-lambda_alias_3275471A.arn
  maximum_batching_window_in_seconds = 60
}
