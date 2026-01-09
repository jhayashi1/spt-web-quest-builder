provider "aws" {
	region = "us-east-1"

    default_tags {
        tags = {
            Name = var.project_name
            git_url = var.git_url
        }
    }
}