import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assert,
	assertFalse,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';

import { completeLunrSet, emptyLunrSet, LunrSet } from '../src/LunrSet.ts';

describe('#contains', function () {
	describe('complete set', function () {
		it('returns true', function () {
			assert(completeLunrSet.contains('foo'));
		});
	});

	describe('empty set', function () {
		it('returns false', function () {
			assertFalse(emptyLunrSet.contains('foo'));
		});
	});

	describe('populated set', function () {
		const set = new LunrSet(['foo']);

		it('element contained in set', function () {
			assert(set.contains('foo'));
		});

		it('element not contained in set', function () {
			assertFalse(set.contains('bar'));
		});
	});
});

describe('#union', function () {
	const set = new LunrSet(['foo']);

	describe('complete set', function () {
		it('union is complete', function () {
			const result = completeLunrSet.union(set);
			assert(result.contains('foo'));
			assert(result.contains('bar'));
		});
	});

	describe('empty set', function () {
		it('contains element', function () {
			const result = emptyLunrSet.union(set);
			assert(result.contains('foo'));
			assertFalse(result.contains('bar'));
		});
	});

	describe('populated set', function () {
		describe('with other populated set', function () {
			it('contains both elements', function () {
				const target = new LunrSet(['bar']);
				const result = target.union(set);

				assert(result.contains('foo'));
				assert(result.contains('bar'));
				assertFalse(result.contains('baz'));
			});
		});

		describe('with empty set', function () {
			it('contains all elements', function () {
				const target = new LunrSet(['bar']);
				const result = target.union(emptyLunrSet);

				assert(result.contains('bar'));
				assertFalse(result.contains('baz'));
			});
		});

		describe('with complete set', function () {
			it('contains all elements', function () {
				const target = new LunrSet(['bar']);
				const result = target.union(completeLunrSet);

				assert(result.contains('foo'));
				assert(result.contains('bar'));
				assert(result.contains('baz'));
			});
		});
	});
});

describe('#intersect', function () {
	const set = new LunrSet(['foo']);

	describe('complete set', function () {
		it('contains element', function () {
			const result = completeLunrSet.intersect(set);
			assert(result.contains('foo'));
			assertFalse(result.contains('bar'));
		});
	});

	describe('empty set', function () {
		it('does not contain element', function () {
			const result = emptyLunrSet.intersect(set);
			assertFalse(result.contains('foo'));
		});
	});

	describe('populated set', function () {
		describe('no intersection', function () {
			it('does not contain intersection elements', function () {
				const target = new LunrSet(['bar']);
				const result = target.intersect(set);

				assertFalse(result.contains('foo'));
				assertFalse(result.contains('bar'));
			});
		});

		describe('intersection', function () {
			it('contains intersection elements', function () {
				const target = new LunrSet(['foo', 'bar']);
				const result = target.intersect(set);

				assert(result.contains('foo'));
				assertFalse(result.contains('bar'));
			});
		});

		describe('with empty set', function () {
			it('returns empty set', function () {
				const target = new LunrSet(['foo']),
					result = target.intersect(emptyLunrSet);

				assertFalse(result.contains('foo'));
			});
		});

		describe('with complete set', function () {
			it('returns populated set', function () {
				const target = new LunrSet(['foo']),
					result = target.intersect(completeLunrSet);

				assert(result.contains('foo'));
				assertFalse(result.contains('bar'));
			});
		});
	});
});
