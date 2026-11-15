---
title: Timeline
description: Every relation holds from a time to a time, each end as precise as it is known.
---

A person is not simply "in" a group or "a concertmaster": they were from one time to another, or still are. Zene keeps a **timeline** under the relations of a community, and reads each of them at a moment. The model is in `comp-mdx/model/ZeneTimeline.js`.

| what | its period |
| --- | --- |
| a membership of a person in a group | the membership itself; a person who left and came back has two |
| a role in a group (owner, admin, concertmaster …) | each period the role was held, inside its membership; periods may overlap, of two roles or of the same one |
| a role of a person (practitioner, organizer) | each period it was held |
| a skill | since when it is played |
| a membership of a subgroup | from joining to leaving |
| a group | founded, and dissolved when it ends |

## Points: as precise as they are known

An end of a period is a **point**, written at the precision one knows it:

<!--renderComp=DiagramText-->
```text
'2017'                   a year      some instant of 2017
'2017-06'                a month     some instant of June 2017
'2017-06-04'             a day       some instant of that day, in the zone (+09)
'20261115_12000731+09'   a moment    what the app recorded: exact
```

History told by people is written as a year, a month or a day ("I joined in June 2017"); what the app records (a join, a role given now) is written to the moment. **A point is never widened to a guess**: June 2017 is not the 1st of June, nor the 30th. It stays a month, and the uncertainty it carries is used when the point is read.

A **period** is `{ from, to }`, with `to` left empty while it goes on (until now): `{ from: '2017-06' }` reads "since Jun 2017", `{ from: '2016-04', to: '2025-03' }` reads "Apr 2016 – Mar 2025".

## Reading a period at a moment: yes, maybe, no

<!--renderComp=DiagramText-->
```text
               from: 2016-04                              to: 2025-03
time  ─────────┬───────────┬──────────── … ──────────────┬───────────┬──────▶
               │  April    │                              │  March    │
     no        │  maybe    │            yes               │  maybe    │  no
```

- **yes**: surely inside; **no**: surely outside; **maybe**: inside the month (or the year) an end is known to.
- **Two periods overlap** yes, maybe or no the same way: a role that ended in June 2019 and one that began in June 2019 maybe overlap.
- **One period lies within another** yes, maybe or no: a role must lie within its membership, so telling a role that surely starts before the membership is refused.

What is decided with a period chooses what a maybe means:

- **being a member** holds through a maybe (a person who left sometime in March is still read as a member in March);
- **a role that manages the group** (owner, admin) holds only for sure: rights are never granted on a maybe;
- **the roles shown** on a homepage include the maybe, since they describe, not grant.

## Telling the history

The app records periods as things happen: joining, leaving, giving or ending a role write moments (`group.join`, `group.leave`, `membership.roleSet` …). History from before, or a correction, is told by the owners and admins of the group with `membership.historySet`: the period of a membership and the periods of its roles, each end at the precision it is known, overlapping as they did. The action checks what it is told:

- each end is a point, and no period ends before it starts;
- each role lies within its membership (an end told for the membership ends its open roles with it);
- the group keeps one owner at least now; only an owner tells when owners and admins were.

A person tells their own periods the same way, in the edit mode of their homepage (their roles, since when they play each instrument), through `individual.update`.

## On a timeline

The Groups view of a homepage switches between a list and a **timeline** (`ZeneTimelineChart`): a row per group (or, on a group's homepage, per person who was ever a member, under a row of the group's own life), memberships as thick bars, roles as thin bars below.

<!--renderComp=DiagramText-->
```text
            2017   2018   2019   2020   2021   2022   …   now
Aurora      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▌  member
              ░▒▓▓ Section leader ▓▓▒░    ░▒▓▓ admin ▓▓▓▓▓▓▓▓▌
                          ░▒▓▓ Concertmaster ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▌
```

- **Overlapping periods never hide each other**: bars that may overlap go into lanes of their own; those that surely do not share one.
- **An end known to its month or year fades** over that month or year, instead of drawing a sharp edge at a day nobody knows. An open end runs to the line of now.
- A tap on a bar says what it is and its period, at the precision it was told.
