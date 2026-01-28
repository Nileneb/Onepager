#!/bin/sh
set -e

# Ensure data directory exists and has correct permissions (needs root)
mkdir -p /app/data

# Allow passing PUID/PGID: if set on the host we chown to that user
if [ -n "$PUID" ]; then
	# default PGID to PUID if not provided
	PGID=${PGID:-$PUID}
	echo "Setting ownership of /app/data to $PUID:$PGID"
	chown -R $PUID:$PGID /app/data 2>/dev/null || true
else
	chown -R node:node /app/data 2>/dev/null || true
fi

# If su-exec exists and we have a user to switch to, use it
if command -v su-exec >/dev/null 2>&1; then
	exec su-exec node "$@"
else
	exec "$@"
fi
