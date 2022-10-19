import { QueryParser } from '../src/QueryParser.ts';
import { Query } from '../src/Query.ts';

const parse = function (q: string) {
	const query = new Query(['title', 'body']),
		parser = new QueryParser(q, query);

	parser.parse();
};

Deno.bench('simple', { group: 'QueryParser' }, () => {
	parse('foo bar');
});

Deno.bench('field', { group: 'QueryParser' }, () => {
	parse('title:foo bar');
});

Deno.bench('modifier', { group: 'QueryParser' }, () => {
	parse('foo~2 bar');
});

Deno.bench('complex', { group: 'QueryParser' }, () => {
	parse('title:foo~2^6 bar');
});
