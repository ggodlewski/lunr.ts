/**
 * A vector is used to construct the vector space of documents and queries. These
 * vectors support operations to determine the similarity between two documents or
 * a document and a query.
 *
 * Normally no parameters are required for initializing a vector, but in the case of
 * loading a previously dumped vector the raw elements can be provided to the constructor.
 *
 * For performance reasons vectors are implemented with a flat array, where an elements
 * index is immediately followed by its value. E.g. [index, value, index, value]. This
 * allows the underlying array to be as sparse as possible and still offer decent
 * performance when being used for vector calculations.
 */
export class Vector {
	_magnitude = 0;

	constructor(private elements: Array<number | string> = []) {
	}

	/**
	 * Calculates the position within the vector to insert a given index.
	 *
	 * This is used internally by insert and upsert. If there are duplicate indexes then
	 * the position is returned as if the value for that index were to be updated, but it
	 * is the callers responsibility to check whether there is a duplicate at that index
	 *
	 * @param {number} index - The index at which the element should be inserted.
	 */
	positionForIndex(index: number): number {
		// For an empty vector the tuple can be inserted at the beginning
		if (this.elements.length == 0) {
			return 0;
		}

		let start = 0;
		let end = this.elements.length / 2;
		let sliceLength = end - start;
		let pivotPoint = Math.floor(sliceLength / 2);
		let pivotIndex = this.elements[pivotPoint * 2];

		while (sliceLength > 1) {
			if (pivotIndex < index) {
				start = pivotPoint;
			}

			if (pivotIndex > index) {
				end = pivotPoint;
			}

			if (pivotIndex === index) {
				break;
			}

			sliceLength = end - start;
			pivotPoint = start + Math.floor(sliceLength / 2);
			pivotIndex = this.elements[pivotPoint * 2];
		}

		if (pivotIndex == index) {
			return pivotPoint * 2;
		}

		if (pivotIndex > index) {
			return pivotPoint * 2;
		}

		if (pivotIndex < index) {
			return (pivotPoint + 1) * 2;
		}

		return 0;
	}

	/**
	 * Inserts an element at an index within the vector.
	 *
	 * Does not allow duplicates, will throw an error if there is already an entry
	 * for this index.
	 *
	 * @param {Number} insertIdx - The index at which the element should be inserted.
	 * @param {Number} val - The value to be inserted into the vector.
	 */
	insert(insertIdx: number, val: number) {
		this.upsert(insertIdx, val, function () {
			throw new Error('duplicate index');
		});
	}

	/**
	 * Inserts or updates an existing index within the vector.
	 *
	 * @param {Number} insertIdx - The index at which the element should be inserted.
	 * @param {Number} val - The value to be inserted into the vector.
	 * @param {function} fn - A function that is called for updates, the existing value and the
	 * requested value are passed as arguments
	 */
	upsert(
		insertIdx: number,
		val: number,
		fn?: (p1: number | string, p2: number) => number | string,
	) {
		this._magnitude = 0;
		const position = this.positionForIndex(insertIdx);

		if (this.elements[position] == insertIdx) {
			if (fn) {
				const i: number | string = this.elements[position + 1];
				this.elements[position + 1] = fn(i, val);
			}
		} else {
			this.elements.splice(position, 0, insertIdx, val);
		}
	}

	/**
	 * Calculates the magnitude of this vector.
	 *
	 * @returns {Number}
	 */
	magnitude() {
		if (this._magnitude) return this._magnitude;

		let sumOfSquares = 0;
		const elementsLength = this.elements.length;

		for (let i = 1; i < elementsLength; i += 2) {
			const valElem = this.elements[i];
			const val = 'string' === typeof valElem
				? parseFloat(valElem)
				: valElem;
			sumOfSquares += val * val;
		}

		return this._magnitude = Math.sqrt(sumOfSquares);
	}

	/**
	 * Calculates the dot product of this vector and another vector.
	 *
	 * @param {Vector} otherVector - The vector to compute the dot product with.
	 * @returns {Number}
	 */
	dot(otherVector: Vector) {
		let dotProduct = 0;
		const a = this.elements, b = otherVector.elements;

		let i = 0, j = 0;
		while (i < a.length && j < b.length) {
			const ai = a[i];
			const bj = b[j];
			const aVal = 'string' === typeof ai ? parseFloat(ai) : ai;
			const bVal = 'string' === typeof bj ? parseFloat(bj) : bj;

			if (aVal < bVal) {
				i += 2;
			} else if (aVal > bVal) {
				j += 2;
			} else if (aVal == bVal) {
				const nextAi = a[i + 1];
				const nextBj = b[j + 1];
				const nextA = 'string' === typeof nextAi
					? parseFloat(nextAi)
					: nextAi;
				const nextB = 'string' === typeof nextBj
					? parseFloat(nextBj)
					: nextBj;
				dotProduct += nextA * nextB;
				i += 2;
				j += 2;
			}
		}

		return dotProduct;
	}

	/**
	 * Calculates the similarity between this vector and another vector.
	 *
	 * @param {Vector} otherVector - The other vector to calculate the
	 * similarity with.
	 * @returns {Number}
	 */
	similarity(otherVector: Vector) {
		return this.dot(otherVector) / this.magnitude() || 0;
	}

	/**
	 * Converts the vector to an array of the elements within the vector.
	 */
	toArray(): number[] {
		const output = new Array(this.elements.length / 2);

		for (let i = 1, j = 0; i < this.elements.length; i += 2, j++) {
			output[j] = this.elements[i];
		}

		return output;
	}

	/**
	 * A JSON serializable representation of the vector.
	 *
	 * @returns {Number[]}
	 */
	toJSON() {
		return this.elements;
	}
}
