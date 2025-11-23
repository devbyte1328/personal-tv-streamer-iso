from flask import Flask, render_template
import asyncio
import websockets
import threading
import json
import pyautogui

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

@app.route('/')
def home():
    return render_template("home.html", title="Home", active="home")

@app.route('/curated')
def curated():
    return render_template("curated.html", title="Curated", active="curated")

@app.route('/apps')
def apps():
    return render_template("apps.html", title="Apps", active="apps")

if __name__ == "__main__":
    threading.Thread(target=start_ws, daemon=True).start()
    app.run(host='0.0.0.0', port=8080)

