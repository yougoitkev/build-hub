import pandas as pd
import os
import openpyxl

docs_dir = r"c:\Users\349125\Documents\Projects\Trainer Hub\tmsdocs"
files = [f for f in os.listdir(docs_dir) if f.endswith(('.xlsx', '.xlsm'))]

for file in files:
    file_path = os.path.join(docs_dir, file)
    print(f"\n--- Analyzing: {file} ---")
    try:
        # Load workbook to get sheet names
        xl = pd.ExcelFile(file_path)
        print(f"Sheets: {xl.sheet_names}")
        
        for sheet in xl.sheet_names:
            print(f"\n  Sheet: {sheet}")
            df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
            print("  Columns:", df.columns.tolist())
            print("  First 5 rows:")
            print(df.to_string())
            
    except Exception as e:
        print(f"  Error reading {file}: {e}")
