#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_IMAGE=mindcrime30/mayhem:latest

export GIT_SSH_COMMAND='ssh -i ~/.ssh/8layer8_github -o IdentitiesOnly=yes'
# Fargate runs linux/amd64; without this, builds on Apple Silicon target arm64.
export DOCKER_DEFAULT_PLATFORM=linux/amd64

VERSION="$("${SCRIPT_DIR}/version.sh" patch)"

docker build --no-cache -t "$LOCAL_IMAGE" -f "${SCRIPT_DIR}/Dockerfile" "${SCRIPT_DIR}"
docker push "$LOCAL_IMAGE"

docker tag "$LOCAL_IMAGE" "mindcrime30/mayhem:${VERSION}"
docker push "mindcrime30/mayhem:${VERSION}"
