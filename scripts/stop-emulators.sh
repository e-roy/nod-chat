#!/bin/bash

# Script to stop all Android emulators
echo "Stopping all Android emulators..."

# Kill all emulator processes
pkill -f emulator

echo "All emulators stopped!"