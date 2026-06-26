output "prompt_logs_bucket" {
  description = "Name of the Kiro prompt logs bucket."
  value       = aws_s3_bucket.prompt_logs.id
}

output "activity_reports_bucket" {
  description = "Name of the Kiro activity reports bucket."
  value       = aws_s3_bucket.activity_reports.id
}
