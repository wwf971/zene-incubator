---
title: Availability
description: When a person or a group can play, declared at whatever scale they know it, and merged into one picture.
---

People know their time at very different scales: "free every Saturday afternoon", "busy all of August", "not this spring", "free on the evening of the 24th", "Wednesdays from 19:30 to 22:00". Zene lets them say each of these as it comes, and works out the rest: what holds for each part of each day, and an overall status for their homepage. The model is in `comp-mdx/model/ZeneAvailability.js`.

## Declarations

A **declaration** gives a state to a stretch of time:

<!--renderComp=DiagramText-->
```text
declaration = state  ×  span  ×  filter
              │         │        └ some days of the week (Sat, Sun; weekdays),
              │         │          some parts of the day (morning, afternoon,
              │         │          evening, night) or exact hours (19:30–22:00);
              │         │          absent: all of them
              │         └ always (every week from now on) · a year · a season
              │           · a month · a week · a range of days · a day
              └ available · limited (some time; ask) · unavailable
```

| what people say | span | filter | state |
| --- | --- | --- | --- |
| free every Saturday afternoon | always | Sat, afternoon | available |
| weekdays are work | always | weekdays, morning–afternoon | unavailable |
| busy all of August 2027 | month 2027-08 | | unavailable |
| this spring I am also with the youth orchestra | season 2027-spring | | limited |
| free for a gig on the evening of the 24th | day 2026-12-24 | evening | available |
| Wednesdays after work | always | Wed, 19:30–22:00 | available |
| new year in Osaka | range 2026-12-28 – 2027-01-03 | | unavailable |

Days and hours are local, in the zone of the availability (`+09`): what a person in Tokyo calls Saturday afternoon. Seasons are those of a calendar of the northern hemisphere, winter 2026 being December 2026 to February 2027; a week is an ISO week, Monday to Sunday.

The parts of a day are night (0–6), morning (6–12), afternoon (12–18) and evening (18–24). They are the cells the declarations are merged into; exact hours stay in the declaration, and a cell they cover only in part is shown as such.

## Merging: the narrowest declaration decides

Each part of each day takes the state of the **most specific** declaration covering it: the one that covers the fewest hours in all. When two cover as many, the one said **later** decides.

<!--renderComp=DiagramText-->
```text
hours covered = days of its span × share of the week × hours of the day

every Saturday afternoon     3650 × 1/7 × 6   ≈ 3129 h   (always: ten years)
all of August 2027             31 × 1   × 24  =  744 h   narrower: wins there
the evening of 2026-12-24       1 × 1   × 6   =    6 h   narrower still
```

So general rules and their exceptions are said in any order and never contradict each other: a person states the habit once ("every Saturday afternoon"), and a later, narrower declaration ("not on the 28th") overrides it where they meet, without the habit being edited. A part of a day no declaration covers is **not said**, which is not the same as unavailable.

## Current: how the person is now

One declaration is special: **current**, the state the person is in now, with a note and, maybe, the day it holds until ("not taking anything: on tour, until 2026-11-30").

- It is the **status** of the homepage while it holds: a pill beside the name, and the first thing the availability section says.
- With an end, it is also a declaration of the range from the day it was said to that end, merged with the others like any range: a narrower declaration (one free evening during the tour) still wins over it.
- Without one, or once its end has passed, the status is read from the calendar instead: available when at least a quarter of the parts of the next two weeks are free, limited when some are, unavailable when none is, and nothing when nothing is said.

## The report

What the homepage shows is worked out from the declarations at a moment, over the next eight weeks (`zeneAvailabilityReport`):

| part | what it is |
| --- | --- |
| status | the current declaration while it holds, else what the next two weeks say |
| usually free | the parts of a weekday that are free in most of the weeks ahead: "Sat afternoon–evening" |
| next free | the next days with free parts: "Sat 11-21 afternoon–evening" |
| the calendar | six weeks of days, each with its morning, afternoon and evening coloured by state; part of it striped |
| the declarations | from the most general to the most specific, each with what it decides: **overridden** when narrower ones decide every part it covers, **later** when it covers nothing in the weeks ahead |

## On the homepage

Read, the availability section says the status, the usual and next free times, the calendar and the declarations. A tap on a part of a day says which declaration decided it ("Morning: unavailable, by every weekday · morning–afternoon"), so nobody has to guess why a day looks the way it does.

In the **edit mode** of one's own homepage (Edit beside the name), the same section is where one declares, where things are shown:

- the **status**: tap a state (or "say nothing"), type its note, pick the day it holds until;
- the **calendar**: tap a part of a day, a day, a week (its label on the left) or a whole month, then Available, Limited or Unavailable; Take back removes what was declared for exactly that;
- the **declarations**: tap one to change it, × to take it back; "Declare for weekdays, a month, a season, hours" opens a sheet for what the calendar cannot tap: a span at any scale, days of the week, parts of the day or hours, a note, with the number of parts it would decide in the weeks ahead.

## As data

One item per person (or group), of the kind `availability`:

```yaml
subject: { kind: individual, id: {id} }
zone: '+09'
current: { state: available, note: open for extra player requests from January, until: '', timeDeclared: 20261110_21000000+09 }
declarationList:
  - id: {id}
    state: available | limited | unavailable
    span: { unit: always | year | season | month | week | day | range, value: '2027-spring', from: '', to: '' }
    weekdayList: [sat]
    dayPartList: [afternoon, evening]     # or hourFrom: '19:30', hourTo: '22:00'
    note: ''
    timeDeclared: 20261110_21000000+09    # decides between two declarations as specific
```

The values of `span.value`: `2027` (year), `2027-spring` (season), `2027-08` (month), `2027-W03` (week), `2027-01-24` (day); a range has `from` and `to`, both included.

The actions (who may: the person; for a group, its owners and admins):

| action | does |
| --- | --- |
| `availability.declare` | adds a declaration, or replaces the one with the same id; makes the item the first time |
| `availability.remove` | takes a declaration back |
| `availability.currentSet` | sets the current state, its note and its end; an empty state says nothing |

A declaration is kept as it was said, never merged into the others when written: merging happens when the availability is read. So a person changes their mind by one more, narrower declaration, without editing the rule it overrides; what was replaced or taken back stays in the earlier versions of the item.
