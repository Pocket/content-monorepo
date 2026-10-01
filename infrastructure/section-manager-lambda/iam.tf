# Execution role
data "aws_iam_policy_document" "section-manager-sqs-lambda_assume-policy-document_F99472DC" {
  version = "2012-10-17"
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      identifiers = ["lambda.amazonaws.com", "edgelambda.amazonaws.com"]
      type        = "Service"
    }
  }
}

resource "aws_iam_role" "section-manager-sqs-lambda_execution-role_D23D53C9" {
  assume_role_policy = data.aws_iam_policy_document.section-manager-sqs-lambda_assume-policy-document_F99472DC.json
  name               = "${local.prefix}-SQS-ExecutionRole"
  tags               = local.tags
}

data "aws_iam_policy_document" "section-manager-sqs-lambda_execution-policy-document_1AB11EF3" {
  version = "2012-10-17"
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
    ]
    effect    = "Allow"
    resources = ["arn:aws:logs:*:*:*"]
  }
  statement {
    actions = ["secretsmanager:GetSecretValue", "kms:Decrypt"]
    resources = [
      "arn:aws:secretsmanager:${local.region}:${local.account_id}:secret:${local.name}/${local.environment}",
      "arn:aws:secretsmanager:${local.region}:${local.account_id}:secret:${local.name}/${local.environment}/*",
    ]
  }
  statement {
    actions = [
      "ec2:DescribeNetworkInterfaces",
      "ec2:CreateNetworkInterface",
      "ec2:DeleteNetworkInterface",
      "ec2:DescribeInstances",
      "ec2:AttachNetworkInterface",
    ]
    effect    = "Allow"
    resources = ["*"]
  }
}

resource "aws_iam_policy" "section-manager-sqs-lambda_execution-policy_EC3142E4" {
  name   = "${local.prefix}-SQS-ExecutionRolePolicy"
  policy = data.aws_iam_policy_document.section-manager-sqs-lambda_execution-policy-document_1AB11EF3.json
  tags   = local.tags
}

resource "aws_iam_role_policy_attachment" "section-manager-sqs-lambda_execution-role-policy-attachment_E506CF5F" {
  policy_arn = aws_iam_policy.section-manager-sqs-lambda_execution-policy_EC3142E4.arn
  role       = aws_iam_role.section-manager-sqs-lambda_execution-role_D23D53C9.name
  depends_on = [aws_iam_role.section-manager-sqs-lambda_execution-role_D23D53C9, aws_iam_policy.section-manager-sqs-lambda_execution-policy_EC3142E4]
}


data "aws_iam_policy_document" "section-manager-sqs-lambda_lambda-code-deploy_code-deploy-assume-role-policy-document_5B4957EF" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      identifiers = ["codedeploy.amazonaws.com"]
      type        = "Service"
    }
  }
}

resource "aws_iam_role" "section-manager-sqs-lambda_lambda-code-deploy_code-deploy-role_F5C93DC6" {
  assume_role_policy = data.aws_iam_policy_document.section-manager-sqs-lambda_lambda-code-deploy_code-deploy-assume-role-policy-document_5B4957EF.json
  name               = "${local.prefix}-SQS-CodeDeployRole"
}

resource "aws_iam_role_policy_attachment" "section-manager-sqs-lambda_lambda-code-deploy_code-deploy-policy-attachment_063AA94C" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambda"
  role       = aws_iam_role.section-manager-sqs-lambda_lambda-code-deploy_code-deploy-role_F5C93DC6.name
  depends_on = [aws_iam_role.section-manager-sqs-lambda_lambda-code-deploy_code-deploy-role_F5C93DC6]
}


data "aws_iam_policy_document" "section-manager-sqs-lambda_lambda_sqs_policy_39CDD9DB" {
  statement {
    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ChangeMessageVisibility",
    ]
    effect    = "Allow"
    resources = [aws_sqs_queue.section-manager-sqs-lambda_lambda_sqs_queue_146756B6.arn]
  }
}

resource "aws_iam_policy" "section-manager-sqs-lambda_sqs-policy_C1BC09EC" {
  name       = "${local.prefix}-SQS-LambdaSQSPolicy"
  policy     = data.aws_iam_policy_document.section-manager-sqs-lambda_lambda_sqs_policy_39CDD9DB.json
  tags       = local.tags
  depends_on = [aws_iam_role.section-manager-sqs-lambda_execution-role_D23D53C9]
}

resource "aws_iam_role_policy_attachment" "section-manager-sqs-lambda_execution-role-policy-attachment_8368C6D5" {
  policy_arn = aws_iam_policy.section-manager-sqs-lambda_sqs-policy_C1BC09EC.arn
  role       = aws_iam_role.section-manager-sqs-lambda_execution-role_D23D53C9.name
  depends_on = [aws_iam_role.section-manager-sqs-lambda_execution-role_D23D53C9, aws_iam_policy.section-manager-sqs-lambda_sqs-policy_C1BC09EC]
}


# The ML side enqueues as IAM user ProspectAPI-<env>-Queue-User. prospect-api owns
# that user (created in its stack), so it is referenced by name only. It must get a
# new owner before prospect-api is decommissioned: see
# docs/adr/0001-migrate-cdktf-to-terraform.md.
data "aws_iam_policy_document" "corpus-scheduler-ml-user-policy_iam_sqs_policy_2CE4E3DF" {
  statement {
    actions   = ["sqs:SendMessage", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"]
    effect    = "Allow"
    resources = [aws_sqs_queue.section-manager-sqs-lambda_lambda_sqs_queue_146756B6.arn]
  }
}

resource "aws_iam_policy" "corpus-scheduler-ml-user-policy_iam-sqs-policy_867A1D82" {
  name   = "IAM-${local.prefix}-QueuePolicy"
  policy = data.aws_iam_policy_document.corpus-scheduler-ml-user-policy_iam_sqs_policy_2CE4E3DF.json
  tags   = local.tags
}

resource "aws_iam_user_policy_attachment" "corpus-scheduler-ml-user-policy_iam-sqs-user-policy-attachment_22113AFF" {
  policy_arn = aws_iam_policy.corpus-scheduler-ml-user-policy_iam-sqs-policy_867A1D82.arn
  user       = "ProspectAPI-${local.environment}-Queue-User"
}
