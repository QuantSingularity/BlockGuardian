aws_region  = "us-west-2"
environment = "dev"
app_name    = "blockguardian"

vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-west-2a", "us-west-2b", "us-west-2c"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
database_subnet_cidrs = ["10.0.7.0/24", "10.0.8.0/24", "10.0.9.0/24"]

instance_type         = "t3.micro"
key_name              = "dev-key"
instance_profile_name = "blockguardian-dev-ec2-profile"

db_instance_class = "db.t3.micro"
db_name           = "blockguardian"
db_username       = "bgadmin"
db_engine         = "mysql"
db_family         = "mysql8.0"
# db_password: set via TF_VAR_db_password env var or AWS Secrets Manager
# export TF_VAR_db_password="your-secure-password"

default_tags = {
  Terraform   = "true"
  Environment = "dev"
  Project     = "blockguardian"
  ManagedBy   = "terraform"
}
