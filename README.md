# Lecture videos: ink-motion renderer

Renders hand-drawn motion-graphic lecture scenes (deterministic `render(t)` in headless Chromium → ffmpeg).
Scene data and images for each block come from a release asset (`render-<block>`); the `render` workflow
renders shards of scenes in parallel and uploads the clips as artifacts, which are joined into the final video elsewhere.
