/**
 * A function to calculate the inverse document frequency for
 * a posting. This is shared between the builder and the index
 *
 * @private
 * @param {object} posting - The posting for a given term
 * @param {number} documentCount - The total number of documents.
 */
export function inverseDocumentFrequency(
	posting: { [key: string]: string },
	documentCount: number,
): number {
	let documentsWithTerm = 0;

	for (const fieldName in posting) {
		if (fieldName == '_index') continue; // Ignore the term index, its not a field
		documentsWithTerm += Object.keys(posting[fieldName]).length;
	}

	const x = (documentCount - documentsWithTerm + 0.5) /
		(documentsWithTerm + 0.5);

	return Math.log(1 + Math.abs(x));
}
