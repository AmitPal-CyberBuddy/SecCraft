#!/bin/bash
set -e
cd "$(dirname "$(dirname "$(realpath "$0")")")/frontend"
npm run dev
