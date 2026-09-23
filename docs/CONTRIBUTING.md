# Contributing

## Workflow

1. Fork / branch; work on `main` or a feature branch.
2. Keep changes small and focused.
3. Run the checks before pushing:
   ```bash
   npm test          # integrity + syntax tests
   npm run lint      # JS style checks
   ```
4. Open a pull request with a clear description.

## Conventions

- **Frontend**: vanilla JS, no framework, no build step. Scripts are classic
  `<script>` tags loaded in the order defined in `frontend/index.html`.
- **Style**: 2-space indentation, double quotes, semicolons, no unnecessary
  comments in production code.
- **Pages**: new views are an HTML fragment in `frontend/pages/` merged into
  `frontend/index.html` body section.
- **Modules**: view logic goes in `frontend/scripts/modules/<name>.js`.
- **i18n**: add strings to both the EN and RU dictionaries in
  `frontend/scripts/translations.js`.
- **Database**: follow `database/schema.sql` style (snake_case, triggers for
  `updated_at`). Add to `schema.sql` and a numbered migration.

## Integrity guarantee

The frontend is a restructured single-file app. Do **not** break the
dependency order of `frontend/scripts` and do not leave `getElementById`
references to ids that do not exist — `tests/` verifies these invariants.

## License

CC0 1.0 Universal — see `LICENSE`.