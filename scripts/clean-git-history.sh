#!/bin/bash

# Clean Git History Script - Remove Claude References

set -e

echo "Creating backup branch before history rewrite..."
git checkout -b backup-before-claude-cleanup-$(date +%Y%m%d-%H%M%S)
git checkout source-private

echo "Cleaning commit messages..."
# This will rewrite history to remove Claude references from commit messages
git filter-branch -f --msg-filter '
  sed -e "s/claude//" -e "s/Claude//" -e "s/CLAUDE//" -e "s/\.claude//" | 
  sed -e "/^$/d"
' --tag-name-filter cat -- --all

echo "Cleaning up refs..."
# Remove original refs
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# Force garbage collection
git reflog expire --expire=now --all && git gc --prune=now --aggressive

echo "History cleaned! Claude references removed."
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. Review the changes: git log --oneline | head -20"
echo "2. Force push to ALL branches:"
echo "   git push github source-private --force"
echo "   git push github main --force"
echo "3. Tell your team members to re-clone the repository"
echo ""
echo "Your backup branch: backup-before-claude-cleanup-$(date +%Y%m%d-%H%M%S)"