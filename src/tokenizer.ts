import { Token } from './Token.ts';
import { LunrDocument } from './Builder.ts';

interface HasToString {
	toString(): string;
}

/**
 * Convert an object to a string.
 *
 * In the case of `null` and `undefined` the function returns
 * the empty string, in all other cases the result of calling
 * `toString` on the passed object is returned.
 *
 * @param {any} obj The object to convert to a string.
 */
function asString(obj: HasToString): string {
	if (obj === void 0 || obj === null) {
		return '';
	} else {
		return obj.toString();
	}
}

/**
 * A function for splitting a string into tokens ready to be inserted into
 * the search index. Uses `tokenizer.separator` to split strings, change
 * the value of this property to change how strings are split into tokens.
 *
 * This tokenizer will convert its parameter to a string by calling `toString` and
 * then will split this string on the character in `tokenizer.separator`.
 * Arrays will have their elements converted to strings and wrapped in a Token.
 *
 * Optional metadata can be passed to the tokenizer, this metadata will be cloned and
 * added as metadata to every token that is created from the object to be tokenized.
 *
 * @static
 * @param {?(string|object|object[])} obj - The object to convert into tokens
 * @param {?object} metadata - Optional metadata to associate with every token
 * @see {@link Pipeline}
 */
export function tokenizer(
	obj?: string | number | boolean | HasToString | null | HasToString[],
	metadata?: LunrDocument,
): Token[] {
	if (obj == null) {
		return [];
	}
	if (Array.isArray(obj)) {
		return obj.map(function (t) {
			return new Token(
				asString(t).toLowerCase(),
				structuredClone(metadata),
			);
		});
	}

	const str = obj.toString().toLowerCase(),
		len = str.length,
		tokens = [];

	for (let sliceEnd = 0, sliceStart = 0; sliceEnd <= len; sliceEnd++) {
		const char = str.charAt(sliceEnd),
			sliceLength = sliceEnd - sliceStart;

		if ((char.match(tokenizer.separator) || sliceEnd == len)) {
			if (sliceLength > 0) {
				const tokenMetadata = structuredClone(metadata) || {};
				tokenMetadata['position'] = [sliceStart, sliceLength];
				tokenMetadata['index'] = tokens.length;

				tokens.push(
					new Token(
						str.slice(sliceStart, sliceEnd),
						tokenMetadata,
					),
				);
			}

			sliceStart = sliceEnd + 1;
		}
	}

	return tokens;
}

/**
 * The separator used to split a string into tokens. Override this property to change the behaviour of
 * `tokenizer` behaviour when tokenizing strings. By default this splits on whitespace and hyphens.
 *
 * @static
 * @see tokenizer
 */
tokenizer.separator = /[\s\-]+/;
