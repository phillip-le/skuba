import * as Buildkite from '../../../../api/buildkite';
import type { ESLintOutput } from '../../../../cli/adapter/eslint';
import type { PrettierOutput } from '../../../../cli/adapter/prettier';
import type { StreamInterceptor } from '../../../../cli/lint/external';

import { createEslintAnnotations } from './eslint';
import { createPrettierAnnotations } from './prettier';
import { createTscAnnotations } from './tsc';

export const createBuildkiteAnnotations = async (
  eslint: ESLintOutput,
  prettier: PrettierOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): Promise<void> => {
  if (eslint.ok && prettier.ok && tscOk) {
    return;
  }

  const buildkiteOutput = [
    '`skuba lint` found issues that require triage:',
    ...createEslintAnnotations(eslint),
    ...createPrettierAnnotations(prettier),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ].join('\n\n');

  await Buildkite.annotate(buildkiteOutput, {
    context: 'skuba-lint-external',
    scopeContextToStep: true,
    style: 'error',
  });
};
