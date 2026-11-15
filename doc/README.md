---
title: Zene
description: Music groups and events, kept as data items, changed by actions, shown as an app on a phone.
---

Zene helps people join music groups and organize music events. This package of react-doc keeps a whole music community as **one frontend object**, says in one place **what each person may do and what it changes**, and draws **the app** on a simulated phone over that data. The concepts are in [Core concepts](zene-core.md); try the app in [The app](zene-demo.md).

## How it is built

```text
the app on a phone            screens, gestures, forms                 zene-ui.md
      │ reads a world          │ asks for an action
      ▼                        ▼
queries (model/ZeneQuery)     actions (model/ZeneAction)               zene-action.md
  feed, search, inbox ...       who may · is it possible · its effects
      │                        │ effects: create / update / delete data items
      ▼                        ▼
the world: every entity of one partition, with indexes  (model/ZeneWorld)
      ▲
      │ read from, written to
a backend                     in the page: the partition and a session over it   (backend/ZeneBackendLocal)
                              later: a server running the same actions
      ▲
the data items                a frontend object of the type zene.community,     zene-data.md
                              one item per entity, a partition per community
```

- **The data is items, never screens.** An account, a membership, an application, a tag: each is one asset item of the object, with its kind, an id, and a path `/{partition}/{kind}/{id}`. Where the items are stored is the storage layer's choice (files on the development server, a storage point behind a network), so the same app runs on another backend.
- **The meaning is the actions.** A button never writes data: it asks for an action of the catalog, which says who may run it, refuses with a reason, and answers its effects, the items it creates, updates and deletes. The demonstration applies them in the page; an MVP sends the same request to a server running the same catalog.
- **The app is a view.** Every screen is a query over the world for the person holding the phone; the session beside the phone shows each action with its effects.

## The documents

| | |
| --- | --- |
| [Core concepts](zene-core.md) | groups, subgroups, events, individuals, accounts, tags: brief |
| [The app](zene-demo.md) | the app on the example community, with the session beside it |
| [Data items](zene-data.md) | the kinds of items, their fields, ids, paths, partitions, the tag DAG |
| [Actions](zene-action.md) | who may do what, and what it changes: the catalog, and where it runs |
| [The app on a phone](zene-ui.md) | the screens, gestures, forms, icons, and the backend of the demonstration |
| [Later](zene-todo.md) | what is left for later |

## The files

```text
type.yaml                 the type zene.community: kinds of items, partitions, modes (App, Actions, Data items)
comp-mdx/model/           the semantic model, pure: kinds, world, roles, actions, queries, times, ids (+ tests)
comp-mdx/backend/         the backend of the demonstration (the partition with a session over it)
comp-mdx/app/             the app: the phone, the stores, the screens, the sheets, the icons
comp-mdx/ZeneActionTable.jsx, ZeneDataTable.jsx   the modes Actions and Data items
script-data/              the example community (zene-example.yaml) and the script writing it as items
.doc-page/object-frontend/   the example object, its items under item/example/
```

`npm test` runs the tests of the model.
