import { tokenizer } from './tokenizer.ts';

export interface Lexem {
	type: string;
	str: string;
	start: number;
	end: number;
}

export class QueryLexer {
	lexemes: Lexem[] = [];
	pos = 0;
	start = 0;
	escapeCharPositions: number[] = [];
	private length: number;

	constructor(private str: string) {
		this.length = str.length;
	}

	run() {
		let state = QueryLexer.lexText;

		while (state) {
			state = state(this);
		}
	}

	sliceString() {
		const subSlices = [];
		let sliceStart = this.start;
		let sliceEnd = this.pos;

		for (let i = 0; i < this.escapeCharPositions.length; i++) {
			sliceEnd = this.escapeCharPositions[i];
			subSlices.push(this.str.slice(sliceStart, sliceEnd));
			sliceStart = sliceEnd + 1;
		}

		subSlices.push(this.str.slice(sliceStart, this.pos));
		this.escapeCharPositions.length = 0;

		return subSlices.join('');
	}

	emit(type: string) {
		this.lexemes.push({
			type: type,
			str: this.sliceString(),
			start: this.start,
			end: this.pos,
		});

		this.start = this.pos;
	}

	escapeCharacter() {
		this.escapeCharPositions.push(this.pos - 1);
		this.pos += 1;
	}

	next() {
		if (this.pos >= this.length) {
			return QueryLexer.EOS;
		}

		const char = this.str.charAt(this.pos);
		this.pos += 1;
		return char;
	}

	width() {
		return this.pos - this.start;
	}

	ignore() {
		if (this.start == this.pos) {
			this.pos += 1;
		}

		this.start = this.pos;
	}

	backup() {
		this.pos -= 1;
	}

	acceptDigitRun() {
		let char, charCode;

		do {
			char = this.next();
			charCode = char.charCodeAt(0);
		} while (charCode > 47 && charCode < 58);

		if (char != QueryLexer.EOS) {
			this.backup();
		}
	}

	more() {
		return this.pos < this.length;
	}

	static EOS = 'EOS';
	static FIELD = 'FIELD';
	static TERM = 'TERM';
	static EDIT_DISTANCE = 'EDIT_DISTANCE';
	static BOOST = 'BOOST';
	static PRESENCE = 'PRESENCE';

	static lexField(lexer: QueryLexer) {
		lexer.backup();
		lexer.emit(QueryLexer.FIELD);
		lexer.ignore();
		return QueryLexer.lexText;
	}

	static lexTerm(lexer: QueryLexer) {
		if (lexer.width() > 1) {
			lexer.backup();
			lexer.emit(QueryLexer.TERM);
		}

		lexer.ignore();

		if (lexer.more()) {
			return QueryLexer.lexText;
		}
	}

	static lexEditDistance(lexer: QueryLexer) {
		lexer.ignore();
		lexer.acceptDigitRun();
		lexer.emit(QueryLexer.EDIT_DISTANCE);
		return QueryLexer.lexText;
	}

	static lexBoost(lexer: QueryLexer) {
		lexer.ignore();
		lexer.acceptDigitRun();
		lexer.emit(QueryLexer.BOOST);
		return QueryLexer.lexText;
	}

	static lexEOS(lexer: QueryLexer) {
		if (lexer.width() > 0) {
			lexer.emit(QueryLexer.TERM);
		}
	}

	// This matches the separator used when tokenising fields
	// within a document. These should match otherwise it is
	// not possible to search for some tokens within a document.
	//
	// It is possible for the user to change the separator on the
	// tokenizer so it _might_ clash with any other of the special
	// characters already used within the search string, e.g. :.
	//
	// This means that it is possible to change the separator in
	// such a way that makes some words unsearchable using a search
	// string.
	static termSeparator = tokenizer.separator;

	static lexText(lexer: QueryLexer) {
		while (true) {
			const char = lexer.next();

			if (char == QueryLexer.EOS) {
				return QueryLexer.lexEOS;
			}

			// Escape character is '\'
			if (char.charCodeAt(0) == 92) {
				lexer.escapeCharacter();
				continue;
			}

			if (char == ':') {
				return QueryLexer.lexField;
			}

			if (char == '~') {
				lexer.backup();
				if (lexer.width() > 0) {
					lexer.emit(QueryLexer.TERM);
				}
				return QueryLexer.lexEditDistance;
			}

			if (char == '^') {
				lexer.backup();
				if (lexer.width() > 0) {
					lexer.emit(QueryLexer.TERM);
				}
				return QueryLexer.lexBoost;
			}

			// "+" indicates term presence is required
			// checking for length to ensure that only
			// leading "+" are considered
			if (char == '+' && lexer.width() === 1) {
				lexer.emit(QueryLexer.PRESENCE);
				return QueryLexer.lexText;
			}

			// "-" indicates term presence is prohibited
			// checking for length to ensure that only
			// leading "-" are considered
			if (char == '-' && lexer.width() === 1) {
				lexer.emit(QueryLexer.PRESENCE);
				return QueryLexer.lexText;
			}

			if (char.match(QueryLexer.termSeparator)) {
				return QueryLexer.lexTerm;
			}
		}
	}
}
