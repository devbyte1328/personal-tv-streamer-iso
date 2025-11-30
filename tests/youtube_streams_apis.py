import subprocess
import json
import asyncio
import aiohttp
import os

API_KEY = os.getenv("YT_DATA_API_KEY")
URL_CHANNEL_HANDLE = "PFLMMA"

cmd = ["curl", "-s", f"https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&forHandle={URL_CHANNEL_HANDLE}&key={API_KEY}"]
data = json.loads(subprocess.check_output(cmd).decode())
CHANNEL_ID = data["items"][0]["id"]
UPLOADS_PLAYLIST = data["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

cmd = [
    "curl", "-s",
    f"https://www.googleapis.com/youtube/v3/playlistItems?"
    f"part=contentDetails&playlistId={UPLOADS_PLAYLIST}&maxResults=50&key={API_KEY}"
]
plist = json.loads(subprocess.check_output(cmd).decode())
video_ids = [item["contentDetails"]["videoId"] for item in plist.get("items", [])]

async def fetch_meta(session, ids):
    url = (
        "https://www.googleapis.com/youtube/v3/videos?"
        f"part=snippet,liveStreamingDetails&id={','.join(ids)}&key={API_KEY}"
    )
    async with session.get(url) as r:
        return await r.json()

async def main(ids):
    async with aiohttp.ClientSession() as session:
        data = await fetch_meta(session, ids)
        live = []
        archived = []
        for item in data.get("items", []):
            vid = item["id"]
            state = item["snippet"]["liveBroadcastContent"]
            ls = item.get("liveStreamingDetails")
            if state == "live":
                live.append(vid)
            elif ls is not None:
                archived.append((vid, ls.get("actualStartTime")))
        if live:
            print("https://www.youtube.com/watch?v=" + live[0])
            return
        archived_sorted = sorted(archived, key=lambda x: x[1], reverse=True)
        if archived_sorted:
            print("https://www.youtube.com/watch?v=" + archived_sorted[0][0])
        else:
            print(None)

asyncio.run(main(video_ids))

