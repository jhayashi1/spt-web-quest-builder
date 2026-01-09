variable "domain" {
  description = "Domain name for the website (optional, for future custom domain setup)"
  type        = string
  default     = ""
}

variable "git_url" {
  description = "Git repository URL"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "bucket_name" {
  description = "Name of the S3 bucket for website hosting"
  type        = string
}