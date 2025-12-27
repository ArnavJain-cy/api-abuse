import requests
import threading
from requests.exceptions import RequestException

URL = "http://localhost:5000/api/balance"
def attack():
    global request_count
    request_count = 0
    while True:
        try:
            response = requests.get(URL)
            # global request_count
            request_count += 1
            print(f"Request {request_count}: Status: {response.status_code}")

            if response.status_code == 429:
                print(">>> RATE LIMITED <<<")
                break

            if response.status_code == 403:
                print(">>> IP BANNED <<<")
                break

        except RequestException as e:
            print("Connection dropped by server")
            break

threads = []
for i in range(5):
    t = threading.Thread(target=attack)
    t.start()
    threads.append(t)

for t in threads:
    t.join()
# import requests
# import time
# import sys

# # CONFIGURATION
# # Change this to your Render URL if testing cloud deployment
# TARGET_URL = "http://localhost:5000/api/balance"

# print(f"--- 🚀 STARTING RATE LIMIT ATTACK (DDoS Simulation) ---")
# print(f"Target: {TARGET_URL}")
# print("Expected Result: You will see 200 OK for the first 100 requests, then 429 errors.")
# print("-------------------------------------------------------")

# request_count = 0

# try:
#     while True:
#         try:
#             # Send GET request (fastest way to trigger rate limit)
#             response = requests.get(TARGET_URL)
#             request_count += 1
            
#             # Print status with color for better visibility
#             if response.status_code == 200:
#                 print(f"Request #{request_count}: ✅ 200 OK")
#             elif response.status_code == 429:
#                 print(f"Request #{request_count}: ⛔ 429 TOO MANY REQUESTS (Blocked!)")
#             elif response.status_code == 403:
#                 print(f"Request #{request_count}: 🔒 403 BANNED (IP blocked completely)")
#             else:
#                 print(f"Request #{request_count}: Status {response.status_code}")

#             # No sleep() here because we WANT to hit the limit fast!
            
#         except requests.exceptions.ConnectionError:
#             print("❌ Connection Error: Is the server running?")
#             break
            
# except KeyboardInterrupt:
#     print(f"\n🛑 Attack stopped by user. Total requests sent: {request_count}")
