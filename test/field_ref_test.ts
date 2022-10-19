import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assertEquals,
	assertThrows,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { FieldRef } from '../src/FieldRef.ts';

describe('FieldRef', function () {
	describe('#toString', function () {
		it('combines document ref and field name', function () {
			const fieldName = 'title',
				documentRef = '123',
				fieldRef = new FieldRef(documentRef, fieldName);

			assertEquals(fieldRef.toString(), 'title/123');
		});
	});

	describe('.fromString', function () {
		it('splits string into parts', function () {
			const fieldRef = FieldRef.fromString('title/123');

			assertEquals(fieldRef.fieldName, 'title');
			assertEquals(fieldRef.docRef, '123');
		});

		it('docRef contains join character', function () {
			const fieldRef = FieldRef.fromString(
				'title/http://example.com/123',
			);

			assertEquals(fieldRef.fieldName, 'title');
			assertEquals(fieldRef.docRef, 'http://example.com/123');
		});

		it('string does not contain join character', function () {
			const s = 'docRefOnly';

			assertThrows(function () {
				FieldRef.fromString(s);
			});
		});
	});
});
