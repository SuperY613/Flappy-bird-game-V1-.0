#!/usr/bin/env bash
# Example script to create a GitHub repo locally and push using gh CLI.
# Edit REPO_NAME before running, or pass as first argument.
REPO_NAME="${1:-flappy999}"
if ! command -v gh >/dev/null; then
  echo "Please install GitHub CLI (gh) and authenticate first."
  exit 1
fi
git init
git add .
git commit -m "Initial commit: Flappy 999 full project"
echo "Creating GitHub repo ${REPO_NAME}..."
gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
echo "Done."
