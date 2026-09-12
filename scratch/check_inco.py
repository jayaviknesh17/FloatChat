import urllib.request
import ssl
import certifi
import re

ctx = ssl.create_default_context(cafile=certifi.where())
dacs = ['inco', 'aoml', 'csiro']

print("Querying ARGO GDAC DAC directories...")
for dac in dacs:
    url = f"https://data-argo.ifremer.fr/dac/{dac}/"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        floats = sorted(list(set(re.findall(r'href=["\']?(\d{7})/?[#"\']?', html))))
        print(f"DAC '{dac}': Found {len(floats)} floats. Sample: {floats[:10]}")
    except Exception as e:
        print(f"Error querying DAC '{dac}': {e}")
