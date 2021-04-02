import { Select } from 'enquirer';
import { NormalizedReadResult } from 'read-pkg-up';

import { log } from '../../utils/logging.js';
import { PROJECT_TYPES, ProjectType } from '../../utils/manifest.js';
import { TemplateConfig } from '../../utils/template.js';
import { hasProp } from '../../utils/validation.js';

interface Props {
  manifest: NormalizedReadResult;
  templateConfig: TemplateConfig;
}

export const getProjectType = async ({
  manifest,
  templateConfig,
}: Props): Promise<ProjectType> => {
  if (
    hasProp(manifest.packageJson.skuba, 'type') &&
    ProjectType.guard(manifest.packageJson.skuba.type)
  ) {
    return manifest.packageJson.skuba.type;
  }

  if (typeof templateConfig.type !== 'undefined') {
    return templateConfig.type;
  }

  const initial: ProjectType =
    manifest.packageJson.devDependencies?.['@seek/seek-module-toolkit'] ||
    manifest.packageJson.files
      ? 'package'
      : 'application';

  log.newline();
  const projectTypePrompt = new Select({
    choices: PROJECT_TYPES,
    message: 'Project type:',
    name: 'projectType',
    initial,
  });

  return projectTypePrompt.run();
};
