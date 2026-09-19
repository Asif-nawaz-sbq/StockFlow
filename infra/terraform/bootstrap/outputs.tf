output "state_bucket" {
  description = "Name of the S3 bucket holding Terraform state."
  value       = aws_s3_bucket.state.id
}

output "state_bucket_arn" {
  description = "ARN of the state bucket, for the CI role policy."
  value       = aws_s3_bucket.state.arn
}


