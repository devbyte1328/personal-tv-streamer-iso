import asyncio
import websockets
import json
import os
from cryptography.fernet import Fernet
import base64

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
                client_name = data["UpdateRequest"]["Client"]
                client_payload_path = os.path.join("payload", client_name)
                if os.path.isdir(client_payload_path):
                    for root, directories, files in os.walk(client_payload_path):
                        for file_name in files:
                            file_path = os.path.join(root, file_name)
                            with open(file_path, "rb") as f:
                                encoded_content = base64.b64encode(f.read()).decode("utf-8")
                            relative_path = os.path.relpath(file_path, client_payload_path)
                            payload = {
                                "Path": relative_path,
                                "FileContent": encoded_content
                            }
                            await websocket.send(fernet.encrypt(json.dumps(payload).encode()))
                await websocket.send(fernet.encrypt(json.dumps({"Done": True}).encode()))

        except Exception as e:
            print(f"Error: {e}")
            await websocket.close()

async def main():
    async with websockets.serve(handler, "localhost", 8764):
        print("WebSocket server running on ws://localhost:8764")
        await asyncio.Future()

asyncio.run(main())

