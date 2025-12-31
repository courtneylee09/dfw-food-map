import os
import asyncio
from x402 import X402Client
from dotenv import load_dotenv

load_dotenv()

async def simulate_buyer():
    # 1. Initialize the client (The 'Customer')
    # In a real app, this would be a different person's wallet
    client = X402Client(
        api_key_name=os.getenv("CDP_API_KEY_NAME"),
        api_key_private_key=os.getenv("CDP_API_KEY_PRIVATE_KEY"),
        network_id="base-sepolia"
    )

    # 2. The API endpoint you want to test
    url = "http://localhost:8000/verify?claim=Is Rihanna the founder of Fenty Beauty?"

    print(f"--- ATTEMPTING PURCHASE ---")
    
    try:
        # 3. The 'Magic' Call: 
        # The x402 client handles the 402 error and payment automatically
        response = await client.get(url)
        
        if response.status_code == 200:
            print("✅ SUCCESS: Payment verified and data received!")
            print(f"Result: {response.json()}")
        else:
            print(f"❌ FAILED: Status code {response.status_code}")
            
    except Exception as e:
        print(f"⚠️ ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(simulate_buyer())
