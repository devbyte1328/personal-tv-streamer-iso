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
from pynput import keyboard
from playsound3 import playsound

__version__ = "0.1.0"
client_device = "None"
device_build = "1"
app = Flask(__name__)
pyautogui.FAILSAFE = False
width, height = pyautogui.size()
center_x = width // 2
center_y = height // 2
weather_data = {"locations": []}
SHARED_KEY = b'UM_pZBDsFnObCNvGijuUAiLexwfgPOv3ATMHvxjAa-Q=' # Placeholder key to avoid raising error
fernet = Fernet(SHARED_KEY)
_spinner_process = None
_spinner_lock = threading.Lock()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
moveAudioPath = os.path.join(BASE_DIR, "static", "assets", "audio-feedback", "move.mp3")
enterAudioPath = os.path.join(BASE_DIR, "static", "assets", "audio-feedback", "enter.mp3")
subprocess.run(["xmodmap", os.path.expanduser("~/.Xmodmap")], check=True)

def playMove():
    subprocess.Popen(
        ["mpg123", "-q", moveAudioPath],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

def playEnter():
    subprocess.Popen(
        ["mpg123", "-q", enterAudioPath],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )


def onKeyPress(key):
    if key in (
        keyboard.Key.up,
        keyboard.Key.down,
        keyboard.Key.left,
        keyboard.Key.right,
    ):
        threading.Thread(target=playMove, daemon=True).start()

    elif key in (
        keyboard.Key.enter,
        keyboard.Key.f8,
        keyboard.Key.menu,
    ):
        threading.Thread(target=playEnter, daemon=True).start()

def start_keyboard_listener():
    listener = keyboard.Listener(on_press=onKeyPress)
    listener.start()
    listener.join()

def load_server_info():
    server_info_path = os.path.join(BASE_DIR, "database", "serverinfo")
    server_ip = "0.0.0.0"
    server_port = "8764"

    os.makedirs(os.path.dirname(server_info_path), exist_ok=True)

    if not os.path.isfile(server_info_path):
        with open(server_info_path, "w", encoding="utf-8") as file:
            file.write(f"IP: {server_ip}\n")
            file.write(f"PORT: {server_port}\n")
        return server_ip, server_port

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
        client_info_path = os.path.join(BASE_DIR, "database", "clientinfo")

        # Ensure clientinfo exists
        if not os.path.isfile(client_info_path):
            os.makedirs(os.path.dirname(client_info_path), exist_ok=True)
            with open(client_info_path, "w", encoding="utf-8") as file:
                file.write(f"Version: {__version__}+{client_device}.{device_build}")

        with open(client_info_path, "r", encoding="utf-8") as file:
            line = file.readline().strip()
            if line.startswith("Version:"):
                local_version = line.split(":", 1)[1].strip()
            else:
                raise ValueError("Invalid version file format")


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
                    {"Version": local_version}
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

        client_info_path = os.path.join(BASE_DIR, "database", "clientinfo")
        with open(client_info_path, encoding="utf-8") as client_info_file:
            first_line = client_info_file.readline().strip()

        if not first_line.startswith("Version:"):
            raise ValueError("Invalid version file format")

        local_version = first_line.split(":", 1)[1].strip()

        updates_staging_root = os.path.join(BASE_DIR, "database", "updates")
        os.makedirs(updates_staging_root, exist_ok=True)

        server_ip, server_port = load_server_info()
        websocket_url = f"ws://{server_ip}:{server_port}"

        async with websockets.connect(websocket_url, max_size=None) as update_socket:
            await update_socket.send(fernet.encrypt(SHARED_KEY))
            handshake_response = await update_socket.recv()

            if fernet.decrypt(handshake_response) != SHARED_KEY:
                await ws.send("UpdateFailed")
                return

            request_payload = {
                "UpdateRequest": {
                    "Version": local_version
                }
            }

            await update_socket.send(
                fernet.encrypt(json.dumps(request_payload).encode())
            )

            while True:
                encrypted_message = await update_socket.recv()
                decrypted_message = fernet.decrypt(encrypted_message)
                decoded_payload = json.loads(decrypted_message.decode())

                if decoded_payload.get("Done") is True:
                    break

                relative_file_path = decoded_payload["Path"]
                file_binary_data = base64.b64decode(decoded_payload["FileContent"])

                final_staging_path = os.path.join(updates_staging_root, relative_file_path)
                os.makedirs(os.path.dirname(final_staging_path), exist_ok=True)

                with open(final_staging_path, "wb") as output_file:
                    output_file.write(file_binary_data)

                await ws.send("UpdateProgress")

        application_root = os.path.abspath(os.path.dirname(__file__))
        post_update_script_path = None

        for current_root, directory_list, file_list in os.walk(updates_staging_root, topdown=False):
            for current_file in file_list:
                source_file = os.path.join(current_root, current_file)
                relative_location = os.path.relpath(source_file, updates_staging_root)
                destination_file = os.path.join(application_root, relative_location)

                os.makedirs(os.path.dirname(destination_file), exist_ok=True)
                os.replace(source_file, destination_file)

                if current_file == "update-com.sh":
                    post_update_script_path = destination_file

            for current_directory in directory_list:
                absolute_directory_path = os.path.join(current_root, current_directory)
                if not os.listdir(absolute_directory_path):
                    os.rmdir(absolute_directory_path)

        if os.path.isdir(updates_staging_root):
            os.rmdir(updates_staging_root)

        if post_update_script_path and os.path.isfile(post_update_script_path):
            os.chmod(post_update_script_path, 0o755)
            subprocess.run(["bash", post_update_script_path])
            os.remove(post_update_script_path)

        await ws.send("UpdateFinished")
        subprocess.run(["reboot"])

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
            elif msg == "VideoPlayPause":
                pyautogui.click(center_x, center_y)
                pyautogui.moveTo(0, height - 1)
            elif msg == "SearchEnter":
                pyautogui.press('space')
                pyautogui.press('backspace')
                pyautogui.press('enter')
            elif msg == "ManualVideoPlayerFocusAndFullscreen":
                pyautogui.click(center_x, center_y)
                time.sleep(2)
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
    subprocess.Popen(["python3",os.path.join(BASE_DIR, "apis", "youtube-api.py")])


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
    global _spinner_process
    with _spinner_lock:
        if _spinner_process is None or _spinner_process.poll() is not None:
            _spinner_process = subprocess.Popen(
                ["python3", os.path.join(BASE_DIR, "lib", "spinner_overlay.py")],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )

    return "", 204

@app.route('/url-control-stop-spinner')
def url_control_stop_spinner():
    global _spinner_process
    with _spinner_lock:
        if _spinner_process is not None and _spinner_process.poll() is None:
            _spinner_process.terminate()
            _spinner_process = None

    return "", 204

if __name__ == "__main__":
    pyautogui.moveTo(x=0, y=height)
    update_flag = os.path.join(BASE_DIR, "database", "update")
    if os.path.exists(update_flag):
        os.remove(update_flag)
    update_available = asyncio.run(CheckUpdate())
    if update_available:
        os.makedirs(os.path.join(BASE_DIR, "database"), exist_ok=True)
        open(update_flag, "w").close()
    pulled_folder_path = os.path.join(app.root_path, "database", "pulled")
    os.makedirs(pulled_folder_path, exist_ok=True)
    threading.Thread(target=start_ws, daemon=True).start()
    threading.Thread(target=weather_thread_function, daemon=True).start()
    threading.Thread(target=run_youtube_api, daemon=True).start()
    threading.Thread(target=start_keyboard_listener, daemon=True).start()
    app.run(host='0.0.0.0', port=8080)

