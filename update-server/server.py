import asyncio
import websockets
import json
from cryptography.fernet import Fernet

# Test key
SHARED_KEY = b'ycrhQ4UyYbMqeqUP1qXHsvVFVLFeyzzEDk2P5mGA5no='
fernet = Fernet(SHARED_KEY)

async def handler(websocket):
    async for encrypted_message in websocket:
        try:
            decrypted = fernet.decrypt(encrypted_message)

            # Handshake check
            if decrypted == SHARED_KEY:
                await websocket.send(fernet.encrypt(SHARED_KEY))
                continue

            data = json.loads(decrypted.decode())

            if "UpdateCheck" in data:
                client = data["UpdateCheck"][0]["Client"]
                build = data["UpdateCheck"][1]["Build"]
                print(f"{client} {build}")
                await websocket.send(fernet.encrypt("True".encode()))

        except Exception:
            pass

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        print("WebSocket server running on ws://localhost:8765")
        await asyncio.Future()

asyncio.run(main())

