# Git Pull Commands - Quick Reference

## 🔄 Basic Pull Commands

### Pull from current branch:
```bash
git pull
```

### Pull from specific remote and branch:
```bash
git pull origin main
```

### Pull from current branch's upstream:
```bash
git pull origin cursor/repository-content-reading-76b8
```

---

## 🔧 Pull Options

### Pull with rebase (cleaner history):
```bash
git pull --rebase
```

### Pull and merge (default):
```bash
git pull --no-rebase
```

### Pull only, don't merge:
```bash
git fetch
git merge origin/main
```

### Pull with verbose output:
```bash
git pull --verbose
```

---

## 🛡️ Safe Pull Commands

### Check what will be pulled first:
```bash
# Fetch without merging
git fetch

# See what's different
git log HEAD..origin/main

# Then pull if you want
git pull
```

### Pull with auto-stash (saves local changes):
```bash
git pull --autostash
```

### Pull and discard local changes:
```bash
# ⚠️ WARNING: This discards local changes!
git fetch
git reset --hard origin/main
```

---

## 📋 Common Scenarios

### Pull latest from main branch:
```bash
git checkout main
git pull origin main
```

### Pull latest from your feature branch:
```bash
git checkout cursor/repository-content-reading-76b8
git pull origin cursor/repository-content-reading-76b8
```

### Pull and see what changed:
```bash
git pull --verbose
git log --oneline -5
```

### Pull specific file only:
```bash
git fetch
git checkout origin/main -- path/to/file.js
```

---

## 🔀 Pull with Branch Management

### Pull and update all branches:
```bash
git fetch --all
git pull --all
```

### Pull and prune deleted branches:
```bash
git pull --prune
```

### Pull with tags:
```bash
git pull --tags
```

---

## ⚡ Quick Commands for Your Project

### Pull latest main:
```bash
cd /workspace
git checkout main
git pull origin main
```

### Pull latest feature branch:
```bash
cd /workspace
git checkout cursor/repository-content-reading-76b8
git pull origin cursor/repository-content-reading-76b8
```

### Pull and rebase your branch on main:
```bash
cd /workspace
git checkout cursor/repository-content-reading-76b8
git fetch origin
git rebase origin/main
```

---

## 🐛 Troubleshooting

### If pull fails due to conflicts:
```bash
# See conflicts
git status

# Resolve conflicts, then:
git add .
git commit

# Or abort merge:
git merge --abort
```

### If pull fails due to local changes:
```bash
# Option 1: Stash changes, pull, then apply stash
git stash
git pull
git stash pop

# Option 2: Commit changes first
git add .
git commit -m "Local changes"
git pull
```

### Force pull (discard local changes):
```bash
# ⚠️ WARNING: Loses local changes!
git fetch origin
git reset --hard origin/main
```

---

## 📝 Best Practices

### Always check status first:
```bash
git status
git pull
```

### Pull before pushing:
```bash
git pull
git push
```

### Pull with rebase for cleaner history:
```bash
git pull --rebase
```

---

## 🎯 Most Common Commands

```bash
# 1. Check current status
git status

# 2. Pull latest changes
git pull

# 3. If conflicts, resolve and commit
git add .
git commit -m "Resolved conflicts"

# 4. Push your changes
git push
```

---

## 💡 Pro Tips

1. **Always pull before starting work:**
   ```bash
   git pull origin main
   ```

2. **Use fetch + merge for safety:**
   ```bash
   git fetch
   git merge origin/main
   ```

3. **Pull with rebase for linear history:**
   ```bash
   git pull --rebase
   ```

4. **Check what you're pulling:**
   ```bash
   git fetch
   git log HEAD..origin/main
   git pull
   ```
