import pandas as pd
import os
import json
from datetime import datetime, time

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, pd.Timestamp)):
        return obj.isoformat()
    if isinstance(obj, time):
        return obj.strftime('%H:%M:%S')
    if pd.isna(obj):
        return None
    raise TypeError ("Type %s not serializable" % type(obj))

docs_dir = r"c:\Users\349125\Documents\Projects\Trainer Hub\tmsdocs"
output_dir = r"c:\Users\349125\Documents\Projects\Trainer Hub\scratch"
files = [f for f in os.listdir(docs_dir) if f.endswith(('.xlsx', '.xlsm'))]

all_data = {}

for file in files:
    file_path = os.path.join(docs_dir, file)
    print(f"Processing: {file}")
    all_data[file] = {}
    try:
        xl = pd.ExcelFile(file_path)
        for sheet in xl.sheet_names:
            print(f"  Reading sheet: {sheet}")
            df = pd.read_excel(file_path, sheet_name=sheet)
            
            # Convert timestamps to strings before to_dict
            for col in df.select_dtypes(include=['datetime', 'datetimetz']).columns:
                df[col] = df[col].dt.strftime('%Y-%m-%d %H:%M:%S').where(df[col].notnull(), None)
            
            # For time objects, we'll let json_serial handle them or convert here
            # But converting here is safer for the initial to_dict
            
            # Standard python types conversion
            data = df.to_dict(orient='records')
            
            # Clean up the data to be JSON serializable
            cleaned_data = []
            for row in data:
                cleaned_row = {}
                for k, v in row.items():
                    if pd.isna(v):
                        cleaned_row[k] = None
                    elif isinstance(v, (datetime, pd.Timestamp)):
                        cleaned_row[k] = v.isoformat()
                    elif isinstance(v, time):
                        cleaned_row[k] = v.strftime('%H:%M:%S')
                    else:
                        cleaned_row[k] = v
                cleaned_data.append(cleaned_row)
            
            all_data[file][sheet] = {
                "columns": df.columns.tolist(),
                "sample_rows": cleaned_data[:20],
                "total_rows": len(df)
            }
            
    except Exception as e:
        print(f"  Error reading {file}: {e}")
        all_data[file]["error"] = str(e)

with open(os.path.join(output_dir, "tmsdocs_summary.json"), "w") as f:
    json.dump(all_data, f, indent=2, default=json_serial)

print(f"\nSummary saved to scratch/tmsdocs_summary.json")
