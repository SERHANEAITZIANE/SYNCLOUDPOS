import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\landing-client.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx in range(1245, 1390):
    if idx < len(lines):
        print(f"{idx+1}: {lines[idx].strip()}")
