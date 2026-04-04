# Terraform Backend Configuration
#
# LOCAL BACKEND (Development/Testing):
# By default, Terraform uses local state (terraform.tfstate in current directory).
# This is suitable for local testing only. DO NOT use local backend for production.
#
# REMOTE BACKEND (Production/Team):
# Uncomment and configure the S3 backend below for production use.
# Setup steps:
# 1. Create S3 bucket:
#    aws s3 mb s3://your-terraform-state-bucket --region us-east-1
# 2. Enable versioning:
#    aws s3api put-bucket-versioning --bucket your-terraform-state-bucket \
#      --versioning-configuration Status=Enabled
# 3. Enable encryption:
#    aws s3api put-bucket-encryption --bucket your-terraform-state-bucket \
#      --server-side-encryption-configuration \
#      '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
# 4. Block public access:
#    aws s3api put-public-access-block --bucket your-terraform-state-bucket \
#      --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
# 5. Create DynamoDB table for state locking:
#    aws dynamodb create-table --table-name terraform-state-lock \
#      --attribute-definitions AttributeName=LockID,AttributeType=S \
#      --key-schema AttributeName=LockID,KeyType=HASH \
#      --billing-mode PAY_PER_REQUEST
# 6. Uncomment the backend block below and update values
# 7. Run: terraform init -migrate-state

# backend "s3" {
#   bucket         = "your-terraform-state-bucket-name"  # Change this!
#   key            = "blockguardian/terraform.tfstate"
#   region         = "us-east-1"                         # Change to your region
#   encrypt        = true
#   dynamodb_table = "terraform-state-lock"
# }
