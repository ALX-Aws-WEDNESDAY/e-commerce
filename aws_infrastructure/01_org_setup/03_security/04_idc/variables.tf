variable "email_george" {
  description = "Primary email for george_shinrai. IDC sends the activation invite to this address."
  type        = string
  sensitive   = true
}

variable "email_kinyanjui" {
  description = "Primary email for kinyanjui_shinrai."
  type        = string
  sensitive   = true
}

variable "email_ayana" {
  description = "Primary email for ayana_shinrai."
  type        = string
  sensitive   = true
}
