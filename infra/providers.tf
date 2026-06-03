provider "aws" {
  region = var.region

  # Every resource we create gets these tags automatically — makes OUR resources
  # easy to find (and safely tear down) in this shared account.
  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
