---
title: Later
description: What the design leaves for later, in one list.
---

What is left for later, by area. An item done leaves this list; its design moves into the document of its area.

## Planned features

- **Advertisement and ticketing.** An event sells tickets (kinds, prices, a count, who bought them) and an account promotes an event or a hiring post to people who did not follow it. Commercial events already carry a ticket price; nothing is sold yet.
- **Organizing rehearsals.** Utilities for a group preparing an event: who comes to which rehearsal (attendance asked and answered), the bars rehearsed each time, parts and bowings shared, seating by section, a rehearsal plan sent a week before.

## The model

- **Invitations to a group.** A group whose `joinPolicy` is `invite` takes no applications, and no action invites a person into it yet (events have `event.invite`).
- **Leads of a subgroup** adding members (`joinPolicy: lead`) and handing the lead over.
- **Messages** between accounts, and comments and likes on posts.
- **Notifications**: an application decided, an invitation, a rehearsal moved.
- **Search by place and time**: events near an area, people free on a day.
- **Checking the data of a kind** when an item is read (a schema per kind), beyond the defaults the model fills in.

## The backend

- **A server running the actions** (`action/run`), signing people in through the auth layer, writing items in one transaction, and the page's backend client in place of `ZeneBackendLocal` ([Where the actions run](zene-action.md#where-the-actions-run)).
- **Media files** for posts and avatars (pictures, video, sound), kept as items of a storage point; they are drawn from their title and icon today.
- **Writing a homepage** from the app keeps its Markdown in the session; in edit mode it is written into its page item. Editing it block by block with the edit layer of the page is left for later.

## The app

- Pull to refresh, and a long press menu on a post.
- An onboarding after registering: what you play, when you are free, the first groups to follow.
- The phone in dark mode.
