import { Lexem, QueryLexer } from './QueryLexer.ts';
import { QueryParseError } from './QueryParseError.ts';
import { Query, QueryClause } from './Query.ts';

export class QueryParser {
	currentClause: QueryClause = {};
	lexemeIdx = 0;
	private lexer: QueryLexer;
	private lexemes: Lexem[] = [];

	constructor(str: string, private query: Query) {
		this.lexer = new QueryLexer(str);
	}

	parse() {
		this.lexer.run();
		this.lexemes = this.lexer.lexemes;

		let state = QueryParser.parseClause;

		while (state) {
			const newState = state(this);
			if (!newState) {
				break;
			}
			state = newState;
		}

		return this.query;
	}

	peekLexeme() {
		return this.lexemes[this.lexemeIdx];
	}

	consumeLexeme() {
		const lexeme = this.peekLexeme();
		this.lexemeIdx += 1;
		return lexeme;
	}

	nextClause() {
		const completedClause = this.currentClause;
		this.query.clause(completedClause);
		this.currentClause = {};
	}

	static parseClause(parser: QueryParser) {
		const lexeme = parser.peekLexeme();

		if (lexeme == undefined) {
			return;
		}

		switch (lexeme.type) {
			case QueryLexer.PRESENCE:
				return QueryParser.parsePresence;
			case QueryLexer.FIELD:
				return QueryParser.parseField;
			case QueryLexer.TERM:
				return QueryParser.parseTerm;
			default:
				throw new QueryParseError(
					'expected either a field or a term, found ' + lexeme.type +
						(lexeme.str.length >= 1)
						? ' with value \'' + lexeme.str + '\''
						: '',
					lexeme.start,
					lexeme.end,
				);
		}
	}

	static parsePresence(parser: QueryParser) {
		const lexeme = parser.consumeLexeme();

		if (lexeme == undefined) {
			return;
		}

		switch (lexeme.str) {
			case '-':
				parser.currentClause.presence = Query.presence.PROHIBITED;
				break;
			case '+':
				parser.currentClause.presence = Query.presence.REQUIRED;
				break;
			default:
				throw new QueryParseError(
					'unrecognised presence operator\'' + lexeme.str + '\'',
					lexeme.start,
					lexeme.end,
				);
		}

		const nextLexeme = parser.peekLexeme();

		if (nextLexeme == undefined) {
			const errorMessage = 'expecting term or field, found nothing';
			throw new QueryParseError(errorMessage, lexeme.start, lexeme.end);
		}

		switch (nextLexeme.type) {
			case QueryLexer.FIELD:
				return QueryParser.parseField;
			case QueryLexer.TERM:
				return QueryParser.parseTerm;
			default:
				throw new QueryParseError(
					'expecting term or field, found \'' +
						nextLexeme.type + '\'',
					nextLexeme.start,
					nextLexeme.end,
				);
		}
	}

	static parseField(parser: QueryParser) {
		const lexeme = parser.consumeLexeme();

		if (lexeme == undefined) {
			return;
		}

		if (parser.query.allFields.indexOf(lexeme.str) == -1) {
			const possibleFields = parser.query.allFields.map(function (f) {
					return '\'' + f + '\'';
				}).join(', '),
				errorMessage = 'unrecognised field \'' + lexeme.str +
					'\', possible fields: ' + possibleFields;

			throw new QueryParseError(errorMessage, lexeme.start, lexeme.end);
		}

		parser.currentClause.fields = [lexeme.str];

		const nextLexeme = parser.peekLexeme();

		if (nextLexeme == undefined) {
			const errorMessage = 'expecting term, found nothing';
			throw new QueryParseError(errorMessage, lexeme.start, lexeme.end);
		}

		switch (nextLexeme.type) {
			case QueryLexer.TERM:
				return QueryParser.parseTerm;
			default:
				throw new QueryParseError(
					'expecting term, found \'' + nextLexeme.type + '\'',
					nextLexeme.start,
					nextLexeme.end,
				);
		}
	}

	static parseTerm(parser: QueryParser) {
		const lexeme = parser.consumeLexeme();

		if (lexeme == undefined) {
			return;
		}

		parser.currentClause.term = lexeme.str.toLowerCase();

		if (lexeme.str.indexOf('*') != -1) {
			parser.currentClause.usePipeline = false;
		}

		const nextLexeme = parser.peekLexeme();

		if (nextLexeme == undefined) {
			parser.nextClause();
			return;
		}

		switch (nextLexeme.type) {
			case QueryLexer.TERM:
				parser.nextClause();
				return QueryParser.parseTerm;
			case QueryLexer.FIELD:
				parser.nextClause();
				return QueryParser.parseField;
			case QueryLexer.EDIT_DISTANCE:
				return QueryParser.parseEditDistance;
			case QueryLexer.BOOST:
				return QueryParser.parseBoost;
			case QueryLexer.PRESENCE:
				parser.nextClause();
				return QueryParser.parsePresence;
			default:
				throw new QueryParseError(
					'Unexpected lexeme type \'' + nextLexeme.type + '\'',
					nextLexeme.start,
					nextLexeme.end,
				);
		}
	}

	static parseEditDistance(parser: QueryParser) {
		const lexeme = parser.consumeLexeme();

		if (lexeme == undefined) {
			return;
		}

		const editDistance = parseInt(lexeme.str, 10);

		if (isNaN(editDistance)) {
			const errorMessage = 'edit distance must be numeric';
			throw new QueryParseError(errorMessage, lexeme.start, lexeme.end);
		}

		parser.currentClause.editDistance = editDistance;

		const nextLexeme = parser.peekLexeme();

		if (nextLexeme == undefined) {
			parser.nextClause();
			return;
		}

		switch (nextLexeme.type) {
			case QueryLexer.TERM:
				parser.nextClause();
				return QueryParser.parseTerm;
			case QueryLexer.FIELD:
				parser.nextClause();
				return QueryParser.parseField;
			case QueryLexer.EDIT_DISTANCE:
				return QueryParser.parseEditDistance;
			case QueryLexer.BOOST:
				return QueryParser.parseBoost;
			case QueryLexer.PRESENCE:
				parser.nextClause();
				return QueryParser.parsePresence;
			default:
				throw new QueryParseError(
					'Unexpected lexeme type \'' + nextLexeme.type + '\'',
					nextLexeme.start,
					nextLexeme.end,
				);
		}
	}

	static parseBoost(parser: QueryParser) {
		const lexeme = parser.consumeLexeme();

		if (lexeme == undefined) {
			return;
		}

		const boost = parseInt(lexeme.str, 10);

		if (isNaN(boost)) {
			const errorMessage = 'boost must be numeric';
			throw new QueryParseError(errorMessage, lexeme.start, lexeme.end);
		}

		parser.currentClause.boost = boost;

		const nextLexeme = parser.peekLexeme();

		if (nextLexeme == undefined) {
			parser.nextClause();
			return;
		}

		switch (nextLexeme.type) {
			case QueryLexer.TERM:
				parser.nextClause();
				return QueryParser.parseTerm;
			case QueryLexer.FIELD:
				parser.nextClause();
				return QueryParser.parseField;
			case QueryLexer.EDIT_DISTANCE:
				return QueryParser.parseEditDistance;
			case QueryLexer.BOOST:
				return QueryParser.parseBoost;
			case QueryLexer.PRESENCE:
				parser.nextClause();
				return QueryParser.parsePresence;
			default:
				throw new QueryParseError(
					'Unexpected lexeme type \'' + nextLexeme.type + '\'',
					nextLexeme.start,
					nextLexeme.end,
				);
		}
	}
}
