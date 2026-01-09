import configparser
import os
import pwd
import grp
import shutil
import sys

PROFILES_INI = "/home/tv-streamer/.librewolf/profiles.ini"
LIBREWOLF_DIR = "/home/tv-streamer/.librewolf"
USERCHROME_SRC = "userChrome.css"

def main():
    if not os.path.isfile(PROFILES_INI):
        sys.exit(1)

    if not os.path.isfile(USERCHROME_SRC):
        sys.exit(1)

    config = configparser.ConfigParser()
    config.read(PROFILES_INI)

    profile_id = None

    for section in config.sections():
        path = config.get(section, "Path", fallback=None)
        if path and path.endswith(".default-default"):
            profile_id = path[:-len(".default-default")]
            break

    if not profile_id:
        sys.exit(1)

    chrome_dir = os.path.join(
        LIBREWOLF_DIR,
        profile_id + ".default-default",
        "chrome"
    )

    os.makedirs(chrome_dir, exist_ok=True)

    shutil.copy2(
        USERCHROME_SRC,
        os.path.join(chrome_dir, "userChrome.css")
    )

    uid = pwd.getpwnam("tv-streamer").pw_uid
    gid = grp.getgrnam("tv-streamer").gr_gid

    for root, dirs, files in os.walk(LIBREWOLF_DIR):
        os.chown(root, uid, gid)
        for name in dirs:
            os.chown(os.path.join(root, name), uid, gid)
        for name in files:
            os.chown(os.path.join(root, name), uid, gid)

if __name__ == "__main__":
    main()

