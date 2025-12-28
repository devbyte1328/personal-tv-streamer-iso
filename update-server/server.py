import asyncio
import websockets
import json
import os
from cryptography.fernet import Fernet

SHARED_KEY = b'UM_pZBDsFnObCNvGijuUAiLexwfgPOv3ATMHvxjAa-Q=' # Placeholder key
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

                payload_directory = "payload"
                payload_entries = os.listdir(payload_directory) if os.path.isdir(payload_directory) else []

                client_exists = os.path.isdir(os.path.join(payload_directory, client_name))
                build_exists = any(
                    entry.startswith("build-") and os.path.isdir(os.path.join(payload_directory, entry))
                    for entry in payload_entries
                )

                result = "True" if client_exists or build_exists else "False"
                await websocket.send(fernet.encrypt(result.encode()))
                
            elif "UpdateRequest" in data:
                pass

        except Exception:
            pass

async def main():
    async with websockets.serve(handler, "localhost", 8764):
        print("WebSocket server running on ws://localhost:8764")
        await asyncio.Future()

asyncio.run(main())

