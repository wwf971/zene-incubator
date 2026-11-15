var e=`---
title: The app on a phone
description: The screens, gestures and forms of the app, drawn on a simulated phone over the data items.
---

The mode **App** of a community draws the app as it will be on a phone: the screen of a phone, the bar of five buttons at the bottom, pages a swipe goes through, screens pushed and swiped back, sheets sliding up. It is a simulation for designing the app and its data together. The same components also run on a real phone: [The app on Android](zene-deploy-mobile-capacitor.md) builds them, as they are, into an Android app with Capacitor.

<!--renderComp=DiagramText-->
\`\`\`text
┌──────────── the phone ───────────────┐   ┌──── the session ─────┐
│ status bar                           │   │ holding the phone:   │
│ ┌─ Home ─┬ Discover ┬ Activity ┬ Me ┐│   │   a face per person  │
│ │ the root screen of each tab,      ││   │ acting as            │
│ │ side by side: a swipe goes on     ││   │ the partition read,  │
│ │   + screens pushed over a tab:    ││   │   the session's      │
│ │     a swipe to the right goes     ││   │   changes over it    │
│ │     back                          ││   │ the actions run,     │
│ └───────────────────────────────────┘│   │   with their effects │
│ sheets: forms, menus (slide up)      │   │   on data items      │
│ [Home][Discover][ + ][Activity][Me]  │   └──────────────────────┘
└──────────────────────────────────────┘
\`\`\`

## Screens

| tab | the screen | what it reads |
| --- | --- | --- |
| Home | the feed: the posts of what the person follows, of their groups and events, newest first; above it the events coming up for them as story rings | \`zeneFeed\`, the events they take part in |
| Discover | a search field and tags; with nothing asked, the tags as a grid of stickers, by skills, genres, works, composers | \`zeneSearch\`, the tag graph |
| + | not a page: a menu of what the account acted as can create (post, hiring post, event, group, tag), each greyed with its reason | the actions' \`who\` |
| Activity | what waits for the person (applications to decide, invitations) and what they asked for | \`zeneInbox\` |
| Me | the homepage of the account acted as, with the account switcher; signing in when nobody is | the accounts the person may act as |

Pushed on a tab: an **account's homepage**, an **event** without an account (a rehearsal), a **post**, a **tag** (where it stands in the DAG, what lies below it, everything it finds), a **subgroup**.

### Homepages

A homepage is the header of a social app (picture, counts, name, bio, the buttons of what the person may do here) and **views** below it, swiped through:

- **About** (the first, by default): what the data says, laid out to read. For a person: what they play with levels, their roles since when, what they look for, when they can play ([Availability](zene-availability.md): the status, a calendar of the parts of each day, the declarations), their prices, the works they love. For a group: how one joins, what it looks for, what it plays. For an event: when and where, commercial or not, the program with its composers, who takes part (with Accept / Decline for an invitation), open positions, rehearsals. Then the **homepage** the account writes in Markdown, rendered as any document of the page.
- **Posts**: a grid. **Events**: coming and past as a list, or a **calendar** of a month (the events of each day, a tap on a day listing them). **Groups**: a person's groups with the roles held now and before, as a list or on a **timeline**; a group's members with their roles (a manager opens one to give or end a role, and to tell the history of the membership: its period and the periods of its roles), on a timeline everyone who ever was a member, and its subgroups. How the timeline is drawn: [Timeline](zene-timeline.md#on-a-timeline).

### Editing a homepage in place

Whoever may act as an account edits its homepage where it is shown, not in a form: **Edit** beside the name turns the homepage into its edit mode, **Done** ends it.

<!--renderComp=DiagramText-->
\`\`\`text
read                    edit mode                        runs
Mika Tanaka             [Mika Tanaka]                    account.update
Setagaya, Tokyo         [Setagaya, Tokyo]                individual.update
Violin, level 5         Violin  level 1 2 3 4 5  ×       individual.update
                        + Add what you play              a sheet of tags
Looking for: students   students ×   [+ add]             individual.update
the calendar            tap a part of a day, then:       availability.declare
                        Available  Limited  Unavailable
One rehearsal  ¥6,000   [One rehearsal] [6000] JPY ×     individual.update
\`\`\`

- **Every change is one action**, run at once: a level tapped, a skill taken out, a price typed and left. It is in the session's log like any other action, and refused with its reason like any other.
- **A text is typed where it stands**, in a field of the same size and look, with a dashed line saying it can be typed; its draft is the app's (the data stays as it was until the text is committed), Escape gives it up.
- **What has no place on the homepage opens a sheet**: the tags to add, a declaration at a scale the calendar cannot tap, the Markdown of the homepage.
- A group is edited the same way by its owners and admins: its description, where it plays, how members join, who it looks for, what it plays, when it can play.

## Forms

A form is a sheet sliding up, and **the input of one action**: it builds the input from its draft (kept in the app's store, so a sheet closed and opened again keeps what was typed), its Done button is enabled only when the action would take that input, and under the fields it says which action it runs and what that changes. Its fields are those of a phone form: text, a segmented choice, a switch, a time with its zone, and a **tag picker** that walks the DAG from its roots or finds a tag by the words of its label and the labels above it ("strings vio").

## Gestures

- **A swipe belongs to the innermost region that can move that way.** On the root of a tab a horizontal swipe goes to the next tab; on a pushed screen a swipe to the right goes back (the screen follows the finger, and goes back past a third); in the views of a homepage it goes to the next view, and at the first view a swipe to the right goes back. A vertical move scrolls.
- A mouse drags as a finger does; two fingers sideways on a trackpad swipe too.
- **The wheel stays in the phone**: it scrolls the screen under it and never the page behind.
- The click ending a drag is not a tap.
- **No scroll bar stands beside a list.** A phone draws its scroll indicator over the content while one scrolls, and it is gone after; the simulation draws none, and takes no room for one, so nothing shifts when a list starts to scroll.

## Icons

Tags are drawn as **cartoon stickers**: one hand for all of them, a dark ink outline over flat fills with a soft highlight, on a round sticker of the tag's color. A tag names its icon (\`violin\`, \`horn\`, \`score\`, \`gamepad\` ...); a tag without one takes the nearest parent's, so a new tag below *Brass* is drawn as brass. People are cartoon faces made from the seed of their avatar; groups and events are badges with an icon. No file is uploaded: every picture is a function of the data.

## The backend of the demonstration

The app reads a partition and runs actions through \`ZeneBackendLocal\`:

<!--renderComp=DiagramText-->
\`\`\`text
world = the items of the partition  +  the session
        read through the api of         the effects of the actions run, kept in
        the object's mode               this browser, per object and partition
                                        Discard: forgotten
                                        Write into the partition (edit mode):
                                        each changed entity written as its item
\`\`\`

- **Reading a page changes nothing.** The actions of a reader go to the session, in the browser; the files change only in edit mode, by **Write into the partition**. So the static build of the page is a working app: every action works there, kept in the visitor's browser.
- Every block of the same object and partition on a page shares one session: the Data items of [Data items](zene-data.md) show what the app changed.
- **Holding the phone** is choosing a person: the demonstration has no passwords. A backend puts a session of react-doc's auth layer there, whose account is the person's account.
- The moment the app lives at is \`param.time\` plus the time since the page opened, so the example (concerts in December 2026) keeps its meaning when the page is read later.

Block parameters of the mode App: \`partition\`, \`signIn\` (a handle), \`time\`, \`isSessionShown\`.
`;export{e as default};