# zene-incubator

Zene helps people join music groups and organize music events. This repository is the incubator of its design: a [react-doc](https://github.com/wwf971/react-doc) package that keeps a music community as data items of one frontend object, states in one catalog what each person may do and what it changes, and draws the app on a simulated phone over that data.

- **The page**: https://wwf971.github.io/zene-incubator/ (the static build, branch `gh-pages`). The app works there; what you do is kept in your browser.
- **Start reading**: [doc-page/doc/README.md](doc-page/doc/README.md), then [doc-page/doc/zene-core.md](doc-page/doc/zene-core.md).

| folder | |
| --- | --- |
| [doc-page/](doc-page) | the react-doc package: its documents, the semantic model, the app's components, the example community |
| [mobile-capacitor/](mobile-capacitor) | the same app components built into an Android app with Capacitor: [doc-page/doc/zene-deploy-mobile-capacitor.md](doc-page/doc/zene-deploy-mobile-capacitor.md) |

## Run it

The doc page is a react-doc package served as a doc page, with react-doc checked out beside this repository:

```sh
cd doc-page
node ../../../react-doc/main/frontend/cli/doc-cli.js dev . --port 45200
npm test    # the semantic model
sh script-build/pages-deploy.sh    # build the static page and publish it on the branch gh-pages
```

The Android app (JDK 21 and the Android SDK, see its document):

```sh
cd mobile-capacitor
npm install
npm run dev    # the app alone in a browser, http://localhost:45210
npm run apk    # build-apk/zene-0.1.0-debug.apk
```
