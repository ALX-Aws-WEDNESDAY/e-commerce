# CI/CD Pipeline Implementation Guide

## ✅ Implementation Complete

All production-grade CI/CD pipeline files have been created and validated. Here's what was implemented:

### Files Created/Modified

1. **`.github/workflows/ci.yml`** — Consolidated unified CI/CD workflow
   - ✅ YAML syntax validated
   - Frontend jobs: lint, build, unit tests with configurable coverage thresholds
   - Backend jobs: lint (flake8, black, isort), unit tests with coverage enforcement, migration check
   - Security jobs: dependency scanning (Safety, npm audit), secrets detection (Gitleaks), SAST (Bandit)
   - Branch-specific enforcement: main (80% coverage), staging (70% coverage), dev (60% coverage)
   - Comprehensive status summary job

2. **`frontend/jest.config.js`** — Jest configuration for React testing
   - ✅ Syntax validated
   - Configured for TypeScript + React components
   - Coverage thresholds: 80% lines, 75% functions, 70% branches, 80% statements
   - Path aliases and CSS module mocking

3. **`frontend/src/test/setup.ts`** — Jest test setup file
   - Global test utilities (testing-library/jest-dom)
   - Browser API mocks (matchMedia, IntersectionObserver)

4. **`frontend/package.json`** — Updated with test dependencies
   - ✅ Syntax validated
   - Added `test:ci` script for CI environments
   - Added Jest, @testing-library/react, @testing-library/jest-dom, ts-jest, identity-obj-proxy

5. **`services/auth/pytest.ini`** — Django pytest configuration
   - ✅ Syntax validated
   - Django settings module configured
   - Test discovery patterns, markers, coverage exclusions
   - Coverage settings for omitting migrations, **init**.py, etc.

6. **`.github/CODEOWNERS`** — Code ownership and review routing
   - Assign frontend/* to @frontend-team
   - Assign services/auth/* to @backend-team
   - Assign .github/workflows/ to @devops-team

---

## 🔧 Next Steps: Branch Protection Rules

To enable mandatory CI checks, you must configure GitHub branch protection rules. Use these steps:

### Step 1: Navigate to Branch Settings

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. Click **Branches** (left sidebar)
4. Click **Add rule** under "Branch protection rules"

### Step 2: Configure Protection for `main` Branch (Production)

**Branch name pattern:** `main`

**Require status checks to pass before merging:**

- ✅ Enable "Require status checks to pass before merging"
- Add the following required status checks (select from dropdown):
  - `Frontend - Lint Code Base`
  - `Frontend - Build`
  - `Frontend - Unit Tests & Coverage`
  - `Backend - Lint & Format Check`
  - `Backend - Unit Tests & Coverage`
  - `Backend - Migration Check`
  - `Security - Dependency Scanning`
  - `Security - Secrets Detection`
  - `Security - SAST (Bandit)`
  - `CI Pipeline Summary`

**Other recommended settings:**

- ✅ Require branch to be up to date before merging (ensures CI runs on latest code)
- ✅ Require a pull request before merging
- ✅ Require approvals (recommend 1–2 approvals)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require code reviews from code owners (uses CODEOWNERS file)
- ✅ Restrict who can push to matching branches (only maintainers)

### Step 3: Configure Protection for `staging` Branch (Pre-Production)

**Branch name pattern:** `staging`

**Require status checks to pass before merging:**

- ✅ Enable "Require status checks to pass before merging"
- Same checks as `main` (all 10 checks)

**Other settings:**

- ✅ Require branch to be up to date before merging
- ✅ Require a pull request before merging
- ✅ Require approvals (recommend 1 approval)
- ✅ Require code reviews from code owners

### Step 4: Configure Protection for `dev` Branch (Development)

**Branch name pattern:** `dev`

**Require status checks to pass before merging:**

- ✅ Enable "Require status checks to pass before merging"
- Add all 10 required status checks

**Other settings:**

- ✅ Require branch to be up to date before merging
- ✅ Require a pull request before merging
- ⚪ Require approvals (optional, 0–1 approvals for faster dev velocity)

---

## 📊 Branch-Specific Enforcement Strategy

The CI pipeline automatically adjusts enforcement based on the target branch:

| Check | main | staging | dev |
| ------- | ------ | --------- | ----- |
| **Frontend Coverage** | 80% required | 70% required | 60% required |
| **Backend Coverage** | 80% required | 70% required | 60% required |
| **Lint (Frontend)** | Enforced | Enforced | Enforced |
| **Lint (Backend)** | Enforced | Enforced | Enforced |
| **Security – Deps** | Fail on HIGH/CRIT | Fail on HIGH/CRIT | Warn only |
| **Security – Secrets** | Enforced | Enforced | Enforced |
| **Security – SAST** | Fail on findings | Fail on findings | Warn only |
| **Migration Check** | Required | Required | Required |

---

## 🚀 Using the Pipeline

### For Developers (Creating PRs)

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/my-feature dev
   ```

2. **Run pre-commit locally** (recommended before staging/PR):

   ```bash
   # install pre-commit
   pip install pre-commit

   # install hooks
   pre-commit install

   # run manually once on all files
   pre-commit run --all-files
   ```

3. **Commit and push**

   ```bash
   git add .
   git commit -m "feat: ..."
   git push origin feature/my-feature
   ```

4. **Open PR** and verify GitHub Status checks.

## 🧰 New pre-commit configuration

A repository-wide `.pre-commit-config.yaml` file is added in the root with these hooks:

- `ruff` + `ruff-format` for Python linting+formatting
- `mypy` for Python type checking
- `sqlfluff` for SQL linting/fix
- standard hooks: trailing-whitespace, end-of-file-fixer, check-yaml, check-toml, check-merge-conflict, debug-statements
- `eslint` for frontend JS/TS linting
- local hooks:
  - `frontend-jest` runs `npm ci && npm run test:ci` in `frontend/`
  - `backend-migrations` runs Django migration dry-run check

### Tailoring the hook set

Modify `.pre-commit-config.yaml` if you want to change routes (e.g., add `black` or `isort` hook directly, or skip SQLFluff in certain repos).

---

### Optional future integration

If you want to keep Husky + pre-commit in sync:

- remove `.husky/pre-commit` and use pre-commit exclusively, or
- keep Husky for `git` event bindings and let `.pre-commit-config.yaml` enforce syntax/QA.

### Notes

- The git hook mechanism works for Node + Python both (pre-commit is Python-based but can run bash/Node commands).
- `frontend-jest` in pre-commit is built as a local hook to support custom command flow.

### Enough! Continue with the existing instructions below

   ```bash
   git checkout -b feature/my-feature dev
   ```

1. **Make your changes** and commit:

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

2. **Push to GitHub and create a PR:**

   ```bash
   git push origin feature/my-feature
   ```

   - If targeting `dev`: Coverage threshold is 60% (more lenient)
   - If targeting `staging`: Coverage threshold is 70%
   - If targeting `main`: Coverage threshold is 80% (strictest)

3. **Watch CI checks run** in the PR:
   - All 10 required checks must pass
   - Approvals required based on branch rules
   - After approval, merge button becomes available

### For Code Reviewers

1. **Review PRs** using GitHub's UI
2. **Check CI status** — Green checkmark means all automated checks passed
3. **Approve and merge** once code review is complete and CI is green

### For Hotfixes

1. Branch from `main`
2. Make fix, test locally
3. Create PR targeting `main` (strictest checks)
4. Once merged to `main`, cherry-pick to `staging` and `dev` if needed

---

## 📝 Local Development Setup

To test CI checks locally before pushing:

### Frontend Tests

```bash
cd frontend

# Install dependencies
npm install

# Run linter
npm run lint

# Run tests with coverage
npm run test:ci

# Run tests in watch mode
npm run test
```

### Backend Tests

```bash
cd services/auth

# Install dependencies
pip install -r requirements.txt

# Run linter checks
flake8 . --count --select=E9,F63,F7,F82 --statistics
black --check .
isort --check-only .

# Run tests with coverage (requires PostgreSQL running locally)
pytest . --cov=. --cov-report=html --cov-fail-under=80
```

### Running Full CI Locally (Optional)

Use `act` (GitHub Actions runner) to test workflows locally:

```bash
# Install act: https://github.com/nektos/act
brew install act

# Run the workflow locally
cd /home/midega-g/Desktop/Learning/e-commerce
act push --job frontend-lint --job backend-lint
```

---

## 🔐 Security Scanning Details

### Safety (Python Dependencies)

- Scans `services/auth/requirements.txt` for known vulnerabilities
- **Main:** Fails on any vulnerability
- **Dev/Staging:** Warns only (advisory)
- See: <https://safety.io/>

### Gitleaks (Secrets Detection)

- Scans all code for accidentally committed credentials, API keys, etc.
- **All branches:** Enforced
- Automatically leaves comments on PRs if secrets detected
- See: <https://github.com/gitleaks/gitleaks-action>

### Bandit (Python SAST)

- Static security analyzer for Python code
- Checks for common security vulnerabilities (SQL injection, hardcoded passwords, etc.)
- **Main:** Fails on findings
- **Dev/Staging:** Advisory only
- See: <https://bandit.readthedocs.io/>

### npm audit (Frontend)

- Scans Node.js dependencies for vulnerabilities
- **Main:** Fails on HIGH/CRITICAL vulnerabilities
- **Dev/Staging:** Warns only (advisory, doesn't block merge)

---

## 📊 Coverage Artifacts

After CI runs, coverage reports are available as artifacts:

- **Frontend Coverage**: `frontend-coverage/` — HTML coverage report
- **Backend Coverage**: `backend-coverage/` — HTML coverage report + coverage summary
- **Backend Tests**: `backend-test-results/` — JUnit XML format
- **Bandit Report**: `bandit-report/` — SAST findings in JSON format

Download artifacts from any PR:

1. Go to PR → **Checks** tab
2. Click on job (e.g., "Backend - Unit Tests & Coverage")
3. Scroll down to **Artifacts** section
4. Download coverage HTML and open in browser

---

## 🛠️ Troubleshooting

### PR Stuck in Workflow

- Check **Checks** tab in the PR for which job is pending/failing
- Click job name to see logs
- Common issues:
  - Insufficient code coverage (make sure tests cover your changes)
  - Linting errors (auto-fix with `npm run lint --fix` or `black .`)
  - Missing migrations (`python manage.py makemigrations`)

### Secrets Detected by Gitleaks

- If Gitleaks flags a secret:
  1. Remove sensitive data from code
  2. Commit a fix
  3. Use `git filter-branch` or GitHub secret scanning to remove it from history
  4. Push the fix
  5. PR will now pass Gitleaks check

### Coverage Below Threshold

- Add more tests to your code
- View coverage artifacts to see which lines need covering
- Run locally: `npm run test:ci` (frontend) or `pytest --cov` (backend)

### Backend Tests Fail Due to DB Connection

- Workflow uses PostgreSQL 16 service container
- If tests fail locally, ensure PostgreSQL is running:

  ```bash
  # macOS with Homebrew
  brew services start postgresql@16

  # Ubuntu
  sudo systemctl start postgresql
  ```

### Django Migration Issues

- If migration check fails, run locally:

  ```bash
  cd services/auth
  python manage.py makemigrations
  git add . && git commit -m "migrations"
  ```

---

## 📚 Resources

- **GitHub Actions Docs**: <https://docs.github.com/actions>
- **GitHub Branch Protection**: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches>
- **Jest Documentation**: <https://jestjs.io/>
- **Pytest Documentation**: <https://docs.pytest.org/>
- **Django Testing Guide**: <https://docs.djangoproject.com/en/stable/topics/testing/>
- **GitHub CODEOWNERS**: <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners>

---

## 🎯 Final Verification Checklist

Before deploying to production:

- [ ] All workflow files created and YAML syntax validated
- [ ] Frontend jest.config.js and test setup created
- [ ] Frontend package.json updated with Jest dependencies and test:ci script
- [ ] Backend pytest.ini created with coverage configuration
- [ ] CODEOWNERS file created for code review routing
- [ ] Branch protection rules configured for main, staging, dev
- [ ] Required status checks assigned in branch protection
- [ ] Team members assigned as code owners in CODEOWNERS
- [ ] Local testing performed (`npm run test:ci` and `pytest` commands work)
- [ ] Test PR created against main to verify all checks pass
- [ ] Coverage artifacts uploadable and viewable in PR

---

## 📞 Support

For questions or issues, refer to:

1. GitHub Actions logs in your PR **Checks** tab
2. Artifact downloads for detailed error messages
3. CI pipeline execution recorded in **Actions** tab (top of repo)
