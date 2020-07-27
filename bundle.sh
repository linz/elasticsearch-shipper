#!/bin/bash
npx ncc build build/shipper/index.js -e aws-sdk

GIT_SHA=$(git rev-parse HEAD)
GIT_VERSION=$(git describe --tags --always --match 'v*')

sed -i "s/process.env.GIT_HASH/'$GIT_SHA'/" dist/index.js
sed -i "s/process.env.GIT_VERSION/'$GIT_VERSION'/" dist/index.js