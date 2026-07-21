# Deployment Guide & Git Flow Specifications

This document outlines the environment pipelines, deployment procedures, and branching strategy conventions for the Weekly Production Planner.

---

## 🚀 1. Deployment Pipeline Environments

```
[ Local Development ] (LocalStorage sandbox)
         ↓ (Git Flow branch 'uat')
[ UAT / Test Site ] (LocalStorage isolated per browser)
         ↓ (Git Flow branch 'main')
[ Production Environment ] (Google Sheets & Apps Script DB backend)
```

### 1.1 Local Development
- **Database**: LocalStorage.
- **Goal**: Rapid prototyping, feature implementation, and unit testing.

### 1.2 UAT / Test Site
- **Database**: LocalStorage (isolated per user session).
- **Goal**: Gather feedback, verify UI responsiveness, and run regression tests.
- **Deploy Trigger**: Push to branch `uat`.

### 1.3 Production
- **Database**: Google Sheets & Google Apps Script API endpoints.
- **Goal**: Live business operations.
- **Deploy Trigger**: Merge to branch `main`.

---

## 🌿 2. Git Branching Strategy (Git Flow)

### 2.1 Branch Types
1. **`main`**: Production-ready code. Commits represent official production-grade baseline versions (e.g. tag `v1.2`).
2. **`uat`**: Staging code for user acceptance testing. Includes UAT badges and UAT Feedback Modal controls.
3. **`feature/*`**: Short-lived branches created for specific modifications or features. Merged back to `uat` first, and then to `main` after verification.

### 2.2 Release Tagging Policy
Every stable release must be tagged with semver annotations:
- UAT Release Tag: `uat-vX.Y-test-site`
- Production Release Tag: `vX.Y-production`
