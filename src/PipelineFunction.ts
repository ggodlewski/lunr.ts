import { Token } from './Token.ts';

export interface PipelineFunction {
	// deno-lint-ignore no-explicit-any
	(token: Token | string, idx?: number, tokens?: (Token | string)[]): any;
	label: string;
}
