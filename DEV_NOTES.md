# TubeLoad — Developer Cheat Sheet

A reference for the terminal commands used most often on this project. Copy and paste line by line.

---

## Daily development

```
npx expo start
```
Start Metro dev server. Press `i` for iOS sim, `r` to reload, `Ctrl+C` to stop.

```
npx expo start --localhost
```
Same but forces `localhost` instead of LAN IP — use when a network-related "fetch failed" appears.

```
npx expo start --clear
```
Same plus wipes Metro cache — when weird hot-reload glitches happen.

```
npx tsc --noEmit
```
Type-check the whole project without building. Catches errors before EAS does.

---

## Running on the iOS simulator

```
open -a Simulator
```
Open the Simulator app manually (sometimes Expo can't auto-launch it).

```
xcrun simctl list devices available
```
List all installed simulator devices.

```
xcrun simctl list devices booted
```
Show which simulators are currently running.

```
xcrun simctl boot "iPhone 17 Pro"
```
Boot a specific simulator. Replace with any device name from the list.

```
xcrun simctl shutdown <UUID>
xcrun simctl erase <UUID>
```
Wipe a simulator clean when it's in a corrupted state. UUID comes from the `list` commands above.

```
npx expo run:ios --device "iPhone 17 Pro"
npx expo run:ios --device "iPad Pro 13-inch (M5)"
```
Build a native iOS app and install on a specific simulator. Use when you need a real native build (e.g. testing native config changes).

---

## Native rebuild (when `app.json` plugin config changes)

```
npx expo prebuild --clean --platform ios
```
Regenerate the `ios/` folder from scratch based on current `app.json`. Run when you change icons, splash, or plugins.

---

## Git

```
git status
```
What's changed in the working tree.

```
git add <file>
git commit -m "your message"
git push
```
Stage, commit, push. For staging everything use `git add .` carefully — avoid for `ios/`.

```
git checkout master
git checkout -b feature/my-thing
```
Switch to master / create a new branch from current state.

---

## EAS — TestFlight pipeline

```
eas --version
```
Confirm EAS CLI is installed.

```
eas build --platform ios --profile production
```
Cloud build of the .ipa (~15–25 min). Bump `buildNumber` in `app.json` before each new build.

```
eas submit --platform ios --latest
```
Upload the most recent EAS build to App Store Connect (~5 min + ~15 min Apple processing).

---

## npm installs

```
npm install <pkg> --legacy-peer-deps
```
Install a regular package. The `--legacy-peer-deps` flag is required in this project (now also baked into `.npmrc`).

```
npx expo install <pkg>
```
Install an Expo-managed package — uses the version compatible with your Expo SDK. Use this for `expo-*` and React Native packages.

---

## Troubleshooting

```
lsof -nP -iTCP:8081 -sTCP:LISTEN
```
See what's using port 8081 (Metro's port) — useful when "fetch failed" hits.

```
pgrep -fl "expo|metro"
```
List all running Expo/Metro processes — to kill orphan dev servers.

```
kill <PID>
```
Stop a specific process. PID comes from the commands above.

---

## System (rare, one-time)

```
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```
Point dev tools at the full Xcode app (not the limited Command Line Tools).

```
sudo xcodebuild -license accept
```
Accept Xcode license — required once before iOS builds work.
