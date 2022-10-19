export class FieldRef {
	static readonly joiner = '/';

	constructor(
		public readonly docRef: string,
		public readonly fieldName: string,
		private stringValue?: string,
	) {}

	static fromString(s: string): FieldRef {
		const n = s.indexOf(FieldRef.joiner);

		if (n === -1) {
			throw new Error('malformed field ref string');
		}

		const fieldRef = s.slice(0, n),
			docRef = s.slice(n + 1);

		return new FieldRef(docRef, fieldRef, s);
	}

	toString() {
		if (this.stringValue == undefined) {
			this.stringValue = this.fieldName + FieldRef.joiner + this.docRef;
		}

		return this.stringValue;
	}
}
