#!/bin/bash

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root or with sudo."
  exit 1
fi

echo "Removing sudo password for 'streamer-tv'"
echo "streamer-tv ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/90-nopasswd-streamer-tv
chmod 440 /etc/sudoers.d/90-nopasswd-streamer-tv
visudo -c > /dev/null

echo "Updating package index and packages, this takes a moment..."
sudo pacman -Syu --noconfirm >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent

echo "Installing Yay AUR helper, this takes a moment..."
pacman -S --needed --noconfirm base-devel git >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
sudo -u streamer-tv bash -c 'git clone https://aur.archlinux.org/yay.git /tmp/yay >/dev/null 2>&1' # ">/dev/null 2>&1" to make it silent
sudo -u streamer-tv bash -c 'cd /tmp/yay && makepkg -si --noconfirm >/dev/null 2>&1' # ">/dev/null 2>&1" to make it silent
sudo rm -rf /tmp/yay

echo "Installing packages, this takes a moment..."
sudo -u streamer-tv bash -c "yay -S --noconfirm --needed curl ffmpeg python python-pip gedit librewolf-bin >/dev/null 2>&1" # ">/dev/null 2>&1" to make it silent, "grep -v '^\s*#'" to ignore the comments

echo "Removing Manjaro Cinnamon packages that are not needed, this takes a moment..."
sudo pacman -R --noconfirm webapp-manager vivaldi timeshift thunderbird xed gnome-screenshot system-config-printer pix onboard mpv micro manjaro-hello manjaro-application-utility galculator bulky gparted lollypop xviewer-plugins xviewer yelp dconf-editor celluloid gimp gcolor3 pamac-gtk pamac-cli libpamac libpamac-flatpak-plugin

echo "Configuring Librewolf policies"
sudo cp policies.json /usr/lib/librewolf/distribution/policies.json

echo "Remapping keys for airmouse"
sudo cp Xmodmap ~/.Xmodmap
sudo xmodmap ~/.Xmodmap
