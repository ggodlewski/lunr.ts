import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assertEquals,
	assertThrows,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { Vector } from '../src/Vector.ts';
import { assertApproximately } from './utils.ts';

describe('Vector', function () {
	const vectorFromArgs = function (...args: Array<number>): Vector {
		const vector = new Vector();

		for (let i = 0; i < args.length; i++) {
			const el = args[i];
			vector.insert(i, el);
		}

		return vector;
	};

	describe('#magnitude', function () {
		it('calculates magnitude of a vector', function () {
			const vector = vectorFromArgs(4, 5, 6);
			assertEquals(Math.sqrt(77), vector.magnitude());
		});
	});

	describe('#dot', function () {
		it('calculates dot product of two vectors', function () {
			const v1 = vectorFromArgs(1, 3, -5),
				v2 = vectorFromArgs(4, -2, -1);
			assertEquals(3, v1.dot(v2));
		});
	});

	describe('#similarity', function () {
		it('calculates the similarity between two vectors', function () {
			const v1 = vectorFromArgs(1, 3, -5),
				v2 = vectorFromArgs(4, -2, -1);

			assertApproximately(v1.similarity(v2), 0.5, 0.01);
		});

		it('empty vector', function () {
			const vEmpty = new Vector(),
				v1 = vectorFromArgs(1);

			assertEquals(0, vEmpty.similarity(v1));
			assertEquals(0, v1.similarity(vEmpty));
		});

		it('non-overlapping vector', function () {
			const v1 = new Vector([1, 1]),
				v2 = new Vector([2, 1]);

			assertEquals(0, v1.similarity(v2));
			assertEquals(0, v2.similarity(v1));
		});
	});

	describe('#insert', function () {
		it('invalidates magnitude cache', function () {
			const vector = vectorFromArgs(4, 5, 6);

			assertEquals(Math.sqrt(77), vector.magnitude());

			vector.insert(3, 7);

			assertEquals(Math.sqrt(126), vector.magnitude());
		});

		it('keeps items in index specified order', function () {
			const vector = new Vector();

			vector.insert(2, 4);
			vector.insert(1, 5);
			vector.insert(0, 6);

			assertEquals([6, 5, 4], vector.toArray());
		});

		it('fails when duplicate entry', function () {
			const vector = vectorFromArgs(4, 5, 6);
			assertThrows(function () {
				vector.insert(0, 44);
			});
		});
	});

	describe('#upsert', function () {
		it('invalidates magnitude cache', function () {
			const vector = vectorFromArgs(4, 5, 6);

			assertEquals(Math.sqrt(77), vector.magnitude());

			vector.upsert(3, 7);

			assertEquals(Math.sqrt(126), vector.magnitude());
		});

		it('keeps items in index specified order', function () {
			const vector = new Vector();

			vector.upsert(2, 4);
			vector.upsert(1, 5);
			vector.upsert(0, 6);

			assertEquals([6, 5, 4], vector.toArray());
		});

		it('calls fn for value on duplicate', function () {
			const vector = vectorFromArgs(4, 5, 6);
			vector.upsert(0, 4, function (current, passed) {
				return 'string' === typeof current
					? parseFloat(current)
					: current + passed;
			});
			assertEquals([8, 5, 6], vector.toArray());
		});
	});

	describe('#positionForIndex', function () {
		const vector = new Vector([
			1,
			'a',
			2,
			'b',
			4,
			'c',
			7,
			'd',
			11,
			'e',
		]);

		it('at the beginning', function () {
			assertEquals(0, vector.positionForIndex(0));
		});

		it('at the end', function () {
			assertEquals(10, vector.positionForIndex(20));
		});

		it('consecutive', function () {
			assertEquals(4, vector.positionForIndex(3));
		});

		it('non-consecutive gap after', function () {
			assertEquals(6, vector.positionForIndex(5));
		});

		it('non-consecutive gap before', function () {
			assertEquals(6, vector.positionForIndex(6));
		});

		it('non-consecutive gave before and after', function () {
			assertEquals(8, vector.positionForIndex(9));
		});

		it('duplicate at the beginning', function () {
			assertEquals(0, vector.positionForIndex(1));
		});

		it('duplicate at the end', function () {
			assertEquals(8, vector.positionForIndex(11));
		});

		it('duplicate consecutive', function () {
			assertEquals(4, vector.positionForIndex(4));
		});
	});
});
