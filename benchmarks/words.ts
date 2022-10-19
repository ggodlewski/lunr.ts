import * as path from 'https://deno.land/std@0.160.0/path/mod.ts';

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

export const words = Deno.readFileSync(
	path.join(__dirname, 'fixtures', 'words.txt'),
).toString().split('\n')
	.slice(0, 1000)
	.sort();
