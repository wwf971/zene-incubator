var e=`---
title: The app
description: The app on a simulated phone, on the example community, with the session beside it.
---

A made-up music community in Tokyo: eleven people, four groups, nine events, and what they posted. The phone is the app; beside it, who holds the phone and what each action changed in the data items. Tap a face to hold the phone as someone else, and try what they may do.

<!--renderComp=ObjectFrontend-->
\`\`\`yaml
object: frontend:w64o374jrp5
mode: app
param:
  signIn: mika.violin
  time: '20261115_12000000+09'
\`\`\`

Things to try:

- **As Lena** (new in Tokyo): the Activity tab lists her two applications waiting; on Discover, the tag *Bowed strings* finds every violinist, violist and cellist, and *Final Fantasy VII* finds the concert playing One-Winged Angel.
- **As Kenji** (owner of Aurora): the Activity tab has Lena's applications to decide; accepting one makes a membership, or adds her to the Winter Concert and fills one of its open viola positions.
- **As Mika**: the Me tab switches to the account of Aurora (she is its admin) or of her draft workshop; on Aurora's homepage, the Groups view lets her give roles to members.
- **Sora's homepage** (Discover, *Sora*) shows the voicings she plays on a piano keyboard: press one to hear it, or play the keys. More of the keyboard in [Piano keyboard](zene-piano.md).
- **Activity** (as Mika): her messages, the mentions and announcements of her spaces, what is pinned, Lena's applications to decide; choose categories and a range of time. The spaces above the list open their channels: in *Aurora members*, the bowings pinned in #general, the rehearsal plan in #rehearsals until the concert.
- **As Lena**, a fan: Aurora's homepage shows only *Aurora fans* under Spaces; she writes in its #general, and to Aurora directly with **Message**.
- **Badges**: Nao's oboe carries an English horn (Discover, *English horn* finds her); signed in as Nao, Edit on her About view and the button beside the oboe change them.
- **Edit profile** (as Mika, on the Me tab): the picture, then a row per field, each opening its page with Save; a handle already taken is refused before it is saved. Her links show under her bio.
- **The map of relations**: the same data items, an entity at a time, in [Data items](zene-data.md#the-relationship-map); what the phone changes is on it too.
- **Posts**: the Winter Concert and Game Music Night are announced with posters made from their events; the Autumn Concert is told with photos and a video's cover.
- **Swipe**: left and right between the tabs, right to go back from a pushed screen, and between the views of a homepage. With a mouse, drag; on a trackpad, two fingers sideways.

The changes stay in this browser, as the session over the partition; **Discard** forgets them. In edit mode on the development server, **Write into the partition** writes them into the data items.
`;export{e as default};