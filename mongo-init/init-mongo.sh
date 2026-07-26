#!/bin/bash
# Runs once, automatically, the first time the mongodb container initializes
# an empty data directory (see docker-entrypoint-initdb.d in the mongo image).
# Creates a least-privilege application user scoped to the easyshop database,
# instead of having the app connect as the admin/root user.
set -euo pipefail

mongosh <<EOF
use easyshop
db.createUser({
  user: "${MONGO_APP_USERNAME}",
  pwd: "${MONGO_APP_PASSWORD}",
  roles: [{ role: "readWrite", db: "easyshop" }]
})
EOF
