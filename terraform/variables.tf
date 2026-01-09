variable "domain" {
  description = "Domain name for the website (optional, for future custom domain setup)"
  type        = string
  default     = ""
}

variable "git_url" {
  description = "Git repository URL"
  type        = string
  default     = "https://github.com/jhayashi1/spt-web-quest-builder"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "spt-web-quest-builder"
}

variable "bucket_name" {
  description = "Name of the S3 bucket for website hosting"
  type        = string
  default     = "spt-web-quest-builder"
}