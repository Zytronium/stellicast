# Stellicast Style Guide

This document covers the intended style and format for Stellicast UI. While it
is not to be followed exactly, it is highly recommended to follow all of these
guidelines.

# 1. Theme compatibility
Ensure all new UI is fully compatible with color themes. Everything should be
easy to read in all themes and should look reasonably good in all themes. The
only exception is the Colormatic theme, which has such a poor color palette that
it's almost impossible to get things looking good in that theme. Theme variables
as defined in globals.css should be used as much as possible. For example, instead
of using `text-white`, use `text-foreground`, and use `color-primary-foreground` 
as the text color on an element with `bg-primary` assuming full opacity. Test
how everything looks on every theme before you push new UI or UI changes to the
main development branch.

# 2. No Emoji Icons
This is a clear sign of AI vibe coding, and many people will not like this. Use
a React icon library or a custom SVG instead of emoji icons.

# 3. Mobile Responsiveness
Ensure all UI looks good on both mobile, tablet, and desktop screen sizes. A
good portion, most likely the majority, of traffic will be from mobile phones.
You can even test on your phone when running the dev server by inputting the
IP and port (shown in the dev console when you start the server) into your
mobile browser while on the same Wi-Fi network.

# 4. Overscroll-X Behavior
You know those times when the horizontal scrollbar appears because there's just
a few extra pixels of width on the side but no content there? That's usually
fixed by using `w-full` instead of `w-screen`. Try to minimize how often this
occurs. One current example is the settings page on mobile: the tooltips that
are hidden until you hover over the info icon are always there and take up
too much width on some mobile phones. This needs to be fixed eventually.

# 5. Good UX
Keep in mind user experience when designing new UI. Important things should
be two or fewer clicks away. Nothing should be more than four or five clicks
away unless of trivial importance or relevance.

# 6. Creative Liberty
I know this is kind of vague and ambiguous, but try to be creative with new
designs. Try not to copy YouTube or Twitch's layout. Introduce unique designs
while trying to keep it pretty and intuitive. Additionally, we plan to introduce
multiple layout configurations for users to switch between in the future, so keep
this in mind when designing a component that can have multiple designs or a page
that has room for multiple configurations. It's best if a component is designed
to fit in different areas of the page if possible.

# 7. Have Fun! Experiment a Little.
To build on #6, you should enjoy making new designs. Use your creativity and 
experiment with different designs. You might discover something that works
really well or laugh at how terrible or goofy a design looks.
