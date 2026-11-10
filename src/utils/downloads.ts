import fs from 'node:fs/promises';
import path from 'node:path';

// Tool input is a label, never a filesystem path. Restrict it on every platform.
export function validateDownloadLabel(label: string): string {
	if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(label)) {
		throw new Error('savePath must be a folder label of 1-64 letters, digits, underscores or hyphens, starting with a letter or digit; paths are not allowed');
	}
	return label;
}

async function assertDirectory(directory: string): Promise<void> {
	const stat = await fs.lstat(directory);
	if (!stat.isDirectory() || stat.isSymbolicLink()) {
		throw new Error('Download directories must be real directories, not symbolic links');
	}
}

/** The root is operator configuration, not MCP input. Its ancestors must be trusted. */
export async function createDownloadDirectory(root: string, label: string): Promise<string> {
	validateDownloadLabel(label);
	const absoluteRoot = path.resolve(root);
	// Walk one component at a time: recursive mkdir could follow an existing symlink.
	let current = path.parse(absoluteRoot).root;
	for (const component of absoluteRoot.slice(current.length).split(path.sep).filter(Boolean)) {
		current = path.join(current, component);
		try {
			await fs.mkdir(current, { mode: 0o700 });
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
		}
		await assertDirectory(current);
	}
	const canonicalRoot = await fs.realpath(absoluteRoot);
	// Each invocation owns a new private directory, including concurrent/repeated calls.
	return fs.mkdtemp(path.join(canonicalRoot, `${label}-`));
}

export async function writeDownloadFile(directory: string, name: string, data: string | Uint8Array): Promise<void> {
	if (!name || name === '.' || name === '..' || /[\\/\x00]/.test(name)) {
		throw new Error('Download filename must be a single filename');
	}
	await assertDirectory(directory);
	// O_EXCL refuses existing files, hard links and symlinks (including dangling links).
	await fs.writeFile(path.join(directory, name), data, { flag: 'wx', mode: 0o600 });
}
