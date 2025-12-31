import asyncio
import websockets
import json
import os
from cryptography.fernet import Fernet, InvalidToken
import base64
from datetime import datetime
from json import JSONDecodeError

SHARED_KEY = b'UM_pZBDsFnObCNvGijuUAiLexwfgPOv3ATMHvxjAa-Q=' # Placeholder key
fernet = Fernet(SHARED_KEY)

def log_event(ip_address, event_type, summary):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
    log_line = f"[{timestamp}] [{ip_address}] [{event_type}] {summary}"
    print(log_line)
    with open("logs.txt", "a", encoding="utf-8") as log_file:
        log_file.write(log_line + "\n")

async def handler(websocket):
    ip_address = "unknown"
    if websocket.remote_address:
        ip_address = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"

    log_event(ip_address, "CONNECT", "opened")

    try:
        async for encrypted_message in websocket:
            decrypted = fernet.decrypt(encrypted_message)

            if decrypted == SHARED_KEY:
                response = fernet.encrypt(SHARED_KEY)
                await websocket.send(response)
                log_event(ip_address, "HANDSHAKE", "shared key validated")
                continue

            decrypted_text = decrypted.decode(errors="replace")
            data = json.loads(decrypted_text)

            log_event(ip_address, "RECEIVED", decrypted_text)

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
                response = fernet.encrypt(result.encode())
                await websocket.send(response)
                log_event(ip_address, "RESPONDED", f"UpdateCheck={result}")

            elif "UpdateRequest" in data:
                client_name = data["UpdateRequest"]["Client"]
                client_payload_path = os.path.join("payload", client_name)

                file_count = 0

                if os.path.isdir(client_payload_path):
                    for root, directories, files in os.walk(client_payload_path):
                        for file_name in files:
                            file_path = os.path.join(root, file_name)
                            with open(file_path, "rb") as file_handle:
                                encoded_content = base64.b64encode(file_handle.read()).decode("utf-8")

                            relative_path = os.path.relpath(file_path, client_payload_path)
                            payload = {
                                "Path": relative_path,
                                "FileContent": encoded_content
                            }

                            response = fernet.encrypt(json.dumps(payload).encode())
                            await websocket.send(response)
                            file_count += 1

                done_response = fernet.encrypt(json.dumps({"Done": True}).encode())
                await websocket.send(done_response)
                log_event(ip_address, "RESPONDED", f"UpdateRequest files={file_count}")

    except (InvalidToken, JSONDecodeError):
        log_event(ip_address, "ENCRYPTION_FAILED", "decryption or integrity validation failed")
        await websocket.close()
    except Exception as exception:
        log_event(ip_address, "ERROR", repr(exception))
        await websocket.close()
    finally:
        log_event(ip_address, "DISCONNECT", "closed")

async def main():
    async with websockets.serve(handler, "localhost", 8764):
        print("WebSocket server running on ws://localhost:8764")
        await asyncio.Future()

asyncio.run(main())

