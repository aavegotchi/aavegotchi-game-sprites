import { mkdir, readdir, stat, writeFile } from 'fs/promises';
import path from 'path';

type GroupedDiff = Record<string, string[]>;

interface CliOptions {
  newDir: string;
  oldDir: string;
  reportDir: string;
  extensions: string[];
  newStripPrefix?: string;
  oldStripPrefix?: string;
}

const DEFAULT_NEW_DIR = path.resolve(process.cwd(), 'Trait Files');
const DEFAULT_OLD_DIR = path.resolve(process.cwd(), 'Trait Files Old');
const DEFAULT_REPORT_DIR = path.resolve(process.cwd(), 'reports');
const DEFAULT_NEW_STRIP_PREFIX = 'Sprites';
const IGNORED_BASENAMES = new Set(['.ds_store', 'ds_store', 'thumbs.db', 'desktop.ini', 'metadata', 'metadata.json']);
const IGNORED_RELATIVE_PREFIXES = ['projectiles/'];
const IGNORED_RELATIVE_EXACT = new Set(['projectiles']);

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    await Promise.all([assertDirectory(options.newDir), assertDirectory(options.oldDir)]);

    const [newFiles, oldFiles] = await Promise.all([
      collectFiles(options.newDir, options.extensions, options.newStripPrefix),
      collectFiles(options.oldDir, options.extensions, options.oldStripPrefix),
    ]);

    const newSet = new Set(newFiles);
    const oldSet = new Set(oldFiles);

    const onlyInNew = [...newSet].filter((relPath) => !oldSet.has(relPath)).sort();
    const onlyInOld = [...oldSet].filter((relPath) => !newSet.has(relPath)).sort();

    logInventorySummary(options, newFiles.length, oldFiles.length);
    reportDiff('Files only in new directory', onlyInNew);
    reportDiff('Files only in old directory', onlyInOld);

    const groupedReport = {
      generatedAt: new Date().toISOString(),
      newDir: options.newDir,
      oldDir: options.oldDir,
      filters: {
        extensions: options.extensions.length ? options.extensions : ['*'],
        ignoredBasenames: [...IGNORED_BASENAMES],
        ignoredRelativePrefixes: IGNORED_RELATIVE_PREFIXES,
        ignoredRelativeExact: [...IGNORED_RELATIVE_EXACT],
      },
      totals: {
        newFiles: newFiles.length,
        oldFiles: oldFiles.length,
        onlyInNew: onlyInNew.length,
        onlyInOld: onlyInOld.length,
      },
      onlyInNew: groupByDirectory(onlyInNew),
      onlyInOld: groupByDirectory(onlyInOld),
    };

    const reportPath = await writeReport(options.reportDir, groupedReport);
    console.log(`\nReport written to: ${reportPath}`);

    if (onlyInNew.length > 0 || onlyInOld.length > 0) {
      console.error('Differences detected between the trait directories.');
      process.exitCode = 1;
    } else {
      console.log('No differences detected.');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    newDir: DEFAULT_NEW_DIR,
    oldDir: DEFAULT_OLD_DIR,
    reportDir: DEFAULT_REPORT_DIR,
    extensions: [],
    newStripPrefix: DEFAULT_NEW_STRIP_PREFIX,
    oldStripPrefix: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case '--new':
      case '--newDir':
        options.newDir = resolveFromCwd(requireValue(argv, ++i, token));
        break;
      case '--old':
      case '--oldDir':
        options.oldDir = resolveFromCwd(requireValue(argv, ++i, token));
        break;
      case '--report':
      case '--reportDir':
        options.reportDir = resolveFromCwd(requireValue(argv, ++i, token));
        break;
      case '--ext':
      case '--extensions':
        options.extensions.push(...splitExtensions(requireValue(argv, ++i, token)));
        break;
      case '--newStrip':
        options.newStripPrefix = requireValue(argv, ++i, token);
        break;
      case '--oldStrip':
        options.oldStripPrefix = requireValue(argv, ++i, token);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  options.extensions = Array.from(new Set(options.extensions.map(normalizeExtension))).filter(Boolean);
  return options;
}

function splitExtensions(value: string): string[] {
  return value
    .split(',')
    .map((ext) => ext.trim())
    .filter(Boolean);
}

function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

async function assertDirectory(target: string): Promise<void> {
  const stats = await stat(target);
  if (!stats.isDirectory()) {
    throw new Error(`Not a directory: ${target}`);
  }
}

async function collectFiles(root: string, extensions: string[], stripPrefix?: string): Promise<string[]> {
  const files: string[] = [];
  await walk(root, root, extensions, files, stripPrefix);
  return files.sort();
}

async function walk(
  currentDir: string,
  root: string,
  extensions: string[],
  files: string[],
  stripPrefix?: string,
): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entryName = entry.name;
      if (IGNORED_BASENAMES.has(entryName.toLowerCase())) {
        return;
      }

      const fullPath = path.join(currentDir, entryName);
      if (entry.isDirectory()) {
        await walk(fullPath, root, extensions, files, stripPrefix);
        return;
      }

      if (!entry.isFile()) {
        return;
      }

      const extension = path.extname(entryName).toLowerCase();
      if (extensions.length > 0 && !extensions.includes(extension)) {
        return;
      }

      const relative = path.relative(root, fullPath).split(path.sep).join('/');
      const normalized = stripPrefix ? stripLeadingDirectory(relative, stripPrefix) : relative;
      if (!normalized) {
        return;
      }
      if (shouldIgnoreRelativePath(normalized)) {
        return;
      }
      files.push(normalized);
    }),
  );
}

function stripLeadingDirectory(relativePath: string, folder: string): string | null {
  if (!folder) {
    return relativePath;
  }
  const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalizedFolder) {
    return relativePath;
  }
  if (relativePath === normalizedFolder) {
    return null;
  }
  if (relativePath.startsWith(`${normalizedFolder}/`)) {
    return relativePath.slice(normalizedFolder.length + 1);
  }
  return relativePath;
}

function shouldIgnoreRelativePath(relativePath: string): boolean {
  if (IGNORED_RELATIVE_EXACT.has(relativePath)) {
    return true;
  }
  return IGNORED_RELATIVE_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function logInventorySummary(options: CliOptions, newCount: number, oldCount: number): void {
  console.log('Comparison summary:');
  console.log(`  New directory: ${options.newDir}`);
  console.log(`  Old directory: ${options.oldDir}`);
  console.log(`  Files scanned (new): ${newCount}`);
  console.log(`  Files scanned (old): ${oldCount}`);
  if (options.extensions.length > 0) {
    console.log(`  Extensions filter: ${options.extensions.join(', ')}`);
  } else {
    console.log('  Extensions filter: none (all files considered)');
  }
}

function reportDiff(title: string, files: string[]): void {
  if (files.length === 0) {
    console.log(`\n${title}: none 🎉`);
    return;
  }

  console.log(`\n${title} (${files.length}):`);
  const grouped = groupByDirectory(files);
  Object.entries(grouped).forEach(([dir, entries]) => {
    console.log(`  ${dir}`);
    entries.forEach((entry) => console.log(`    - ${entry}`));
  });
}

function groupByDirectory(paths: string[]): GroupedDiff {
  const groups = new Map<string, string[]>();

  paths.forEach((filePath) => {
    const dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : '.';
    if (!groups.has(dir)) {
      groups.set(dir, []);
    }
    groups.get(dir)!.push(filePath);
  });

  const sortedGroups: GroupedDiff = {};
  [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([dir, entries]) => {
      sortedGroups[dir] = entries.slice().sort();
    });
  return sortedGroups;
}

async function writeReport(reportDir: string, report: Record<string, unknown>): Promise<string> {
  await mkdir(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `trait-mismatch-${timestamp}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return reportPath;
}

function resolveFromCwd(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function printHelp(): void {
  console.log(`Usage: tsx scripts/compare-traits.ts [options]

Options:
  --newDir <path>      Path to the newer trait directory (default: "${DEFAULT_NEW_DIR}")
  --oldDir <path>      Path to the older trait directory (default: "${DEFAULT_OLD_DIR}")
  --reportDir <path>   Directory for JSON reports (default: "${DEFAULT_REPORT_DIR}")
  --ext <values>       Comma-separated list of file extensions to include (e.g., ".png,.svg")
  --newStrip <folder>  Strip a leading folder from new paths before comparing (default: "${DEFAULT_NEW_STRIP_PREFIX}")
  --oldStrip <folder>  Strip a leading folder from old paths before comparing
  -h, --help           Show this help message
`);
}

void main();
