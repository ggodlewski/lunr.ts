import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import { assertEquals } from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { MatchData } from '../src/MatchData.ts';
import { assertSameMembers } from './utils.ts';
import { LunrDocument } from '../src/Builder.ts';

describe('MatchData', function () {
	describe('#combine', function () {
		const match = new MatchData('foo', 'title', {
			position: [1],
		});

		match.combine(
			new MatchData('bar', 'title', {
				position: [2],
			}),
		);

		match.combine(
			new MatchData('baz', 'body', {
				position: [3],
			}),
		);

		match.combine(
			new MatchData('baz', 'body', {
				position: [4],
			}),
		);

		it('#terms', function () {
			assertSameMembers(
				['foo', 'bar', 'baz'],
				Object.keys(match.metadata),
			);
		});

		it('#metadata', function () {
			assertEquals(match.metadata.foo.title.position, [1]);
			assertEquals(match.metadata.bar.title.position, [2]);
			assertEquals(match.metadata.baz.body.position, [3, 4]);
		});

		it('does not mutate source data', function () {
			const metadata: LunrDocument = { foo: [1] },
				matchData1 = new MatchData('foo', 'title', metadata),
				matchData2 = new MatchData('foo', 'title', metadata);

			matchData1.combine(matchData2);

			assertEquals(metadata.foo, [1]);
		});
	});
});
