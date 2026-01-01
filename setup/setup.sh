#!/bin/bash

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root or with sudo."
  exit 1
fi

echo "Removing sudo password for 'tv-streamer'"
echo "tv-streamer ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/90-nopasswd-tv-streamer
chmod 440 /etc/sudoers.d/90-nopasswd-tv-streamer
visudo -c > /dev/null # ">/dev/null" to make it silent

echo "Resolve errors caused by upstream (discovered on 1/1/2026)"
yes | sudo pacman -Sy archlinux-keyring manjaro-keyring >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
yes | sudo pacman-key --init >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
yes | sudo pacman-key --populate archlinux manjaro >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
yes | sudo pacman -Scc >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
sudo pacman -Rdd --noconfirm cinnamon caribou >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent

echo "Updating package index and packages, this takes a moment..."
sudo pacman -Syu --noconfirm >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent

echo "Installing Yay AUR helper, this takes a moment..."
pacman -S --needed --noconfirm base-devel git >/dev/null 2>&1 # ">/dev/null 2>&1" to make it silent
sudo -u tv-streamer bash -c 'git clone https://aur.archlinux.org/yay.git /tmp/yay >/dev/null 2>&1' # ">/dev/null 2>&1" to make it silent
sudo -u tv-streamer bash -c 'cd /tmp/yay && makepkg -si --noconfirm >/dev/null 2>&1' # ">/dev/null 2>&1" to make it silent
sudo rm -rf /tmp/yay # ">/dev/null 2>&1" to make it silent

echo "Installing packages, this takes a moment..."
sudo -u tv-streamer bash -c "yay -S --noconfirm --needed curl ffmpeg python python-pip gedit librewolf-bin >/dev/null 2>&1" # ">/dev/null 2>&1" to make it silent, "grep -v '^\s*#'" to ignore the comments

echo "Removing Manjaro Cinnamon packages that are not needed, this takes a moment..."
sudo pacman -R --noconfirm webapp-manager vivaldi timeshift thunderbird xed gnome-screenshot system-config-printer pix onboard mpv micro manjaro-hello manjaro-application-utility galculator bulky gparted lollypop xviewer-plugins xviewer yelp dconf-editor celluloid gimp gcolor3 pamac-gtk pamac-cli libpamac libpamac-flatpak-plugin # ">/dev/null 2>&1" to make it silent

echo "Configuring Librewolf policies"
sudo cp policies.json /usr/lib/librewolf/distribution/policies.json

echo "Remapping keys for airmouse"
sudo cp Xmodmap ~/.Xmodmap
sudo xmodmap ~/.Xmodmap
