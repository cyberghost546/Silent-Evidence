# Anime Nexus — Mobile App Guide (Capacitor)

## What Was Set Up
- Capacitor installed and configured
- Android project generated in `/android` folder
- App ID: com.animeverse.app
- App Name: Anime Nexus

---

## Step 1 — Find Your Computer's Local IP

1. Open CMD (Windows key → type "cmd")
2. Type: `ipconfig`
3. Look for "IPv4 Address" — e.g. `192.168.1.5`
4. Open `capacitor.config.ts` and update:
   ```
   url: 'http://192.168.1.210:3000'
   ```

---

## Step 2 — Install Android Studio

Download from: https://developer.android.com/studio
(Free — takes about 10 minutes to install)

---

## Step 3 — Open the Android Project

Run this command in your project folder:
```
npx cap open android
```

This opens Android Studio with your app ready to build.

---

## Step 4 — Run on Your Phone (Testing)

1. Enable Developer Mode on your Android phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → Developer Options → Enable USB Debugging

2. Plug your phone into your computer via USB

3. In Android Studio — click the green ▶ Play button
   - Select your phone from the dropdown
   - The app will install and open on your phone!

4. Make sure your dev server is running: `npm run dev`

---

## Step 5 — Build a Release APK (to share with friends)

In Android Studio:
1. Build → Generate Signed Bundle/APK
2. Choose APK
3. Create a keystore (save the password somewhere safe!)
4. Build Release
5. The APK file will be in `android/app/release/`
6. Send this APK file to anyone to install on their Android phone

---

## Step 6 — Publish to Google Play Store

1. Go to https://play.google.com/console
2. Pay the one-time $25 registration fee
3. Create a new app
4. Upload the APK/AAB file
5. Fill in description, screenshots, etc.
6. Submit for review (takes 1-3 days)

---

## Going Live (Production)

When your site is deployed to a real domain:
1. Open `capacitor.config.ts`
2. Change the server url to your real website:
   ```ts
   url: 'https://your-website.com',
   ```
3. Run: `npx cap sync android`
4. Rebuild in Android Studio

---

## Useful Commands

| Command | What it does |
|---------|-------------|
| `npx cap sync android` | Syncs latest config changes to Android |
| `npx cap open android` | Opens Android Studio |
| `npx cap run android` | Runs on connected phone |
| `npx cap copy android` | Copies web assets to Android |
