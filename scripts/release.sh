#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Run this command inside the repository."
  exit 1
fi

if [ ! -f package.json ]; then
  echo "package.json not found at repo root."
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "Release must be run from 'main'. Current branch: $branch"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit/stash changes before releasing."
  exit 1
fi

echo "Choose release type:"
echo "1) patch"
echo "2) minor"
echo "3) major"
read -r -p "Enter choice [1-3]: " choice

case "$choice" in
  1) release_type="patch" ;;
  2) release_type="minor" ;;
  3) release_type="major" ;;
  *) echo "Invalid choice."; exit 1 ;;
esac

old_version="$(node -p "require('./package.json').version")"
npm version "$release_type" --no-git-tag-version >/dev/null
new_version="$(node -p "require('./package.json').version")"
tag="v${new_version}"

release_date="$(date +%Y-%m-%d)"
last_tag="$(git describe --tags --abbrev=0 2>/dev/null || true)"

if [ -n "$last_tag" ]; then
  commits="$(git log --pretty=format:'- %s (%h)' "${last_tag}..HEAD")"
else
  commits="$(git log --pretty=format:'- %s (%h)')"
fi

[ -z "$commits" ] && commits="- No changes listed."

touch CHANGELOG.md
tmp_file="$(mktemp)"
{
  echo "# Changelog"
  echo
  echo "## ${tag} - ${release_date}"
  echo
  echo "$commits"
  echo
  if [ -s CHANGELOG.md ]; then
    # Remove existing title to avoid duplicates.
    tail -n +2 CHANGELOG.md
  fi
} >"$tmp_file"
mv "$tmp_file" CHANGELOG.md

git add package.json CHANGELOG.md
git commit -m "chore(release): ${tag} (from ${old_version})"
git tag "${tag}"
git push origin main
git push origin "${tag}"

echo "Release prepared and pushed: ${tag}"
echo "GitHub Release will be created by workflow: Create GitHub Release"
