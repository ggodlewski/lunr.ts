export class LunrSet {
	private readonly elements: { [k: string]: boolean } = {};
	private length: number;

	constructor(elements?: string[]) {
		if (elements) {
			this.length = elements.length;

			for (const element of elements) {
				this.elements[element] = true;
			}
		} else {
			this.length = 0;
		}
	}

	/**
	 * Returns true if this set contains the specified object.
	 *
	 * @param {object} object - Object whose presence in this set is to be tested.
	 * @returns {boolean} - True if this set contains the specified object.
	 */
	contains(object: string): boolean {
		return !!this.elements[object];
	}

	/**
	 * Returns a new set containing only the elements that are present in both
	 * this set and the specified set.
	 *
	 * @param {LunrSet} other - set to intersect with this set.
	 * @returns {LunrSet} a new set that is the intersection of this and the specified set.
	 */

	intersect(other: LunrSet): LunrSet {
		let a, b;
		const intersection = [];

		if (other === completeLunrSet) {
			return this;
		}

		if (other === emptyLunrSet) {
			return other;
		}

		if (this.length < other.length) {
			a = this;
			b = other;
		} else {
			a = other;
			b = this;
		}

		const elements = Object.keys(a.elements);

		for (const element of elements) {
			if (element in b.elements) {
				intersection.push(element);
			}
		}

		return new LunrSet(intersection);
	}

	/**
	 * Returns a new set combining the elements of this and the specified set.
	 *
	 * @param {LunrSet} other - set to union with this set.
	 * @return {LunrSet} a new set that is the union of this and the specified set.
	 */

	union(other: LunrSet): LunrSet {
		if (other === completeLunrSet) {
			return completeLunrSet;
		}

		if (other === emptyLunrSet) {
			return this;
		}

		return new LunrSet(
			Object.keys(this.elements).concat(Object.keys(other.elements)),
		);
	}
}

/**
 * An empty set that contains no elements.
 */
class EmptyLunrSet extends LunrSet {
	intersect(other: LunrSet): LunrSet {
		return this;
	}

	union(other: LunrSet): LunrSet {
		return other;
	}

	contains(object: string): boolean {
		return false;
	}
}

/**
 * A complete set that contains all elements.
 */
class CompleteLunrSet extends LunrSet {
	intersect(other: LunrSet): LunrSet {
		return other;
	}

	union(other: LunrSet): LunrSet {
		return this;
	}

	contains(object: string): boolean {
		return true;
	}
}

/**
 * A complete set that contains all elements.
 */
export const completeLunrSet = new CompleteLunrSet();

/**
 * An empty set that contains no elements.
 */
export const emptyLunrSet = new EmptyLunrSet();
