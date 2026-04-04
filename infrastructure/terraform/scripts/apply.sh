#!/bin/bash
# Terraform Apply Script

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
    err "Invalid environment: $ENVIRONMENT"
fi

cd "$TERRAFORM_DIR"

PLAN_FILE="${ENVIRONMENT}.tfplan"
if [[ ! -f "$PLAN_FILE" ]]; then
    err "Plan file not found: $PLAN_FILE. Run ./scripts/plan.sh $ENVIRONMENT first."
fi

if [[ "$ENVIRONMENT" == "prod" ]]; then
    warn "You are about to apply changes to PRODUCTION!"
    read -rp "Type 'yes-apply-prod' to confirm: " confirm
    if [[ "$confirm" != "yes-apply-prod" ]]; then
        log "Cancelled by user."
        exit 0
    fi
fi

log "Applying Terraform plan for environment: $ENVIRONMENT"
terraform apply "$PLAN_FILE"
rm -f "$PLAN_FILE"
log "Apply completed for $ENVIRONMENT"
