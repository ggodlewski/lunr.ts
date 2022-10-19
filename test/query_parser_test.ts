import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assert,
	assertEquals,
	assertThrows,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { Query } from '../src/Query.ts';
import { QueryParser } from '../src/QueryParser.ts';
import { assertLengthOf, assertSameMembers } from './utils.ts';
import { QueryParseError } from '../src/QueryParseError.ts';

describe('QueryParser', function () {
	const parse = function (q: string) {
		const query = new Query(['title', 'body']),
			parser = new QueryParser(q, query);

		parser.parse();

		return query.clauses;
	};

	describe('#parse', function () {
		describe('single term', function () {
			const clauses = parse('foo');

			it('has 1 clause', function () {
				assertEquals(clauses.length, 1);
			});

			describe('clauses', function () {
				const clause = clauses[0];

				it('term', function () {
					assertEquals('foo', clause.term);
				});

				it('fields', function () {
					assertSameMembers(['title', 'body'], clause.fields);
				});

				it('presence', function () {
					assertEquals(Query.presence.OPTIONAL, clause.presence);
				});

				it('usePipeline', function () {
					assert(clause.usePipeline);
				});
			});
		});

		describe('single term, uppercase', function () {
			const clauses = parse('FOO');

			it('has 1 clause', function () {
				assertLengthOf(clauses, 1);
			});

			describe('clauses', function () {
				const clause = clauses[0];

				it('term', function () {
					assertEquals('foo', clause.term);
				});

				it('fields', function () {
					assertSameMembers(['title', 'body'], clause.fields);
				});

				it('usePipeline', function () {
					assert(clause.usePipeline);
				});
			});
		});

		describe('single term with wildcard', function () {
			const clauses = parse('fo*');

			it('has 1 clause', function () {
				assertLengthOf(clauses, 1);
			});

			describe('clauses', function () {
				const clause = clauses[0];

				it('#term', function () {
					assertEquals('fo*', clause.term);
				});

				it('#usePipeline', function () {
					assert(!clause.usePipeline);
				});
			});
		});

		describe('multiple terms', function () {
			const clauses = parse('foo bar');

			it('has 2 clause', function () {
				assertLengthOf(clauses, 2);
			});

			describe('clauses', function () {
				it('#term', function () {
					assertEquals('foo', clauses[0].term);
					assertEquals('bar', clauses[1].term);
				});
			});
		});

		describe('multiple terms with presence', function () {
			const clauses = parse('+foo +bar');

			it('has 2 clause', function () {
				assertLengthOf(clauses, 2);
			});
		});

		describe('edit distance followed by presence', function () {
			const clauses = parse('foo~10 +bar');

			it('has 2 clause', function () {
				assertLengthOf(clauses, 2);
			});

			describe('clauses', function () {
				const fooClause = clauses[0];
				const barClause = clauses[1];

				it('#term', function () {
					assertEquals('foo', fooClause.term);
					assertEquals('bar', barClause.term);
				});

				it('#presence', function () {
					assertEquals(
						Query.presence.OPTIONAL,
						fooClause.presence,
					);
					assertEquals(
						Query.presence.REQUIRED,
						barClause.presence,
					);
				});

				it('#editDistance', function () {
					assertEquals(10, fooClause.editDistance);
					// It feels dirty asserting that something is undefined
					// but there is no Optional so this is what we are reduced to
					assertEquals('undefined', typeof barClause.editDistance);
				});
			});
		});

		describe('boost followed by presence', function () {
			const clauses = parse('foo^10 +bar');

			it('has 2 clause', function () {
				assertLengthOf(clauses, 2);
			});

			describe('clauses', function () {
				const fooClause = clauses[0];
				const barClause = clauses[1];

				it('#term', function () {
					assertEquals('foo', fooClause.term);
					assertEquals('bar', barClause.term);
				});

				it('#presence', function () {
					assertEquals(
						Query.presence.OPTIONAL,
						fooClause.presence,
					);
					assertEquals(
						Query.presence.REQUIRED,
						barClause.presence,
					);
				});

				it('#boost', function () {
					assertEquals(10, fooClause.boost);
					assertEquals(1, barClause.boost);
				});
			});
		});

		describe('field without a term', function () {
			it('fails with QueryParseError', function () {
				assertThrows(function () {
					parse('title:');
				}, QueryParseError);
			});
		});

		describe('unknown field', function () {
			it('fails with QueryParseError', function () {
				assertThrows(function () {
					parse('unknown:foo');
				}, QueryParseError);
			});
		});

		describe('term with field', function () {
			const clauses = parse('title:foo');

			it('has 1 clause', function () {
				assertLengthOf(clauses, 1);
			});

			it('clause contains only scoped field', function () {
				assertSameMembers(clauses[0].fields, ['title']);
			});
		});

		describe('uppercase field with uppercase term', function () {
			// Using a different query to the rest of the tests
			// so that only this test has to worry about an upcase field name
			const query = new Query(['TITLE']),
				parser = new QueryParser('TITLE:FOO', query);

			parser.parse();

			const clauses = query.clauses;

			it('has 1 clause', function () {
				assertLengthOf(clauses, 1);
			});

			it('clause contains downcased term', function () {
				assertEquals(clauses[0].term, 'foo');
			});

			it('clause contains only scoped field', function () {
				assertSameMembers(clauses[0].fields, ['TITLE']);
			});
		});

		describe('multiple terms scoped to different fields', function () {
			const clauses = parse('title:foo body:bar');

			it('has 2 clauses', function () {
				assertLengthOf(clauses, 2);
			});

			it('fields', function () {
				assertSameMembers(['title'], clauses[0].fields);
				assertSameMembers(['body'], clauses[1].fields);
			});

			it('terms', function () {
				assertEquals('foo', clauses[0].term);
				assertEquals('bar', clauses[1].term);
			});
		});

		describe('single term with edit distance', function () {
			const clauses = parse('foo~2');

			it('has 1 clause', function () {
				assertLengthOf(clauses, 1);
			});

			it('term', function () {
				assertEquals('foo', clauses[0].term);
			});

			it('editDistance', function () {
				assertEquals(2, clauses[0].editDistance);
			});

			it('fields', function () {
				assertSameMembers(['title', 'body'], clauses[0].fields);
			});
		});

		describe('multiple terms with edit distance', function () {
			const clauses = parse('foo~2 bar~3');

			it('has 2 clauses', function () {
				assertLengthOf(clauses, 2);
			});

			it('term', function () {
				assertEquals('foo', clauses[0].term);
				assertEquals('bar', clauses[1].term);
			});

			it('editDistance', function () {
				assertEquals(2, clauses[0].editDistance);
				assertEquals(3, clauses[1].editDistance);
			});

			it('fields', function () {
				assertSameMembers(['title', 'body'], clauses[0].fields);
				assertSameMembers(['title', 'body'], clauses[1].fields);
			});
		});

		describe('single term scoped to field with edit distance', function () {
			const clauses = parse('title:foo~2');

			it('has 1 clause', function () {
				assertLengthOf(clauses, 1);
			});

			it('term', function () {
				assertEquals('foo', clauses[0].term);
			});

			it('editDistance', function () {
				assertEquals(2, clauses[0].editDistance);
			});

			it('fields', function () {
				assertSameMembers(['title'], clauses[0].fields);
			});
		});

		describe('non-numeric edit distance', function () {
			it('throws QueryParseError', function () {
				assertThrows(function () {
					parse('foo~a');
				}, QueryParseError);
			});
		});

		describe('edit distance without a term', function () {
			it('throws QueryParseError', function () {
				assertThrows(function () {
					parse('~2');
				}, QueryParseError);
			});
		});

		describe('single term with boost', function () {
			const clauses = parse('foo^2');

			it('has 1 clause', function () {
				assertLengthOf(clauses, 1);
			});

			it('term', function () {
				assertEquals('foo', clauses[0].term);
			});

			it('boost', function () {
				assertEquals(2, clauses[0].boost);
			});

			it('fields', function () {
				assertSameMembers(['title', 'body'], clauses[0].fields);
			});
		});

		describe('non-numeric boost', function () {
			it('throws QueryParseError', function () {
				assertThrows(function () {
					parse('foo^a');
				}, QueryParseError);
			});
		});

		describe('boost without a term', function () {
			it('throws QueryParseError', function () {
				assertThrows(function () {
					parse('^2');
				}, QueryParseError);
			});
		});

		describe('multiple terms with boost', function () {
			const clauses = parse('foo^2 bar^3');

			it('has 2 clauses', function () {
				assertLengthOf(clauses, 2);
			});

			it('term', function () {
				assertEquals('foo', clauses[0].term);
				assertEquals('bar', clauses[1].term);
			});

			it('boost', function () {
				assertEquals(2, clauses[0].boost);
				assertEquals(3, clauses[1].boost);
			});

			it('fields', function () {
				assertSameMembers(['title', 'body'], clauses[0].fields);
				assertSameMembers(['title', 'body'], clauses[1].fields);
			});
		});

		describe('term scoped by field with boost', function () {
			const clauses = parse('title:foo^2');

			it('has 1 clause', function () {
				assertLengthOf(clauses, 1);
			});

			it('term', function () {
				assertEquals('foo', clauses[0].term);
			});

			it('boost', function () {
				assertEquals(2, clauses[0].boost);
			});

			it('fields', function () {
				assertSameMembers(['title'], clauses[0].fields);
			});
		});

		describe('term with presence required', function () {
			const clauses = parse('+foo');

			it('has 1 clauses', function () {
				assertLengthOf(clauses, 1);
			});

			it('term', function () {
				assertEquals('foo', clauses[0].term);
			});

			it('boost', function () {
				assertEquals(1, clauses[0].boost);
			});

			it('fields', function () {
				assertSameMembers(['title', 'body'], clauses[0].fields);
			});

			it('presence', function () {
				assertEquals(Query.presence.REQUIRED, clauses[0].presence);
			});
		});

		describe('term with presence prohibited', function () {
			const clauses = parse('-foo');

			it('has 1 clauses', function () {
				assertLengthOf(clauses, 1);
			});

			it('term', function () {
				assertEquals('foo', clauses[0].term);
			});

			it('boost', function () {
				assertEquals(1, clauses[0].boost);
			});

			it('fields', function () {
				assertSameMembers(['title', 'body'], clauses[0].fields);
			});

			it('presence', function () {
				assertEquals(
					Query.presence.PROHIBITED,
					clauses[0].presence,
				);
			});
		});

		describe('term scoped by field with presence required', function () {
			const clauses = parse('+title:foo');

			it('has 1 clauses', function () {
				assertEquals(clauses.length, 1);
			});

			it('term', function () {
				assertEquals('foo', clauses[0].term);
			});

			it('boost', function () {
				assertEquals(1, clauses[0].boost);
			});

			it('fields', function () {
				assertSameMembers(['title'], clauses[0].fields);
			});

			it('presence', function () {
				assertEquals(Query.presence.REQUIRED, clauses[0].presence);
			});
		});

		describe('term scoped by field with presence prohibited', function () {
			const clauses = parse('-title:foo');

			it('has 1 clauses', function () {
				assertEquals(clauses.length, 1);
			});

			it('term', function () {
				assertEquals('foo', clauses[0].term);
			});

			it('boost', function () {
				assertEquals(1, clauses[0].boost);
			});

			it('fields', function () {
				assertSameMembers(['title'], clauses[0].fields);
			});

			it('presence', function () {
				assertEquals(
					Query.presence.PROHIBITED,
					clauses[0].presence,
				);
			});
		});
	});

	describe('term with boost and edit distance', function () {
		const clauses = parse('foo^2~3');

		it('has 1 clause', function () {
			assertEquals(clauses.length, 1);
		});

		it('term', function () {
			assertEquals('foo', clauses[0].term);
		});

		it('editDistance', function () {
			assertEquals(3, clauses[0].editDistance);
		});

		it('boost', function () {
			assertEquals(2, clauses[0].boost);
		});

		it('fields', function () {
			assertSameMembers(['title', 'body'], clauses[0].fields);
		});
	});
});
