---
title: Data items
description: How a music community is kept as the data items of one frontend object.
---

A music community is **one frontend object** of the type `zene.community` (react-doc: frontend objects), and **every entity is one data item** of it: an account, a person, a membership, a post. The items are what the app reads and what the actions change; nothing else holds data.

## The object and its partitions

<!--renderComp=DiagramText-->
```text
.doc-page/object-frontend/{id}--Zene example community/
├── object.yaml
└── item/
    ├── {entry}/             the entry: name, type zene.community
    ├── example/             a partition: one complete community
    │   ├── item-list.yaml   the records: key, kind, name, path of each item
    │   ├── account/  individual/  group/  membership/  subgroup/  event/
    │   ├── post/  application/  follow/  page/
    │   ├── availability/    one item per person or group
    │   └── taxonomy/        one item: every tag of the community
    └── playground/          another community, kept out of git
```

- **A partition is one community.** It holds everything its entities refer to, and the app shows one partition at a time (the block's `partition`). `example` is the made-up community of the demonstration, tracked by git; `playground` is for trying things out and git keeps it out.
- **Where a partition is stored** is the storage layer's choice: plain files today; bound to a storage point behind a network, the same items live at a backend and the app does not change.

## Ids and paths

- Every entity has an **id**: self-assigned, 0-9 a-z, with no meaning in it, never typed by a person.
- Its **asset path** is `/{partition}/{kind}/{id}`. A partition copied into another keeps every id, so every reference survives the copy.
- **References between entities are ids**, written in the data, with the kind given by the field: `group: {id}` names a group, `target: { kind: event, id }` names one of several kinds. The key of an item's record is not used: it may change when a partition is copied.

## Times

A time is written in the project's format with its zone: `20261213_14000000+09` (2026-12-13 14:00 at +09). It is compared as a moment and shown in its own zone, so a concert in Tokyo reads 14:00 +09 wherever the page is read.

A relation that lasts (a membership, a role, a skill, a group's life) holds for a **period** `{ from, to }`, `to` empty while it goes on, each end a point as precise as it is known: a year `2017`, a month `2017-06`, a day `2017-06-04`, or a moment the app recorded. A month is some instant of that month, never widened to its first or last day: reading a period at a moment answers yes, maybe or no ([Timeline](zene-timeline.md)).

## The kinds of data items

Every item has `id`, `timeCreated`, and `createdBy` (the account acting when it was made). The rest, by kind (fields left empty are left out of the item):

```yaml
# individual: a person in music
name: Mika Tanaka
account: {account id}
area: Setagaya, Tokyo
roleList: [{ role: practitioner | organizer, from: '2009-04', to: '' }]   # each role for a period
skillList: [{ tag: {skill tag}, level: 1..5, from: '2001', isPrimary: true }]   # played since a point
workTagList: [{work or composer tag}]
lookingForList: [extra player for concerts, students]
pricing: { isPaidOk, isFreeOk, itemList: [{ label, amount, currency: JPY, unit }], note }
# when they can play is an item of its own: availability (below)

# account: the face of an individual, a group or an event
handle: mika.violin                   # unique in the community
name: Mika Tanaka
subject: { kind: individual | group | event, id }
bio: one paragraph
avatar: { style: face | badge, seed, color, icon }   # drawn, never uploaded
homepage: {page id}                   # the Markdown homepage
viewList: [about, post, event, group] # the views under the header, the first by default
isTemporary: true                     # an event's account
timeExpire: 20270112_16300000+09      # 30 days after its event

# group
name, account, area, description
tagList: [{genre, work tags}]
joinPolicy: open | apply | invite
recruitList: [{ tag: {skill tag}, count, note }]
period: { from: '2015-04', to: '' }  # founded, and dissolved when it ends

# membership: one person in one group, for one stretch of time (who left and came back has two)
group, individual
period: { from: '2017-06-04', to: '' }   # a member while it holds
endReason: '' | left | removed           # how it ended
roleList: [{ role: owner | admin | {role tag}, from, to }]   # each role for a period; periods may overlap
skillList: [{what they play in the group}]
via: {application id}

# subgroup: members of a group, formed by them
group, name, description, tagList
joinPolicy: open | lead               # members join it, or its leads add them
memberList: [{ individual, role: lead | member, from, to }]   # leaving ends the period

# event
name, account (absent for most rehearsals)
eventKind: concert | rehearsal | session | workshop | audition | meetup
isCommercial: true
status: draft | published | cancelled
visibility: public | member           # member: those taking part (a rehearsal)
timeStart, timeEnd, venue: { name, area }, description
parent: {event id}                    # a rehearsal of that event
principalList: [{ kind: group | individual, id, role: organizer | performer | host | guest, status: confirmed | invited | declined }]
tagList, programList: [{ tag: {work tag}, note }], openList: [{ tag: {skill tag}, count, note }]
ticket: { price, currency, note }

# post: by an account
account, postKind: general | performance | announcement | hiring
text, event, tagList
media: [{ kind: image | video | audio, title, icon, color }]   # drawn: no files yet
hiring: { target: { kind: group | event, id }, tag: {skill tag}, count, requirement, isOpen }

# application: a person asking to join a group, take part in an event, or join a subgroup
applicant: {individual id}
target: { kind: group | event | subgroup, id }
via: {post id}                        # the hiring post it answers
skillList, message
status: pending | accepted | declined | withdrawn
timeDecided, decidedBy: {account id}

# follow
from: {account id}, to: {account id}

# availability: when a person or a group can play (zene-availability.md)
subject: { kind: individual | group, id }
zone: '+09'
current: { state, note, until, timeDeclared }     # how they are now
declarationList: [{ id, state, span, weekdayList, dayPartList | hourFrom + hourTo, note, timeDeclared }]

# taxonomy: every tag of the community, in one item
name: Tags of the community
tagList:
  - id: {id}                          # a tag keeps an id of its own: what everything else names
    label, kindList: [skill | role | genre | work | composer]
    parentList: [{tag ids}]           # above it: the DAG
    composerList: [{composer tags}]   # a work: by whom
    originList: [{work tags}]         # a work: the work it comes from (a game, a film)
    icon, color, note
```

**Why the tags are one item.** A taxonomy is curated as a whole and read as a whole: no screen shows one tag without the tags around it, and the DAG is checked across all of them. One item keeps them together, is read in one request, and saves a file per tag. Adding a tag is an update of that item (`tag.create`); each tag still has its own id, which is all that the people, groups and events tagged with it write. A person's availability is the other way round: one item each, since only that person writes it, and only their homepage reads it whole.

A **page** (a homepage) is Markdown, a document of the object: its frontmatter names its account, its text is rendered by the page as any document.

## Tags

The tags form a DAG, kept in the one taxonomy item: a tag may lie below several (`parentList`), and a work lies below the work it comes from (`originList`) and links its composers (`composerList`). An edge that would close a cycle is left out and reported.

**A tag stands for itself and everything below it.** An entity is found by a tag when one of its tags lies at it or below it, along every edge: *strings* finds a violist, *Dvořák* finds an orchestra playing his ninth symphony, *Final Fantasy VII* finds a concert playing One-Winged Angel. The tags of an entity are: what a person plays and loves; what a group plays and looks for; an event's tags, program and open positions; a post's tags and what it hires.

## The world

The app reads a partition as a **world**: every entity, normalized (every field present, of its type), with the indexes the queries and the actions need (the memberships of a group and of a person, the events of a principal, the applications to a target, the follows, the tag graph). A world is a value: a change is a new world built with the change applied. What does not fit (an id twice, a tag naming a missing tag, a cycle) is listed as a problem of the world, never a broken page.

## The data of the example

The items of the partition `example`, with the changes of the session over them (shared with the app block of the same page):

<!--renderComp=ObjectFrontend-->
```yaml
object: frontend:w64o374jrp5
mode: data
param:
  kind: membership
```

The example is written readably in `script-data/zene-example.yaml` (local names like `$mika` stand for ids) and turned into items by `script-data/zene-seed.mjs`, through a running development server.
