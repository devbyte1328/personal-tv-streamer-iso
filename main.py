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

async def ws_handler(ws):
    print("WS client connected")
    try:
        async for msg in ws:
            if msg == "VideoPlayPause":
                ### Hardcoded to work with two screens for now, later will make this auto resolve resolution...
                #pyautogui.click(center_x, center_y)
                pyautogui.click(x=950, y=535)
                pyautogui.moveTo(0, height - 1)
            elif msg == "SearchEnter":
                pyautogui.press('space')
                pyautogui.press('backspace')
                pyautogui.press('enter')
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

def fetch_weather_for_location(location_text):
    r = requests.get(f"https://geocoding-api.open-meteo.com/v1/search?name={location_text}&count=1")
    j = r.json()
    if "results" not in j:
        return None
    if not j["results"]:
        return None
    item = j["results"][0]
    lat = item["latitude"]
    lon = item["longitude"]
    r2 = requests.get(f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true")
    j2 = r2.json()
    if "current_weather" not in j2:
        return None
    return {
        "name": item["name"],
        "temperature": j2["current_weather"]["temperature"],
        "windspeed": j2["current_weather"]["windspeed"],
        "time": j2["current_weather"]["time"]
    }

def weather_thread_function():
    global weather_data
    while True:
        path = os.path.join(app.root_path, "database", "location.txt")
        if os.path.isfile(path):
            with open(path) as f:
                t = f.read()
            w1 = ""
            w2 = ""
            m1 = t.split('WeatherLocation1: "')
            if len(m1) > 1:
                w1 = m1[1].split('"')[0].strip()
            m2 = t.split('WeatherLocation2: "')
            if len(m2) > 1:
                w2 = m2[1].split('"')[0].strip()
            locations_list = []
            if w1:
                d1 = fetch_weather_for_location(w1)
                if d1:
                    locations_list.append(d1)
            if w2:
                d2 = fetch_weather_for_location(w2)
                if d2:
                    locations_list.append(d2)
            weather_data = {"locations": locations_list}
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
    #threading.Thread(target=run_youtube_api, daemon=True).start()
    app.run(host='0.0.0.0', port=8080)

