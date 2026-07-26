#!/bin/bash
# Runs once, automatically, the first time the mongodb container initializes
# an empty data directory (see docker-entrypoint-initdb.d in the mongo image).
# Creates a least-privilege application user scoped to the easyshop database,
# instead of having the app connect as the admin/root user.
#
# Credentials are read from process.env inside mongosh itself, not
# interpolated into the script text — a password containing a backtick,
# `$(...)`, or a double quote would otherwise be able to inject shell
# commands (via the heredoc) or break out of a JS string literal (inside
# the createUser call).
set -euo pipefail

mongosh <<'EOF'
const username = process.env.MONGO_APP_USERNAME;
const password = process.env.MONGO_APP_PASSWORD;
db.getSiblingDB('easyshop').createUser({
  user: username,
  pwd: password,
  roles: [{ role: 'readWrite', db: 'easyshop' }]
});

// Separate, even-more-restricted user for mongodb_exporter — clusterMonitor
// is MongoDB's built-in read-only role for exactly this (serverStatus,
// replSetGetStatus, etc.). Reusing the app's readWrite user here would mean
// the exporter can read/write real order and user data, which it has no
// business doing.
const exporterUsername = process.env.MONGO_EXPORTER_USERNAME;
const exporterPassword = process.env.MONGO_EXPORTER_PASSWORD;
db.getSiblingDB('admin').createUser({
  user: exporterUsername,
  pwd: exporterPassword,
  roles: [{ role: 'clusterMonitor', db: 'admin' }],
});
EOF
