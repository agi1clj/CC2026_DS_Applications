#!/usr/bin/env bash
# Deploys a bundle (docker-compose.yml + proxy config) to an Elastic Beanstalk environment
# (deploy-aws workflow): upload to S3, register it as an application version, switch the
# environment to it and wait until the update has finished.
#
# Usage: scripts/deploy-beanstalk.sh <application> <environment> <bucket> <bundle.zip> <version-label>
set -euo pipefail

application="$1"
environment="$2"
bucket="$3"
bundle="$4"
label="$5"
key="$application/$label.zip"

status="$(aws elasticbeanstalk describe-environments --application-name "$application" \
  --environment-names "$environment" --query "Environments[?Status!='Terminated'] | [0].Status" --output text)"
if [[ -z "$status" || "$status" == "None" ]]; then
  echo "::error::Elastic Beanstalk environment $environment not found. Run the Infra repository's bootstrap or terraform workflow first."
  exit 1
fi
if [[ "$status" != "Ready" ]]; then
  echo "Environment is $status; waiting until it is Ready..."
  aws elasticbeanstalk wait environment-updated --application-name "$application" --environment-names "$environment"
fi

aws s3 cp "$bundle" "s3://$bucket/$key" --only-show-errors

# Re-running a workflow for the same commit reuses the existing version.
if [[ "$(aws elasticbeanstalk describe-application-versions --application-name "$application" \
  --version-labels "$label" --query 'length(ApplicationVersions)' --output text)" == "0" ]]; then
  aws elasticbeanstalk create-application-version --application-name "$application" \
    --version-label "$label" --source-bundle "S3Bucket=$bucket,S3Key=$key" >/dev/null
  echo "Created application version $label"
fi

started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
aws elasticbeanstalk update-environment --application-name "$application" \
  --environment-name "$environment" --version-label "$label" >/dev/null
echo "Deploying $label to $environment (pulls the images and restarts the containers)..."
aws elasticbeanstalk wait environment-updated --application-name "$application" --environment-names "$environment"

read -r deployed health <<<"$(aws elasticbeanstalk describe-environments --application-name "$application" \
  --environment-names "$environment" --query 'Environments[0].[VersionLabel,Health]' --output text)"
if [[ "$deployed" != "$label" || "$health" == "Red" ]]; then
  echo "::error::Deployment failed (running version: $deployed, health: $health). Recent events:"
  aws elasticbeanstalk describe-events --application-name "$application" --environment-name "$environment" \
    --start-time "$started" --query 'Events[].[EventDate,Severity,Message]' --output text | head -20
  exit 1
fi
echo "Deployed $label to $environment (health: $health)"
