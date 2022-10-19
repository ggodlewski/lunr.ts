import { TokenSet } from '../src/TokenSet.ts';
import { words } from './words.ts';

const tokenSet = TokenSet.fromArray([
	'january',
	'february',
	'march',
	'april',
	'may',
	'june',
	'july',
	'august',
	'september',
	'october',
	'november',
	'december',
].sort());

const noWildcard = TokenSet.fromString('september');
const withWildcard = TokenSet.fromString('*ber');

Deno.bench('.fromArray', { group: 'TokenSet' }, () => {
	TokenSet.fromArray(words);
});

Deno.bench('.fromString (no wildcard)', { group: 'TokenSet' }, () => {
	TokenSet.fromString('javascript');
});

Deno.bench('.fromString (with wildcard)', { group: 'TokenSet' }, () => {
	TokenSet.fromString('java*cript');
});

Deno.bench('.fromFuzzyString', { group: 'TokenSet' }, () => {
	TokenSet.fromFuzzyString('javascript', 2);
});

Deno.bench('#toArray', { group: 'TokenSet' }, () => {
	tokenSet.toArray();
});

Deno.bench('#toString', { group: 'TokenSet' }, () => {
	tokenSet.toString();
});

Deno.bench('#intersect (no wildcard)', { group: 'TokenSet' }, () => {
	tokenSet.intersect(noWildcard);
});

Deno.bench('#intersect (with wildcard)', { group: 'TokenSet' }, () => {
	tokenSet.intersect(withWildcard);
});
