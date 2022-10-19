/**
 * A token set is used to store the unique list of all tokens
 * within an index. Token sets are also used to represent an
 * incoming query to the index, this query token set and index
 * token set are then intersected to find which tokens to look
 * up in the inverted index.
 *
 * A token set can hold multiple tokens, as in the case of the
 * index token set, or it can hold a single token as in the
 * case of a simple query token set.
 *
 * Additionally token sets are used to perform wildcard matching.
 * Leading, contained and trailing wildcards are supported, and
 * from this edit distance matching can also be provided.
 *
 * Token sets are implemented as a minimal finite state automata,
 * where both common prefixes and suffixes are shared between tokens.
 * This helps to reduce the space used for storing the token set.
 *
 * @constructor
 */
import { TokenSetBuilder } from './TokenSetBuilder.ts';
import { Vector } from './Vector.ts';
import { QueryClause } from './Query.ts';

export class TokenSet {
	final = false;
	edges: { [key: string]: TokenSet } = {};
	private id: number;
	public _str = '';

	constructor() {
		this.id = TokenSet._nextId;
		TokenSet._nextId += 1;
	}

	/**
	 * Keeps track of the next, auto increment, identifier to assign
	 * to a new tokenSet.
	 *
	 * TokenSets require a unique identifier to be correctly minimised.
	 */
	public static _nextId = 1;

	/**
	 * Creates a TokenSet instance from the given sorted array of words.
	 *
	 * @param {String[]} arr - A sorted array of strings to create the set from.
	 * @returns {TokenSet}
	 * @throws Will throw an error if the input array is not sorted.
	 */
	static fromArray(arr: string[]) {
		const builder = new TokenSetBuilder();

		for (let i = 0, len = arr.length; i < len; i++) {
			builder.insert(arr[i]);
		}

		builder.finish();
		return builder.root;
	}

	/**
	 * Creates a token set from a query clause.
	 *
	 * @private
	 * @param {Object} clause - A single clause from Query.
	 * @param {string} clause.term - The query clause term.
	 * @param {number} [clause.editDistance] - The optional edit distance for the term.
	 * @returns {TokenSet}
	 */
	static fromClause(clause: QueryClause) {
		if ('editDistance' in clause) {
			return TokenSet.fromFuzzyString(
				clause.term || '',
				clause.editDistance || 1,
			);
		} else {
			return TokenSet.fromString(clause.term || '');
		}
	}

	/**
	 * Creates a token set representing a single string with a specified
	 * edit distance.
	 *
	 * Insertions, deletions, substitutions and transpositions are each
	 * treated as an edit distance of 1.
	 *
	 * Increasing the allowed edit distance will have a dramatic impact
	 * on the performance of both creating and intersecting these TokenSets.
	 * It is advised to keep the edit distance less than 3.
	 *
	 * @param {string} str - The string to create the token set from.
	 * @param {number} editDistance - The allowed edit distance to match.
	 * @returns {Vector}
	 */
	static fromFuzzyString(str: string, editDistance: number): TokenSet {
		const root = new TokenSet();

		const stack = [{
			node: root,
			editsRemaining: editDistance,
			str: str,
		}];

		while (stack.length) {
			const frame = stack.pop();

			if (!frame) {
				break;
			}

			// no edit
			if (frame.str.length > 0) {
				const char = frame.str.charAt(0);
				let noEditNode;

				if (char in frame.node.edges) {
					noEditNode = frame.node.edges[char];
				} else {
					noEditNode = new TokenSet();
					frame.node.edges[char] = noEditNode;
				}

				if (frame.str.length == 1) {
					noEditNode.final = true;
				}

				stack.push({
					node: noEditNode,
					editsRemaining: frame.editsRemaining,
					str: frame.str.slice(1),
				});
			}

			if (frame.editsRemaining == 0) {
				continue;
			}

			// insertion
			let insertionNode;
			if ('*' in frame.node.edges) {
				insertionNode = frame.node.edges['*'];
			} else {
				insertionNode = new TokenSet();
				frame.node.edges['*'] = insertionNode;
			}

			if (frame.str.length == 0) {
				insertionNode.final = true;
			}

			stack.push({
				node: insertionNode,
				editsRemaining: frame.editsRemaining - 1,
				str: frame.str,
			});

			// deletion
			// can only do a deletion if we have enough edits remaining
			// and if there are characters left to delete in the string
			if (frame.str.length > 1) {
				stack.push({
					node: frame.node,
					editsRemaining: frame.editsRemaining - 1,
					str: frame.str.slice(1),
				});
			}

			// deletion
			// just removing the last character from the str
			if (frame.str.length == 1) {
				frame.node.final = true;
			}

			// substitution
			// can only do a substitution if we have enough edits remaining
			// and if there are characters left to substitute
			if (frame.str.length >= 1) {
				let substitutionNode;
				if ('*' in frame.node.edges) {
					substitutionNode = frame.node.edges['*'];
				} else {
					substitutionNode = new TokenSet();
					frame.node.edges['*'] = substitutionNode;
				}

				if (frame.str.length == 1) {
					substitutionNode.final = true;
				}

				stack.push({
					node: substitutionNode,
					editsRemaining: frame.editsRemaining - 1,
					str: frame.str.slice(1),
				});
			}

			// transposition
			// can only do a transposition if there are edits remaining
			// and there are enough characters to transpose
			if (frame.str.length > 1) {
				const charA = frame.str.charAt(0),
					charB = frame.str.charAt(1);
				let transposeNode;

				if (charB in frame.node.edges) {
					transposeNode = frame.node.edges[charB];
				} else {
					transposeNode = new TokenSet();
					frame.node.edges[charB] = transposeNode;
				}

				if (frame.str.length == 1) {
					transposeNode.final = true;
				}

				stack.push({
					node: transposeNode,
					editsRemaining: frame.editsRemaining - 1,
					str: charA + frame.str.slice(2),
				});
			}
		}

		return root;
	}

	/**
	 * Creates a TokenSet from a string.
	 *
	 * The string may contain one or more wildcard characters (*)
	 * that will allow wildcard matching when intersecting with
	 * another TokenSet.
	 *
	 * @param {string} str - The string to create a TokenSet from.
	 * @returns {TokenSet}
	 */
	static fromString(str: string): TokenSet {
		let node = new TokenSet();
		const root = node;

		/*
     * Iterates through all characters within the passed string
     * appending a node for each character.
     *
     * When a wildcard character is found then a self
     * referencing edge is introduced to continually match
     * any number of any characters.
     */
		for (let i = 0, len = str.length; i < len; i++) {
			const char = str[i],
				final = (i == len - 1);

			if (char == '*') {
				node.edges[char] = node;
				node.final = final;
			} else {
				const next = new TokenSet();
				next.final = final;

				node.edges[char] = next;
				node = next;
			}
		}

		return root;
	}

	/**
	 * Converts this TokenSet into an array of strings
	 * contained within the TokenSet.
	 *
	 * This is not intended to be used on a TokenSet that
	 * contains wildcards, in these cases the results are
	 * undefined and are likely to cause an infinite loop.
	 *
	 * @returns {string[]}
	 */
	toArray() {
		const words = [];

		// deno-lint-ignore no-this-alias
		const thisNode: TokenSet = this;

		const stack = [{
			prefix: '',
			node: thisNode,
		}];

		while (stack.length) {
			const frame = stack.pop();
			if (!frame) {
				break;
			}

			const edges = Object.keys(frame.node.edges),
				len = edges.length;

			if (frame.node.final) {
				/* In Safari, at this point the prefix is sometimes corrupted, see:
         * https://github.com/olivernn/lunr.js/issues/279 Calling any
         * String.prototype method forces Safari to "cast" this string to what
         * it's supposed to be, fixing the bug. */
				frame.prefix.charAt(0);
				words.push(frame.prefix);
			}

			for (let i = 0; i < len; i++) {
				const edge = edges[i];

				stack.push({
					prefix: frame.prefix.concat(edge),
					node: frame.node.edges[edge],
				});
			}
		}

		return words;
	}

	/**
	 * Generates a string representation of a TokenSet.
	 *
	 * This is intended to allow TokenSets to be used as keys
	 * in objects, largely to aid the construction and minimisation
	 * of a TokenSet. As such it is not designed to be a human
	 * friendly representation of the TokenSet.
	 *
	 * @returns {string}
	 */
	toString() {
		// NOTE: Using Object.keys here as this.edges is very likely
		// to enter 'hash-mode' with many keys being added
		//
		// avoiding a for-in loop here as it leads to the function
		// being de-optimised (at least in V8). From some simple
		// benchmarks the performance is comparable, but allowing
		// V8 to optimize may mean easy performance wins in the future.

		if (this._str) {
			return this._str;
		}

		let str = this.final ? '1' : '0';
		const labels = Object.keys(this.edges).sort(),
			len = labels.length;

		for (let i = 0; i < len; i++) {
			const label = labels[i],
				node = this.edges[label];

			str = str + label + node.id;
		}

		return str;
	}

	/**
	 * Returns a new TokenSet that is the intersection of
	 * this TokenSet and the passed TokenSet.
	 *
	 * This intersection will take into account any wildcards
	 * contained within the TokenSet.
	 *
	 * @param {TokenSet} b - An other TokenSet to intersect with.
	 * @returns {TokenSet}
	 */
	intersect(b: TokenSet) {
		const output = new TokenSet();

		// deno-lint-ignore no-this-alias
		const thisNode: TokenSet = this;

		const stack = [{
			qNode: b,
			output: output,
			node: thisNode,
		}];

		while (stack.length) {
			const frame = stack.pop();
			if (!frame) {
				break;
			}

			// NOTE: As with the #toString method, we are using
			// Object.keys and a for loop instead of a for-in loop
			// as both of these objects enter 'hash' mode, causing
			// the function to be de-optimised in V8
			const qEdges = Object.keys(frame.qNode.edges),
				qLen = qEdges.length,
				nEdges = Object.keys(frame.node.edges),
				nLen = nEdges.length;

			for (let q = 0; q < qLen; q++) {
				const qEdge = qEdges[q];

				for (let n = 0; n < nLen; n++) {
					const nEdge = nEdges[n];

					if (nEdge == qEdge || qEdge == '*') {
						const node = frame.node.edges[nEdge],
							qNode = frame.qNode.edges[qEdge],
							final = node.final && qNode.final;
						let next = undefined;

						if (nEdge in frame.output.edges) {
							// an edge already exists for this character
							// no need to create a new node, just set the finality
							// bit unless this node is already final
							next = frame.output.edges[nEdge];
							next.final = next.final || final;
						} else {
							// no edge exists yet, must create one
							// set the finality bit and insert it
							// into the output
							next = new TokenSet();
							next.final = final;
							frame.output.edges[nEdge] = next;
						}

						stack.push({
							qNode: qNode,
							output: next,
							node: node,
						});
					}
				}
			}
		}

		return output;
	}
}
