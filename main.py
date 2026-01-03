from flask import Flask, render_template, send_from_directory, abort, jsonify
import asyncio
import websockets
import threading
import json
import pyautogui
import os
import subprocess
import requests
import time
from cryptography.fernet import Fernet
import base64

app = Flask(__name__)
pyautogui.FAILSAFE = False
width, height = pyautogui.size()
center_x = width // 2
center_y = height // 2
weather_data = {"locations": []}
SHARED_KEY = b'UM_pZBDsFnObCNvGijuUAiLexwfgPOv3ATMHvxjAa-Q=' # Placeholder key to avoid raising error
fernet = Fernet(SHARED_KEY)

def load_server_info():
    server_info_path = os.path.join("database", "serverinfo")
    server_ip = "0.0.0.0"
    server_port = "8764"

    # Create serverinfo with defaults if missing
    if not os.path.isfile(server_info_path):
        os.makedirs(os.path.dirname(server_info_path), exist_ok=True)
        with open(server_info_path, "w", encoding="utf-8") as file:
            file.write(f"IP: {server_ip}\n")
            file.write(f"PORT: {server_port}\n")
        return server_ip, server_port

    # Read existing serverinfo values
    with open(server_info_path, "r", encoding="utf-8") as file:
        for line in file:
            key, _, value = line.partition(": ")
            value = value.strip()
            if key == "IP":
                server_ip = value
            elif key == "PORT":
                server_port = value

    return server_ip, server_port

async def CheckUpdate():
    try:
        client_info_path = "database/clientinfo"

        # Ensure clientinfo exists
        if not os.path.isfile(client_info_path):
            os.makedirs(os.path.dirname(client_info_path), exist_ok=True)
            with open(client_info_path, "w", encoding="utf-8") as file:
                file.write("Client: None\n")
                file.write("Build: 1\n")

        client = "None"
        build = "1"

        # Read client and build values
        with open(client_info_path, "r", encoding="utf-8") as file:
            for line in file:
                key, _, value = line.partition(": ")
                value = value.strip()
                if key == "Client":
                    client = value
                elif key == "Build":
                    build = value

        server_ip, server_port = load_server_info()
        websocket_url = f"ws://{server_ip}:{server_port}"

        async with websockets.connect(websocket_url) as ws:
            await ws.send(fernet.encrypt(SHARED_KEY))
            response = await ws.recv()

            # Validate shared key handshake
            if fernet.decrypt(response) != SHARED_KEY:
                return False

            payload = {
                "UpdateCheck": [
                    {"Client": client},
                    {"Build": build}
                ]
            }

            await ws.send(fernet.encrypt(json.dumps(payload).encode()))
            response = await ws.recv()
            decrypted = fernet.decrypt(response)

            return decrypted.decode() == "True"

    except Exception:
        return False

async def RequestUpdate(ws):
    try:
        await ws.send("UpdateStarted")

        # Read client identifier
        client_info_path = "database/clientinfo"
        client = "None"

        if os.path.isfile(client_info_path):
            with open(client_info_path, "r", encoding="utf-8") as file:
                for line in file:
                    key, _, value = line.partition(": ")
                    if key == "Client":
                        client = value.strip()

        # Prepare update staging directory
        updates_directory = os.path.join("database", "updates")
        os.makedirs(updates_directory, exist_ok=True)

        # Connect to update server
        server_ip, server_port = load_server_info()
        websocket_url = f"ws://{server_ip}:{server_port}"

        async with websockets.connect(websocket_url, max_size=None) as update_ws:
            # Shared key handshake
            await update_ws.send(fernet.encrypt(SHARED_KEY))
            response = await update_ws.recv()

            if fernet.decrypt(response) != SHARED_KEY:
                await ws.send("UpdateFailed")
                return

            # Request update payload
            await update_ws.send(
                fernet.encrypt(
                    json.dumps({"UpdateRequest": {"Client": client}}).encode()
                )
            )

            # Receive update files
            while True:
                response = await update_ws.recv()
                decrypted = fernet.decrypt(response)
                data = json.loads(decrypted.decode())

                if data.get("Done") is True:
                    break

                relative_path = data["Path"]
                file_bytes = base64.b64decode(data["FileContent"])

                destination_path = os.path.join(updates_directory, relative_path)
                os.makedirs(os.path.dirname(destination_path), exist_ok=True)

                with open(destination_path, "wb") as file:
                    file.write(file_bytes)

                await ws.send("UpdateProgress")

        root_directory = os.path.abspath(os.path.dirname(__file__))
        update_command_script_path = None

        # Move staged files into application root
        for root_path, directory_names, file_names in os.walk(updates_directory, topdown=False):
            for file_name in file_names:
                source_file_path = os.path.join(root_path, file_name)
                relative_sub_path = os.path.relpath(source_file_path, updates_directory)
                target_file_path = os.path.join(root_directory, relative_sub_path)

                os.makedirs(os.path.dirname(target_file_path), exist_ok=True)
                os.replace(source_file_path, target_file_path)

                # Detect post-update command script
                if file_name == "update-com.sh":
                    update_command_script_path = target_file_path

            # Cleanup empty directories
            for directory_name in directory_names:
                directory_path = os.path.join(root_path, directory_name)
                if not os.listdir(directory_path):
                    os.rmdir(directory_path)

        if os.path.isdir(updates_directory):
            os.rmdir(updates_directory)

        # Execute post-update command script if present
        if update_command_script_path and os.path.isfile(update_command_script_path):
            os.chmod(update_command_script_path, 0o755)
            subprocess.run(["bash", update_command_script_path])
            os.remove(update_command_script_path)

        subprocess.run(["echo", "Update finished! maybe this should be a reboot command?"])
        await ws.send("UpdateFinished")

    except Exception:
        await ws.send("UpdateFailed")

@app.route('/static/navigation/target_websites/')
def serve_target_website_directory():
    directory_path = os.path.join(app.root_path, "static/navigation/target_websites")
    if not os.path.isdir(directory_path):
        abort(404)
    files = [f for f in os.listdir(directory_path) if f.endswith(".js")]
    return jsonify(files)

async def ws_handler(ws):
    print("WS client connected")
    try:
        async for msg in ws:
            if msg == "UpdateRequest":
                await RequestUpdate(ws)
            elif msg == "ManualFullScreen":
                pyautogui.press('F')
            elif msg == "ExitFullscreen":
                pyautogui.press('esc')
            elif msg == "FocusLocalhostBackground":
                ### Hardcoded to work with two screens for now
                time.sleep(0.1)
                pyautogui.click(x=284, y=723) # This needs to be resolved at some point
                pyautogui.moveTo(0, height - 1)
            elif msg == "VideoPlayPause":
                ### Hardcoded to work with two screens for now, later will make this auto resolve resolution...
                #pyautogui.click(center_x, center_y)
                pyautogui.click(x=950, y=535) # This needs to be resolved at some point
                pyautogui.moveTo(0, height - 1)
            elif msg == "SearchEnter":
                pyautogui.press('space')
                pyautogui.press('backspace')
                pyautogui.press('enter')
            elif msg == "ManualVideoPlayerFocusAndFullscreen":
                ### Hardcoded to work with two screens for now, later will make this auto resolve resolution...
                #pyautogui.click(center_x, center_y)
                time.sleep(2)
                pyautogui.moveTo(x=950, y=535) # This needs to be resolved at some point
                pyautogui.press('F')
                pyautogui.moveTo(0, height - 1)
    except websockets.exceptions.ConnectionClosed:
        print("WS client disconnected")

async def ws_server():
    print("WebSocket server running on ws://0.0.0.0:8765")
    async with websockets.serve(ws_handler, "0.0.0.0", 8765):
        await asyncio.Future()

def start_ws():
    asyncio.run(ws_server())

def run_youtube_api():
    subprocess.Popen(["python3", "apis/youtube-api.py"])

def fetch_weather_for_location(location_name):
    search_response = requests.get(
        f"https://geocoding-api.open-meteo.com/v1/search?name={location_name}&count=1"
    )
    search_data = search_response.json()
    if "results" not in search_data or not search_data["results"]:
        return None
    first_result = search_data["results"][0]
    latitude_value = first_result["latitude"]
    longitude_value = first_result["longitude"]
    weather_response = requests.get(
        f"https://api.open-meteo.com/v1/forecast?latitude={latitude_value}&longitude={longitude_value}&current_weather=true"
    )
    weather_data_json = weather_response.json()
    if "current_weather" not in weather_data_json:
        return None
    current_weather = weather_data_json["current_weather"]
    return {
        "location_name": first_result["name"],
        "temperature": current_weather["temperature"],
        "wind_speed": current_weather["windspeed"],
        "timestamp": current_weather["time"]
    }

def weather_thread_function():
    global weather_data
    location_file_path = os.path.join(app.root_path, "database", "location.txt")
    while True:
        collected_weather = []
        if os.path.isfile(location_file_path):
            with open(location_file_path, "r", encoding="utf-8") as file:
                file_text = file.read()
            def read_location(label_name):
                search_text = f'{label_name}: "'
                if search_text in file_text:
                    return file_text.split(search_text)[1].split('"')[0].strip()
                return ""
            first_location_name = read_location("WeatherLocation1")
            second_location_name = read_location("WeatherLocation2")
            for location_name in (first_location_name, second_location_name):
                if location_name:
                    weather_result = fetch_weather_for_location(location_name)
                    if weather_result:
                        collected_weather.append(weather_result)
        weather_data = {"locations": collected_weather}
        time.sleep(900)

@app.route('/')
def home():
    return render_template("home.html", title="Home", active="home")

@app.route('/curated')
def curated():
    return render_template("curated.html", title="Curated", active="curated")

@app.route('/apps')
def apps():
    app_folder = os.path.join(app.root_path, 'templates', 'apps')
    app_files = sorted(f for f in os.listdir(app_folder) if f.endswith(".html"))
    return render_template("apps.html", title="Apps", active="apps", app_files=app_files)

@app.route('/database/pulled/<path:filename>')
def serve_pulled_files(filename):
    base = os.path.join(app.root_path, "database", "pulled")
    file_path = os.path.join(base, filename)
    if not os.path.isfile(file_path):
        abort(404)
    return send_from_directory(base, filename, mimetype="text/plain")

@app.route('/database/location')
def serve_location_file():
    file_path = os.path.join(app.root_path, "database", "location.txt")
    if not os.path.isfile(file_path):
        abort(404)
    return send_from_directory(
        os.path.join(app.root_path, "database"),
        "location.txt",
        mimetype="text/plain"
    )

@app.route('/weather')
def serve_weather_data():
    return jsonify(weather_data)

@app.route("/static/navigation/virtual_keyboard_languages/")
def list_virtual_keyboard_languages():
    base_directory = os.path.dirname(os.path.abspath(__file__))
    language_directory = os.path.join(
        base_directory,
        "static",
        "navigation",
        "virtual_keyboard_languages",
    )
    if not os.path.isdir(language_directory):
        abort(404)
    language_files = [
        filename
        for filename in os.listdir(language_directory)
        if filename.endswith(".js")
    ]
    return jsonify(language_files)

@app.route("/update")
def update_exists():
    return jsonify(os.path.isfile(os.path.join(app.root_path, "database", "update")))

@app.route('/url-control-start-spinner')
def url_control_start_spinner():
    print("start spinner")
    return "", 204

@app.route('/url-control-stop-spinner') 
def url_control_stop_spinner():
    print("stop spinner")
    return "", 204

if __name__ == "__main__":
    if os.path.exists("database/update"):
        os.remove("database/update")
    update_available = asyncio.run(CheckUpdate())
    if update_available:
        os.makedirs("database", exist_ok=True)
        open("database/update", "w").close()
    pulled_folder_path = os.path.join(app.root_path, "database", "pulled")
    os.makedirs(pulled_folder_path, exist_ok=True)
    threading.Thread(target=start_ws, daemon=True).start()
    threading.Thread(target=weather_thread_function, daemon=True).start()
    threading.Thread(target=run_youtube_api, daemon=True).start()
    app.run(host='0.0.0.0', port=8080)

