import configparser
import os
import shutil
import pwd
import sys

TARGET_USER = "tv-streamer"
USERCHROME_SRC = "userChrome.css"

def main():
    try:
        pw = pwd.getpwnam(TARGET_USER)
    except KeyError:
        print(f"User '{TARGET_USER}' does not exist")
        sys.exit(1)

    home = pw.pw_dir
    librewolf_dir = os.path.join(home, ".librewolf")
    profiles_ini = os.path.join(librewolf_dir, "profiles.ini")

    if not os.path.isfile(profiles_ini):
        print("Librewolf profile not initialized (profiles.ini missing)")
        sys.exit(1)

    if not os.path.isfile(USERCHROME_SRC):
        print("userChrome.css not found in working directory")
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
        print("No *.default-default profile found")
        sys.exit(1)

    profile_dir = os.path.join(librewolf_dir, profile_path)
    chrome_dir = os.path.join(profile_dir, "chrome")

    os.makedirs(chrome_dir, exist_ok=True)

    dest = os.path.join(chrome_dir, "userChrome.css")
    shutil.copy2(USERCHROME_SRC, dest)

    # Ensure ownership is correct ONLY for the file we touched
    os.chown(dest, pw.pw_uid, pw.pw_gid)
    os.chown(chrome_dir, pw.pw_uid, pw.pw_gid)

    print(f"userChrome.css installed for {TARGET_USER}")

if __name__ == "__main__":
    main()

