import os
from omnidimension import Client
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("OMNIDIM_API_KEY")
client = Client(api_key=api_key)

# This will list all imported numbers and their internal IDs
numbers = client.phone_number.list()
print(numbers)