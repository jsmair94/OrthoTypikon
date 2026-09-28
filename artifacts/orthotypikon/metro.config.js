const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);
const defaultBlockList = config.resolver.blockList;
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildOutputBlockList = ['.gradle-home', '.android-sdk', 'android', 'dist'].map(
  (directory) =>
    new RegExp(
      `^${escapeRegex(path.resolve(__dirname, directory))}(?:[/\\\\]|$)`,
    ),
);

config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList)
    ? defaultBlockList
    : defaultBlockList
      ? [defaultBlockList]
      : []),
  ...buildOutputBlockList,
];

module.exports = config;
