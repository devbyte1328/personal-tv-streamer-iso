import subprocess
import json
import asyncio
import aiohttp
import os

API_KEY = os.getenv("YT_DATA_API_KEY")
if not API_KEY:
    raise RuntimeError("YT_DATA_API_KEY is not set in your environment!")

URL_CHANNEL_HANDLE = "discovery"

cmd = ["curl", "-s", f"https://www.googleapis.com/youtube/v3/channels?part=id&forHandle={URL_CHANNEL_HANDLE}&key={API_KEY}"]
data = json.loads(subprocess.check_output(cmd).decode())
CHANNEL_ID = data["items"][0]["id"]

cmd = ["curl", "-s", f"https://www.googleapis.com/youtube/v3/search?part=snippet&order=date&maxResults=5&type=video&channelId={CHANNEL_ID}&key={API_KEY}"]
data = json.loads(subprocess.check_output(cmd).decode())

video_ids = [item["id"]["videoId"] for item in data["items"]]

async def check_video(session, vid):
    url = f"https://www.youtube.com/shorts/{vid}"
    async with session.get(url, allow_redirects=False) as resp:
        if 300 <= resp.status < 400 and "Location" in resp.headers:
            return ("normal", resp.headers["Location"])
        else:
            return ("short", None)

async def main(video_ids):
    async with aiohttp.ClientSession() as session:
        for idx, vid in enumerate(video_ids):
            kind, url = await check_video(session, vid)
            if kind == "normal":
                print(url)
                return
            if idx == 4:
                print(None)

asyncio.run(main(video_ids))

