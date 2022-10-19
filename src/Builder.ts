import { Pipeline } from './Pipeline.ts';
import { FieldRef } from './FieldRef.ts';
import { Vector } from './Vector.ts';
import { tokenizer } from './tokenizer.ts';
import { inverseDocumentFrequency } from './inverseDocumentFrequency.ts';
import { LunrIndex } from './LunrIndex.ts';
import { TokenSet } from './TokenSet.ts';

export interface LunrDocument {
	// deno-lint-ignore no-explicit-any
	[key: string]: any;
}

/**
 * Builder performs indexing on a set of documents and
 * returns instances of LunrIndex ready for querying.
 *
 * All configuration of the index is done via the builder, the
 * fields to index, the document reference, the text processing
 * pipeline and document scoring parameters are all set on the
 * builder before indexing.
 *
 * @constructor
 * @property {string} _ref - Internal reference to the document reference field.
 * @property {string[]} _fields - Internal reference to the document fields to index.
 * @property {object} invertedIndex - The inverted index maps terms to document fields.
 * @property {object} documentTermFrequencies - Keeps track of document term frequencies.
 * @property {object} documentLengths - Keeps track of the length of documents added to the index.
 * @property {tokenizer} tokenizer - Function for splitting strings into tokens for indexing.
 * @property {Pipeline} pipeline - The pipeline performs text processing on tokens before indexing.
 * @property {Pipeline} searchPipeline - A pipeline for processing search terms before querying the index.
 * @property {number} documentCount - Keeps track of the total number of documents indexed.
 * @property {number} _b - A parameter to control field length normalization, setting this to 0 disabled normalization, 1 fully normalizes field lengths, the default value is 0.75.
 * @property {number} _k1 - A parameter to control how quickly an increase in term frequency results in term frequency saturation, the default value is 1.2.
 * @property {number} termIndex - A counter incremented for each unique term, used to identify a terms position in the vector space.
 * @property {array} metadataWhitelist - A list of metadata keys that have been whitelisted for entry in the index.
 */
export class Builder {
	_ref = 'id';
	_fields: {
		[key: string]: {
			extractor?: (doc: LunrDocument) => number;
			boost?: number;
		};
	} = Object.create(null);
	_documents: { [key: string]: LunrDocument } = {};
	readonly invertedIndex: LunrDocument = Object.create(null);
	fieldTermFrequencies: { [key: string]: { [key: string]: number } } = Object
		.create(null);
	fieldLengths: { [key: string]: number } = {};
	tokenizer = tokenizer;
	pipeline = new Pipeline();
	searchPipeline = new Pipeline();
	documentCount = 0;
	_b = 0.75;
	_k1 = 1.2;
	termIndex = 0;
	metadataWhitelist: string[] = [];
	public tokenSet: TokenSet = new TokenSet();
	public averageFieldLength: { [key: string]: number } = {};
	public fieldVectors: { [key: string]: Vector } = {};

	/**
	 * Sets the document field used as the document reference. Every document must have this field.
	 * The type of this field in the document should be a string, if it is not a string it will be
	 * coerced into a string by calling toString.
	 *
	 * The default ref is 'id'.
	 *
	 * The ref should _not_ be changed during indexing, it should be set before any documents are
	 * added to the index. Changing it during indexing can lead to inconsistent results.
	 *
	 * @param {string} ref - The name of the reference field in the document.
	 */
	ref(ref: string) {
		this._ref = ref;
	}

	/**
	 * Adds a field to the list of document fields that will be indexed. Every document being
	 * indexed should have this field. Null values for this field in indexed documents will
	 * not cause errors but will limit the chance of that document being retrieved by searches.
	 *
	 * All fields should be added before adding documents to the index. Adding fields after
	 * a document has been indexed will have no effect on already indexed documents.
	 *
	 * Fields can be boosted at build time. This allows terms within that field to have more
	 * importance when ranking search results. Use a field boost to specify that matches within
	 * one field are more important than other fields.
	 *
	 * @param {string} fieldName - The name of a field to index in all documents.
	 * @param {object} attributes - Optional attributes associated with this field.
	 * @param {number} [attributes.boost=1] - Boost applied to all terms within this field.
	 * @param {fieldExtractor} [attributes.extractor] - Function to extract a field from a document.
	 * @throws {RangeError} fieldName cannot contain unsupported characters '/'
	 */
	field(fieldName: string, attributes = {}) {
		if (/\//.test(fieldName)) {
			throw new RangeError(
				'Field \'' + fieldName + '\' contains illegal character \'/\'',
			);
		}

		this._fields[fieldName] = attributes || {};
	}

	/**
	 * A parameter to tune the amount of field length normalisation that is applied when
	 * calculating relevance scores. A value of 0 will completely disable any normalisation
	 * and a value of 1 will fully normalise field lengths. The default is 0.75. Values of b
	 * will be clamped to the range 0 - 1.
	 *
	 * @param {number} number - The value to set for this tuning parameter.
	 */
	b(number: number) {
		if (number < 0) {
			this._b = 0;
		} else if (number > 1) {
			this._b = 1;
		} else {
			this._b = number;
		}
	}

	/**
	 * A parameter that controls the speed at which a rise in term frequency results in term
	 * frequency saturation. The default value is 1.2. Setting this to a higher value will give
	 * slower saturation levels, a lower value will result in quicker saturation.
	 *
	 * @param {number} number - The value to set for this tuning parameter.
	 */
	k1(number: number) {
		this._k1 = number;
	}

	/**
	 * Adds a document to the index.
	 *
	 * Before adding fields to the index the index should have been fully setup, with the document
	 * ref and all fields to index already having been specified.
	 *
	 * The document must have a field name as specified by the ref (by default this is 'id') and
	 * it should have all fields defined for indexing, though null or undefined values will not
	 * cause errors.
	 *
	 * Entire documents can be boosted at build time. Applying a boost to a document indicates that
	 * this document should rank higher in search results than other documents.
	 *
	 * @param {object} doc - The document to add to the index.
	 * @param {object} attributes - Optional attributes associated with this document.
	 * @param {number} [attributes.boost=1] - Boost applied to all terms within this document.
	 */
	add(
		doc: LunrDocument,
		attributes: { [key: string]: string | number } = {},
	) {
		const docRef = doc[this._ref];

		this._documents[docRef] = attributes || {};
		this.documentCount += 1;

		for (const fieldName in this._fields) {
			const extractor = this._fields[fieldName].extractor,
				field = extractor ? extractor(doc) : doc[fieldName],
				tokens = this.tokenizer(field, {
					fields: [fieldName],
				}),
				terms = this.pipeline.run(tokens),
				fieldRef = new FieldRef(docRef, fieldName),
				fieldTerms: { [key: string]: number } = Object.create(null);

			this.fieldTermFrequencies[fieldRef.toString()] = fieldTerms;
			this.fieldLengths[fieldRef.toString()] = 0;

			// store the length of this field for this document
			this.fieldLengths[fieldRef.toString()] += terms.length;

			// calculate term frequencies for this field
			for (const term of terms) {
				if (fieldTerms[term.toString()] == undefined) {
					fieldTerms[term.toString()] = 0;
				}

				fieldTerms[term.toString()] += 1;

				// add to inverted index
				// create an initial posting if one doesn't exist
				if (this.invertedIndex[term.toString()] == undefined) {
					// deno-lint-ignore no-explicit-any
					const posting: { [key: string]: any } = Object.create(null);
					posting['_index'] = this.termIndex;
					this.termIndex += 1;

					for (const field in this._fields) {
						posting[field] = Object.create(null);
					}

					this.invertedIndex[term.toString()] = posting;
				}

				// add an entry for this term/fieldName/docRef to the invertedIndex
				if (
					this.invertedIndex[term.toString()][fieldName][docRef] ==
						undefined
				) {
					this.invertedIndex[term.toString()][fieldName][docRef] =
						Object.create(null);
				}

				// store all whitelisted metadata about this token in the
				// inverted index
				for (const metadataKey of this.metadataWhitelist) {
					const metadata = term.metadata[metadataKey];

					if (
						this.invertedIndex[term.toString()][fieldName][docRef][
							metadataKey
						] ==
							undefined
					) {
						this.invertedIndex[term.toString()][fieldName][docRef][
							metadataKey
						] = [];
					}

					this.invertedIndex[term.toString()][fieldName][docRef][
						metadataKey
					].push(
						metadata,
					);
				}
			}
		}
	}

	/**
	 * Calculates the average document length for this index
	 *
	 * @private
	 */
	calculateAverageFieldLengths() {
		const accumulator: { [key: string]: number } = {};
		const documentsWithField: { [key: string]: number } = {};

		for (const fieldRefStr in this.fieldLengths) {
			const fieldRef = FieldRef.fromString(fieldRefStr),
				field = fieldRef.fieldName;

			documentsWithField[field] || (documentsWithField[field] = 0);
			documentsWithField[field] += 1;

			accumulator[field] || (accumulator[field] = 0);
			accumulator[field] += this.fieldLengths[fieldRef.toString()];
		}

		for (const fieldName in this._fields) {
			accumulator[fieldName] = accumulator[fieldName] /
				documentsWithField[fieldName];
		}

		this.averageFieldLength = accumulator;
	}

	/**
	 * Builds a vector space model of every document using Vector
	 *
	 * @private
	 */
	createFieldVectors() {
		const fieldVectors: { [key: string]: Vector } = {};
		const fieldRefs = Object.keys(this.fieldTermFrequencies);
		const termIdfCache: { [key: string]: number } = Object.create(null);

		for (const fieldRefStr of fieldRefs) {
			const fieldRef = FieldRef.fromString(fieldRefStr),
				fieldName = fieldRef.fieldName,
				fieldLength = this.fieldLengths[fieldRef.toString()],
				fieldVector = new Vector(),
				termFrequencies =
					this.fieldTermFrequencies[fieldRef.toString()],
				terms = Object.keys(termFrequencies);

			const fieldBoost = this._fields[fieldName].boost || 1,
				docBoost = this._documents[fieldRef.docRef].boost || 1;

			for (const term of terms) {
				const tf = termFrequencies[term],
					termIndex = this.invertedIndex[term]._index;
				let idf, score;

				if (termIdfCache[term] === undefined) {
					idf = inverseDocumentFrequency(
						this.invertedIndex[term],
						this.documentCount,
					);
					termIdfCache[term] = idf;
				} else {
					idf = termIdfCache[term];
				}

				score = idf * ((this._k1 + 1) * tf) /
					(this._k1 *
							(1 - this._b +
								this._b *
									(fieldLength /
										this.averageFieldLength[fieldName])) +
						tf);
				score *= fieldBoost;
				score *= docBoost;
				const scoreWithPrecision = Math.round(score * 1000) / 1000;
				// Converts 1.23456789 to 1.234.
				// Reducing the precision so that the vectors take up less
				// space when serialised. Doing it now so that they behave
				// the same before and after serialisation. Also, this is
				// the fastest approach to reducing a number's precision in
				// JavaScript.

				fieldVector.insert(termIndex, scoreWithPrecision);
			}

			fieldVectors[fieldRef.toString()] = fieldVector;
		}

		this.fieldVectors = fieldVectors;
	}

	/**
	 * Creates a token set of all tokens in the index using TokenSet
	 *
	 * @private
	 */
	createTokenSet() {
		this.tokenSet = TokenSet.fromArray(
			Object.keys(this.invertedIndex).sort(),
		);
	}

	/**
	 * Builds the index, creating an instance of LunrIndex.
	 *
	 * This completes the indexing process and should only be called
	 * once all documents have been added to the index.
	 *
	 * @returns {LunrIndex}
	 */
	build() {
		this.calculateAverageFieldLengths();
		this.createFieldVectors();
		this.createTokenSet();

		return new LunrIndex({
			invertedIndex: this.invertedIndex,
			fieldVectors: this.fieldVectors,
			tokenSet: this.tokenSet,
			fields: Object.keys(this._fields),
			pipeline: this.searchPipeline,
		});
	}

	/**
	 * Applies a plugin to the index builder.
	 *
	 * A plugin is a function that is called with the index builder as its context.
	 * Plugins can be used to customise or extend the behaviour of the index
	 * in some way. A plugin is just a function, that encapsulated the custom
	 * behaviour that should be applied when building the index.
	 *
	 * The plugin function will be called with the index builder as its argument, additional
	 * arguments can also be passed when calling use. The function will be called
	 * with the index builder as its context.
	 *
	 * @param {Function} plugin The plugin to apply.
	 */
	// deno-lint-ignore no-explicit-any
	use(plugin: any, ...args: any[]) {
		args.unshift(this);
		plugin.apply(this, args);
	}
}
