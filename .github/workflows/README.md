# GitHub Actions Build Workflows

This directory contains GitHub Actions workflows for building SlimScan across multiple platforms.

## Workflows

### `build-mac.yml` - Cross-Platform Build Workflow
- **Trigger**: Push/PR to main/master branches, manual dispatch
- **Purpose**: Build installers for all platforms (Mac, Windows, Linux)
- **Outputs**:
  - Mac: `.dmg` installer and `.app` bundle
  - Windows: `.exe` installer and unpacked portable version
  - Linux: `.AppImage` portable executable

### `release.yml` - Release Workflow
- **Trigger**: Git tags starting with `v` (e.g., `v1.0.0`)
- **Purpose**: Create GitHub releases with built artifacts
- **Outputs**: GitHub release with all platform installers attached

## How to Use

### Development Builds
1. Push code to `main` or `master` branch
2. GitHub Actions will automatically build all platforms
3. Download artifacts from the Actions tab

### Creating Releases
1. Create and push a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. GitHub Actions will automatically:
   - Build all platforms
   - Create a GitHub release
   - Attach all installers to the release

## Supported Platforms

| Platform | Output Format | Architecture |
|----------|---------------|--------------|
| macOS    | `.dmg`, `.app` | x64, arm64 |
| Windows  | `.exe`, unpacked | x64 |
| Linux    | `.AppImage` | x64 |

## Build Features

- ✅ **Code Signing Disabled**: Builds work without certificates
- ✅ **Native Dependencies**: Automatically rebuilds SQLite and Keytar
- ✅ **Cross-Platform**: Mac builds on macOS, Windows builds on Windows, Linux builds on Ubuntu
- ✅ **Artifact Upload**: All builds available for 30 days
- ✅ **Release Automation**: Tagged versions create releases automatically

## Manual Builds

You can also trigger builds manually:
1. Go to the "Actions" tab in your GitHub repository
2. Select "Build Mac Installer" workflow
3. Click "Run workflow"
4. Choose the branch to build from

## Environment Variables

The workflows set:
- `CSC_IDENTITY_AUTO_DISCOVERY=false` - Disables code signing requirements
- `GITHUB_TOKEN` - Automatically provided for release uploads

## Troubleshooting

If builds fail:
1. Check the Actions logs for specific error messages
2. Ensure all dependencies in `package.json` are correctly specified
3. Verify the build scripts (`dist:mac`, `dist:win`, `dist:linux`) work locally
4. Check that native dependencies (better-sqlite3, keytar) are compatible with the target platform