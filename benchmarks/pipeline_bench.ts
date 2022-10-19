import { Pipeline } from '../src/Pipeline.ts';
import { PipelineFunction } from '../src/PipelineFunction.ts';
import { Token } from '../src/Token.ts';
import { words } from './words.ts';

const tokenToToken = function (token: string): string {
	return token;
};

const tokenToTokenArray = function (token: string): string[] {
	return [token, token];
};

const buildTokens = function (count: number) {
	return words.slice(0, count).map(function (word: string) {
		return new Token(word);
	});
};

Pipeline.registerFunction(<PipelineFunction> tokenToToken, 'tokenToToken');
Pipeline.registerFunction(
	<PipelineFunction> tokenToTokenArray,
	'tokenToTokenArray',
);

const fewTokens = buildTokens(50);
const manyTokens = buildTokens(1000);

const tokenToTokenPipeline = new Pipeline();
tokenToTokenPipeline.add(<PipelineFunction> tokenToToken);

const tokenToTokenArrayPipeline = new Pipeline();
tokenToTokenArrayPipeline.add(<PipelineFunction> tokenToTokenArray);

Deno.bench('few tokens, token -> token', { group: 'Pipeline' }, () => {
	tokenToTokenPipeline.run(fewTokens);
});

Deno.bench('many tokens, token -> token', { group: 'Pipeline' }, () => {
	tokenToTokenPipeline.run(manyTokens);
});

Deno.bench('few tokens, token -> token array', { group: 'Pipeline' }, () => {
	tokenToTokenArrayPipeline.run(fewTokens);
});

Deno.bench('many tokens, token -> token array', { group: 'Pipeline' }, () => {
	tokenToTokenArrayPipeline.run(manyTokens);
});
