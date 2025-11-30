import subprocess
import json
import asyncio
import aiohttp
import os

API_KEY = os.getenv("YT_DATA_API_KEY")
URL_CHANNEL_HANDLE = "FCBarcelona"

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
            ls = item.get("liveStreamingDetails")
            state = item["snippet"]["liveBroadcastContent"]
            if state == "live":
                live.append(vid)
            elif ls is not None:
                archived.append(vid)
        return live, archived

live_ids, archived_ids = asyncio.run(main(video_ids))

print("LIVE STREAMS:")
for v in live_ids:
    print("https://www.youtube.com/watch?v=" + v)

print("\nARCHIVED LIVESTREAMS:")
for v in archived_ids:
    print("https://www.youtube.com/watch?v=" + v)

