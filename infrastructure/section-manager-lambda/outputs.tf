# Output names match CDKTF so `terraform output -json` consumers see no change.
output "section-manager-sqs-lambda_lambda_function_name_A21C655B" {
  value       = aws_lambda_function.section-manager-sqs-lambda_D7365DAE.function_name
  description = "Lambda Function Name"
}

output "section-manager-sqs-lambda_lambda_arn_83D1BA1E" {
  value       = aws_lambda_function.section-manager-sqs-lambda_D7365DAE.arn
  description = "Lambda Function ARN"
}

output "section-manager-sqs-lambda_lambda_version_arn_C4E0E329" {
  value       = aws_lambda_alias.section-manager-sqs-lambda_alias_3275471A.arn
  description = "Lambda Version ARN"
}

output "section-manager-sqs-lambda_lambda-code-deploy_lambda_codedeploy_app_D7297E70" {
  value       = aws_codedeploy_app.section-manager-sqs-lambda_lambda-code-deploy_code-deploy-app_600748B9.name
  description = "Lambda CodeDeploy App Name"
}

output "section-manager-sqs-lambda_lambda-code-deploy_lambda_codedeploy_group_DD01D734" {
  value       = aws_codedeploy_deployment_group.section-manager-sqs-lambda_lambda-code-deploy_code-deployment-group_AE66E4AC.deployment_group_name
  description = "Lambda CodeDeploy Group Name"
}
