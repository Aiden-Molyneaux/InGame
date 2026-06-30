// Metro config for the npm-workspaces monorepo — lets Metro resolve hoisted deps + the @ingame/shared
// workspace package from the repo-root node_modules (npm workspaces hoist; decision 0051/F11 chose npm
// precisely because pnpm's strict symlinks fight this).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
