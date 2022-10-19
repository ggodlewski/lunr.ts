/**
 * A convenience function for configuring and constructing
 * a new lunr Index.
 *
 * A Builder instance is created and the pipeline setup
 * with a trimmer, stop word filter and stemmer.
 *
 * This builder object is yielded to the configuration function
 * that is passed as a parameter, allowing the list of fields
 * and other builder parameters to be customised.
 *
 * All documents _must_ be added within the passed config function.
 *
 * @example
 * const idx = lunr((builder: Builder) => {
 *   builder.field('title');
 *   builder.field('body');
 *   builder.ref('id');
 *
 *   for (const doc of documents) {
 *     builder.add(doc);
 *   }
 * })
 *
 * @see {@link Builder}
 * @see {@link Pipeline}
 * @see {@link trimmer}
 * @see {@link stopWordFilter}
 * @see {@link stemmer}
 * @namespace {function} lunr
 */
import { Builder } from './Builder.ts';
import { stopWordFilter } from './stopWordFilter.ts';
import { trimmer } from './trimmer.ts';
import { stemmer } from './stemmer.ts';
import { PipelineFunction } from './PipelineFunction.ts';

export function lunr(config: (builder: Builder) => void) {
	const builder = new Builder();

	builder.pipeline.add(
		<PipelineFunction> trimmer,
		<PipelineFunction> stopWordFilter,
		<PipelineFunction> stemmer,
	);

	builder.searchPipeline.add(
		<PipelineFunction> stemmer,
	);

	config(builder);
	return builder.build();
}
