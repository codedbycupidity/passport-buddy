#!/bin/bash

# Automatically fix Claude references in git history

set -e

echo "=== Git History Cleanup ==="
echo "Removing Claude references from commit history"
echo ""

# Create backup
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
echo "Creating backup branch: $BACKUP_BRANCH"
git branch "$BACKUP_BRANCH"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Use git filter-branch to rewrite the specific commit
echo "Rewriting commit messages..."
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter '
if test "$GIT_COMMIT" = "12040fbc934a0001c657f9767360990c6cb7c197"
then
    echo "Remove temporary directory and update gitignore"
else
    cat
fi
' -- --all

# Clean up
echo "Cleaning up..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "=== CLEANUP COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Verify the change: git log --oneline | grep -i claude"
echo "2. Force push to remote:"
echo "   git push github $CURRENT_BRANCH --force"
echo "   git push github main --force"
echo ""
echo "Backup saved in branch: $BACKUP_BRANCH"
echo ""
echo "IMPORTANT: Your team members will need to:"
echo "- Delete their local repository"
echo "- Re-clone from GitHub"