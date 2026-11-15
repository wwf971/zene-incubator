---
title: The app on Android
description: The app of this doc page built into an Android app with Capacitor, from the same React components, with the example community built in.
---

The app this package draws on a simulated phone ([The app](zene-demo.md)) is a React component, drawn with the DOM and CSS. [Capacitor](https://capacitorjs.com) runs a web app inside the web view of a native app, so the same components become an Android app as they are: the folder `mobile-capacitor/` beside this package (in the repository, `main/mobile-capacitor/`) builds them with vite and wraps them into an apk. React Native and Flutter could not take them so: React Native draws native views, without a DOM or CSS, so every screen would be written again with its `View` and `Text`; Flutter is Dart.

On the device the app is the phone alone: no document around it, no session beside it, no drawn frame. The screen of the device is the phone's screen.

<!--renderComp=DiagramText-->
```text
doc-page/  (this package)          mobile-capacitor/
comp-mdx/app/ model/ backend/ ───▶ src/ZeneDevice.jsx      ZeneApp, imported
                                                           as it is
comp-mdx/Zene.css             ───▶ src/device.css          the phone as the
                                                           screen
@wwf971/react-doc (4 names)   ───▶ src/react-doc-host.jsx  stand-ins
doc/zene-demo.md: the block   ───▶ virtual:zene-community  read when the
.doc-page/object-frontend/    ───▶   (a vite plugin)       app is built
                                        │ vite build
                                        ▼
                                   dist/  one page, 750 kB of js
                                        │ cap sync android
                                        ▼
                                   android/  the Capacitor project
                                        │ gradle assembleDebug
                                        ▼
                                   build-apk/zene-0.1.0-debug.apk
```

## What is the same, what differs

| | the doc page | the app on Android |
| --- | --- | --- |
| the components | `comp-mdx/app/` | the same files, imported from `../doc-page` |
| the data | the object read through react-doc: from the files on the development server, from the static build | the partition `example` read when the app is built, built into it |
| the param | the block in [The app](zene-demo.md) | the same block, read when the app is built: `signIn`, `time` |
| what a person does | the session in the browser; **Write into the partition** in edit mode | the session in the app's storage; nothing is written back |
| the phone | a frame, an island, a drawn status bar and home bar | the device's screen and system bars |
| who holds the phone | a face in the session, or Me → sign out → **Sign in as** | Me → sign out → **Sign in as** |
| a homepage | MDX, rendered by react-doc | Markdown with tables; a component written in a homepage is not drawn |
| going back | a swipe to the right | the swipe, and the back button of Android |

The back button goes as the app's own gestures do: what is open over the screens closes first (a sheet, a menu), then a pushed screen goes back, then a tab goes to Home; on Home it leaves the app.

## The files

<!--renderComp=DiagramText-->
```text
package.json             vite, React, mobx, lucide-react, react-markdown,
                         Capacitor 8: core, android, app (the back button), cli
vite.config.js           @doc-page → ../doc-page; @wwf971/react-doc → the
                         stand-ins; one copy of react, mobx … (dedupe)
index.html               viewport-fit=cover: the page reaches under the bars
src/main.jsx             the font, the base styles, Zene.css, device.css
src/ZeneDevice.jsx       ZeneApp with the block's param; the back button
src/react-doc-host.jsx   BlockPopupSurface, useCompStateStore,
                         timeTextDisplay, MdxRenderer
src/zene-object-static.js  the object's api over the data built in
src/device-base.css      what the doc page gives first: Tailwind's
                         preflight, the font Geist
src/device.css           the phone as the screen, the safe area
script-build/            the vite plugin of the data; apk-build.sh
capacitor.config.json    id io.github.wwf971.zene, name Zene, system bars
android/                 the Android project (cap add android), adapted
```

### The components where they are

The app never copies a file of the doc page: `vite.config.js` names the package `@doc-page`, and `src/ZeneDevice.jsx` imports `@doc-page/comp-mdx/app/ZeneApp.jsx`. A change to a screen of the doc page is in the next build of the app, and in `npm run dev` at once.

- **One copy of each library.** The doc page's files lie outside `mobile-capacitor/`, so a bare import in them (`react`, `mobx`) is looked up from `doc-page/` upwards, where the app's `node_modules` is not. In this workspace it would find the workspace's own and load React twice; elsewhere nothing. `resolve.dedupe` takes `react`, `react-dom`, `mobx`, `mobx-react-lite` and `lucide-react` from the app's folder.
- **The stand-ins of react-doc.** The app's components import four names from `@wwf971/react-doc`; `src/react-doc-host.jsx` answers them without a document around: `BlockPopupSurface` draws its children in place (never in a popup), `useCompStateStore` keeps one store per name for the run (the back button reads the app's store there), `timeTextDisplay` is react-doc's, and `MdxRenderer` renders Markdown with GFM tables. A link of a homepage to another site opens in the phone's browser; one to a document stays text. When a component starts importing another name, the build fails with "is not exported": the moment to add its stand-in.

### The data built in

`script-build/vite-plugin-zene-community.js` makes the module `virtual:zene-community` when the app is built:

1. the first `ObjectFrontend` block of mode `app` in `doc/zene-demo.md`: the object (`frontend:w64o374jrp5`) and the param;
2. the object's folder in `.doc-page/object-frontend/`: its name from the entry item;
3. the item lists of the partition shown (`item/example/`): each asset with its kind, name and path, and the content of its item's head version, data for YAML, text for a homepage.

`src/zene-object-static.js` answers the calls of the app's backend (`ZeneBackendLocal`: `assetList`, `assetDataGet`, `assetTextGet`) from it. The backend and everything above it are unchanged: the world, the actions, the session.

- **Only the partition shown.** The playground partition (ignored by git) never goes into the app.
- **The checkout as it is.** An item changed and not committed goes into the app. The static page is built from `git archive HEAD` instead (`script-build/pages-deploy.sh`); to give someone an apk, build it from a clean checkout.
- **The moment kept.** `time: 20261115_12000000+09` of the block is kept, so the example's coming events are still coming; the clock of the app starts there when the app starts.

### The phone as the screen

`src/device.css` takes the frame, the island, the drawn status bar and the home bar away and lets the screen fill the window. The room of the system bars comes from the safe area:

- Capacitor 8 draws Android apps edge to edge. Its `SystemBars` plugin (`insetsHandling: css`, the default) sets `--safe-area-inset-*` on the page: with a web view of Chromium 140 or later and `viewport-fit=cover`, the page lies under the bars and the variables tell their size; with an older web view, Capacitor keeps the web view clear of the bars and the variables are 0, and what shows behind the bars is the window's background: cream under the status bar, white under the bar of five buttons (`drawable/zene_window_background.xml`).
- The screen takes the top inset; the bar of five buttons takes the bottom one (its 22 px for the drawn home bar are gone), and so do the sheets and the toast.
- `style: LIGHT`: dark icons in the bars, on the app's light background.

### The Android project

`android/` was made by `npx cap add android` and is kept in git, as Capacitor means it to be: it is the source of the native app, adapted here.

- `versionName` 0.1.0, the version of `package.json`; the app stays in portrait.
- The icon is the note of the app's header (the icon `note` of `ZeneIcon.jsx`) on the coral of the app: a vector drawing for Android 8 and later (`drawable/ic_zene_foreground.xml`, also the monochrome of themed icons), and PNGs rendered from the same drawing for Android 7. The launch shows the same note on cream. Capacitor's logo, the template's icon and splash, is gone.

## Building the apk

What it takes: Node, a **JDK 21** (Capacitor 8 compiles for Java 21) and the **Android SDK** with the platform 36. Android Studio is not needed. On this Mac: Homebrew's `openjdk@21`, and the SDK in `~/Library/Android/sdk` from Google's command-line tools:

```sh
brew install openjdk@21
# the command-line tools of developer.android.com/studio, unpacked into
# ~/Library/Android/sdk/cmdline-tools/latest, then:
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

Then, in `mobile-capacitor/`:

```sh
npm install
npm run apk      # vite build, cap sync android, gradle assembleDebug
```

The apk is `build-apk/zene-0.1.0-debug.apk` (4 MB). The script takes `JAVA_HOME` only when it is a JDK 21, else it looks where macOS, Homebrew and Android Studio keep one (this Mac's shell sets `JAVA_HOME` to a JDK 17); `ANDROID_HOME` defaults to `~/Library/Android/sdk`.

### On a phone

- **Without a cable**: copy the apk to the phone (a cloud drive, a message to yourself), open it, and let that app install unknown apps when Android asks. Play Protect may warn about an app it does not know.
- **With a cable** (USB debugging on): `adb install -r build-apk/zene-0.1.0-debug.apk`; `adb` is in `~/Library/Android/sdk/platform-tools`.
- **A debug apk** is signed with this Mac's debug key (`~/.android/debug.keystore`). An apk built on another machine has another key, and Android refuses it as an update: uninstall the app first.
- **Starting again**: Settings → Apps → Zene → Storage → Clear storage forgets the session and who signed in.

### Without a phone

- `npm run dev` shows the app in a browser at `http://localhost:45210`, best in the device mode of the browser's developer tools. A change to the doc page's components reloads it.
- An emulator: `sdkmanager "emulator" "system-images;android-36;google_apis;arm64-v8a"`, `avdmanager create avd -n zene-test -k "system-images;android-36;google_apis;arm64-v8a" -d pixel_7`, `emulator -avd zene-test`, then `adb install` as above. Its web view is Chromium 133, so it shows the older of the two ways above; a phone with a web view updated from the Play Store shows the page under the bars.

## What git keeps

| | |
| --- | --- |
| kept | `package.json`, `package-lock.json`, `index.html`, `vite.config.js`, `capacitor.config.json`, `src/`, `script-build/`, `android/` (its sources, resources, gradle files and wrapper) |
| ignored by `mobile-capacitor/.gitignore` | `node_modules/`, `dist/` (the web build), `build-apk/` and any `.apk` or `.aab` |
| ignored by `android/.gitignore` | `build/`, `.gradle/`, `local.properties` (the SDK's place on this machine), `app/src/main/assets/public` (the copy of `dist/` that `cap sync` makes), the copied `capacitor.config.json` and `capacitor.plugins.json`, `capacitor-cordova-android-plugins/` |

The static page is built by `script-build/pages-deploy.sh` of this package from the folder `doc-page/` alone, so nothing of `mobile-capacitor/` goes into it.

## Later

- **A release apk**: a keystore of the app's own (never in git), a `signingConfig` in `android/app/build.gradle`, `assembleRelease`; `bundleRelease` for an `.aab` for Google Play.
- **iOS**: `npx cap add ios` with Xcode, from the same web build.
- **A server**: once the actions run on a server ([Where the actions run](zene-action.md#where-the-actions-run)), the app's backend asks it instead of keeping a session, and the data is read from it instead of built in.
- **Homepages in MDX**: compiling MDX in the app, with the components a homepage may write.
