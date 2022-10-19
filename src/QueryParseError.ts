export class QueryParseError extends Error {
	private start: number;
	private end: number;

	constructor(message: string, start: number, end: number) {
		super(message);
		this.name = 'QueryParseError';
		this.start = start;
		this.end = end;
	}
}
