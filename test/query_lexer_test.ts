import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assert,
	assertEquals,
	assertFalse,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { QueryLexer } from '../src/QueryLexer.ts';

describe('QueryLexer', function () {
	describe('#run', function () {
		const lex = function (str: string) {
			const lexer = new QueryLexer(str);
			lexer.run();
			return lexer;
		};

		describe('single term', function () {
			const lexer = lex('foo');

			it('produces 1 lexeme', function () {
				assertEquals(lexer.lexemes.length, 1);
			});

			describe('lexeme', function () {
				const lexeme = lexer.lexemes[0];

				it('#type', function () {
					assertEquals(QueryLexer.TERM, lexeme.type);
				});

				it('#str', function () {
					assertEquals('foo', lexeme.str);
				});

				it('#start', function () {
					assertEquals(0, lexeme.start);
				});

				it('#end', function () {
					assertEquals(3, lexeme.end);
				});
			});
		});

		// embedded hyphens should not be confused with
		// presence operators
		describe('single term with hyphen', function () {
			const lexer = lex('foo-bar');

			describe('produces 2 lexeme', function () {
				assertEquals(lexer.lexemes.length, 2);
			});

			describe('lexeme', function () {
				const fooLexeme = lexer.lexemes[0];
				const barLexeme = lexer.lexemes[1];

				it('#type', function () {
					assertEquals(QueryLexer.TERM, fooLexeme.type);
					assertEquals(QueryLexer.TERM, barLexeme.type);
				});

				it('#str', function () {
					assertEquals('foo', fooLexeme.str);
					assertEquals('bar', barLexeme.str);
				});

				it('#start', function () {
					assertEquals(0, fooLexeme.start);
					assertEquals(4, barLexeme.start);
				});

				it('#end', function () {
					assertEquals(3, fooLexeme.end);
					assertEquals(7, barLexeme.end);
				});
			});
		});

		describe('term escape char', function () {
			const lexer = lex('foo\\:bar');

			it('produces 1 lexeme', function () {
				assertEquals(lexer.lexemes.length, 1);
			});

			describe('lexeme', function () {
				const lexeme = lexer.lexemes[0];

				it('#type', function () {
					assertEquals(QueryLexer.TERM, lexeme.type);
				});

				it('#str', function () {
					assertEquals('foo:bar', lexeme.str);
				});

				it('#start', function () {
					assertEquals(0, lexeme.start);
				});

				it('#end', function () {
					assertEquals(8, lexeme.end);
				});
			});
		});

		describe('multiple terms', function () {
			const lexer = lex('foo bar');

			it('produces 2 lexems', function () {
				assertEquals(lexer.lexemes.length, 2);
			});

			describe('lexemes', function () {
				const fooLexeme = lexer.lexemes[0];
				const barLexeme = lexer.lexemes[1];

				it('#type', function () {
					assertEquals(QueryLexer.TERM, fooLexeme.type);
					assertEquals(QueryLexer.TERM, barLexeme.type);
				});

				it('#str', function () {
					assertEquals('foo', fooLexeme.str);
					assertEquals('bar', barLexeme.str);
				});

				it('#start', function () {
					assertEquals(0, fooLexeme.start);
					assertEquals(4, barLexeme.start);
				});

				it('#end', function () {
					assertEquals(3, fooLexeme.end);
					assertEquals(7, barLexeme.end);
				});
			});
		});

		describe('multiple terms with presence', function () {
			const lexer = lex('+foo +bar');

			it('produces 2 lexems', function () {
				assertEquals(lexer.lexemes.length, 4);
			});

			describe('lexemes', function () {
				const fooPresenceLexeme = lexer.lexemes[0];
				const fooTermLexeme = lexer.lexemes[1];

				const barPresenceLexeme = lexer.lexemes[2];
				const barTermLexeme = lexer.lexemes[3];

				it('#type', function () {
					assertEquals(QueryLexer.TERM, fooTermLexeme.type);
					assertEquals(QueryLexer.TERM, barTermLexeme.type);

					assertEquals(
						QueryLexer.PRESENCE,
						fooPresenceLexeme.type,
					);
					assertEquals(
						QueryLexer.PRESENCE,
						barPresenceLexeme.type,
					);
				});

				it('#str', function () {
					assertEquals('foo', fooTermLexeme.str);
					assertEquals('bar', barTermLexeme.str);

					assertEquals('+', fooPresenceLexeme.str);
					assertEquals('+', barPresenceLexeme.str);
				});
			});
		});

		describe('multiple terms with presence and fuzz', function () {
			const lexer = lex('+foo~1 +bar');

			it('produces n lexemes', function () {
				assertEquals(lexer.lexemes.length, 5);
			});

			describe('lexemes', function () {
				const fooPresenceLexeme = lexer.lexemes[0];
				const fooTermLexeme = lexer.lexemes[1];
				const fooFuzzLexeme = lexer.lexemes[2];
				const barPresenceLexeme = lexer.lexemes[3];
				const barTermLexeme = lexer.lexemes[4];

				it('#type', function () {
					assertEquals(
						QueryLexer.PRESENCE,
						fooPresenceLexeme.type,
					);
					assertEquals(QueryLexer.TERM, fooTermLexeme.type);
					assertEquals(
						QueryLexer.EDIT_DISTANCE,
						fooFuzzLexeme.type,
					);
					assertEquals(
						QueryLexer.PRESENCE,
						barPresenceLexeme.type,
					);
					assertEquals(QueryLexer.TERM, barTermLexeme.type);
				});
			});
		});

		describe('separator length > 1', function () {
			const lexer = lex('foo    bar');

			it('produces 2 lexems', function () {
				assertEquals(lexer.lexemes.length, 2);
			});

			describe('lexemes', function () {
				const fooLexeme = lexer.lexemes[0];
				const barLexeme = lexer.lexemes[1];

				it('#type', function () {
					assertEquals(QueryLexer.TERM, fooLexeme.type);
					assertEquals(QueryLexer.TERM, barLexeme.type);
				});

				it('#str', function () {
					assertEquals('foo', fooLexeme.str);
					assertEquals('bar', barLexeme.str);
				});

				it('#start', function () {
					assertEquals(0, fooLexeme.start);
					assertEquals(7, barLexeme.start);
				});

				it('#end', function () {
					assertEquals(3, fooLexeme.end);
					assertEquals(10, barLexeme.end);
				});
			});
		});

		describe('hyphen (-) considered a seperator', function () {
			const lexer = lex('foo-bar');

			it('produces 1 lexeme', function () {
				assertEquals(lexer.lexemes.length, 2);
			});
		});

		describe('term with field', function () {
			const lexer = lex('title:foo');

			it('produces 2 lexems', function () {
				assertEquals(lexer.lexemes.length, 2);
			});

			describe('lexemes', function () {
				const fieldLexeme = lexer.lexemes[0];
				const termLexeme = lexer.lexemes[1];

				it('#type', function () {
					assertEquals(QueryLexer.FIELD, fieldLexeme.type);
					assertEquals(QueryLexer.TERM, termLexeme.type);
				});

				it('#str', function () {
					assertEquals('title', fieldLexeme.str);
					assertEquals('foo', termLexeme.str);
				});

				it('#start', function () {
					assertEquals(0, fieldLexeme.start);
					assertEquals(6, termLexeme.start);
				});

				it('#end', function () {
					assertEquals(5, fieldLexeme.end);
					assertEquals(9, termLexeme.end);
				});
			});
		});

		describe('term with field with escape char', function () {
			const lexer = lex('ti\\:tle:foo');

			it('produces 1 lexeme', function () {
				assertEquals(lexer.lexemes.length, 2);
			});

			describe('lexeme', function () {
				const fieldLexeme = lexer.lexemes[0];
				const termLexeme = lexer.lexemes[1];

				it('#type', function () {
					assertEquals(QueryLexer.FIELD, fieldLexeme.type);
					assertEquals(QueryLexer.TERM, termLexeme.type);
				});

				it('#str', function () {
					assertEquals('ti:tle', fieldLexeme.str);
					assertEquals('foo', termLexeme.str);
				});

				it('#start', function () {
					assertEquals(0, fieldLexeme.start);
					assertEquals(8, termLexeme.start);
				});

				it('#end', function () {
					assertEquals(7, fieldLexeme.end);
					assertEquals(11, termLexeme.end);
				});
			});
		});

		describe('term with presence required', function () {
			const lexer = lex('+foo');

			it('produces 2 lexemes', function () {
				assertEquals(lexer.lexemes.length, 2);
			});

			describe('lexemes', function () {
				const presenceLexeme = lexer.lexemes[0];
				const termLexeme = lexer.lexemes[1];

				it('#type', function () {
					assertEquals(QueryLexer.PRESENCE, presenceLexeme.type);
					assertEquals(QueryLexer.TERM, termLexeme.type);
				});

				it('#str', function () {
					assertEquals('+', presenceLexeme.str);
					assertEquals('foo', termLexeme.str);
				});

				it('#start', function () {
					assertEquals(1, termLexeme.start);
					assertEquals(0, presenceLexeme.start);
				});

				it('#end', function () {
					assertEquals(4, termLexeme.end);
					assertEquals(1, presenceLexeme.end);
				});
			});
		});

		describe('term with field with presence required', function () {
			const lexer = lex('+title:foo');

			it('produces 3 lexemes', function () {
				assertEquals(lexer.lexemes.length, 3);
			});

			describe('lexemes', function () {
				const presenceLexeme = lexer.lexemes[0];
				const fieldLexeme = lexer.lexemes[1];
				const termLexeme = lexer.lexemes[2];

				it('#type', function () {
					assertEquals(QueryLexer.PRESENCE, presenceLexeme.type);
					assertEquals(QueryLexer.FIELD, fieldLexeme.type);
					assertEquals(QueryLexer.TERM, termLexeme.type);
				});

				it('#str', function () {
					assertEquals('+', presenceLexeme.str);
					assertEquals('title', fieldLexeme.str);
					assertEquals('foo', termLexeme.str);
				});

				it('#start', function () {
					assertEquals(0, presenceLexeme.start);
					assertEquals(1, fieldLexeme.start);
					assertEquals(7, termLexeme.start);
				});

				it('#end', function () {
					assertEquals(1, presenceLexeme.end);
					assertEquals(6, fieldLexeme.end);
					assertEquals(10, termLexeme.end);
				});
			});
		});

		describe('term with presence prohibited', function () {
			const lexer = lex('-foo');

			it('produces 2 lexemes', function () {
				assertEquals(lexer.lexemes.length, 2);
			});

			describe('lexemes', function () {
				const presenceLexeme = lexer.lexemes[0];
				const termLexeme = lexer.lexemes[1];

				it('#type', function () {
					assertEquals(QueryLexer.PRESENCE, presenceLexeme.type);
					assertEquals(QueryLexer.TERM, termLexeme.type);
				});

				it('#str', function () {
					assertEquals('-', presenceLexeme.str);
					assertEquals('foo', termLexeme.str);
				});

				it('#start', function () {
					assertEquals(1, termLexeme.start);
					assertEquals(0, presenceLexeme.start);
				});

				it('#end', function () {
					assertEquals(4, termLexeme.end);
					assertEquals(1, presenceLexeme.end);
				});
			});
		});

		describe('term with edit distance', function () {
			const lexer = lex('foo~2');

			it('produces 2 lexems', function () {
				assertEquals(lexer.lexemes.length, 2);
			});

			describe('lexemes', function () {
				const termLexeme = lexer.lexemes[0];
				const editDistanceLexeme = lexer.lexemes[1];

				it('#type', function () {
					assertEquals(QueryLexer.TERM, termLexeme.type);
					assertEquals(
						QueryLexer.EDIT_DISTANCE,
						editDistanceLexeme.type,
					);
				});

				it('#str', function () {
					assertEquals('foo', termLexeme.str);
					assertEquals('2', editDistanceLexeme.str);
				});

				it('#start', function () {
					assertEquals(0, termLexeme.start);
					assertEquals(4, editDistanceLexeme.start);
				});

				it('#end', function () {
					assertEquals(3, termLexeme.end);
					assertEquals(5, editDistanceLexeme.end);
				});
			});
		});

		describe('term with boost', function () {
			const lexer = lex('foo^10');

			it('produces 2 lexems', function () {
				assertEquals(lexer.lexemes.length, 2);
			});

			describe('lexemes', function () {
				const termLexeme = lexer.lexemes[0];
				const boostLexeme = lexer.lexemes[1];

				it('#type', function () {
					assertEquals(QueryLexer.TERM, termLexeme.type);
					assertEquals(QueryLexer.BOOST, boostLexeme.type);
				});

				it('#str', function () {
					assertEquals('foo', termLexeme.str);
					assertEquals('10', boostLexeme.str);
				});

				it('#start', function () {
					assertEquals(0, termLexeme.start);
					assertEquals(4, boostLexeme.start);
				});

				it('#end', function () {
					assertEquals(3, termLexeme.end);
					assertEquals(6, boostLexeme.end);
				});
			});
		});

		describe('term with field, boost and edit distance', function () {
			const lexer = lex('title:foo^10~5');

			it('produces 4 lexems', function () {
				assertEquals(lexer.lexemes.length, 4);
			});

			describe('lexemes', function () {
				const fieldLexeme = lexer.lexemes[0];
				const termLexeme = lexer.lexemes[1];
				const boostLexeme = lexer.lexemes[2];
				const editDistanceLexeme = lexer.lexemes[3];

				it('#type', function () {
					assertEquals(QueryLexer.FIELD, fieldLexeme.type);
					assertEquals(QueryLexer.TERM, termLexeme.type);
					assertEquals(QueryLexer.BOOST, boostLexeme.type);
					assertEquals(
						QueryLexer.EDIT_DISTANCE,
						editDistanceLexeme.type,
					);
				});

				it('#str', function () {
					assertEquals('title', fieldLexeme.str);
					assertEquals('foo', termLexeme.str);
					assertEquals('10', boostLexeme.str);
					assertEquals('5', editDistanceLexeme.str);
				});

				it('#start', function () {
					assertEquals(0, fieldLexeme.start);
					assertEquals(6, termLexeme.start);
					assertEquals(10, boostLexeme.start);
					assertEquals(13, editDistanceLexeme.start);
				});

				it('#end', function () {
					assertEquals(5, fieldLexeme.end);
					assertEquals(9, termLexeme.end);
					assertEquals(12, boostLexeme.end);
					assertEquals(14, editDistanceLexeme.end);
				});
			});
		});
	});
});
