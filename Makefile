.PHONY: install

install:
	@command -v pre-commit >/dev/null 2>&1 || { echo "pre-commit not found. Install it: https://pre-commit.com/#install"; exit 1; }
	pre-commit install --install-hooks
	@echo "pre-commit hooks installed."
