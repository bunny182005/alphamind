# Contributing to AlphaMind AI

## Development Workflow
1. Create a descriptive feature branch: `feat/your-feature` or `fix/issue`.
2. Format and lint code:
   ```bash
   ruff check . --fix
   npm run lint --prefix ui
   ```
3. Run unit and integration tests:
   ```bash
   pytest tests/
   npm run build --prefix ui
   ```
4. Submit PR with detailed test verification notes.
