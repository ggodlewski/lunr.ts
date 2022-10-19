import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assert,
	assertEquals,
	assertFalse,
	assertThrows,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { Builder } from '../src/Builder.ts';
import { LunrIndex } from '../src/LunrIndex.ts';
import { TokenSet } from '../src/TokenSet.ts';
import { Vector } from '../src/Vector.ts';
import { Pipeline } from '../src/Pipeline.ts';
import { PipelineFunction } from '../src/PipelineFunction.ts';
import { assertDeepProperty, assertInstanceOf } from './utils.ts';

describe('Builder', function () {
	describe('#add', function () {
		it('field contains terms that clash with object prototype', function () {
			const builder = new Builder();

			builder.field('title');
			builder.add({ id: 'id', title: 'constructor' });

			assertDeepProperty(
				builder.invertedIndex,
				'constructor.title.id',
			);
			assertEquals(builder.invertedIndex['constructor'].title.id, {});

			assertEquals(
				builder.fieldTermFrequencies['title/id']['constructor'],
				1,
			);
		});

		it('field name clashes with object prototype', function () {
			const builder = new Builder();
			builder.field('constructor');
			builder.add({ id: 'id', constructor: 'constructor' });

			assertDeepProperty(
				builder.invertedIndex,
				'constructor.constructor.id',
			);
			assertEquals(
				(<any> builder).invertedIndex.constructor['constructor']['id'],
				{},
			);
		});

		it('document ref clashes with object prototype', function () {
			const builder = new Builder();
			builder.field('title');
			builder.add({ id: 'constructor', title: 'word' });

			assertDeepProperty(
				builder.invertedIndex,
				'word.title.constructor',
			);
			assertEquals(builder.invertedIndex.word.title.constructor, {});
		});

		it('token metadata clashes with object prototype', function () {
			const builder = new Builder();
			const pipelineFunction = function (t: any) {
				t.metadata['constructor'] = 'foo';
				return t;
			};

			Pipeline.registerFunction(
				<PipelineFunction> pipelineFunction,
				'test',
			);
			builder.pipeline.add(<PipelineFunction> pipelineFunction);

			// the registeredFunctions object is global, this is to prevent
			// polluting any other tests.
			delete Pipeline.registeredFunctions.test;

			builder.metadataWhitelist.push('constructor');

			builder.field('title');
			builder.add({ id: 'id', title: 'word' });
			assertDeepProperty(
				builder.invertedIndex,
				'word.title.id.constructor',
			);
			assertEquals(builder.invertedIndex.word.title.id.constructor, [
				'foo',
			]);
		});

		it('extracting nested properties from a document', function () {
			const builder = new Builder();
			const extractor = function (d: any) {
				return d.person.name;
			};

			builder.field('name', {
				extractor: extractor,
			});

			builder.add({
				id: 'id',
				person: {
					name: 'bob',
				},
			});

			assertDeepProperty(builder.invertedIndex, 'bob.name.id');
		});
	});

	describe('#field', function () {
		it('defining fields to index', function () {
			const builder = new Builder();
			builder.field('foo');
			assert('foo' in builder._fields);
		});

		it('field with illegal characters', function () {
			const builder = new Builder();
			assertThrows(function () {
				builder.field('foo/bar');
			});
		});
	});

	describe('#ref', function () {
		it('default reference', function () {
			const builder = new Builder();
			assertEquals('id', builder._ref);
		});

		it('defining a reference field', function () {
			const builder = new Builder();
			builder.ref('foo');
			assertEquals('foo', builder._ref);
		});
	});

	describe('#b', function () {
		it('default value', function () {
			const builder = new Builder();
			assertEquals(0.75, builder._b);
		});

		it('values less than zero', function () {
			const builder = new Builder();
			builder.b(-1);
			assertEquals(0, builder._b);
		});

		it('values higher than one', function () {
			const builder = new Builder();
			builder.b(1.5);
			assertEquals(1, builder._b);
		});

		it('value within range', function () {
			const builder = new Builder();
			builder.b(0.5);
			assertEquals(0.5, builder._b);
		});
	});

	describe('#k1', function () {
		it('default value', function () {
			const builder = new Builder();
			assertEquals(1.2, builder._k1);
		});

		it('values less than zero', function () {
			const builder = new Builder();
			builder.k1(1.6);
			assertEquals(1.6, builder._k1);
		});
	});

	describe('#use', function () {
		const builder = new Builder();

		it('calls plugin function', function () {
			let wasCalled = false;
			const plugin = function () {
				wasCalled = true;
			};

			builder.use(plugin);
			assert(wasCalled);
		});

		it('sets context to the builder instance', function () {
			let context: any = null;
			const plugin = function (this: any) {
				context = this;
			};

			builder.use(plugin);
			assertEquals(context, builder);
		});

		it('passes builder as first argument', function () {
			let arg: Builder | null = null;
			const plugin = function (a: Builder) {
				arg = a;
			};

			builder.use(plugin);
			assertEquals(arg, builder);
		});

		it('forwards arguments to the plugin', function () {
			let args: any = null;
			const plugin = function () {
				args = [].slice.call(arguments);
			};

			builder.use(plugin, 1, 2, 3);
			assertEquals(args, [builder, 1, 2, 3]);
		});
	});

	describe('#build', function () {
		const builder = new Builder(),
			doc = { id: 'id', title: 'test', body: 'missing' };

		builder.ref('id');
		builder.field('title');
		builder.add(doc);
		builder.build();

		it('adds tokens to invertedIndex', function () {
			assertDeepProperty(builder.invertedIndex, 'test.title.id');
		});

		it('builds a vector space of the document fields', function () {
			assert('title/id' in builder.fieldVectors);
			assertInstanceOf(builder.fieldVectors['title/id'], Vector);
		});

		it('skips fields not defined for indexing', function () {
			assertFalse('missing' in builder.invertedIndex);
		});

		it('builds a token set for the corpus', function () {
			const needle = TokenSet.fromString('test');
			assert(
				builder.tokenSet.intersect(needle).toArray().includes('test'),
			);
		});

		it('calculates document count', function () {
			assertEquals(1, builder.documentCount);
		});

		it('calculates average field length', function () {
			assertEquals(1, builder.averageFieldLength['title']);
		});

		it('index returned', function () {
			const builder = new Builder(),
				doc = { id: 'id', title: 'test', body: 'missing' };

			builder.ref('id');
			builder.field('title');
			builder.add(doc);
			assertInstanceOf(builder.build(), LunrIndex);
		});
	});
});
