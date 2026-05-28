import os

workspace = r"c:\Users\tre\Documents\SYNCLOUDPOS"
apks = []

for root, dirs, files in os.walk(workspace):
    for file in files:
        if file.endswith('.apk'):
            apks.append(os.path.join(root, file))

print(f"Found {len(apks)} APK files:")
for apk in apks:
    print(apk)
