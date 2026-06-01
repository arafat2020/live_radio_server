# basic radio.liq for Icecast
set("log.file", false)
set("log.stdout", true)

# Load the playlist from the shared volume
# mode="normal" means it will play the tracks sequentially.
# reload_mode="watch" makes liquidsoap reload the playlist when the file changes.
radio = playlist(
  "/playlists/radio.m3u",
  mode="normal",
  reload_mode="watch"
)

# Crossfade between tracks
radio = crossfade(radio)

# Make the source safe (infallible) so icecast doesn't complain
radio = mksafe(radio)

# Output to icecast
output.icecast(
  %mp3(bitrate=128),
  host="icecast",
  port=8000,
  password="hackme",
  mount="/live.mp3",
  radio
)
