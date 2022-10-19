import {
	afterEach,
	beforeEach,
	describe,
	it,
} from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assertEquals,
	assertThrows,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { Pipeline } from '../src/Pipeline.ts';
import { PipelineFunction } from '../src/PipelineFunction.ts';
import { assertSameMembers } from './utils.ts';

describe('lunr.Pipeline', function () {
	const noop = function (token: string) {};

	const existingRegisteredFunctions = Pipeline.registeredFunctions;

	beforeEach(function () {
		Pipeline.registeredFunctions = {};
	});

	afterEach(function () {
		Pipeline.registeredFunctions = existingRegisteredFunctions;
	});

	const pipeline = new Pipeline();

	describe('#add', function () {
		it('add function to pipeline', function () {
			pipeline.add(<PipelineFunction> noop);
			assertEquals(1, pipeline._stack.length);
		});

		it('add multiple functions to the pipeline', function () {
			const pipeline = new Pipeline();
			pipeline.add(<PipelineFunction> noop, <PipelineFunction> noop);
			assertEquals(2, pipeline._stack.length);
		});
	});

	describe('#remove', function () {
		it('function exists in pipeline', function () {
			const pipeline = new Pipeline();
			pipeline.add(<PipelineFunction> noop);
			assertEquals(1, pipeline._stack.length);
			pipeline.remove(<PipelineFunction> noop);
			assertEquals(0, pipeline._stack.length);
		});

		it('function does not exist in pipeline', function () {
			const pipeline = new Pipeline();
			const fn = function (token: string) {};
			pipeline.add(<PipelineFunction> noop);
			assertEquals(1, pipeline._stack.length);
			pipeline.remove(<PipelineFunction> fn);
			assertEquals(1, pipeline._stack.length);
		});
	});

	describe('#before', function () {
		const fn = function (token: string) {};

		it('other function exists', function () {
			const pipeline = new Pipeline();
			pipeline.add(<PipelineFunction> noop);
			pipeline.before(<PipelineFunction> noop, <PipelineFunction> fn);

			assertEquals([fn, noop], pipeline._stack);
		});

		it('other function does not exist', function () {
			const pipeline = new Pipeline();
			const action = function () {
				pipeline.before(<PipelineFunction> noop, <PipelineFunction> fn);
			};

			assertThrows(() => action());
			assertEquals(0, pipeline._stack.length);
		});
	});

	describe('#after', function () {
		const fn = function (token: string) {};

		it('other function exists', function () {
			const pipeline = new Pipeline();
			pipeline.add(<PipelineFunction> noop);
			pipeline.after(<PipelineFunction> noop, <PipelineFunction> fn);

			assertEquals([noop, fn], pipeline._stack);
		});

		it('other function does not exist', function () {
			const pipeline = new Pipeline();
			const action = function () {
				pipeline.after(<PipelineFunction> noop, <PipelineFunction> fn);
			};

			assertThrows(action);
			assertEquals(0, pipeline._stack.length);
		});
	});

	describe('#run', function () {
		it('calling each function for each token', function () {
			let count1 = 0,
				count2 = 0,
				fn1 = function (t: any) {
					count1++;
					return t;
				},
				fn2 = function (t: any) {
					count2++;
					return t;
				};

			const pipeline = new Pipeline();
			pipeline.add(<PipelineFunction> fn1, <PipelineFunction> fn2);
			pipeline.run(<any> [1, 2, 3]);

			assertEquals(3, count1);
			assertEquals(3, count2);
		});

		it('passes token to pipeline function', function () {
			pipeline.add(
				<PipelineFunction> function (token) {
					assertEquals('foo', token);
				},
			);

			pipeline.run(<any> ['foo']);
		});

		it('passes index to pipeline function', function () {
			pipeline.add(
				<PipelineFunction> function (_, index) {
					assertEquals(0, index);
				},
			);

			pipeline.run(<any> ['foo']);
		});

		it('passes entire token array to pipeline function', function () {
			const pipeline = new Pipeline();
			pipeline.add(
				<any> function (p1: any, p2: any, tokens: any) {
					assertEquals(['foo'], tokens);
				},
			);

			pipeline.run(<any> ['foo']);
		});

		it('passes output of one function as input to the next', function () {
			const pipeline = new Pipeline();
			pipeline.add(
				<PipelineFunction> function (t) {
					return t.toString().toUpperCase();
				},
			);

			pipeline.add(
				<PipelineFunction> function (t) {
					assertEquals('FOO', t);
				},
			);

			pipeline.run(<any> ['foo']);
		});

		it('returns the results of the last function', function () {
			const pipeline = new Pipeline();
			pipeline.add(
				<PipelineFunction> function (t) {
					return t.toString().toUpperCase();
				},
			);

			assertEquals(<any> ['FOO'], pipeline.run(<any> ['foo']));
		});

		it('filters out null, undefined and empty string values', function () {
			const tokens: string[] = [];

			// only pass on tokens for even token indexes
			// return null for 'foo'
			// return undefined for 'bar'
			// return '' for 'baz'
			pipeline.add(
				<PipelineFunction> function (t, i: number) {
					if (i == 4) {
						return null;
					} else if (i == 5) {
						return '';
					}
					if (i % 2) {
						return t;
					} else {
						return undefined;
					}
				},
			);

			pipeline.add(
				<PipelineFunction> function (t) {
					tokens.push(t.toString());
					return t;
				},
			);

			const output: any[] = pipeline.run(
				<any> [
					'a',
					'b',
					'c',
					'd',
					'foo',
					'bar',
					'baz',
				],
			);

			assertSameMembers(['b', 'd'], tokens);
			assertSameMembers(['b', 'd'], output);
		});

		describe('expanding tokens', function () {
			it('passed to output', function () {
				pipeline.add(
					<PipelineFunction> function (t) {
						return [t, t.toString().toUpperCase()];
					},
				);

				assertSameMembers(
					['foo', 'FOO'],
					<any> pipeline.run(<any> ['foo']),
				);
			});

			it('not passed to same function', function () {
				const received: string[] = [];

				pipeline.add(
					<PipelineFunction> function (t) {
						received.push(t.toString());
						return [t, t.toString().toUpperCase()];
					},
				);

				pipeline.run(<any> ['foo']);

				assertSameMembers(['foo'], received);
			});

			it('passed to the next pipeline function', function () {
				const received: string[] = [];

				pipeline.add(
					<PipelineFunction> function (t) {
						return [t, t.toString().toUpperCase()];
					},
				);

				pipeline.add(
					<PipelineFunction> function (t) {
						received.push(t.toString());
					},
				);

				pipeline.run(<any> ['foo']);

				assertSameMembers(['foo', 'FOO'], received);
			});
		});
	});

	describe('#toJSON', function () {
		it('returns an array of registered function labels', function () {
			const fn = function (token: string) {};

			Pipeline.registerFunction(<PipelineFunction> fn, 'fn');

			pipeline.add(<PipelineFunction> fn);

			assertSameMembers(['fn'], pipeline.toJSON());
		});
	});

	describe('.registerFunction', function () {
		const fn = function (token: string) {};

		it('adds a label property to the function', function () {
			Pipeline.registerFunction(<PipelineFunction> fn, 'fn');

			assertEquals('fn', (<PipelineFunction> fn).label);
		});

		it('adds function to the list of registered functions', function () {
			Pipeline.registerFunction(<PipelineFunction> fn, 'fn');

			assertEquals(fn, Pipeline.registeredFunctions['fn']);
		});
	});

	describe('.load', function () {
		beforeEach(function () {
			Pipeline.registeredFunctions = {};
		});

		afterEach(function () {
			Pipeline.registeredFunctions = existingRegisteredFunctions;
		});

		it('with registered functions', function () {
			const fn = function (token: string) {},
				serializedPipeline = ['fn'];

			Pipeline.registerFunction(<PipelineFunction> fn, 'fn');

			const pipeline = Pipeline.load(serializedPipeline);

			assertEquals(1, pipeline._stack.length);
			assertEquals(fn, pipeline._stack[0]);
		});

		it('with unregisterd functions', function () {
			const serializedPipeline = ['fn'];

			console.log(
				'Pipeline.registeredFunctions',
				Pipeline.registeredFunctions,
			);

			assertThrows(function () {
				Pipeline.load(serializedPipeline);
			});
		});
	});

	describe('#reset', function () {
		it('empties the stack', function () {
			const pipeline = new Pipeline();
			pipeline.add(<PipelineFunction> function (token: string) {});

			assertEquals(1, pipeline._stack.length);

			pipeline.reset();

			assertEquals(0, pipeline._stack.length);
		});
	});
});
