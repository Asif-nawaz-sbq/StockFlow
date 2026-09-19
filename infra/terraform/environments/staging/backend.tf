/**
 * Remote state.
 *
 * Backend blocks cannot use variables, so the bucket name is literal. It is
 * created by infra/terraform/bootstrap, which must be applied first.
 *
 * No `profile` here on purpose. Locally, export AWS_PROFILE=CTDeploy2; in CI
 * the assumed role supplies credentials and a named profile would not exist.
 *
 * Locking uses `use_lockfile`, the S3-native lock introduced in Terraform
 * 1.10. It writes a .tflock object next to the state, which makes the old
 * DynamoDB table redundant - `dynamodb_table` is deprecated as of 1.11 and
 * warns on init.
 */
terraform {
  backend "s3" {
    bucket       = "stockflow-tfstate-156275709542"
    key          = "staging/terraform.tfstate"
    region       = "eu-central-1"
    use_lockfile = true
    encrypt      = true
  }
}
