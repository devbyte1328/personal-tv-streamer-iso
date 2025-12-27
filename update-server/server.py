import asyncio
import websockets
import json
import os
from cryptography.fernet import Fernet

# Test key
SHARED_KEY = b'ycrhQ4UyYbMqeqUP1qXHsvVFVLFeyzzEDk2P5mGA5no='
fernet = Fernet(SHARED_KEY)

async def handler(websocket):
    async for encrypted_message in websocket:
        try:
            decrypted = fernet.decrypt(encrypted_message)

            if decrypted == SHARED_KEY:
                await websocket.send(fernet.encrypt(SHARED_KEY))
                continue

            data = json.loads(decrypted.decode())

            if "UpdateCheck" in data:
                client_name = data["UpdateCheck"][0]["Client"]
                build_value = data["UpdateCheck"][1]["Build"]

                payload_directory = "payload"
                payload_entries = os.listdir(payload_directory) if os.path.isdir(payload_directory) else []

                client_exists = os.path.isdir(os.path.join(payload_directory, client_name))
                build_exists = any(
                    entry.startswith("build-") and os.path.isdir(os.path.join(payload_directory, entry))
                    for entry in payload_entries
                )

                client_status = f"Client: {str(client_exists)}"
                build_status = f"Build: {str(build_exists)}"

                response_message = f"{client_status}, {build_status}"
                await websocket.send(fernet.encrypt(response_message.encode()))

        except Exception:
            pass

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        print("WebSocket server running on ws://localhost:8765")
        await asyncio.Future()

asyncio.run(main())

