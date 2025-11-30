# apis/youtube-general-videos-api.py
import os
import json
import random
import subprocess
import asyncio
import aiohttp

api_key = os.getenv("YT_DATA_API_KEY")
if not api_key:
    raise RuntimeError("YT_DATA_API_KEY is not set in your environment!")

source_file = "../database/curated/curated_general_youtube_channels.txt"
output_file = "../database/pulled/curated-youtube-general-videos"

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

async def is_short_or_redirect(session, vid):
    url = f"https://www.youtube.com/shorts/{vid}"
    async with session.get(url, allow_redirects=False) as resp:
        if 300 <= resp.status < 400 and "Location" in resp.headers:
            return ("normal", resp.headers["Location"])
        return ("short", None)

async def fetch_stream_info(session, ids):
    url = (
        "https://www.googleapis.com/youtube/v3/videos?"
        f"part=snippet,liveStreamingDetails&id={','.join(ids)}&key={api_key}"
    )
    async with session.get(url) as r:
        return await r.json()

async def pick_general_video(session, video_ids):
    for vid in video_ids[:5]:
        kind, redir = await is_short_or_redirect(session, vid)
        if kind == "normal":
            return redir
    return None

async def pick_stream_video(session, video_ids):
    data = await fetch_stream_info(session, video_ids)
    live = []
    archived = []
    for it in data.get("items", []):
        vid = it["id"]
        state = it["snippet"]["liveBroadcastContent"]
        ls = it.get("liveStreamingDetails")
        if state == "live":
            live.append(vid)
        elif ls is not None:
            archived.append((vid, ls.get("actualStartTime")))
    if live:
        return "https://www.youtube.com/watch?v=" + live[0]
    archived_sorted = sorted(archived, key=lambda x: x[1], reverse=True)
    if archived_sorted:
        return "https://www.youtube.com/watch?v=" + archived_sorted[0][0]
    return None

async def main():
    handles = load_channel_handles(source_file)
    results = []
    async with aiohttp.ClientSession() as session:
        for handle in handles:
            if "/streams" in handle:
                clean_handle = handle.replace("/streams", "")
                channel_id, uploads = get_channel_id(clean_handle)
                if not uploads:
                    continue
                vids = get_recent_video_ids(uploads)
                if not vids:
                    continue
                link = await pick_stream_video(session, vids)
                if link:
                    results.append(link)
            else:
                channel_id, uploads = get_channel_id(handle)
                if not uploads:
                    continue
                vids = get_recent_video_ids(uploads)
                if not vids:
                    continue
                link = await pick_general_video(session, vids)
                if link:
                    results.append(link)
    random.shuffle(results)
    with open(output_file, "w") as f:
        for r in results:
            f.write(r + "\n")

asyncio.run(main())

