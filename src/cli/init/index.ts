import path from 'path';

import {
  copyFiles,
  createEjsRenderer,
  createInclusionFilter,
} from '../../utils/copy';
import { createExec, ensureCommands } from '../../utils/exec';
import { log } from '../../utils/logging';
import { showLogoAndVersionInfo } from '../../utils/logo';
import {
  BASE_TEMPLATE_DIR,
  ensureTemplateConfigDeletion,
} from '../../utils/template';

import { getConfig } from './getConfig';
import { commitChanges, initialiseRepo } from './git';
import { writePackageJson } from './writePackageJson';

export const init = async () => {
  const skubaVersionInfo = await showLogoAndVersionInfo();

  await ensureCommands('git', 'yarn');

  const {
    destinationDir,
    entryPoint,
    templateComplete,
    templateData,
    templateName,
    type,
  } = await getConfig();

  const include = await createInclusionFilter([
    path.join(destinationDir, '.gitignore'),
    path.join(BASE_TEMPLATE_DIR, '_.gitignore'),
  ]);

  const processors = [createEjsRenderer(templateData)];

  await copyFiles({
    sourceRoot: BASE_TEMPLATE_DIR,
    destinationRoot: destinationDir,
    include,
    // prefer template-specific files
    overwrite: false,
    processors,
    // base template has files like _.eslintrc.js
    stripUnderscorePrefix: true,
  });

  await copyFiles({
    sourceRoot: destinationDir,
    destinationRoot: destinationDir,
    include,
    processors,
  });

  await Promise.all([
    templateComplete
      ? ensureTemplateConfigDeletion(destinationDir)
      : Promise.resolve(),

    writePackageJson({
      cwd: destinationDir,
      entryPoint,
      template: templateName,
      type,
      version: skubaVersionInfo.local,
    }),
  ]);

  const exec = createExec({
    cwd: destinationDir,
    stdio: 'pipe',
    streamStdio: 'yarn',
  });

  log.newline();
  await initialiseRepo(exec, templateData);

  const skubaSlug = `skuba@${skubaVersionInfo.local}`;

  let depsInstalled = false;
  try {
    await exec('yarn', 'add', '--dev', skubaSlug);
    depsInstalled = true;
  } catch {}

  await commitChanges(exec, `Clone ${templateName}`);

  if (!depsInstalled) {
    log.newline();
    log.warn(log.bold('✗ Failed to install dependencies. Resume with:'));

    log.newline();
    log.plain(log.bold('cd', destinationDir));
    log.plain(log.bold('yarn add --dev', skubaSlug));
    log.plain(log.bold('git add --all'));
    log.plain(log.bold('git commit --message', `'Pin ${skubaSlug}'`));
    log.plain(log.bold('git push --set-upstream origin master'));

    log.newline();
    process.exit(1);
  }

  log.newline();
  log.ok(log.bold('✔ All done! Try running:'));

  log.newline();
  log.plain(log.bold('cd', destinationDir));
  log.plain(log.bold('git push --set-upstream origin master'));

  log.newline();
};
