import asyncio
import websockets
import json
from cryptography.fernet import Fernet
import os

SHARED_KEY = b'ycrhQ4UyYbMqeqUP1qXHsvVFVLFeyzzEDk2P5mGA5no='
fernet = Fernet(SHARED_KEY)

async def CheckUpdate():
    path = "database/clientinfo"

    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write("Client: None\n")
            f.write("Build: 1\n")

    client = "None"
    build = "1"

    with open(path, "r") as f:
        for line in f:
            key, _, value = line.partition(": ")
            value = value.strip()
            if key == "Client":
                client = value
            elif key == "Build":
                build = value

    async with websockets.connect("ws://localhost:8765") as ws:
        await ws.send(fernet.encrypt(SHARED_KEY))

        response = await ws.recv()
        decrypted = fernet.decrypt(response)

        if decrypted == SHARED_KEY:
            payload = {
                "UpdateCheck": [
                    {"Client": client},
                    {"Build": build}
                ]
            }

            encrypted_payload = fernet.encrypt(json.dumps(payload).encode())
            await ws.send(encrypted_payload)

            response = await ws.recv()
            decrypted = fernet.decrypt(response)
            print(decrypted.decode())

asyncio.run(CheckUpdate())

