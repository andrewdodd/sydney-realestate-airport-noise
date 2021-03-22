// ==UserScript==
// @name         AirportNoiseCurvesToRealestate.com.au
// @namespace    http://adodd.net/
// @version      0.1
// @description  Wait a few secs after load...the buttons should show up.
// @author       You
// @match        https://www.realestate.com.au/*
// @run-at       document-body
// @grant        GM_xmlhttpRequest
// ==/UserScript==

//console.log("Found scripts before execing", document.getElementsByTagName('script'))

airportNoiseCurveGlobals = {};
(function() {
    'use strict';

    function patchScript(text) {
      return text.replace(/this.map=new google.maps.Map\(Q,this.options.googleDefaults\);/g, "this.map=new google.maps.Map(Q,this.options.googleDefaults);airportNoiseCurveGlobals.map=this.map;");
    }
    function addScript(text) {
        // Hack in to store "this.map" in the airportNoiseCurveGlobals
        var newScript = document.createElement('script');
        newScript.type = "text/javascript";
        newScript.textContent = patchScript(text);
        var head = document.getElementsByTagName('head')[0];
        head.appendChild(newScript);
        //document.body.appendChild(newScript);
    }

    window.addEventListener('beforescriptexecute', function(e) {
        const src = e.target.src;
        if (src.search(/.*page_findOnMap_new.js.*/) != -1) {
            e.preventDefault();
            e.stopPropagation();
            GM_xmlhttpRequest({
                method: "GET",
                url: src,
                onload: function(response) {
                    console.error("FETCHED IT");
                    addScript(response.responseText);
                }
            });
        }

    });

    function loadNoiseCurvesToMap() {
        let map = airportNoiseCurveGlobals.map;
        if (!map) {
            console.log("NO MAP...Sorry...perhaps try refreshing?")
            //window.location.reload(true);
            return;
        }
        // https://stackoverflow.com/questions/14446511/most-efficient-method-to-groupby-on-an-array-of-objects#38327540
        function groupBy(xs, key) {
            return xs.reduce(function(rv, x) {
                (rv[x[key]] = rv[x[key]] || []).push(x)
                return rv
            }, {})
        }

        function flatten(arr) {
            return [].concat(...arr)
        }

        function deepFlatten(arr) {
            return flatten(           // return shalowly flattened array
                arr.map(x=>             // with each x in array
                        Array.isArray(x)      // is x an array?
                        ? deepFlatten(x)    // if yes, return deeply flattened x
                        : x                 // if no, return just x
                       )
            )
        }

        let infoWindow = new google.maps.InfoWindow();
        function buildPopupDisplayer(text) {
            return function(event) {
                // Since this polygon has only one path, we can call getPath() to return the
                // MVCArray of LatLngs.

                const polygon = this;
                const vertices = polygon.getPath();
                const contentString = text;
                // Replace the info window's content and position.
                infoWindow.setContent(contentString);
                infoWindow.setPosition(event.latLng);
                infoWindow.open(map);
            }
        }

        function popupText(poly) {
            const name = (poly['name'] || "").trim()
            const desc = (poly['description'] || "").trim()
            return (name + " " + desc).trim()
        }

        function buildToggle(added, map, toggeText, allButtons) {
            const toggleButton = document.createElement("button");
            toggleButton.textContent = toggeText;
            toggleButton.classList.add("custom-map-control-button");

            let shown = false;
            toggleButton.show = () => {
                if (!shown) {
                    toggleButton.classList.add("active");
                    toggleButton.style.color = "blue";
                    added.forEach(layer => layer.setMap(map));
                    shown = true;
                }
            };
            toggleButton.hide = () => {
                if (shown) {
                    toggleButton.classList.remove("active");
                    toggleButton.style.color = null;
                    added.forEach(layer => layer.setMap(null));
                    shown = false;
                }
            };
            toggleButton.toggle = () => {
                if (shown) {
                    toggleButton.hide();
                } else {
                    toggleButton.show();
                }
            }

            return toggleButton;
        }

        function buildLayers(polys, map, toggeText) {
            let added = []
            for (var poly of polys) {
                const {
                    styles,
                    geometry
                } = poly;
                const {
                    coordinates
                } = geometry;
                let coords = deepFlatten(coordinates)
                // Some shapes have [lng, lat, 0] for their points....so just filtering out the
                // zeros should work
                coords = coords.filter(x => x!== 0)
                coords = coords.reduce((results, lng, idx) => {
                    if (idx % 2 === 0) {
                        results.push({
                            'lat': coords[idx+1],
                            'lng': lng
                        })
                    }
                    return results
                }, [])

                const p = new google.maps.Polygon({
                    paths: coords,
                    strokeColor: styles['stroke'],
                    strokeOpacity: 0.6, // styles['stroke-opacity'],
                    strokeWeight: styles['stroke-width'],
                    fillColor: styles['fill'],
                    fillOpacity: 0.3, // styles['fill-opacity'],
                });
                p.addListener('click', buildPopupDisplayer(popupText(poly)));
                //p.setMap(map);

                added.push(p);
            }

            return {
                layers: added,
            }
        }

        function compareMetadataValue(itema, itemb) {
            const a = Number(itema['metadata']['value'])
            const b = Number(itemb['metadata']['value'])

            if (a < b) {
                return -1
            } else if (a > b) {
                return 1
            } else {
                return 0;
            }
        }

        // Get the curves from this website
        fetch("https://focus-apis.emsbk.com/productinfo?product=ContourDisplay&sitename=ssy1&action=get_layers").then(
            r => r.json()
        ).then(layers => {
            let by_group_name = groupBy(layers['polygons'], "group_name")

            // Correct the metadata value for the first item in the 2039 N70 data set (it is wrong)
            by_group_name['2039 N70'][0]['metadata']['value'] = "5"

            // Remove the N60 curves...they're not useful
            delete by_group_name['N60 2026']
            delete by_group_name['N60 2033']
            // Use the '2018 ANEI 2' version, it appears to be better
            by_group_name['2018 ANEI'] = by_group_name['2018 ANEI 2']
            delete by_group_name['2018 ANEI 2']

            const buttons = [];

            for (var group_name in by_group_name) {
                layers = by_group_name[group_name]
                layers.sort(compareMetadataValue)
                const group = buildLayers(by_group_name[group_name], map, group_name)
                const toggleButton = buildToggle(group.layers, map, group_name, buttons);
                buttons.push(toggleButton);

                toggleButton.addEventListener("click", () => {
                    toggleButton.toggle();
                    buttons.filter(b => b !== toggleButton).forEach(b => b.hide());
                });
                map.controls[google.maps.ControlPosition.TOP_RIGHT].push(toggleButton);
            }
        })

    };

    function slowTheLoad() {
        const start = (new Date()).getTime();
        const end = start + 1000;
        while ((new Date()).getTime() < end) {}
    }
    //setTimeout(loadNoiseCurvesToMap, 5000);
    window.addEventListener('load', loadNoiseCurvesToMap);
    //window.addEventListener('load', slowTheLoad);
})();
