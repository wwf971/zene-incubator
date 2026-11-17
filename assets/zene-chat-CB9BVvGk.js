var e=`---
title: Spaces and messages
description: Where a group talks, with its members and with its fans; the roles there; files and notes pinned for a period; direct messages between accounts.
---

A music group talks in **spaces**: an official one for its members, an official one for its fans, and the spaces its members open for a project or a section. A space has **channels**, written by everyone in it or, for announcements, by its moderators. The group keeps **files**, and a **note** is a file made of text; either is **pinned** in a channel for a period, or until someone unpins it. Besides the spaces, accounts write to each other directly. The model is in \`comp-mdx/model/ZeneSpace.js\` (who may), \`ZeneActionChat.js\` (the actions) and \`ZeneQueryChat.js\` (what the screens read).

<!--renderComp=DiagramText-->
\`\`\`text
Aurora Chamber Orchestra
├── space Aurora members         internal, official: its members
│   ├── #general        chat      everyone in the space writes
│   ├── #rehearsals     chat      ── pinned: Rehearsal plan, until Dec 13
│   └── #announcements  announce  moderators post, the others read
├── space Aurora fans            external, official: anyone who joins
│   ├── #announcements  announce  ── pinned: the poster, until Dec 13;
│   │                                 the concert-day guide, Dec 6 to 14
│   └── #general        chat
├── space Winter Concert 2026    internal: opened by Mika, who owns it
└── files     of a space, or on the group's shelf (its members)

conversation   two accounts writing directly; a group's account is read
               and answered by the managers of the group
\`\`\`

## Spaces

A space belongs to one group and is for one **audience**:

- **internal**: the members of the group. Every member is in every internal space of the group, with nothing to join.
- **external**: anyone. Fans read it without joining; they **join** to write, and may leave. The members of the group are in it too.

A space is **official** or not. A group has at most one official internal and one official external space, its *group chat* for the members and for the fans, opened by its owners and admins. Any member opens other internal spaces (a concert, a section, a tour) and owns what they open; spaces for fans are opened by the owners and admins only.

## Roles

What a person may do in a space follows from their **standing** there, read from the data at the moment, as the standing in a group is ([Actions](zene-action.md#who-may-the-questions)). Nothing is stored as a permission.

| standing | who | may |
| --- | --- | --- |
| owner | of an official space: the owners of the group; of another: who opened it, and those given the role | everything of an admin; give and end owner and admin |
| admin | the role admin; the owners and admins of the group, in every space of it | add and edit channels, edit the space, give and end moderator and muted |
| moderator | the role moderator | post announcements, call \`@everyone\`, pin and unpin, delete any message, share files with the fans |
| member | a member of the group; in an external space, who joined it | read, write in the chat channels, add files to an internal space |
| muted | the role muted, for its period | read only, until the period ends; owners and admins are never muted |

A role of a space is held for a **period**, as a role in a group is: giving it starts a period, ending it closes it, and the history stays. A mute is given with its end ("for 7 days") and lifts itself.

## Channels and messages

A channel is a **chat** (everyone in the space writes) or an **announcement** channel (its moderators write, everyone reads). An admin adds, renames and archives channels.

- A message is written by a person, **as an account**: their own; or, for a manager writing in a space of their group, the group's account (the announcements of Aurora speak as Aurora, and say who wrote them).
- \`@handle\` in the text **names an account**: it is in the message (\`mentionList\`) and reaches that account's Activity. \`@everyone\` calls all, from a moderator; from anyone else it is only text.
- A message carries **files** of its space or of the group; who wrote it, and a moderator, delete it.

## Files, notes and pins

A file belongs to its group, and to one of its spaces or to the group's own **shelf** (seen by the members). An internal space takes the files of those in it; an external space, of its moderators, since the fans read them. A **note** is a file made of text, in Markdown: a rehearsal plan, how to pay the fee, an encore vote. Shared in a channel, a file comes with a message; it stays a file of the space either way.

A **pin** puts a file or a message at the top of a channel for a period:

<!--renderComp=DiagramText-->
\`\`\`text
pin = { what: a file or a message, from, to }

  from   now, or a day to come            (a pin may be scheduled)
  to     a day: it holds through that day, and ends by itself
         empty: it holds until someone unpins it

  pinned     ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  to empty: until unpinned
  until      ●━━━━━━━━━━━━━━━━━━━━━━━━━━●            to Dec 13
  scheduled          ○╌╌╌╌╌●━━━━━━━━━●                from Dec 6 to Dec 14
                     now
\`\`\`

- **Unpinning** ends the period now, and the pin stays as history; a pin that had not started is taken out.
- **Pinning the same thing again** in a channel changes the period of its pin, so a channel never shows a thing twice.
- A file or a message taken away takes its pins with it.

## Direct messages

A **conversation** is between two accounts; the first message makes it, and the same two accounts always meet in it again. An account is read by everyone who may act as it: a fan writing to Aurora's account is answered by Aurora's owners and admins, as Aurora. This is how a person writes to a group without a space: to ask about joining, about tickets.

## Read and unread

What a person has read is one item of theirs (\`seen\`): for each channel and conversation, until when. Opening a channel or a conversation marks it read (\`seen.mark\`); the messages of others after that moment are **unread**, counted on the space, the channel and the Activity ([The app on a phone](zene-ui.md#activity)).

## What it does not do yet

Threads of replies (a message names the one it answers; the app does not show threads), editing a message, spaces bound to a subgroup, files of a storage point: [Later](zene-todo.md#the-model).
`;export{e as default};