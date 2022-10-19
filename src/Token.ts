import { LunrDocument } from './Builder.ts';

export class Token {
	/**
	 * A token wraps a string representation of a token
	 * as it is passed through the text processing pipeline.
	 *
	 * @constructor
	 * @param {string} [str=''] - The string token being wrapped.
	 * @param {object} [metadata={}] - Metadata associated with this token.
	 */
	constructor(
		private str = '',
		public readonly metadata: LunrDocument = {},
	) {
	}

	/**
	 * Returns the token string that is being wrapped by this object.
	 *
	 * @returns {string}
	 */
	toString() {
		return this.str;
	}

	/**
	 * A token update function is used when updating or optionally
	 * when cloning a token.
	 *
	 * @callback Token~updateFunction
	 * @param {string} str - The string representation of the token.
	 * @param {Object} metadata - All metadata associated with this token.
	 */

	/**
	 * Applies the given function to the wrapped string token.
	 *
	 * @example
	 * token.update(function (str, metadata) {
	 *   return str.toUpperCase()
	 * })
	 *
	 * @param {Token~updateFunction} fn - A function to apply to the token string.
	 * @returns {Token}
	 */
	update(fn: (s: string, metadata: LunrDocument) => string) {
		this.str = fn(this.str, this.metadata);
		return this;
	}

	/**
	 * Creates a clone of this token. Optionally a function can be
	 * applied to the cloned token.
	 *
	 * @param {Token~updateFunction} [fn] - An optional function to apply to the cloned token.
	 * @returns {Token}
	 */
	clone(fn?: (s: string, metadata: LunrDocument) => string) {
		fn = fn || function (s: string) {
			return s;
		};
		return new Token(fn(this.str, this.metadata), this.metadata);
	}
}
