const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const path = require('path');

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async function afterPack(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName === 'darwin') {
    console.log('Configuring Electron fuses for macOS...');

    const electronBinary = path.join(
      appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      'Contents',
      'MacOS',
      context.packager.appInfo.productFilename
    );

    try {
      await flipFuses(electronBinary, {
        version: FuseVersion.V1,
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.EnableCookieEncryption]: true,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false, // This should fix the crash
      });

      console.log('Electron fuses configured successfully for macOS build!');
    } catch (error) {
      console.warn('Warning: Could not configure Electron fuses for macOS:', error.message);
      // Don't fail the build
    }
  }
};