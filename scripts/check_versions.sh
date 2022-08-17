#!/bin/bash

set -e

CURRENT_VERSION=$( jq -r .version package.json )
OPENVSX_VERSION=$( curl -X GET "https://open-vsx.org/api/zokugun/sync-settings" -H "accept: application/json" | jq -r .version )

if [[ "${OPENVSX_VERSION}" != "${CURRENT_VERSION}" ]]; then
	echo "DEPLOY_OPENVSX=yes" >> "${GITHUB_ENV}"
fi
