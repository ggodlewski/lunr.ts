import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assert,
	assertEquals,
	assertNotEquals,
	assertThrows,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { assertSameMembers } from './utils.ts';
import { TokenSet } from '../src/TokenSet.ts';

describe('TokenSet', function () {
	describe('#toString', function () {
		it('includes node finality', function () {
			const nonFinal = new TokenSet(),
				final = new TokenSet(),
				otherFinal = new TokenSet();

			final.final = true;
			otherFinal.final = true;

			assertNotEquals(nonFinal.toString(), final.toString());
			assertEquals(otherFinal.toString(), final.toString());
		});

		/*		it('includes all edges', function () {
			const zeroEdges = new TokenSet(),
				oneEdge = new TokenSet(),
				twoEdges = new TokenSet();

			oneEdge.edges['a'] = 1;
			twoEdges.edges['a'] = 1;
			twoEdges.edges['b'] = 1;

			assertNotEquals(zeroEdges.toString(), oneEdge.toString());
			assertNotEquals(twoEdges.toString(), oneEdge.toString());
			assertNotEquals(twoEdges.toString(), zeroEdges.toString());
		});*/

		it('includes edge id', function () {
			const childA = new TokenSet(),
				childB = new TokenSet(),
				parentA = new TokenSet(),
				parentB = new TokenSet(),
				parentC = new TokenSet();

			parentA.edges['a'] = childA;
			parentB.edges['a'] = childB;
			parentC.edges['a'] = childB;

			assertEquals(parentB.toString(), parentC.toString());
			assertNotEquals(parentA.toString(), parentC.toString());
			assertNotEquals(parentA.toString(), parentB.toString());
		});
	});

	describe('.fromString', function () {
		it('without wildcard', function () {
			TokenSet._nextId = 1;
			const x = TokenSet.fromString('a');

			assertEquals(x.toString(), '0a2');
			assert(x.edges['a'].final);
		});

		it('with trailing wildcard', function () {
			const x = TokenSet.fromString('a*'),
				wild = x.edges['a'].edges['*'];

			// a state reached by a wildcard has
			// an edge with a wildcard to itself.
			// the resulting automota is
			// non-determenistic
			assertEquals(wild, wild.edges['*']);
			assert(wild.final);
		});
	});

	describe('.fromArray', function () {
		it('with unsorted array', function () {
			assertThrows(function () {
				TokenSet.fromArray(['z', 'a']);
			});
		});

		it('with sorted array', function () {
			const tokenSet = TokenSet.fromArray(['a', 'z']);

			assertEquals(['a', 'z'], tokenSet.toArray().sort());
		});

		it('is minimal', function () {
			const tokenSet = TokenSet.fromArray(['ac', 'dc']),
				acNode = tokenSet.edges['a'].edges['c'],
				dcNode = tokenSet.edges['d'].edges['c'];

			assertEquals(acNode, dcNode);
		});
	});

	describe('#toArray', function () {
		it('includes all words', function () {
			const words = ['bat', 'cat'],
				tokenSet = TokenSet.fromArray(words);

			assertSameMembers(words, tokenSet.toArray());
		});

		it('includes single words', function () {
			const word = 'bat',
				tokenSet = TokenSet.fromString(word);

			assertSameMembers([word], tokenSet.toArray());
		});
	});

	describe('#intersect', function () {
		it('no intersection', function () {
			const x = TokenSet.fromString('cat'),
				y = TokenSet.fromString('bar'),
				z = x.intersect(y);

			assertEquals(0, z.toArray().length);
		});

		it('simple intersection', function () {
			const x = TokenSet.fromString('cat'),
				y = TokenSet.fromString('cat'),
				z = x.intersect(y);

			assertSameMembers(['cat'], z.toArray());
		});

		it('trailing wildcard intersection', function () {
			const x = TokenSet.fromString('cat'),
				y = TokenSet.fromString('c*'),
				z = x.intersect(y);

			assertSameMembers(['cat'], z.toArray());
		});

		it('trailing wildcard no intersection', function () {
			const x = TokenSet.fromString('cat'),
				y = TokenSet.fromString('b*'),
				z = x.intersect(y);

			assertEquals(0, z.toArray().length);
		});

		it('leading wildcard intersection', function () {
			const x = TokenSet.fromString('cat'),
				y = TokenSet.fromString('*t'),
				z = x.intersect(y);

			assertSameMembers(['cat'], z.toArray());
		});

		it('leading wildcard backtracking intersection', function () {
			const x = TokenSet.fromString('aaacbab'),
				y = TokenSet.fromString('*ab'),
				z = x.intersect(y);

			assertSameMembers(['aaacbab'], z.toArray());
		});

		it('leading wildcard no intersection', function () {
			const x = TokenSet.fromString('cat'),
				y = TokenSet.fromString('*r'),
				z = x.intersect(y);

			assertEquals(0, z.toArray().length);
		});

		it('leading wildcard backtracking no intersection', function () {
			const x = TokenSet.fromString('aaabdcbc'),
				y = TokenSet.fromString('*abc'),
				z = x.intersect(y);

			assertEquals(0, z.toArray().length);
		});

		it('contained wildcard intersection', function () {
			const x = TokenSet.fromString('foo'),
				y = TokenSet.fromString('f*o'),
				z = x.intersect(y);

			assertSameMembers(['foo'], z.toArray());
		});

		it('contained wildcard backtracking intersection', function () {
			const x = TokenSet.fromString('ababc'),
				y = TokenSet.fromString('a*bc'),
				z = x.intersect(y);

			assertSameMembers(['ababc'], z.toArray());
		});

		it('contained wildcard no intersection', function () {
			const x = TokenSet.fromString('foo'),
				y = TokenSet.fromString('b*r'),
				z = x.intersect(y);

			assertEquals(0, z.toArray().length);
		});

		it('contained wildcard backtracking no intersection', function () {
			const x = TokenSet.fromString('ababc'),
				y = TokenSet.fromString('a*ac'),
				z = x.intersect(y);

			assertEquals(0, z.toArray().length);
		});

		it('wildcard matches zero or more characters', function () {
			const x = TokenSet.fromString('foo'),
				y = TokenSet.fromString('foo*'),
				z = x.intersect(y);

			assertSameMembers(['foo'], z.toArray());
		});

		// This test is intended to prevent 'bugs' that have lead to these
		// kind of intersections taking a _very_ long time. The assertion
		// is not of interest, just that the test does not timeout.
		it('catastrophic backtracking with leading characters', function () {
			const x = TokenSet.fromString(
					'fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
				),
				y = TokenSet.fromString('*ff'),
				z = x.intersect(y);

			assertEquals(1, z.toArray().length);
		});

		it('leading and trailing backtracking intersection', function () {
			const x = TokenSet.fromString('acbaabab'),
				y = TokenSet.fromString('*ab*'),
				z = x.intersect(y);

			assertSameMembers(['acbaabab'], z.toArray());
		});

		it('multiple contained wildcard backtracking', function () {
			const x = TokenSet.fromString('acbaabab'),
				y = TokenSet.fromString('a*ba*b'),
				z = x.intersect(y);

			assertSameMembers(['acbaabab'], z.toArray());
		});

		it('intersect with fuzzy string substitution', function () {
			const x1 = TokenSet.fromString('bar'),
				x2 = TokenSet.fromString('cur'),
				x3 = TokenSet.fromString('cat'),
				x4 = TokenSet.fromString('car'),
				x5 = TokenSet.fromString('foo'),
				y = TokenSet.fromFuzzyString('car', 1);

			assertSameMembers(x1.intersect(y).toArray(), ['bar']);
			assertSameMembers(x2.intersect(y).toArray(), ['cur']);
			assertSameMembers(x3.intersect(y).toArray(), ['cat']);
			assertSameMembers(x4.intersect(y).toArray(), ['car']);
			assertEquals(x5.intersect(y).toArray().length, 0);
		});

		it('intersect with fuzzy string deletion', function () {
			const x1 = TokenSet.fromString('ar'),
				x2 = TokenSet.fromString('br'),
				x3 = TokenSet.fromString('ba'),
				x4 = TokenSet.fromString('bar'),
				x5 = TokenSet.fromString('foo'),
				y = TokenSet.fromFuzzyString('bar', 1);

			assertSameMembers(x1.intersect(y).toArray(), ['ar']);
			assertSameMembers(x2.intersect(y).toArray(), ['br']);
			assertSameMembers(x3.intersect(y).toArray(), ['ba']);
			assertSameMembers(x4.intersect(y).toArray(), ['bar']);
			assertEquals(x5.intersect(y).toArray().length, 0);
		});

		it('intersect with fuzzy string insertion', function () {
			const x1 = TokenSet.fromString('bbar'),
				x2 = TokenSet.fromString('baar'),
				x3 = TokenSet.fromString('barr'),
				x4 = TokenSet.fromString('bar'),
				x5 = TokenSet.fromString('ba'),
				x6 = TokenSet.fromString('foo'),
				x7 = TokenSet.fromString('bara'),
				y = TokenSet.fromFuzzyString('bar', 1);

			assertSameMembers(x1.intersect(y).toArray(), ['bbar']);
			assertSameMembers(x2.intersect(y).toArray(), ['baar']);
			assertSameMembers(x3.intersect(y).toArray(), ['barr']);
			assertSameMembers(x4.intersect(y).toArray(), ['bar']);
			assertSameMembers(x5.intersect(y).toArray(), ['ba']);
			assertEquals(x6.intersect(y).toArray().length, 0);
			assertSameMembers(x7.intersect(y).toArray(), ['bara']);
		});

		it('intersect with fuzzy string transpose', function () {
			const x1 = TokenSet.fromString('abr'),
				x2 = TokenSet.fromString('bra'),
				x3 = TokenSet.fromString('foo'),
				y = TokenSet.fromFuzzyString('bar', 1);

			assertSameMembers(x1.intersect(y).toArray(), ['abr']);
			assertSameMembers(x2.intersect(y).toArray(), ['bra']);
			assertEquals(x3.intersect(y).toArray().length, 0);
		});

		it('fuzzy string insertion', function () {
			const x = TokenSet.fromString('abcxx'),
				y = TokenSet.fromFuzzyString('abc', 2);

			assertSameMembers(x.intersect(y).toArray(), ['abcxx']);
		});

		it('fuzzy string substitution', function () {
			const x = TokenSet.fromString('axx'),
				y = TokenSet.fromFuzzyString('abc', 2);

			assertSameMembers(x.intersect(y).toArray(), ['axx']);
		});

		it('fuzzy string deletion', function () {
			const x = TokenSet.fromString('a'),
				y = TokenSet.fromFuzzyString('abc', 2);

			assertSameMembers(x.intersect(y).toArray(), ['a']);
		});

		it('fuzzy string transpose', function () {
			const x = TokenSet.fromString('bca'),
				y = TokenSet.fromFuzzyString('abc', 2);

			assertSameMembers(x.intersect(y).toArray(), ['bca']);
		});
	});
});
