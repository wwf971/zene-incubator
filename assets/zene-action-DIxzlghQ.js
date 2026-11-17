var e=`---
title: Actions
description: Who may do what in a music community, and what each action does to the data items.
---

Everything a person does that changes data is an **action** of one catalog (\`comp-mdx/model/ZeneAction.js\`). A screen never writes an item: it asks for an action, and the action says whether it may run and what it changes. The catalog is the meaning of the app, written once, run the same in the demonstration and behind a server.

## Running an action

<!--renderComp=DiagramText-->
\`\`\`text
run(world, { actionId, actor, input, time })
  -> who     may this actor do it?            asked of the data
             no: refused, -7 (sign in first) or -8 (not allowed)
  -> check   is what is asked possible now?   the input, the state
             no: refused, -1, with the reason
  -> plan    its effects: { op: create | update | delete, kind, id, data }
  -> { code: 0, data: { effectList, result } }      nothing written yet
whoever ran it applies the effects to its storage
\`\`\`

- **The actor** is \`{ personId, accountId }\`: the individual signed in, and the account they act as: their own, a group's while they are an owner or admin of it, an event's while they organize it and its account has not expired. A post, a follow, an event created belong to the account acted as.
- **An effect names one data item** with its whole data after the action, and the fields it changed. One action may touch several items; each item appears once in its effects.
- **Nothing is stored as a permission.** "Admin of Aurora" is a membership of the person in Aurora, active, whose roles hold \`admin\` for a period that includes now. Giving a role starts a period, ending it closes it, so the history of who held which role stays in the data.
- **A button asks before it is shown.** The same \`who\` (and, for a form, \`check\`) tells a button whether to be enabled, and its reason is the button's title: what a person may not do is greyed, never missing.

## Who may: the questions

| question | answered by |
| --- | --- |
| the standing of a person in a group | their active membership and the roles it holds now: owner, admin, member |
| an organizer of an event | a confirmed principal with the role organizer: the person, or a group they manage; a rehearsal is managed by the organizers of its parent |
| taking part in an event | a confirmed principal, or a member of a confirmed group principal |
| seeing an event | published and public; a rehearsal (\`visibility: member\`): those taking part in it or in its parent; a draft: its organizers |
| acting as an account | own account; a group's account: owner or admin; an event's account: organizer, until 30 days after the event |
| deciding an application | the managers of its target: owners and admins of a group, organizers of an event, leads of a subgroup |
| the standing of a person in a space | owner, admin, moderator, member: from the roles of the space held now and their standing in its group ([Roles](zene-chat.md#roles)); muted while a mute holds |
| writing in a channel | in the space and not muted; an announcement channel: moderator at least; an archived one: nobody |
| reading a conversation | whoever may act as one of its accounts |
| putting badges on a tag | whoever edits what carries it: the person, the managers of a group, the organizers of an event, the account of a post |

## The catalog

Read from the actions themselves, so this table and the buttons cannot disagree:

<!--renderComp=ObjectFrontend-->
\`\`\`yaml
object: frontend:w64o374jrp5
mode: action
\`\`\`

## Two processes, step by step

**Joining a group by application.**

<!--renderComp=DiagramText-->
\`\`\`text
Lena                group.apply { group: Aurora, message, skillList }
(signed in)           who: signed in
                      check: not a member, the group takes applications,
                             none waiting
                      -> create application (pending)
Mika                sees it in Activity (zeneInbox: what she decides for)
(admin of Aurora)   application.accept { application }
                      who: decides for the target
                      -> update application (accepted, decidedBy @mika.violin)
                      -> create membership (Lena in Aurora, via the application)
\`\`\`

**Hiring for an event.**

<!--renderComp=DiagramText-->
\`\`\`text
Aurora's admin,     post.create { postKind: hiring, hiring: { target:
as @aurora.orch       the Winter Concert, tag: viola, count: 2 } }
                      check: the actor manages the target
Lena                hiring.apply { post }
                      -> create application for the event, via the post
an organizer        application.accept
                      -> update application
                      -> update event: Lena a confirmed performer; one open
                         position whose skill lies above viola filled
\`\`\`

## Rules the actions keep

- A group keeps **one owner at least**: the last owner neither leaves nor loses the role; owner and admin are given and ended by an owner only; an owner is never removed by another member.
- Leaving a group or being removed **ends the open role periods** and keeps the membership as history (its period ended, \`endReason\` left or removed). Joining again is a new membership.
- **History is told, not only recorded**: what the app does is written to the moment; earlier history, or a correction, is told by the owners and admins with \`membership.historySet\`, each end at the precision it is known, roles inside their membership, one owner kept ([Timeline](zene-timeline.md#telling-the-history)).
- **One application waits at a time** per person and target; accepting or declining is final, the applicant may withdraw while it waits.
- An event is made as a **draft**, seen by its organizers, until it is published; one that is over cannot be cancelled. Its account is made with it and **expires 30 days after it**: posting as an expired event account is refused.
- A rehearsal is added to an event by its organizers, is seen only by those taking part, and has no account.
- **Availability is said, not computed when written**: \`availability.declare\` keeps a declaration as it was said (a new one, or one replaced by its id), and the merging into parts of days happens when it is read ([Availability](zene-availability.md)). Only the person declares for themselves; for a group, its owners and admins.
- **The tags are one item**: \`tag.create\` updates the taxonomy item of the community (making it when there is none), so every tag is added the same way and the DAG is checked across all of them.
- **A group has one official space of each audience**, opened by its owners and admins; a member opens other internal spaces and owns them. Roles of a space are periods, as roles of a group are; owner and admin are given by an owner; owners and admins are never muted ([Spaces and messages](zene-chat.md)).
- **A pin is a period**: from now or a day to come, until a day or until unpinned. Unpinning ends it now and keeps it; pinning the same thing again changes its period; what is deleted takes its pins with it.
- **A message's mentions are read when it is sent** (\`@handle\`), and \`@everyone\` counts only from a moderator; a message speaks as the person, or as the group of the space when a manager writes as its account.

## Where the actions run

<!--renderComp=DiagramText-->
\`\`\`text
the demonstration   the screens ──► ZeneBackendLocal ──► the catalog
                    the effects applied to a session kept in the browser,
                    over the partition; written into its items in edit mode

an MVP              the screens ──► a backend client ──► POST action/run
                    a server signs the person in (the auth layer), runs
                    the same catalog, writes the items
\`\`\`

The catalog is pure (no React, no store, no network): the server imports it as it is, checks every request again whatever the page showed, and applies the effects to its storage in one transaction. Because the effects are whole data items, the storage underneath can be the storage layer of react-doc (a partition at a storage point) or a database whose rows are those items.
`;export{e as default};