aws_region  = "us-west-2"
environment = "staging"
app_name    = "blockguardian"

vpc_cidr             = "10.1.0.0/16"
availability_zones   = ["us-west-2a", "us-west-2b", "us-west-2c"]
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnet_cidrs = ["10.1.4.0/24", "10.1.5.0/24", "10.1.6.0/24"]
database_subnet_cidrs = ["10.1.7.0/24", "10.1.8.0/24", "10.1.9.0/24"]

instance_type         = "t3.medium"
key_name              = "staging-key"
instance_profile_name = "blockguardian-staging-ec2-profile"

db_instance_class = "db.t3.medium"
db_name           = "blockguardian"
db_username       = "bgadmin"
db_engine         = "mysql"
db_family         = "mysql8.0"
# db_password: set via TF_VAR_db_password env var or AWS Secrets Manager

default_tags = {
  Terraform   = "true"
  Environment = "staging"
  Project     = "blockguardian"
  ManagedBy   = "terraform"
}
