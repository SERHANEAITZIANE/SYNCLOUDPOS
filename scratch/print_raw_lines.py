import sys

filepath = r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\landing-client.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx in range(1360, 1420):
    if idx < len(lines):
        sys.stdout.buffer.write(f"{idx+1}: {lines[idx]}".encode('utf-8'))
