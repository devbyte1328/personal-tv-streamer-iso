import asyncio
import websockets
import json
from cryptography.fernet import Fernet

# Test key
SHARED_KEY = b'ycrhQ4UyYbMqeqUP1qXHsvVFVLFeyzzEDk2P5mGA5no='
fernet = Fernet(SHARED_KEY)

async def main():
    async with websockets.connect("ws://localhost:8765") as ws:
        # Handshake
        await ws.send(fernet.encrypt(SHARED_KEY))

        response = await ws.recv()
        decrypted = fernet.decrypt(response)

        if decrypted == SHARED_KEY:
            payload = {
                "UpdateCheck": [
                    {"Client": "User100"},
                    {"Build": "5"}
                ]}

            encrypted_payload = fernet.encrypt(json.dumps(payload).encode())
            await ws.send(encrypted_payload)

            response = await ws.recv()
            decrypted = fernet.decrypt(response)
            print(decrypted.decode())

asyncio.run(main())

