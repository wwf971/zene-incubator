var e=`---
title: Core concepts
description: What Zene is made of, in one page.
---

Zene helps people join music groups and organize music events. Four things exist; everything else describes them or links them.

<!--renderComp=DiagramText-->
\`\`\`text
             account: a homepage, posts, follows (an event's is temporary)
                   │ speaks for one of
      ┌────────────┼───────────────────────────┐
      ▼            ▼                           ▼
  individual ─► music group ─► subgroup       music event ◄── rehearsal
  (a person)    membership:   members of     principals: 0..n groups and
                roles for     the group      0..n individuals, each with a
                periods       only           role (organizer, performer …)
\`\`\`

## Music individuals

A person in music. Two roles, each held for a period: a **practitioner** plays or sings, an **organizer** organizes events; one person may be both. A practitioner says what they play (skill tags, with a level), what they ask for, and when they can play: declarations at any scale (every Saturday afternoon, all of August, the evening of the 24th), the narrowest deciding where they meet, and a current state shown as their status ([Availability](zene-availability.md)).

## Music groups

An orchestra, a band, a choir. Individuals **join** a group (openly, by application, or by invitation, as the group decides) and hold **roles** in it for periods: owner and admin manage the group; conductor, concertmaster, section leader are musical roles. A person may be in many groups.

Members of a group form **subgroups** (a string quartet inside an orchestra, a medley team); a member may be in several.

## Music events

A concert, a session, a workshop, an audition. An event is **commercial** (tickets, paid players) or not. Its **principals** are the groups and individuals taking part, from none to many, each with a role; an organizer manages it. A **rehearsal** is an event below another one, seen only by those taking part.

## Accounts

An individual, a group and an event each may have an **account**: the face it shows (a handle, a homepage, posts) and what it acts as. A person acts as their own account, or as the account of a group they manage or of an event they organize. **An event's account is temporary**: it stops 30 days after the event.

## Tags

- **Skills** (instruments, voice, directing) and **roles** form a DAG: violin is below bowed strings, below strings, below instrument; the double bass is below both bowed and plucked strings. Each tag has a cartoon icon.
- **Works** and **composers**: a piece below the work it comes from (One-Winged Angel below Final Fantasy VII), linked to its composers. Assigned to events, groups and individuals.

A tag stands for itself and everything below it: looking for *strings* finds a violist.

## The processes

1. A practitioner registers, and keeps a homepage whose first view explains them (what they play, when they are free, prices, a Markdown page), not a grid of pictures.
2. A group's account does the same, posts its performances and announces its events, and posts **hiring** posts that take applications.
3. Anyone finds people, groups, events and hiring posts by words and tags, and **applies**; who manages what is applied to accepts or declines.

How these are kept as data: [Data items](zene-data.md). What each person may do, and what it changes: [Actions](zene-action.md). The app: [The app on a phone](zene-ui.md).
`;export{e as default};