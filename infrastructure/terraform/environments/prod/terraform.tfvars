aws_region  = "us-west-2"
environment = "prod"
app_name    = "blockguardian"

vpc_cidr             = "10.2.0.0/16"
availability_zones   = ["us-west-2a", "us-west-2b", "us-west-2c"]
public_subnet_cidrs  = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
private_subnet_cidrs = ["10.2.4.0/24", "10.2.5.0/24", "10.2.6.0/24"]
database_subnet_cidrs = ["10.2.7.0/24", "10.2.8.0/24", "10.2.9.0/24"]

instance_type         = "t3.large"
key_name              = "prod-key"
instance_profile_name = "blockguardian-prod-ec2-profile"

db_instance_class = "db.t3.large"
db_name           = "blockguardian"
db_username       = "bgadmin"
db_engine         = "mysql"
db_family         = "mysql8.0"
# NEVER hardcode db_password here. Use one of:
# 1. export TF_VAR_db_password=$(aws secretsmanager get-secret-value --secret-id prod/blockguardian/db --query SecretString --output text | jq -r .password)
# 2. Use aws_secretsmanager_secret_version data source in Terraform
# 3. Use -var="db_password=$DB_PASS" in CI/CD pipeline with secret injection

default_tags = {
  Terraform   = "true"
  Environment = "prod"
  Project     = "blockguardian"
  ManagedBy   = "terraform"
}
