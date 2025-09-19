## TypeScript Migration Plan

This document outlines the approach to convert the repository from JavaScript to TypeScript, along with open questions to clarify before implementation.

### Scope

- Convert `generate_spritesheets.js` (Node script) → `src/generate_spritesheets.ts` (or keep at root as `.ts`).

up to you

- Convert `website/viewer.js` (browser script) → `website/viewer.ts` compiled to `website/viewer.js`.

don't compile the js files for a release. just use tsc

- Introduce `tsconfig.json` with separate configs for Node (ESM/CJS decision pending) and browser builds if needed.

ok

- Add minimal type declarations for domain objects (Gotchi, Attribute, Config structures).

yes

### Proposed Structure

- `src/` for Node TypeScript sources.
- `website/` keeps browser source; TS source as `viewer.ts` compiled to `viewer.js` (same path) to avoid changing HTML.

OK

### Build Tooling

- Use `tsc` only (no bundler) unless required.

yes

- For browser file, compile `viewer.ts` with `tsc` targeting ES2017+ and `dom` libs, output to `website/viewer.js` (no module system changes; plain script).

OK

- For Node script, target Node 18, `es2022`, CommonJS by default (or ESM if preferred; see questions).

OK

### Typings To Add

- Interfaces:

  - `Gotchi` with `id: number`, `collateral?: string`, `attributes: GotchiAttribute[]`.
  - `GotchiAttribute` with `trait_type: string`, `value: string`.
  - `Config`, `ConditionSet`, `Property` based on `config.json` schema.
  - Result objects for generation step to make logging and error handling typed.

  OK

### Behavioral Parity

- Maintain existing CLI flags and defaults.
- Maintain output paths and file names.
- Preserve verbose logs and error handling.
- Keep `website/viewer.html` usage identical (still loads `viewer.js`).

yes

### Scripts

- Add scripts:
  - `build:node` → compile Node TS to `dist/` or root js.
  - `build:web` → compile `website/viewer.ts` to `website/viewer.js`.
  - `build` → run both.
  - `generate` → `node dist/generate_spritesheets.js` (if output to dist) or `tsx src/generate_spritesheets.ts` if runtime TS is acceptable.

---

## Questions

1. Module system preference for Node script?

   - Option A: CommonJS (current). Keep `require` syntax and compile TS to CJS.
   - Option B: ES Modules. Switch to `type: "module"` in `package.json` and use `import` syntax.

   import syntax

2. Output layout for Node build?

   - Option A: Keep source at root, compile in-place to `generate_spritesheets.js` (overwrites). Simpler, but mixes build artifacts with source.
   - Option B: Move TS to `src/` and output JS to `dist/` (recommended). Update npm script to `node dist/generate_spritesheets.js`.

   no dist/. don't compile to js. jst use .ts files directly.

3. Browser build requirements?

   - Is it acceptable to keep `website/viewer.ts` unbundled and compile directly to `website/viewer.js` with `tsc` (no imports)? This preserves the `<script src="viewer.js">` tag and global functions like `window.closeModal`.

yes.

4. Minimum Node/runtime targets?

   - README says Node 18+. Confirm that as the compile target (`target: ES2022`, `module: commonjs`).

   sure.

5. Strictness level?

   - Enable `strict: true`? I recommend yes. I will add pragmatic `unknown`/`any` where needed for parsed JSON with runtime validation where critical.

   yes strict true

6. Type safety for `config.json` and `processedAavegotchis.json`?

yes

- Should I add a lightweight runtime validator (e.g., manual guards) or depend entirely on interfaces and trust input?

interfaces only

7. Keep CLI interface unchanged?

   - I will maintain current flags (`--limit`, `--ids`, `--start`, `--batch`, `--verbose`) and their behavior.

   yes

8. Any future plans to publish this as an npm package or keep as a script?

yes i want to publish this as an NPM package that other repos can import and compile directly. b

- If packaging, we might add proper exports and a library API surface.

OK yes

9. Performance constraints?

   - Any desire to stream/compress logs or chunk writes? Current approach will remain the same unless requested.

   nope

10. Licensing header preferences for new TS files?

- Keep MIT header as in README?

yes

---

If you confirm preferences, I will proceed to implement the migration accordingly.
