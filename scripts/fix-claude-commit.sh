#!/bin/bash

# Fix single commit mentioning Claude

set -e

echo "This script will change the commit message that mentions Claude"
echo "Current problematic commit: 12040fbc Remove .claude directory and add to .gitignore"
echo ""

# Create backup
echo "Creating backup branch..."
BACKUP_BRANCH="backup-before-claude-fix-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BACKUP_BRANCH"
git checkout source-private

echo ""
echo "To fix this commit, run:"
echo "git rebase -i 12040fbc^"
echo ""
echo "In the editor that opens:"
echo "1. Find the line: pick 12040fbc Remove .claude directory and add to .gitignore"
echo "2. Change 'pick' to 'reword'"
echo "3. Save and close"
echo "4. In the next editor, change the message to: 'Remove temp directory and update gitignore'"
echo "5. Save and close"
echo ""
echo "After rebase completes, force push:"
echo "git push github source-private --force"
echo "git push github main --force"
echo ""
echo "Your backup is saved in branch: $BACKUP_BRANCH"