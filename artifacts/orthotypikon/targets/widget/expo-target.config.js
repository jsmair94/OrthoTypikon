/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  icon: '../../assets/images/icon.png',
  deploymentTarget: '16.0',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.orthotypikon.app'],
  },
  colors: {
    $accent: '#E4B967',
    $widgetBackground: '#18324A',
  },
};