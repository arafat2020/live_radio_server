# basic radio.liq for Icecast
set("log.file", false)
set("log.stdout", true)

# Configure Harbor to listen on all interfaces
set("harbor.bind_addr", "0.0.0.0")

# --- Authentication Mechanism ---
# This is a custom authentication function for the Live DJ.
# Currently, it uses a hardcoded password.
# To extend this to use your NestJS API later, you can replace this
# with a function that makes an HTTP GET request (using http.get).
def dj_auth(user, password) =
  if password == "dj-password" then
    true
  else
    false
  end
end

# --- AutoDJ Playlist ---
# Load the playlist from the shared volume
radio = playlist(
  "/playlists/radio.m3u",
  mode="normal",
  reload_mode="watch"
)
radio = crossfade(radio)

# --- Live DJ Input ---
# Listen on port 8005 for incoming streams on the mountpoint /live-dj
live_dj = input.harbor(
  "live-dj",
  port=8005,
  auth=dj_auth
)

# --- Stream Routing ---
# If the live_dj stream connects, switch to it immediately.
# When live_dj disconnects, fallback to the AutoDJ radio.
# track_sensitive=false means the switch happens instantly without waiting for the current track to finish.
radio = fallback(track_sensitive=false, [live_dj, radio])

# Make the final combined source safe (infallible) so icecast doesn't complain
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
