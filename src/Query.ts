/**
 * Constants for indicating what kind of automatic wildcard insertion will be used when constructing a query clause.
 *
 * This allows wildcards to be added to the beginning and end of a term without having to manually do any string
 * concatenation.
 *
 * The wildcard constants can be bitwise combined to select both leading and trailing wildcards.
 *
 * @constant
 * @default
 * @property {number} wildcard.NONE - The term will have no wildcards inserted, this is the default behaviour
 * @property {number} wildcard.LEADING - Prepend the term with a wildcard, unless a leading wildcard already exists
 * @property {number} wildcard.TRAILING - Append a wildcard to the term, unless a trailing wildcard already exists
 * @see Query~Clause
 * @see Query#clause
 * @see Query#term
 * @example <caption>query term with trailing wildcard</caption>
 * query.term('foo', { wildcard: QueryWildCard.TRAILING })
 * @example <caption>query term with leading and trailing wildcard</caption>
 * query.term('foo', {
 *   wildcard: QueryWildCard.LEADING | QueryWildCard.TRAILING
 * })
 */
import { Token } from './Token.ts';

export enum QueryWildCard {
	NONE = 0,
	LEADING = 1 << 0,
	TRAILING = 1 << 1,
}

export interface QueryClause {
	editDistance?: number;
	wildcard?: QueryWildCard;
	fields?: string[];
	boost?: number;
	usePipeline?: boolean;
	term?: string;
	presence?: number;
}

/**
 * A Query provides a programmatic way of defining queries to be performed
 * against a {@link LunrIndex}.
 *
 * Prefer constructing a Query using the {@link LunrIndex#query} method
 * so the query object is pre-initialized with the right index fields.
 *
 * @constructor
 * @property {Query~Clause[]} clauses - An array of query clauses.
 * @property {string[]} allFields - An array of all available fields in a LunrIndex.
 */
export class Query {
	public readonly clauses: QueryClause[] = [];
	public readonly allFields: string[];

	constructor(allFields: string[]) {
		this.allFields = allFields;
	}

	/**
	 * Constants for indicating what kind of presence a term must have in matching documents.
	 *
	 * @constant
	 * @enum {number}
	 * @see Query~Clause
	 * @see Query#clause
	 * @see Query#term
	 * @example <caption>query term with required presence</caption>
	 * query.term('foo', { presence: Query.presence.REQUIRED })
	 */
	static presence = {
		/**
		 * Term's presence in a document is optional, this is the default value.
		 */
		OPTIONAL: 1,

		/**
		 * Term's presence in a document is required, documents that do not contain
		 * this term will not be returned.
		 */
		REQUIRED: 2,

		/**
		 * Term's presence in a document is prohibited, documents that do contain
		 * this term will not be returned.
		 */
		PROHIBITED: 3,
	};

	/**
	 * A single clause in a {@link Query} contains a term and details on how to
	 * match that term against a {@link LunrIndex}.
	 *
	 * @typedef {Object} Query~Clause
	 * @property {string[]} fields - The fields in an index this clause should be matched against.
	 * @property {number} [boost=1] - Any boost that should be applied when matching this clause.
	 * @property {number} [editDistance] - Whether the term should have fuzzy matching applied, and how fuzzy the match should be.
	 * @property {boolean} [usePipeline] - Whether the term should be passed through the search pipeline.
	 * @property {number} [wildcard=QueryWildCard.NONE] - Whether the term should have wildcards appended or prepended.
	 * @property {number} [presence=Query.presence.OPTIONAL] - The terms presence in any matching documents.
	 */

	/**
	 * Adds a {@link Query~Clause} to this query.
	 *
	 * Unless the clause contains the fields to be matched all fields will be matched. In addition
	 * a default boost of 1 is applied to the clause.
	 *
	 * @param {Query~Clause} clause - The clause to add to this query.
	 * @see Query~Clause
	 * @returns {Query}
	 */
	clause(clause: QueryClause = {}) {
		if (!('fields' in clause)) {
			clause.fields = this.allFields;
		}

		if (!('boost' in clause)) {
			clause.boost = 1;
		}

		if (!('usePipeline' in clause)) {
			clause.usePipeline = true;
		}

		if (!('wildcard' in clause)) {
			clause.wildcard = QueryWildCard.NONE;
		}

		const wildcard = clause.wildcard || QueryWildCard.NONE;

		if (
			(wildcard & QueryWildCard.LEADING) &&
			(!clause.term || clause.term.substr(0, 1) !== '*')
		) {
			clause.term = '*' + clause.term;
		}

		if (
			(wildcard & QueryWildCard.TRAILING) &&
			(!clause.term ||
				clause.term.substring(clause.term.length - 1) !== '*')
		) {
			clause.term = '' + clause.term + '*';
		}

		if (!('presence' in clause)) {
			clause.presence = Query.presence.OPTIONAL;
		}

		this.clauses.push(clause);

		return this;
	}

	/**
	 * A negated query is one in which every clause has a presence of
	 * prohibited. These queries require some special processing to return
	 * the expected results.
	 *
	 * @returns boolean
	 */
	isNegated(): boolean {
		for (const clause of this.clauses) {
			if (clause.presence !== Query.presence.PROHIBITED) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Adds a term to the current query, under the covers this will create a {@link Query~Clause}
	 * to the list of clauses that make up this query.
	 *
	 * The term is used as is, i.e. no tokenization will be performed by this method. Instead conversion
	 * to a token or token-like string should be done before calling this method.
	 *
	 * The term will be converted to a string by calling `toString`. Multiple terms can be passed as an
	 * array, each term in the array will share the same options.
	 *
	 * @param {object|object[]} term - The term(s) to add to the query.
	 * @param {object} [options] - Any additional properties to add to the query clause.
	 * @returns {Query}
	 * @see Query#clause
	 * @see Query~Clause
	 * @example <caption>adding a single term to a query</caption>
	 * query.term("foo")
	 * @example <caption>adding a single term to a query and specifying search fields, term boost and automatic trailing wildcard</caption>
	 * query.term("foo", {
	 *   fields: ["title"],
	 *   boost: 10,
	 *   wildcard: QueryWildCard.TRAILING
	 * })
	 * @example <caption>using tokenizer to convert a string to tokens before using them as terms</caption>
	 * query.term(tokenizer("foo bar"))
	 */
	term(term: string | string[] | Token | Token[], options?: QueryClause) {
		if (Array.isArray(term)) {
			for (const t of term) {
				this.term(t, structuredClone(options));
			}
			return this;
		}

		const clause: QueryClause = options || {};
		clause.term = term.toString();

		this.clause(clause);

		return this;
	}
}
