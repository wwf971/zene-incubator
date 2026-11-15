#!/bin/sh
# Builds the static page of this doc page and publishes it on the branch gh-pages, which GitHub Pages
# serves (https://wwf971.github.io/zene-incubator/). The branch is a git worktree beside this folder,
# ../gh-pages; the build goes to ../dist first (react-doc builds outside the doc page).
#
#   sh script-build/pages-deploy.sh          react-doc is found beside this repository, or at REACT_DOC_DIR
set -e
here=$(cd "$(dirname "$0")/.." && pwd)
react_doc=${REACT_DOC_DIR:-$(cd "$here/../../react-doc" && pwd)}
out="$here/../dist"
site="$here/../gh-pages"

node "$react_doc/main/frontend/cli/doc-cli.js" build "$here" --out "$out" --force

# the worktree of the branch gh-pages: the branch of the remote when it exists, else a new branch
# without history (made inside a detached worktree, which git of every version can do)
if [ ! -e "$site/.git" ]; then
	if git -C "$here" fetch -q origin gh-pages 2>/dev/null; then
		git -C "$here" worktree add -B gh-pages "$site" origin/gh-pages
	else
		git -C "$here" worktree add --detach "$site"
		git -C "$site" checkout -q --orphan gh-pages
		git -C "$site" rm -rq --cached . 2>/dev/null || true
	fi
fi

# the files of the build, nothing else; .nojekyll: every file served as it is
find "$site" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$out"/. "$site"/
touch "$site/.nojekyll"
git -C "$site" add -A
if git -C "$site" diff --cached --quiet 2>/dev/null && git -C "$site" rev-parse -q --verify HEAD >/dev/null; then
	echo "the page did not change"
else
	git -C "$site" commit -q -m "build the static page from $(git -C "$here" rev-parse --short HEAD)"
fi
# a build is tens of MB in hundreds of files: over https git needs a larger buffer to send it at once
git -C "$site" config http.postBuffer 524288000
git -C "$site" push -u origin gh-pages
