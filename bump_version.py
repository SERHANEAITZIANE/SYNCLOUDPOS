#!/usr/bin/env python3
"""
Version Bump Script for SynCloudPOS Gerant Mobile App.

Reads the current version from syncloud-gerant/package.json (single source of truth),
increments it using proper semver (patch/minor/major), and updates ALL files that
reference the version in sync:

  1. syncloud-gerant/package.json         (npm/expo version)
  2. syncloud-gerant/app.json             (Expo/Android build version)
  3. src/app/api/mobile/version/route.ts   (API endpoint served to app)
  4. src/app/[locale]/landing-client.tsx   (landing page download links)
  5. deploy_everything.py                  (APK filename in deploy script)
  6. public/downloads/ APK filename        (renames the actual APK file)

Usage:
  python bump_version.py patch    # 2.2.0 -> 2.2.1  (bug fixes, small changes)
  python bump_version.py minor    # 2.2.0 -> 2.3.0  (new features)
  python bump_version.py major    # 2.2.0 -> 3.0.0  (breaking changes)
  python bump_version.py          # defaults to 'patch'

After running, don't forget to:
  - Rebuild the APK if needed
  - Run deploy_everything.py to deploy
"""

import json
import re
import os
import sys
import glob

# === Configuration ===
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
GERANT_DIR = os.path.join(ROOT_DIR, "syncloud-gerant")

# Files to update (relative to ROOT_DIR)
FILES = {
    "gerant_package": os.path.join(GERANT_DIR, "package.json"),
    "gerant_app": os.path.join(GERANT_DIR, "app.json"),
    "version_route": os.path.join(ROOT_DIR, "src", "app", "api", "mobile", "version", "route.ts"),
    "landing_page": os.path.join(ROOT_DIR, "src", "app", "[locale]", "landing-client.tsx"),
    "deploy_script": os.path.join(ROOT_DIR, "deploy_everything.py"),
    "gerant_app_tsx": os.path.join(GERANT_DIR, "App.tsx"),
}

APK_DIR = os.path.join(ROOT_DIR, "public", "downloads")


def parse_version(version_str: str) -> tuple:
    """Parse a semver string like '2.2.0' into (major, minor, patch)."""
    parts = version_str.strip().split(".")
    if len(parts) != 3:
        raise ValueError(f"Invalid version format: '{version_str}'. Expected X.Y.Z")
    return tuple(int(p) for p in parts)


def bump(version_str: str, bump_type: str) -> str:
    """Increment version based on bump_type (patch/minor/major)."""
    major, minor, patch = parse_version(version_str)

    if bump_type == "patch":
        patch += 1
    elif bump_type == "minor":
        minor += 1
        patch = 0
    elif bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    else:
        raise ValueError(f"Unknown bump type: '{bump_type}'. Use patch/minor/major")

    return f"{major}.{minor}.{patch}"


def get_current_version() -> str:
    """Read current version from syncloud-gerant/package.json (source of truth)."""
    pkg_path = FILES["gerant_package"]
    if not os.path.exists(pkg_path):
        raise FileNotFoundError(f"Cannot find {pkg_path}")
    
    with open(pkg_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    version = data.get("version")
    if not version:
        raise ValueError(f"No 'version' field found in {pkg_path}")
    
    return version


def update_json_file(filepath: str, old_version: str, new_version: str):
    """Update version in a JSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Parse and update
    data = json.loads(content)
    
    if "expo" in data:
        # app.json format
        data["expo"]["version"] = new_version
    else:
        # package.json format
        data["version"] = new_version
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    
    print(f"  [OK] {os.path.relpath(filepath, ROOT_DIR)}: {old_version} -> {new_version}")


def update_version_route(filepath: str, old_version: str, new_version: str):
    """Update version in the API route.ts file."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace version string
    content = content.replace(f'version: "{old_version}"', f'version: "{new_version}"')
    
    # Replace APK URL
    old_apk = f"syncloudpos-gerant-v{old_version}.apk"
    new_apk = f"syncloudpos-gerant-v{new_version}.apk"
    content = content.replace(old_apk, new_apk)
    
    # Replace release notes version reference
    content = content.replace(f"Version {old_version}", f"Version {new_version}")
    content = content.replace(f"نسخة {old_version}", f"نسخة {new_version}")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"  [OK] {os.path.relpath(filepath, ROOT_DIR)}: {old_version} -> {new_version}")


def update_text_file(filepath: str, old_version: str, new_version: str):
    """Generic: replace all vX.Y.Z references in any text file."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    old_apk = f"syncloudpos-gerant-v{old_version}.apk"
    new_apk = f"syncloudpos-gerant-v{new_version}.apk"
    content = content.replace(old_apk, new_apk)
    content = content.replace(f"v{old_version}", f"v{new_version}")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"  [OK] {os.path.relpath(filepath, ROOT_DIR)}: {old_version} -> {new_version}")


def update_app_tsx(filepath: str, old_version: str, new_version: str):
    """Update version inside App.tsx static declaration."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = content.replace(f'const CURRENT_VERSION = "{old_version}";', f'const CURRENT_VERSION = "{new_version}";')
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"  [OK] {os.path.relpath(filepath, ROOT_DIR)}: {old_version} -> {new_version}")


def rename_apk(old_version: str, new_version: str):
    """Rename the APK file in public/downloads/ if it exists."""
    old_apk = os.path.join(APK_DIR, f"syncloudpos-gerant-v{old_version}.apk")
    new_apk = os.path.join(APK_DIR, f"syncloudpos-gerant-v{new_version}.apk")
    
    if os.path.exists(old_apk):
        os.rename(old_apk, new_apk)
        print(f"  [OK] Renamed APK: syncloudpos-gerant-v{old_version}.apk -> syncloudpos-gerant-v{new_version}.apk")
    else:
        print(f"  [!] APK not found at {old_apk} - skipping rename (rebuild APK with new version)")


def main():
    bump_type = sys.argv[1] if len(sys.argv) > 1 else "patch"
    
    if bump_type not in ("patch", "minor", "major"):
        print(f"Error: Unknown bump type '{bump_type}'")
        print("Usage: python bump_version.py [patch|minor|major]")
        sys.exit(1)
    
    # Get current version
    current = get_current_version()
    new = bump(current, bump_type)
    
    print(f"\n{'='*50}")
    print(f"  SynCloudPOS Gerant - Version Bump")
    print(f"  {current} -> {new}  ({bump_type})")
    print(f"{'='*50}\n")
    
    # Update all files
    print("Updating files:\n")
    
    # 1. syncloud-gerant/package.json
    update_json_file(FILES["gerant_package"], current, new)
    
    # 2. syncloud-gerant/app.json
    update_json_file(FILES["gerant_app"], current, new)
    
    # 3. Version API route
    if os.path.exists(FILES["version_route"]):
        update_version_route(FILES["version_route"], current, new)
    else:
        print(f"  [!] {FILES['version_route']} not found - skipping")
    
    # 4. Landing page
    if os.path.exists(FILES["landing_page"]):
        update_text_file(FILES["landing_page"], current, new)
    else:
        print(f"  [!] {FILES['landing_page']} not found - skipping")
    
    # 5. Deploy script
    if os.path.exists(FILES["deploy_script"]):
        update_text_file(FILES["deploy_script"], current, new)
    else:
        print(f"  [!] {FILES['deploy_script']} not found - skipping")
    
    # 6. App.tsx
    if os.path.exists(FILES["gerant_app_tsx"]):
        update_app_tsx(FILES["gerant_app_tsx"], current, new)
    else:
        print(f"  [!] {FILES['gerant_app_tsx']} not found - skipping")

    # 7. Rename APK
    rename_apk(current, new)
    
    print(f"\n{'='*50}")
    print(f"  [OK] All files updated to v{new}")
    print(f"{'='*50}")
    print(f"\nNext steps:")
    print(f"  1. Update release notes in route.ts if needed")
    print(f"  2. Rebuild APK:  cd syncloud-gerant && eas build --platform android --profile preview")
    print(f"  3. Copy APK to:  public/downloads/syncloudpos-gerant-v{new}.apk")
    print(f"  4. Deploy:       python deploy_everything.py")
    print(f"  5. Commit:       git add -A && git commit -m 'v{new} - <description>'")


if __name__ == "__main__":
    main()
