#!/bin/bash

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root or with sudo."
  exit 1
fi

set -e

echo "Removing sudo password for 'tv-streamer'"
echo "tv-streamer ALL=(ALL) NOPASSWD: ALL" | tee /etc/sudoers.d/90-nopasswd-tv-streamer
chmod 440 /etc/sudoers.d/90-nopasswd-tv-streamer
visudo -c > /dev/null

echo "Resolve errors caused by upstream (discovered on 1/1/2026)"
yes | pacman -Sy archlinux-keyring manjaro-keyring >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
pacman-key --init >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
pacman-key --populate archlinux manjaro >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
yes | pacman -Scc >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
pacman -Rdd --noconfirm cinnamon caribou >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent

echo "Updating package index and packages, this takes a moment..."
pacman -Syu --noconfirm >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent

echo "Installing Yay AUR helper, this takes a moment..."
pacman -S --needed --noconfirm base-devel git >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
rm -rf /tmp/yay
sudo -u tv-streamer bash -c 'git clone https://aur.archlinux.org/yay.git /tmp/yay >/dev/null 2>&1' # ">/dev/null 2>&1" to make it silent
sudo -u tv-streamer bash -c 'cd /tmp/yay && makepkg -si --noconfirm >/dev/null 2>&1' # ">/dev/null 2>&1" to make it silent
rm -rf /tmp/yay # ">/dev/null 2>&1" to make it silent

echo "Installing packages, this takes a moment..."
sudo -u tv-streamer bash -c "yay -S --noconfirm --needed curl ffmpeg mpg123 python python-pip tk gedit librewolf-bin >/dev/null 2>&1" # ">/dev/null 2>&1" to make it silent, "grep -v '^\s*#'" to ignore the comments

echo "Removing Manjaro Cinnamon packages that are not needed, this takes a moment..."
pacman -R --noconfirm webapp-manager vivaldi timeshift thunderbird xed gnome-screenshot system-config-printer pix onboard mpv micro manjaro-hello manjaro-application-utility galculator bulky gparted lollypop xviewer-plugins xviewer yelp dconf-editor celluloid gimp gcolor3 pamac-gtk pamac-cli libpamac libpamac-flatpak-plugin >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent

echo "Configuring Librewolf policies"
cp policies.json /usr/lib/librewolf/distribution/policies.json

echo "Configuring Librewolf loading status"
# Remove default grey colored new URL display at bottom left
mkdir -p /home/tv-streamer/.librewolf
for ProfileDirectory in /home/tv-streamer/.librewolf/*.default-default; do
  mkdir -p "$ProfileDirectory/chrome"
  cp userChrome.css "$ProfileDirectory/chrome/"
done
chown -R tv-streamer:tv-streamer /home/tv-streamer/.librewolf
# Add loading screen connector to Python 
rm -f loading-spinner@local.xpi
zip -r loading-spinner@local.xpi manifest.json loading-spinner.js
mkdir -p /usr/lib/librewolf/browser/extensions
cp loading-spinner@local.xpi /usr/lib/librewolf/browser/extensions/loading-spinner@local.xpi

echo "Remapping keys for airmouse"
cp Xmodmap /home/tv-streamer/.Xmodmap
chown tv-streamer:tv-streamer /home/tv-streamer/.Xmodmap
sudo -u tv-streamer xmodmap /home/tv-streamer/.Xmodmap

echo "Setting up Python virtual environment and installing requirements..."
sudo -u tv-streamer bash -c 'cd .. && python -m venv venv >/dev/null 2>&1 && source venv/bin/activate >/dev/null 2>&1 && pip install -r requirements.txt >/dev/null 2>&1' # ">/dev/null 2>&1" to make it silent

echo "Installing and enabling TV Streamer systemd user services..."
loginctl enable-linger tv-streamer
mkdir -p /home/tv-streamer/.config/systemd/user
mkdir -p /home/tv-streamer/.config/systemd/user/default.target.wants
cp /home/tv-streamer/personal-tv-streamer-iso/setup/tv-streamer.service /home/tv-streamer/.config/systemd/user/tv-streamer.service
cp /home/tv-streamer/personal-tv-streamer-iso/setup/librewolf-kiosk.service /home/tv-streamer/.config/systemd/user/librewolf-kiosk.service
chown tv-streamer:tv-streamer /home/tv-streamer/.config/systemd/user/tv-streamer.service
chown tv-streamer:tv-streamer /home/tv-streamer/.config/systemd/user/librewolf-kiosk.service
ln -sf ../tv-streamer.service /home/tv-streamer/.config/systemd/user/default.target.wants/tv-streamer.service
ln -sf ../librewolf-kiosk.service /home/tv-streamer/.config/systemd/user/default.target.wants/librewolf-kiosk.service
chown -R tv-streamer:tv-streamer /home/tv-streamer/.config/systemd
sudo -u tv-streamer XDG_RUNTIME_DIR=/run/user/$(id -u tv-streamer) systemctl --user daemon-reload

echo "Pulling curated content for first time boot"
mkdir -p /home/tv-streamer/personal-tv-streamer-iso/database/pulled
sudo chown -R tv-streamer:tv-streamer /home/tv-streamer/personal-tv-streamer-iso/database/pulled && sudo chmod -R 755 /home/tv-streamer/personal-tv-streamer-iso/database/pulled
sudo YT_DATA_API_KEY="$YT_DATA_API_KEY" -u tv-streamer bash -c 'cd .. && source venv/bin/activate && python apis/youtube-api.py'
