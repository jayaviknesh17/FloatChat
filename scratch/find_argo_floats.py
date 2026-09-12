import urllib.request
import ssl
import certifi
import gzip
from collections import defaultdict

ctx = ssl.create_default_context(cafile=certifi.where())
url = 'https://data-argo.ifremer.fr/ar_index_global_prof.txt.gz'

print('Streaming ARGO global index from IFREMER GDAC...')
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

bob_floats = defaultdict(list)
as_floats = defaultdict(list)

with urllib.request.urlopen(req, context=ctx) as resp:
    with gzip.GzipFile(fileobj=resp) as gz:
        for line_bytes in gz:
            line = line_bytes.decode('utf-8', errors='ignore')
            if line.startswith('#') or not line.strip():
                continue
            parts = line.strip().split(',')
            if len(parts) < 4:
                continue
            rel_file, dt_str, lat_str, lon_str = parts[0], parts[1], parts[2], parts[3]
            try:
                lat = float(lat_str)
                lon = float(lon_str)
            except ValueError:
                continue

            file_parts = rel_file.split('/')
            if len(file_parts) < 3:
                continue
            dac = file_parts[0]
            float_id = file_parts[1]

            if (5.0 <= lat <= 23.0) and (80.0 <= lon <= 100.0):
                bob_floats[(dac, float_id)].append((dt_str, lat, lon, rel_file))
            elif (5.0 <= lat <= 25.0) and (50.0 <= lon <= 78.0):
                as_floats[(dac, float_id)].append((dt_str, lat, lon, rel_file))

print(f'Total Bay of Bengal float platforms: {len(bob_floats)}')
print(f'Total Arabian Sea float platforms: {len(as_floats)}')

def analyze_candidates(float_dict, name):
    candidates = []
    for (dac, float_id), profiles in float_dict.items():
        if len(profiles) < 15:
            continue
        dates = sorted([p[0] for p in profiles if len(p[0]) >= 8])
        if not dates:
            continue
        min_d, max_d = dates[0][:8], dates[-1][:8]
        
        # Calculate approximate duration in months
        try:
            yr_span = int(max_d[:4]) - int(min_d[:4])
            mo_span = int(max_d[4:6]) - int(min_d[4:6]) + yr_span * 12
        except Exception:
            mo_span = 0

        candidates.append({
            'dac': dac,
            'float_id': float_id,
            'prof_count': len(profiles),
            'start_date': min_d,
            'end_date': max_d,
            'months_span': mo_span,
            'url': f'https://data-argo.ifremer.fr/dac/{dac}/{float_id}/{float_id}_prof.nc'
        })
    # Filter for good time spans (~12 to 36 months or recent active floats)
    candidates.sort(key=lambda x: x['prof_count'], reverse=True)
    
    print(f'\nTop Candidates for {name} (out of {len(candidates)} active floats):')
    for c in candidates[:20]:
        print(f"  Float {c['float_id']} ({c['dac']}): {c['prof_count']} profiles, {c['start_date']} to {c['end_date']} (~{c['months_span']} mos)")
    return candidates

bob_cands = analyze_candidates(bob_floats, 'Bay of Bengal')
as_cands = analyze_candidates(as_floats, 'Arabian Sea')
