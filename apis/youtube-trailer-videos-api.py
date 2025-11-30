# apis/youtube-trailer-videos-api.py
import os
import json
import random
import subprocess
import asyncio
import aiohttp

api_key = os.getenv("YT_DATA_API_KEY")
if not api_key:
    raise RuntimeError("YT_DATA_API_KEY is not set in your environment!")

source_file = "../database/curated/curated_trailers_youtube_channels.txt"
output_file = "../database/pulled/curated-youtube-trailer-videos"

def load_channel_handles(path):
    handles = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("https://www.youtube.com/@"):
                line = line.replace("https://www.youtube.com/", "")
                line = line.replace("@", "")
                handles.append(line)
    return handles

def get_channel_id(handle):
    cmd = [
        "curl", "-s",
        f"https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&forHandle={handle}&key={api_key}"
    ]
    data = json.loads(subprocess.check_output(cmd).decode())
    if not data.get("items"):
        return None, None
    return data["items"][0]["id"], data["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

def get_recent_video_ids(playlist_id):
    cmd = [
        "curl", "-s",
        f"https://www.googleapis.com/youtube/v3/playlistItems?"
        f"part=contentDetails&playlistId={playlist_id}&maxResults=10&key={api_key}"
    ]
    plist = json.loads(subprocess.check_output(cmd).decode())
    return [it["contentDetails"]["videoId"] for it in plist.get("items", [])]

async def check_short_or_redirect(session, vid):
    url = f"https://www.youtube.com/shorts/{vid}"
    async with session.get(url, allow_redirects=False) as resp:
        if 300 <= resp.status < 400 and "Location" in resp.headers:
            return ("normal", resp.headers["Location"])
        return ("short", None)

async def main():
    handles = load_channel_handles(source_file)
    results = []
    async with aiohttp.ClientSession() as session:
        for handle in handles:
            channel_id, uploads = get_channel_id(handle)
            if not uploads:
                continue
            vids = get_recent_video_ids(uploads)
            if not vids:
                continue
            found = None
            for vid in vids[:5]:
                kind, redir = await check_short_or_redirect(session, vid)
                if kind == "normal":
                    found = redir
                    break
            if found:
                results.append(found)
    random.shuffle(results)
    with open(output_file, "w") as f:
        for r in results:
            f.write(r + "\n")

asyncio.run(main())

