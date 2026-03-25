# Contributing

Thank you for your interest in contributing to this project! Please follow these guidelines to make collaboration smooth and efficient.

1. Filing issues
- Search existing issues before opening a new one.
- Use a clear title and describe the problem or feature request with steps to reproduce, expected behavior, and any relevant logs.

2. Branches and PRs
- Create a feature branch from `main`: `git checkout -b fix/your-topic`.
- Push the branch and open a Pull Request targeting `main`.
- Use a descriptive title and include the motivation and summary in the PR body.

3. Coding style
- Follow the existing code style. Use `flake8` for Python linting.
- Write small, focused commits. Use clear commit messages (consider Conventional Commits).

4. Tests
- Add tests for new features or bug fixes. Run `pytest -q` locally before opening a PR.
- If tests rely on services, document how to run them locally in the PR description.

5. Code review
- Expect at least one reviewer to leave comments. Address feedback by pushing follow-up commits.
- Rebase or merge `main` if necessary to resolve conflicts — prefer rebasing for a clean history.

6. CI and checks
- The repository enforces required status checks. Ensure your PR passes CI before requesting a merge or it will be rejected automatically by github.

7. Communication
- Use the project issue tracker for design discussions.
- Reachout on whatsApp incase of anything

8. Code of Conduct
- Be respectful and follow the project's Code of Conduct.
