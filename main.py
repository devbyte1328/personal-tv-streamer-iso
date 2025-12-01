from flask import Flask, render_template, send_from_directory, abort
import asyncio
import websockets
import threading
import json
import pyautogui
import os
import subprocess

app = Flask(__name__)
pyautogui.FAILSAFE = False
width, height = pyautogui.size()
center_x = width // 2
center_y = height // 2

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

if __name__ == "__main__":
    pulled_folder_path = os.path.join(app.root_path, "database", "pulled")
    os.makedirs(pulled_folder_path, exist_ok=True)
    threading.Thread(target=start_ws, daemon=True).start()
    threading.Thread(target=run_youtube_api, daemon=True).start()
    app.run(host='0.0.0.0', port=8080)

