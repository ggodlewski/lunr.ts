import { Pipeline } from './Pipeline.ts';
import { PipelineFunction } from './PipelineFunction.ts';

/**
 * lunr.generateStopWordFilter builds a stopWordFilter function from the provided
 * list of stop words.
 *
 * The built in stopWordFilter is built using this generator and can be used
 * to generate custom stopWordFilters for applications or non English languages.
 *
 * @function
 * @param {Array} stopWords The token to pass through the filter
 * @returns {PipelineFunction}
 * @see Pipeline
 * @see stopWordFilter
 */
function generateStopWordFilter(stopWords: string[]) {
	const words = stopWords.reduce(
		(memo: { [key: string]: string }, stopWord: string) => {
			memo[stopWord] = stopWord;
			return memo;
		},
		{},
	);

	return function (token: string) {
		if (token && words[token.toString()] !== token.toString()) return token;
	};
}

/**
 * stopWordFilter is an English language stop word list filter, any words
 * contained in the list will not be passed through the filter.
 *
 * This is intended to be used in the Pipeline. If the token does not pass the
 * filter then undefined will be returned.
 *
 * @function
 * @implements {PipelineFunction}
 * @params {Token} token - A token to check for being a stop word.
 * @returns {Token}
 * @see {@link Pipeline}
 */
export const stopWordFilter = generateStopWordFilter([
	'a',
	'able',
	'about',
	'across',
	'after',
	'all',
	'almost',
	'also',
	'am',
	'among',
	'an',
	'and',
	'any',
	'are',
	'as',
	'at',
	'be',
	'because',
	'been',
	'but',
	'by',
	'can',
	'cannot',
	'could',
	'dear',
	'did',
	'do',
	'does',
	'either',
	'else',
	'ever',
	'every',
	'for',
	'from',
	'get',
	'got',
	'had',
	'has',
	'have',
	'he',
	'her',
	'hers',
	'him',
	'his',
	'how',
	'however',
	'i',
	'if',
	'in',
	'into',
	'is',
	'it',
	'its',
	'just',
	'least',
	'let',
	'like',
	'likely',
	'may',
	'me',
	'might',
	'most',
	'must',
	'my',
	'neither',
	'no',
	'nor',
	'not',
	'of',
	'off',
	'often',
	'on',
	'only',
	'or',
	'other',
	'our',
	'own',
	'rather',
	'said',
	'say',
	'says',
	'she',
	'should',
	'since',
	'so',
	'some',
	'than',
	'that',
	'the',
	'their',
	'them',
	'then',
	'there',
	'these',
	'they',
	'this',
	'tis',
	'to',
	'too',
	'twas',
	'us',
	'wants',
	'was',
	'we',
	'were',
	'what',
	'when',
	'where',
	'which',
	'while',
	'who',
	'whom',
	'why',
	'will',
	'with',
	'would',
	'yet',
	'you',
	'your',
]);

Pipeline.registerFunction(<PipelineFunction> stopWordFilter, 'stopWordFilter');
