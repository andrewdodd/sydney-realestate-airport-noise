# Overview

If, like me, you are considering real estate in the inner part of Sydney city you probably would like to know if the location will be affected by airplane noise (once we all start flying about everywhere again).

These snippets let you add some polygon overlays for what the predicted noise levels will be.

# Caveats

The data comes from https://focus-apis.emsbk.com/productinfo?product=ContourDisplay&sitename=ssy1&action=get_layers". I'm not sure if this API is stable, but I found it when I came across this website: https://aircraftnoise.sydneyairport.com.au/can-i-expect-to-see-more-traffic/.

I'm not really sure what any of the polygons mean...beyond ANEF 20 seems to be about the point that the noise is unsuitable for Schools/Hospitals/Houses. So I think ANEF 15 is probably ok, ANEF 20 is probably fine too so long as your house has noise insulation? Maybe if you know what these mean a bit more, or if you live in these areas you could raise a ticket and let me know?

Some of the collection do not draw perfectly...but I can't really be bother to fix them at this stage. The most useful ones I have found are the *2039 N70* and the *2026 ANEC* ones.

# How to

You have to use the deveoper tools in your browser to get hold of the Google Maps object. Here are the instructions for two of the big sites.

## https://www.domain.com.au/

This is quite straightforward.

1. Open developer tools (hacker mode) on your browser (there are many ways to do this, F12 often does it, right-click then "Inspect Element", or Menu>Tools>Developer Tools)
1. Go to https://www.domain.com.au/
1. Search for what you're after in Sydney
1. Select "Map View"
1. In the "sources" tab of the developer tools, select the script under Top > www.domain.com.au > phoenix/static > Pages / search-results.SOMEHASH.js
1. In the view window pretty print the JavaScript (either click the "Pretty print" button, or the "{}" in the bottom left)
1. Find "getZoom" in the page
1. Put a breakpoint on the line that looks like `return t.mapRef.getZoom()`
1. Zoom the map one step to trigger the breakpoint
1. While the code is waiting on the breakpoint, execute the following in the console: `map = t.mapRef`. This saves the object pointed to by "t.mapRef" in a global called "map".
1. Remove the breakpoint and click the play button to resume execution
1. Copy-paste the code from the snippet.js file in this repo to the Console window of the developer tools
1. Push enter and wait...you should eventually see the buttons appear above the map that display the various polygon arrangements.

![](DomainDemo.gif)

## https://www.realestate.com.au/

This one is a bit more tricky. The developers are doing something that causes the site to crash if you type in the console if a breakpoint has stopped, so you have to get all the text ready to go and then reload the page.

1. Open developer tools (hacker mode) on your browser (there are many ways to do this, F12 often does it, right-click then "Inspect Element", or Menu>Tools>Developer Tools)
1. Go to https://www.realestate.com.au/
1. Search for what you're after in Sydney
1. Select "Map View"
1. In the console of the developer tools, enter the text `map=b.map` and push enter. It should fail, but that it ok
1. In the "sources" tab of the developer tools, select the script under Top > s2.rea.reastatic.net > js > page_findOnMap_new.js$$SOMEHASH
1. In the view window, pretty print the JavaScript
1. Find the text "b = new LMI.Mapping.Map"
1. Put a breakpoint on the statement following this line (at the moment the line looks like `if (L.searchLocations && !(_.any(L.searchLocations, w))) {`)
1. Reload the page and wait for your breakpoint to be hit
1. While the breakpoint is waiting on the breakpoint, in the console of the developer tools, push the up key to load "map=b.map" from the history, and push enter.
1. In the sources tab of the developer tools, resume code execution.
1. Copy-paste the code from the snippet.js file in this repo to the Console window of the developer tools
1. Push enter and wait...you should eventually see the buttons appear above the map that display the various polygon arrangements.
