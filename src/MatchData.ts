/**
 * Contains and collects metadata about a matching document.
 * A single instance of MatchData is returned as part of every
 * LunrIndex~Result.
 *
 * @constructor
 * @param {string} term - The term this match data is associated with
 * @param {string} field - The field in which the term was found
 * @param {object} metadata - The metadata recorded about this term in this field
 * @property {object} metadata - A cloned collection of metadata associated with this document.
 * @see {@link LunrIndex~Result}
 */
import { LunrDocument } from './Builder.ts';

export class MatchData {
	metadata: LunrDocument = {};

	constructor(
		term?: string,
		field?: string,
		metadata: LunrDocument = {},
	) {
		const clonedMetadata: { [key: string]: string } = {},
			metadataKeys = Object.keys(metadata || {});

		// Cloning the metadata to prevent the original
		// being mutated during match data combination.
		// Metadata is kept in an array within the inverted
		// index so cloning the data can be done with
		// Array#slice
		for (const key of metadataKeys) {
			clonedMetadata[key] = metadata[key].slice();
		}

		if (term !== undefined && field !== undefined) {
			this.metadata[term] = {};
			this.metadata[term][field] = clonedMetadata;
		}
	}

	/**
	 * An instance of MatchData will be created for every term that matches a
	 * document. However only one instance is required in a LunrIndex~Result. This
	 * method combines metadata from another instance of MatchData with this
	 * objects metadata.
	 *
	 * @param {MatchData} otherMatchData - Another instance of match data to merge with this one.
	 * @see {@link LunrIndex~Result}
	 */
	combine(otherMatchData: MatchData) {
		const terms = Object.keys(otherMatchData.metadata);

		for (const term of terms) {
			const fields = Object.keys(otherMatchData.metadata[term]);

			if (this.metadata[term] == undefined) {
				this.metadata[term] = {};
			}

			for (const field of fields) {
				const keys = Object.keys(otherMatchData.metadata[term][field]);

				if (this.metadata[term][field] == undefined) {
					this.metadata[term][field] = {};
				}

				for (const key of keys) {
					if (this.metadata[term][field][key] == undefined) {
						this.metadata[term][field][key] =
							otherMatchData.metadata[term][field][key];
					} else {
						this.metadata[term][field][key] = this
							.metadata[term][field][key]
							.concat(otherMatchData.metadata[term][field][key]);
					}
				}
			}
		}
	}

	/**
	 * Add metadata for a term/field pair to this instance of match data.
	 *
	 * @param {string} term - The term this match data is associated with
	 * @param {string} field - The field in which the term was found
	 * @param {object} metadata - The metadata recorded about this term in this field
	 */
	add(term: string, field: string, metadata: LunrDocument) {
		if (!(term in this.metadata)) {
			this.metadata[term] = {};
			this.metadata[term][field] = metadata;
			return;
		}

		if (!(field in this.metadata[term])) {
			this.metadata[term][field] = metadata;
			return;
		}

		const metadataKeys = Object.keys(metadata);

		for (const key of metadataKeys) {
			if (key in this.metadata[term][field]) {
				this.metadata[term][field][key] = this
					.metadata[term][field][key]
					.concat(metadata[key]);
			} else {
				this.metadata[term][field][key] = metadata[key];
			}
		}
	}
}
