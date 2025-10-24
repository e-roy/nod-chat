#!/bin/bash

# Script to start multiple Android emulators for chat testing
# Usage: ./scripts/start-emulators.sh [number_of_emulators]

EMULATOR_PATH="$HOME/Library/Android/sdk/emulator/emulator"
NUMBER_OF_EMULATORS=${1:-2}

echo "Starting $NUMBER_OF_EMULATORS Android emulators for chat testing..."

# List available AVDs
echo "Available AVDs:"
$EMULATOR_PATH -list-avds

echo ""
echo "Starting emulators..."

# Start the first emulator (your existing one)
$EMULATOR_PATH -avd Medium_Phone_API_36.1 -port 5554 &
echo "Started emulator 1 on port 5554"

# If you have more AVDs, start them on different ports
# You'll need to create additional AVDs first using Android Studio
# For now, we'll just start the one you have

echo ""
echo "Emulators started! You can now:"
echo "1. Install your app on each emulator"
echo "2. Test chat functionality between devices"
echo ""
echo "To stop emulators, run: ./scripts/stop-emulators.sh"