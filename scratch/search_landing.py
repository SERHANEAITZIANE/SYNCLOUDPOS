import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\landing-client.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "<section" in line or "</section" in line:
        print(f"Line {i+1}: {line.strip()}")
