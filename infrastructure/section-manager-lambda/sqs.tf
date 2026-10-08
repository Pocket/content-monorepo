# SQS
resource "aws_sqs_queue" "section-manager-sqs-lambda_lambda_sqs_queue_redrive_sqs_queue_AC8D9E7D" {
  fifo_queue = false
  name       = "${local.prefix}-SQS-Queue-Deadletter"
  tags       = local.tags
}

resource "aws_sqs_queue" "section-manager-sqs-lambda_lambda_sqs_queue_146756B6" {
  fifo_queue = false
  name       = "${local.prefix}-SQS-Queue"
  redrive_policy = jsonencode({
    maxReceiveCount     = 3
    deadLetterTargetArn = aws_sqs_queue.section-manager-sqs-lambda_lambda_sqs_queue_redrive_sqs_queue_AC8D9E7D.arn
  })
  tags                       = local.tags
  visibility_timeout_seconds = 210 # must be >= the lambda timeout (lambda.tf): SQS hides a message while the lambda works on it
}
