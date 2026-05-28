import os

root_dir = r"C:\Users\tre\.gemini\antigravity-ide\brain\419668f7-9401-44ca-9b03-66dacd8c0720"
log_files = []

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.log'):
            log_files.append(os.path.join(root, file))

print(f"Found {len(log_files)} log files:")
for log in log_files:
    print(log)
