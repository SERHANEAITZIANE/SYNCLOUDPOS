import json

log_path = r"C:\Users\tre\.gemini\antigravity-ide\brain\419668f7-9401-44ca-9b03-66dacd8c0720\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            step = data.get("step_index", -1)
            content = data.get("content", "")
            if 3450 <= step <= 3470:
                print(f"=== STEP {step} ({data.get('source', '')}) ===")
                print(content[:1500])
                print("\n")
        except Exception as e:
            pass
