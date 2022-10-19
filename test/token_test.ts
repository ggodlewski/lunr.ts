import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import { assertEquals } from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { Token } from '../src/Token.ts';
import { LunrDocument } from '../src/Builder.ts';

describe('Token', function () {
	describe('#toString', function () {
		it('converts the token to a string', function () {
			const token = new Token('foo');
			assertEquals('foo', token.toString());
		});
	});

	describe('#metadata', function () {
		it('can attach arbitrary metadata', function () {
			const token = new Token('foo', { length: 3 });
			assertEquals(3, token.metadata.length);
		});
	});

	describe('#update', function () {
		it('can update the token value', function () {
			const token = new Token('foo');

			token.update(function (s) {
				return s.toUpperCase();
			});

			assertEquals('FOO', token.toString());
		});

		it('metadata is yielded when updating', function () {
			const metadata = { bar: true },
				token = new Token('foo', metadata);
			let yieldedMetadata;

			token.update(function (_: string, md: LunrDocument) {
				yieldedMetadata = md;
				return '';
			});

			assertEquals(metadata, yieldedMetadata);
		});
	});

	describe('#clone', function () {
		const token = new Token('foo', { bar: true });

		it('clones value', function () {
			assertEquals(token.toString(), token.clone().toString());
		});

		it('clones metadata', function () {
			assertEquals(token.metadata, token.clone().metadata);
		});

		it('clone and modify', function () {
			const clone = token.clone(function (s) {
				return s.toUpperCase();
			});

			assertEquals('FOO', clone.toString());
			assertEquals(token.metadata, clone.metadata);
		});
	});
});
