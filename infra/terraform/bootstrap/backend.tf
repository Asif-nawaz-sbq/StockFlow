terraform {
  backend "s3" {
    bucket       = "stockflow-tfstate-156275709542"
    key          = "bootstrap/terraform.tfstate"
    region       = "eu-central-1"
    profile      = "CTDeploy2"
    use_lockfile = true
    encrypt      = true
  }
}
