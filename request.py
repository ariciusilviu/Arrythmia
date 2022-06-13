import requests
url = 'http://localhost:5000/api'
r = requests.post(url,json={'208':25})
print(r.json())