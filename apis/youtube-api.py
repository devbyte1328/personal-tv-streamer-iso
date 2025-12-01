import os
import json
import random
import asyncio
import aiohttp

api_key = os.getenv("YT_DATA_API_KEY")
if not api_key:
    raise RuntimeError("YT_DATA_API_KEY is not set in your environment!")

general_source_file = "database/curated/curated_general_youtube_channels.txt"
trailer_source_file = "database/curated/curated_trailers_youtube_channels.txt"

general_output_file = "database/pulled/curated-youtube-general-videos"
trailer_output_file = "database/pulled/curated-youtube-trailer-videos"

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

async def get_channel_id(session, handle):
    url = f"https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&forHandle={handle}&key={api_key}"
    async with session.get(url) as response:
        data = await response.json()
    if not data.get("items"):
        return None, None
    item = data["items"][0]
    return item["id"], item["contentDetails"]["relatedPlaylists"]["uploads"]

async def get_recent_video_ids(session, playlist_id):
    url = (
        "https://www.googleapis.com/youtube/v3/playlistItems?"
        f"part=contentDetails&playlistId={playlist_id}&maxResults=10&key={api_key}"
    )
    async with session.get(url) as response:
        data = await response.json()
    return [i["contentDetails"]["videoId"] for i in data.get("items", [])]

async def check_if_short_or_redirect(session, video_id):
    url = f"https://www.youtube.com/shorts/{video_id}"
    async with session.get(url, allow_redirects=False) as response:
        if 300 <= response.status < 400 and "Location" in response.headers:
            redirected = response.headers["Location"]
            idx = redirected.find("v=")
            if idx != -1:
                return ("normal", redirected.split("v=")[1].split("&")[0])
            return ("normal", None)
        return ("short", None)

async def fetch_stream_data(session, video_ids):
    url = (
        "https://www.googleapis.com/youtube/v3/videos?"
        f"part=snippet,liveStreamingDetails&id={','.join(video_ids)}&key={api_key}"
    )
    async with session.get(url) as response:
        return await response.json()

async def fetch_video_titles(session, video_ids):
    if not video_ids:
        return {}
    url = (
        "https://www.googleapis.com/youtube/v3/videos?"
        f"part=snippet&id={','.join(video_ids)}&key={api_key}"
    )
    async with session.get(url) as response:
        data = await response.json()
    titles = {}
    for item in data.get("items", []):
        vid = item["id"]
        title = item["snippet"]["title"]
        titles[vid] = title
    return titles

async def pick_normal_video(session, video_ids):
    tasks = [check_if_short_or_redirect(session, vid) for vid in video_ids[:5]]
    results = await asyncio.gather(*tasks)
    for result, redirect in results:
        if result == "normal" and redirect:
            return redirect
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
    archived_items.sort(key=lambda x: x[1] or "", reverse=True)
    if archived_items:
        return archived_items[0][0]
    return None

async def collect_general_one(session, handle):
    if "/streams" in handle:
        clean = handle.replace("/streams", "")
        channel_id, uploads = await get_channel_id(session, clean)
        if not uploads:
            return None
        video_ids = await get_recent_video_ids(session, uploads)
        if not video_ids:
            return None
        return await pick_stream_video(session, video_ids)
    else:
        channel_id, uploads = await get_channel_id(session, handle)
        if not uploads:
            return None
        video_ids = await get_recent_video_ids(session, uploads)
        if not video_ids:
            return None
        return await pick_normal_video(session, video_ids)

async def collect_trailers_one(session, handle):
    channel_id, uploads = await get_channel_id(session, handle)
    if not uploads:
        return None
    video_ids = await get_recent_video_ids(session, uploads)
    if not video_ids:
        return None
    tasks = [check_if_short_or_redirect(session, vid) for vid in video_ids[:5]]
    results = await asyncio.gather(*tasks)
    for kind, redirect_id in results:
        if kind == "normal" and redirect_id:
            return redirect_id
    return None

async def main():
    general_handles = load_channel_handles(general_source_file)
    trailer_handles = load_channel_handles(trailer_source_file)
    async with aiohttp.ClientSession() as session:
        general_tasks = [collect_general_one(session, h) for h in general_handles]
        trailer_tasks = [collect_trailers_one(session, h) for h in trailer_handles]

        general_results = [r for r in await asyncio.gather(*general_tasks) if r]
        trailer_results = [r for r in await asyncio.gather(*trailer_tasks) if r]

        general_titles = await fetch_video_titles(session, general_results)
        trailer_titles = await fetch_video_titles(session, trailer_results)

    random.shuffle(general_results)
    random.shuffle(trailer_results)

    with open(general_output_file, "w") as file:
        for video_id in general_results:
            title = general_titles.get(video_id, "")
            file.write(f"{video_id} {title}\n")

    with open(trailer_output_file, "w") as file:
        for video_id in trailer_results:
            title = trailer_titles.get(video_id, "")
            file.write(f"{video_id} {title}\n")

if __name__ == "__main__":
    asyncio.run(main())

