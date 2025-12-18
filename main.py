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

app = Flask(__name__)

pyautogui.FAILSAFE = False
width, height = pyautogui.size()
center_x = width // 2
center_y = height // 2

weather_data = {"locations": []}

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
            if msg == "ManualFullScreen":
                pyautogui.press('F')
            elif msg == "ExitFullscreen":
                pyautogui.press('esc')
            elif msg == "FocusLocalhostBackground":
                ### Hardcoded to work with two screens for now
                time.sleep(0.1)
                pyautogui.click(x=314, y=1012) # This needs to be resolved at some point
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
                print("Hello from ManualVideoPlayerFocusAndFullscreen")
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

if __name__ == "__main__":
    pulled_folder_path = os.path.join(app.root_path, "database", "pulled")
    os.makedirs(pulled_folder_path, exist_ok=True)
    threading.Thread(target=start_ws, daemon=True).start()
    threading.Thread(target=weather_thread_function, daemon=True).start()
    threading.Thread(target=run_youtube_api, daemon=True).start()
    app.run(host='0.0.0.0', port=8080)

