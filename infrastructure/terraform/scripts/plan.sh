#!/bin/bash
# Terraform Plan Script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-dev}"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
err() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}" >&2; exit 1; }

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    err "Invalid environment: $ENVIRONMENT"
fi

if [[ -z "${TF_VAR_db_password:-}" ]]; then
    err "TF_VAR_db_password is not set. Export it before running plan."
fi

cd "$TERRAFORM_DIR"

TFVARS="environments/${ENVIRONMENT}/terraform.tfvars"
if [[ ! -f "$TFVARS" ]]; then
    err "tfvars file not found: $TFVARS"
fi

log "Planning Terraform for environment: $ENVIRONMENT"
terraform plan -var-file="$TFVARS" -out="${ENVIRONMENT}.tfplan"
log "Plan saved to ${ENVIRONMENT}.tfplan"
log "Next: run ./scripts/apply.sh $ENVIRONMENT"
