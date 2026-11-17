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
| Activity | everything that reached the person, newest first: direct messages, mentions, announcements, pins, what waits for their decision, how their applications went; above it the spaces they are in ([below](#activity)) | \`zeneActivity\` |
| Me | the homepage of the account acted as, with the account switcher; signing in when nobody is | the accounts the person may act as |

Pushed on a tab: an **account's homepage**, an **event** without an account (a rehearsal), a **post**, a **tag** (where it stands in the DAG, what lies below it, everything it finds), a **subgroup**; a **space**, a **channel**, a **conversation**, a **file** ([Spaces and messages](zene-chat.md)).

### Homepages

A homepage is the header of a social app (picture, counts, name, bio, the buttons of what the person may do here) and **views** below it, swiped through:

- **About** (the first, by default): what the data says, laid out to read. For a person: what they play with levels, their roles since when, what they look for, when they can play ([Availability](zene-availability.md): the status, a calendar of the parts of each day, the declarations), their prices, the works they love. For a group: how one joins, what it looks for, what it plays. For an event: when and where, commercial or not, the program with its composers, who takes part (with Accept / Decline for an invitation), open positions, rehearsals. Then the **homepage** the account writes in Markdown, rendered as any document of the page; it may hold a [piano keyboard](zene-piano.md) (a pianist's voicings, a teacher's scales), the one component a homepage draws besides Markdown (\`part/ZeneHomepageBlock.js\`).
- **Posts**: a grid. **Events**: coming and past as a list, or a **calendar** of a month (the events of each day, a tap on a day listing them). **Groups**: a person's groups with the roles held now and before, as a list or on a **timeline**; a group's members with their roles (a manager opens one to give or end a role, and to tell the history of the membership: its period and the periods of its roles), on a timeline everyone who ever was a member, and its subgroups. How the timeline is drawn: [Timeline](zene-timeline.md#on-a-timeline). **Spaces**, on a group's homepage: the spaces the person may look into (the fans' space only, from outside the group), with what is unread, and the files of the group's shelf.
- Beside Follow, **Message** writes to the account directly.

### Activity

The Activity is everything that reached the person, as one list, newest first, each day under its date. Its most basic entry is a **message received**; what waits for a decision is one category among the others:

| category | an entry | a tap |
| --- | --- | --- |
| Messages | a conversation, at its last message from the other side, with what is unread; a message to a group's account reaches its managers | the conversation |
| Mentions | a message of one of the person's spaces naming them, or calling \`@everyone\` | the channel |
| Announcements | a message of an announcement channel of their spaces | the channel |
| Pinned | a file or a message pinned in their spaces, and for how long | the file |
| To decide | an application to decide, an invitation to answer, with Accept and Decline | (in place) |
| Applied | the person's own applications, at the moment each was decided | (in place) |

**Narrowing it**: the categories are chips, each with its count, any number chosen at once (none: all); the time is a range (any time, today, 7 days, 30 days, or two days chosen, each whole day in the zone of now). What is unread is tinted, and the tab's badge counts what waits for a decision and the messages and mentions unread. Above the list, the spaces the person is in, with their unread counts; the button at the top writes to someone new.

### Spaces and channels

A **space** shows its channels (a megaphone for an announcement channel), its files, and who is in it with their roles (a sheet: the admins give moderator and mute for 7 days, the owners give admin). A **channel** shows its pins at the top (a tap opens the file), then its messages, the messages of one account within minutes under one name, each day under its date; \`@handle\` is a link to the account, a message calling \`@everyone\` is tinted. Below, the field to write and the clip to share a file or a note; who may not write there reads why instead. Opening a channel or a conversation marks it read. A **conversation** is drawn as bubbles, the person's own on the right; a **file** shows its preview (a note's Markdown on its paper), where it is pinned and until when, and to its moderators Pin, Unpin, Edit, Delete. The rules: [Spaces and messages](zene-chat.md).

### Editing a profile

What an account says about itself (its picture, its name, where it plays) is edited on a **page of its own**, as most apps do it: **Edit profile** on the homepage pushes it, for whoever may act as the account.

<!--renderComp=DiagramText-->
\`\`\`text
< Edit profile                     a row opens the page of its field:
         (face)
     Change picture                < Bio                       [Save]
                                   ┌──────────────────────────────┐
PROFILE                            │ First violin. Teaching on    │
Name           Mika Tanaka      >  │ weekends.                    │
Handle         @mika.violin     >  └──────────────────────────────┘
Bio            First violin...  >  a line or two under your name
Where you play Setagaya, Tokyo  >                          41 / 300
Links          aurora.example   >
                                   Save is greyed with its reason
YOUR MUSIC     (on the homepage)   ("the handle @sora.keys is taken")
What you play  Violin, Viola    >  until the action would take it
\`\`\`

- **A row per field**, its value on the right; a tap opens the page of that field alone, with **Save** in its header. Saving is one action (\`account.update\` for the name, the handle, the bio, the links; \`individual.update\` or \`group.update\` for where one plays and a group's description), checked before it is run: Save is enabled only when the action would take the draft, and says why not.
- **The picture** opens in place: a person chooses among faces drawn from seeds (and asks for other faces), a group or an event among icons; both choose a color. Each tap is saved at once.
- **Links**: up to five, each a label and an address, shown on the homepage under the bio by their host name.
- **What a homepage shows of the music** (what one plays, when, for how much) is not on this page: its rows lead back to the homepage, in the edit mode of its About view. The homepage's Markdown opens in its sheet.

### Editing a homepage in place

The About view of a homepage is edited where it is shown, not in a form: **Edit** at its top turns it into its edit mode, **Done** ends it.

<!--renderComp=DiagramText-->
\`\`\`text
read                    edit mode                        runs
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
- A group is edited the same way by its owners and admins: how members join, who it looks for, what it plays, when it can play. Its name and description are on its profile page.

## Forms

A form is a sheet sliding up, and **the input of one action**: it builds the input from its draft (kept in the app's store, so a sheet closed and opened again keeps what was typed), its Done button is enabled only when the action would take that input, and under the fields it says which action it runs and what that changes. Its fields are those of a phone form: text, a segmented choice, a switch, a time with its zone, and a **tag picker** that walks the DAG from its roots or finds a tag by the words of its label and the labels above it ("strings vio").

## Gestures

- **A swipe belongs to the innermost region that can move that way.** On the root of a tab a horizontal swipe goes to the next tab; on a pushed screen a swipe to the right goes back (the screen follows the finger, and goes back past a third); in the views of a homepage it goes to the next view, and at the first view a swipe to the right goes back. A vertical move scrolls.
- A mouse drags as a finger does; two fingers sideways on a trackpad swipe too.
- **The wheel stays in the phone**: it scrolls the screen under it and never the page behind.
- The click ending a drag is not a tap.
- **No scroll bar stands beside a list.** A phone draws its scroll indicator over the content while one scrolls, and it is gone after; the simulation draws none, and takes no room for one, so nothing shifts when a list starts to scroll.

## Icons

Tags are drawn as **cartoon stickers**: one hand for all of them, a dark ink outline over flat fills with a soft highlight, on a round sticker of the tag's color. A tag names its icon (\`violin\`, \`horn\`, \`score\`, \`gamepad\` ...); a tag without one takes the nearest parent's, so a new tag below *Brass* is drawn as brass. The **badges** a tag carries on an entity are small stickers at the lower right of its sticker, and a chip says them in words too ("Oboe with English horn"); in the edit mode of a homepage the button beside a tag opens them ([Badges](zene-data.md#badges)). People are cartoon faces made from the seed of their avatar; groups and events are badges with an icon.

## Pictures of posts

A post's picture is drawn in one of three designs ([How a picture is drawn](zene-data.md#how-a-picture-is-drawn)), chosen in the form of a post (Picture: None, Drawing, Photo, Poster):

- **Poster**: a concert flyer made from an event, as groups in Tokyo print them. Ink art above (blots of ink, lighter in their middle and darker at their rim, with fine veins of light along them), in the colors of the event's genre: vivid for game music, navy and gold for classical, dark and amber for jazz, pastel for choral music; the organizing group's mark on it. Below, set in a serif: the series, the title, the program with its composers in small capitals, the date as a flyer says it (2026年12月13日(日) 14:00 開演) and the hall. The same seed draws the same art.
- **Photo**: a real photograph, for a concert of classical music or a rehearsal. A video's or a sound's cover is the photo dimmed, the title large over it with a line above, the group's mark at a corner, and the kind and the length below, as the covers of a video channel are.
- **Drawing**: the sticker of the first tag on its color, the look of a general post.

The photos are the demonstration's own (\`app/media/photo/\`): nine pictures, each CC0 or in the public domain (instruments, halls, orchestras seen from afar, no one of the made-up community), with their sources in \`photo-source.yaml\`. A real app would keep a picture uploaded with a post as an item of a storage point.

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