import os
import json
import random
import subprocess
import asyncio
import aiohttp

api_key = os.getenv("YT_DATA_API_KEY")
if not api_key:
    raise RuntimeError("YT_DATA_API_KEY is not set in your environment!")

general_source_file = "../database/curated/curated_general_youtube_channels.txt"
trailer_source_file = "../database/curated/curated_trailers_youtube_channels.txt"

general_output_file = "../database/pulled/curated-youtube-general-videos"
trailer_output_file = "../database/pulled/curated-youtube-trailer-videos"

def load_channel_handles(path):
    channel_handles = []
    with open(path, "r") as file:
        for line in file:
            stripped = line.strip()
            if stripped.startswith("https://www.youtube.com/@"):
                stripped = stripped.replace("https://www.youtube.com/", "")
                stripped = stripped.replace("@", "")
                channel_handles.append(stripped)
    return channel_handles

def get_channel_id(channel_handle):
    command = [
        "curl", "-s",
        f"https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&forHandle={channel_handle}&key={api_key}"
    ]
    response = json.loads(subprocess.check_output(command).decode())
    if not response.get("items"):
        return None, None
    return response["items"][0]["id"], response["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

def get_recent_video_ids(playlist_id):
    command = [
        "curl", "-s",
        f"https://www.googleapis.com/youtube/v3/playlistItems?"
        f"part=contentDetails&playlistId={playlist_id}&maxResults=10&key={api_key}"
    ]
    response = json.loads(subprocess.check_output(command).decode())
    return [item["contentDetails"]["videoId"] for item in response.get("items", [])]

async def check_if_short_or_redirect(session, video_id):
    url = f"https://www.youtube.com/shorts/{video_id}"
    async with session.get(url, allow_redirects=False) as response:
        if 300 <= response.status < 400 and "Location" in response.headers:
            redirected = response.headers["Location"]
            split_point = redirected.find("v=")
            if split_point != -1:
                video_only = redirected.split("v=")[1].split("&")[0]
                return ("normal", video_only)
            return ("normal", None)
        return ("short", None)

async def fetch_stream_data(session, video_ids):
    url = (
        "https://www.googleapis.com/youtube/v3/videos?"
        f"part=snippet,liveStreamingDetails&id={','.join(video_ids)}&key={api_key}"
    )
    async with session.get(url) as response:
        return await response.json()

async def pick_normal_video(session, video_ids):
    for video_id in video_ids[:5]:
        result, redirect_id = await check_if_short_or_redirect(session, video_id)
        if result == "normal" and redirect_id:
            return redirect_id
    return None

async def pick_stream_video(session, video_ids):
    data = await fetch_stream_data(session, video_ids)
    live_items = []
    archived_items = []
    for item in data.get("items", []):
        vid = item["id"]
        state = item["snippet"]["liveBroadcastContent"]
        details = item.get("liveStreamingDetails")
        if state == "live":
            live_items.append(vid)
        elif details is not None:
            archived_items.append((vid, details.get("actualStartTime")))
    if live_items:
        return live_items[0]
    archived_sorted = sorted(archived_items, key=lambda x: x[1], reverse=True)
    if archived_sorted:
        return archived_sorted[0][0]
    return None

async def collect_general(session, handles):
    collected = []
    for handle in handles:
        if "/streams" in handle:
            clean_handle = handle.replace("/streams", "")
            channel_id, uploads = get_channel_id(clean_handle)
            if not uploads:
                continue
            video_ids = get_recent_video_ids(uploads)
            if not video_ids:
                continue
            found = await pick_stream_video(session, video_ids)
            if found:
                collected.append(found)
        else:
            channel_id, uploads = get_channel_id(handle)
            if not uploads:
                continue
            video_ids = get_recent_video_ids(uploads)
            if not video_ids:
                continue
            found = await pick_normal_video(session, video_ids)
            if found:
                collected.append(found)
    return collected

async def collect_trailers(session, handles):
    collected = []
    for handle in handles:
        channel_id, uploads = get_channel_id(handle)
        if not uploads:
            continue
        video_ids = get_recent_video_ids(uploads)
        if not video_ids:
            continue
        found_video = None
        for vid in video_ids[:5]:
            kind, redirect_id = await check_if_short_or_redirect(session, vid)
            if kind == "normal" and redirect_id:
                found_video = redirect_id
                break
        if found_video:
            collected.append(found_video)
    return collected

async def main():
    general_handles = load_channel_handles(general_source_file)
    trailer_handles = load_channel_handles(trailer_source_file)
    async with aiohttp.ClientSession() as session:
        general_results = await collect_general(session, general_handles)
        trailer_results = await collect_trailers(session, trailer_handles)
    random.shuffle(general_results)
    random.shuffle(trailer_results)
    with open(general_output_file, "w") as file:
        for video_id in general_results:
            file.write(video_id + "\n")
    with open(trailer_output_file, "w") as file:
        for video_id in trailer_results:
            file.write(video_id + "\n")

asyncio.run(main())

