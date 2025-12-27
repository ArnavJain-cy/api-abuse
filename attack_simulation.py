import requests
import time
import threading

URL = "http://localhost:5000/api/transaction"

def attack():
    while True:
        try:
            # Send requests as fast as possible
            response = requests.post(URL, json={"amount": 100})
            print(f"Status: {response.status_code}")
            if response.status_code == 429:
                print(">>> BLOCKED BY SENTINEL <<<")
                break
            if response.status_code == 403:
                print(">>> IP BANNED <<<")
                break
        except:
            pass

# Create 5 threads to simulate heavy load
for i in range(5):
    t = threading.Thread(target=attack)
    t.start()