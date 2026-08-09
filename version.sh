#!/usr/bin/env bash
set -euo pipefail

# Bumps a semver git tag (vMAJOR.MINOR.PATCH) and pushes it to GitHub.
# Usage: ./version.sh [major|minor|patch]   (default: patch)

bump="${1:-patch}"

latest="$(git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n1)"
latest="${latest:-v0.0.0}"
IFS='.' read -r major minor patch <<< "${latest#v}"

case "$bump" in
  major) major=$((major + 1)); minor=0; patch=0 ;;
  minor) minor=$((minor + 1)); patch=0 ;;
  patch) patch=$((patch + 1)) ;;
  *) echo "Usage: $0 [major|minor|patch]" >&2; exit 1 ;;
esac

new="v${major}.${minor}.${patch}"

log_range="HEAD"
[ "$latest" != "v0.0.0" ] && log_range="${latest}..HEAD"

{
  echo "## ${new} - $(date +%Y-%m-%d)"
  echo
  git log "$log_range" --pretty='format:- %s'
  echo
  echo
  [ -f CHANGELOG.md ] && cat CHANGELOG.md
} > CHANGELOG.md.tmp
mv CHANGELOG.md.tmp CHANGELOG.md

git add CHANGELOG.md
git commit -q -m "chore: release ${new}"
git tag "$new"
git push -q origin HEAD "$new"
echo "$new"
