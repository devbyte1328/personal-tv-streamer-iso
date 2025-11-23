import subprocess
import json
import requests
import asyncio
import aiohttp


API_KEY = os.getenv("YT_DATA_API_KEY")
if not API_KEY:
    raise RuntimeError("YT_DATA_API_KEY is not set in your environment!")

URL_CHANNEL_HANDLE = "NatGeo"

cmd = ["curl", "-s", f"https://www.googleapis.com/youtube/v3/channels?part=id&forHandle={URL_CHANNEL_HANDLE}&key={API_KEY}"]

data = json.loads(subprocess.check_output(cmd).decode())

CHANNEL_ID = data["items"][0]["id"]

cmd = ["curl", "-s", f"https://www.googleapis.com/youtube/v3/search?part=snippet&order=date&maxResults=4&type=video&channelId={CHANNEL_ID}&key={API_KEY}"]

data = json.loads(subprocess.check_output(cmd).decode())

video_ids = []

for item in data["items"]:
    video_id = item["id"]["videoId"]
    video_ids.append(video_id)

print(video_ids)

# Step 3: Check shorts vs normal videos
normal_videos = []
shorts = []

async def check_video(session, vid):
    shorts_url = f"https://www.youtube.com/shorts/{vid}"

    # KEEP: Do NOT follow redirects
    async with session.get(shorts_url, allow_redirects=False) as resp:
        if 300 <= resp.status < 400 and "Location" in resp.headers:
            redirect_url = resp.headers["Location"]
            return ("normal", redirect_url)
        else:
            return ("short", shorts_url)

async def main(video_ids):
    async with aiohttp.ClientSession() as session:
        tasks = [check_video(session, vid) for vid in video_ids]
        results = await asyncio.gather(*tasks)

        for kind, url in results:
            if kind == "normal":
                normal_videos.append(url)
            else:
                shorts.append(url)

# Run async classification
asyncio.run(main(video_ids))

# Output results
print("\nNormal videos:")
for url in normal_videos:
    print(url)

print("\nShorts:")
for url in shorts:
    print(url)
