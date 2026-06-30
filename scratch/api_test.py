import urllib.request
import json

url = "http://localhost:3000/api/clients/b52d2293-b57e-494b-93c4-475c9177725d/vouchers?includeShared=true"
try:
    response = urllib.request.urlopen(url)
    data = json.loads(response.read().decode('utf-8'))
    print("Vouchers for Rebeca (shared included):")
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error fetching API: {e}")
