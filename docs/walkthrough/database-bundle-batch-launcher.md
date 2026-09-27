# Database Bundle Batch Launcher

Added `build-db-install.bat` in the project root. Double-click it on Windows to generate `dbscripts/install.sql`; the window stays open to show success or errors. Use `build-db-install.bat --no-pause` from a terminal to exit without waiting for a keypress.

The launcher checks for Node.js, resolves the generator relative to its own location, and preserves the generation exit code. It only generates the SQL bundle and never executes SQL against a database. Updated both README files with usage instructions.

Validation: ran the batch file with `--no-pause` from outside the project directory. It successfully generated the bundle from all 14 object files and returned exit code 0. `git diff --check` passed.
