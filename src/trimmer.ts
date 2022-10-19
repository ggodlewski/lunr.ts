import { Pipeline } from './Pipeline.ts';
import { PipelineFunction } from './PipelineFunction.ts';
import { Token } from './Token.ts';

/**
 * trimmer is a pipeline function for trimming non word
 * characters from the beginning and end of tokens before they
 * enter the index.
 *
 * This implementation may not work correctly for non latin
 * characters and should either be removed or adapted for use
 * with languages with non-latin characters.
 *
 * @static
 * @implements {PipelineFunction}
 * @param {Token} token The token to pass through the filter
 * @returns {Token}
 * @see Pipeline
 */
export function trimmer(token: Token) {
	return token.update(function (s) {
		return s.replace(/^\W+/, '').replace(/\W+$/, '');
	});
}

Pipeline.registerFunction(<PipelineFunction> trimmer, 'trimmer');
