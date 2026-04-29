import os
import re

def check_files():
    found_issues = []
    
    # Regex to find db.<model>.findMany/findUnique/findFirst
    db_regex = re.compile(r'db\.([a-zA-Z0-9_]+)\.(findMany|findUnique|findFirst)\(')
    
    for root, dirs, files in os.walk('src/app'):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        # Find all db queries
                        for match in db_regex.finditer(content):
                            model = match.group(1)
                            method = match.group(2)
                            start_idx = match.start()
                            
                            # Extract the argument of the find function
                            bracket_count = 0
                            end_idx = start_idx
                            started = False
                            
                            for i in range(start_idx, len(content)):
                                if content[i] == '(':
                                    bracket_count += 1
                                    started = True
                                elif content[i] == ')':
                                    bracket_count -= 1
                                    if started and bracket_count == 0:
                                        end_idx = i
                                        break
                                        
                            if started:
                                arg_content = content[start_idx:end_idx+1]
                                
                                # Some queries might genuinely not need tenantId (e.g. user lookup by id on login, tenant lookup)
                                if model in ['user', 'tenant']:
                                    continue
                                    
                                if 'tenantId' not in arg_content:
                                    # Get the line number
                                    line_no = content[:start_idx].count('\n') + 1
                                    found_issues.append({
                                        'file': path,
                                        'line': line_no,
                                        'model': model,
                                        'method': method,
                                        'content': arg_content[:150].replace('\n', ' ') + '...'
                                    })
                except Exception as e:
                    print(f"Error reading {path}: {e}")

    for issue in found_issues:
        print(f"{issue['file']}:{issue['line']} - db.{issue['model']}.{issue['method']} missing tenantId")

if __name__ == '__main__':
    check_files()
