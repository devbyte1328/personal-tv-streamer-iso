import configparser
import os
import shutil
import pwd
import sys
import subprocess
import time

TARGET_USER = "tv-streamer"
USERCHROME_SRC = "userChrome.css"

def run_librewolf_once(username, home):
    env = os.environ.copy()
    env["HOME"] = home
    env["USER"] = username
    env["LOGNAME"] = username
    p = subprocess.Popen(
        ["sudo", "-u", username, "librewolf", "--headless"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(5)
    p.terminate()
    try:
        p.wait(timeout=5)
    except subprocess.TimeoutExpired:
        p.kill()
        p.wait()

def main():
    try:
        pw = pwd.getpwnam(TARGET_USER)
    except KeyError:
        sys.exit(1)

    home = pw.pw_dir
    librewolf_dir = os.path.join(home, ".librewolf")
    profiles_ini = os.path.join(librewolf_dir, "profiles.ini")

    if not os.path.isfile(profiles_ini):
        run_librewolf_once(TARGET_USER, home)

    if not os.path.isfile(profiles_ini):
        sys.exit(1)

    if not os.path.isfile(USERCHROME_SRC):
        sys.exit(1)

    config = configparser.ConfigParser()
    config.read(profiles_ini)

    profile_path = None
    for section in config.sections():
        path = config.get(section, "Path", fallback="")
        if path.endswith(".default-default"):
            profile_path = path
            break

    if not profile_path:
        sys.exit(1)

    profile_dir = os.path.join(librewolf_dir, profile_path)
    chrome_dir = os.path.join(profile_dir, "chrome")
    os.makedirs(chrome_dir, exist_ok=True)

    dest = os.path.join(chrome_dir, "userChrome.css")
    shutil.copy2(USERCHROME_SRC, dest)

    os.chown(chrome_dir, pw.pw_uid, pw.pw_gid)
    os.chown(dest, pw.pw_uid, pw.pw_gid)

if __name__ == "__main__":
    main()

