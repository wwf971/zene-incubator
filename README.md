# zene-incubator

Zene helps people join music groups and organize music events. This repository is the incubator of its design: a [react-doc](https://github.com/wwf971/react-doc) package that keeps a music community as data items of one frontend object, states in one catalog what each person may do and what it changes, and draws the app on a simulated phone over that data.

- **The page**: https://wwf971.github.io/zene-incubator/ (the static build, branch `gh-pages`). The app works there; what you do is kept in your browser.
- **Start reading**: [doc/README.md](doc/README.md), then [doc/zene-core.md](doc/zene-core.md).

## Run it

It is a react-doc package served as a doc page, with react-doc checked out beside this repository:

```sh
node ../../react-doc/main/frontend/cli/doc-cli.js dev . --port 45200
npm test    # the semantic model
sh script-build/pages-deploy.sh    # build the static page and publish it on the branch gh-pages
```
