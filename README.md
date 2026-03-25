# ecommerce website

Short guide to set up, test, lint, and run CI locally for this repository.

Prerequisites
- Python 3.8+ and git
- Docker (for running CI locally with `act`) — optional

Local setup
1. Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies (if any) and test tools:

```bash
pip install -r requirements.txt || true
pip install pytest flake8
```

Run tests

```bash
pytest -q
# or run a single test quickly
python3 -c "from tests.python_test import test_add; test_add(); print('OK')"
```

Linting

```bash
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
```

Run CI locally with `act` (optional)
1. Install `act` (see https://github.com/nektos/act)
2. Create an `event.json` in repo root with:

```json
{ "ref": "refs/heads/main" }
```

3. Run the workflow (map runner image to a Docker image):

```bash
act -P ubuntu-latest=nektos/act-environments-ubuntu:18.04 -e event.json
```

Notes
- We added a small test-support `tests/conftest.py` to ensure the project root
	is on `PYTHONPATH` during pytest collection. Consider renaming the `code`
	package to avoid shadowing Python's stdlib `code` module.
- To push changes to `main`, create a branch and open a pull request so required
	status checks can run.

Collaboration
- See `CONTRIBUTING.md` for contribution guidelines, PR process, testing expectations, and communication channels.
