import os
import re

files_to_edit = [
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\suppliers\ledger-client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\suppliers\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\products\low-stock-client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\products\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\purchases\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\payments\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\emprunt-fournisseur\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\customers\unpaid-client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\customers\ledger-client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\customers\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\emprunt\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\brands\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\components\categories\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(superadmin)\superadmin\components\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\treasury\components\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\treasury\[accountId]\components\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\treasury\components\mouvements-client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\sales\components\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\reports\sales\components\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\reports\treasury\components\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\reports\purchases\components\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\reports\inventory\components\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\reports\customers\components\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\expenses\components\client.tsx",
    r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\(dashboard)\avaries\page.tsx"
]

for file_path in files_to_edit:
    if not os.path.exists(file_path): 
        print(f"Skipping {file_path}")
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "exportTitle=" in content:
        continue

    # Try to extract the title and description from Heading component
    # It usually looks like: <Heading title={t("title")} description={t("subtitle")} />
    # Or <Heading title="Something" description="Something else" />
    # Or <Heading title={`Something`} description={t("subtitle")} />
    
    heading_match = re.search(r'<Heading\s+title=({[^}]+}|"[^"]+"|`[^`]+`)\s+(?:description|expr)=({[^}]+}|"[^"]+"|`[^`]+`)?', content)
    
    export_title = '""'
    export_desc = '""'
    
    if heading_match:
        val1 = heading_match.group(1).strip()
        val2 = heading_match.group(2)
        
        # Format for JSX insertion
        if val1.startswith('{') and val1.endswith('}'):
            export_title = val1[1:-1]
        elif val1.startswith('"') or val1.startswith('`'):
            export_title = val1
        else:
            export_title = f'"{val1}"'
            
        if val2:
            val2 = val2.strip()
            if val2.startswith('{') and val2.endswith('}'):
                export_desc = val2[1:-1]
            elif val2.startswith('"') or val2.startswith('`'):
                export_desc = val2
            else:
                export_desc = f'"{val2}"'
    else:
        # Fallback to general translation strategy if Heading is missing
        t_match = re.search(r'const\s+([a-zA-Z0-9_]+)\s*=\s*useTranslations\(', content)
        if t_match:
            t_var = t_match.group(1)
            export_title = f'{t_var}("title")'
            export_desc = f'{t_var}("subtitle")'
        else:
            export_title = '"Export"'
            export_desc = '""'

    inject_str = f' exportTitle={{{export_title}}} exportDescription={{{export_desc}}} '
    
    # Replace the DataTables
    content = re.sub(r'<DataTable\s', f'<DataTable {inject_str}', content)
    content = re.sub(r'<ServerDataTable\s', f'<ServerDataTable {inject_str}', content)
    # Handle newlines
    content = re.sub(r'<DataTable\n', f'<DataTable\n{inject_str}\n', content)
    content = re.sub(r'<ServerDataTable\n', f'<ServerDataTable\n{inject_str}\n', content)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
print("Done patching title exports!")
