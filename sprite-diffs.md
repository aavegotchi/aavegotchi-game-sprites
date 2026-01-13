## Implementation Plan

1. Audit input directories
   - Confirm absolute paths for `Trait Files` and `Trait Files Old` relative to the repo root.
   - List their subdirectory structures to ensure the comparison covers the nested `Sprites/` tree.

2. Design comparison strategy
   - Normalize relative paths from each root so matches account for identical subfolder layouts.
   - Decide whether to include non-file entries (e.g., directories, hidden files) or filter by extensions such as `.png`.

3. Implement diff script
   - Create a TypeScript Node script (e.g., `scripts/compare-traits.ts`) that recursively walks both directories using `fs/promises`.
   - Store file inventories in `Set<string>` collections keyed by relative path for `Trait Files` and `Trait Files Old`.
   - Compute differences to highlight files missing from the new folder (present only in the old set); optionally include the inverse diff for completeness.
   - Provide a CLI interface to override directory paths, defaulting to the two trait folders.

4. Output results
   - Log missing file paths grouped by subdirectory to the console and optionally write them to a timestamped report (e.g., `reports/trait-mismatch.json`) for auditing.
   - Exit with a non-zero status if missing files are detected, enabling CI integration.

5. Validation
   - Dry run the script locally and verify it detects representative missing files by temporarily removing known assets.
   - Document usage in `README` or within the script header comment for future reference.

### Clarifying Questions

1. Should the script ignore specific file types or metadata files (e.g., `.DS_Store`, JSON manifests), or should it diff every filesystem entry?

Yeah you can ignore DS_STORE and metadata.

2. Do you only need the list of files missing from `Trait Files`, or should the script also flag files that exist only in the new folder?

Both, missing and new ones.

3. Is a console report sufficient, or would you prefer the script to emit a structured file (JSON/CSV) for downstream tooling?

A JSON export would be great.

