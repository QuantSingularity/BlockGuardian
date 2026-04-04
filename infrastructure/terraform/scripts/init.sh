#!/bin/bash
# Terraform Init Script - Initializes Terraform for a given environment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-dev}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"; }
err()  { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}" >&2; exit 1; }

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    err "Invalid environment: $ENVIRONMENT. Must be: dev, staging, prod"
fi

cd "$TERRAFORM_DIR"

log "Initializing Terraform for environment: $ENVIRONMENT"

TFVARS="environments/${ENVIRONMENT}/terraform.tfvars"
if [[ ! -f "$TFVARS" ]]; then
    err "tfvars file not found: $TFVARS"
fi

# Upgrade providers to latest compatible versions
terraform init -upgrade

log "Terraform initialized successfully for $ENVIRONMENT"
log "Next: run ./scripts/plan.sh $ENVIRONMENT"
