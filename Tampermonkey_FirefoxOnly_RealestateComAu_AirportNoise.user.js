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

// console.log("Found scripts before execing", document.getElementsByTagName('script'))

const rozelleAnnandaleRegion = [
  [151.16500241778994, -33.88598367740575],
  [151.1580425748445, -33.86445373559793],
  [151.1669337352778, -33.857565769724715],
  [151.18112883567377, -33.86218217561534],
  [151.17713770865961, -33.86834699037345],
  [151.1755498409228, -33.8857563367477]
]

const marrickvilleRegion = [
  [151.15618185067035, -33.89827485774692],
  [151.15952924752094, -33.92477275064235],
  [151.14141897225238, -33.931609579085475],
  [151.1325784113393, -33.92733662561858],
  [151.12940267586566, -33.916866983690475],
  [151.1457907062036, -33.898416029633516]
]

const points = [
  [151.17873425262536, -33.863864533189535],
  [151.16914990203782, -33.87830285037094],
  [151.19270676825948, -33.90329209874698],
  [151.20091365662984, -33.90199803004741],
  [151.17528285537793, -33.893766078005875],
  [151.1931878037185, -33.89810362647135],
  [151.20377196322292, -33.80448901549677],
  [151.2594382383966, -33.79468504001792],
  [151.19695473071815, -33.876359362562106],
  [151.1802210264296, -33.860387644214114]
]

const youAreMe = false

airportNoiseCurveGlobals = {};
(function () {
  'use strict'

  function patchScript (text) {
    return text.replace(/this.map=new google.maps.Map\(Q,this.options.googleDefaults\);/g, 'this.map=new google.maps.Map(Q,this.options.googleDefaults);airportNoiseCurveGlobals.map=this.map;')
  }
  function addScript (text) {
    // Hack in to store "this.map" in the airportNoiseCurveGlobals
    const newScript = document.createElement('script')
    newScript.type = 'text/javascript'
    newScript.textContent = patchScript(text)
    const head = document.getElementsByTagName('head')[0]
    head.appendChild(newScript)
    // document.body.appendChild(newScript);
  }

  window.addEventListener('beforescriptexecute', function (e) {
    const src = e.target.src
    if (src.search(/.*page_findOnMap_new.js.*/) != -1) {
      e.preventDefault()
      e.stopPropagation()
      GM_xmlhttpRequest({
        method: 'GET',
        url: src,
        onload: function (response) {
          console.error('FETCHED IT')
          addScript(response.responseText)
        }
      })
    }
  })

  function loadNoiseCurvesToMap () {
    const map = airportNoiseCurveGlobals.map
    if (!map) {
      console.log('NO MAP...Sorry...perhaps try refreshing?')
      // window.location.reload(true);
      return
    }
    // https://stackoverflow.com/questions/14446511/most-efficient-method-to-groupby-on-an-array-of-objects#38327540
    function groupBy (xs, key) {
      return xs.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x)
        return rv
      }, {})
    }

    function flatten (arr) {
      return [].concat(...arr)
    }

    function deepFlatten (arr) {
      return flatten( // return shalowly flattened array
        arr.map(x => // with each x in array
          Array.isArray(x) // is x an array?
            ? deepFlatten(x) // if yes, return deeply flattened x
            : x // if no, return just x
        )
      )
    }

    const infoWindow = new google.maps.InfoWindow()
    function buildPopupDisplayer (text) {
      return function (event) {
        // Since this polygon has only one path, we can call getPath() to return the
        // MVCArray of LatLngs.

        const polygon = this
        const vertices = polygon.getPath()
        const contentString = text
        // Replace the info window's content and position.
        infoWindow.setContent(contentString)
        infoWindow.setPosition(event.latLng)
        infoWindow.open(map)
      }
    }

    function popupText (poly) {
      const name = (poly.name || '').trim()
      const desc = (poly.description || '').trim()
      return (name + ' ' + desc).trim()
    }

    function buildToggle (added, map, toggeText) {
      const toggleButton = document.createElement('button')
      toggleButton.textContent = toggeText
      toggleButton.classList.add('custom-map-control-button')

      let shown = false
      toggleButton.show = () => {
        if (!shown) {
          toggleButton.classList.add('active')
          toggleButton.style.color = 'blue'
          added.forEach(layer => layer.setMap(map))
          shown = true
        }
      }
      toggleButton.hide = () => {
        if (shown) {
          toggleButton.classList.remove('active')
          toggleButton.style.color = null
          added.forEach(layer => layer.setMap(null))
          shown = false
        }
      }
      toggleButton.toggle = () => {
        if (shown) {
          toggleButton.hide()
        } else {
          toggleButton.show()
        }
      }

      return toggleButton
    }

    function buildLayers (polys, map, toggeText) {
      const added = []
      for (const poly of polys) {
        const {
          styles,
          geometry
        } = poly
        const {
          coordinates
        } = geometry
        let coords = deepFlatten(coordinates)
        // Some shapes have [lng, lat, 0] for their points....so just filtering out the
        // zeros should work
        coords = coords.filter(x => x !== 0)
        coords = coords.reduce((results, lng, idx) => {
          if (idx % 2 === 0) {
            results.push({
              lat: coords[idx + 1],
              lng: lng
            })
          }
          return results
        }, [])

        const p = new google.maps.Polygon({
          paths: coords,
          strokeColor: styles.stroke,
          strokeOpacity: 0.6, // styles['stroke-opacity'],
          strokeWeight: styles['stroke-width'],
          fillColor: styles.fill,
          fillOpacity: 0.3 // styles['fill-opacity'],
        })
        p.addListener('click', buildPopupDisplayer(popupText(poly)))
        // p.setMap(map);

        added.push(p)
      }

      return {
        layers: added
      }
    }

    function compareMetadataValue (itema, itemb) {
      const a = Number(itema.metadata.value)
      const b = Number(itemb.metadata.value)

      if (a < b) {
        return -1
      } else if (a > b) {
        return 1
      } else {
        return 0
      }
    }

    // Get the curves from this website
    fetch('https://focus-apis.emsbk.com/productinfo?product=ContourDisplay&sitename=ssy1&action=get_layers').then(
      r => r.json()
    ).then(layers => {
      const by_group_name = groupBy(layers.polygons, 'group_name')

      // Correct the metadata value for the first item in the 2039 N70 data set (it is wrong)
      by_group_name['2039 N70'][0].metadata.value = '5'

      // Remove the N60 curves...they're not useful
      delete by_group_name['N60 2026']
      delete by_group_name['N60 2033']
      // Use the '2018 ANEI 2' version, it appears to be better
      by_group_name['2018 ANEI'] = by_group_name['2018 ANEI 2']
      delete by_group_name['2018 ANEI 2']

      const buttons = []

      for (const group_name in by_group_name) {
        layers = by_group_name[group_name]
        layers.sort(compareMetadataValue)
        const group = buildLayers(by_group_name[group_name], map, group_name)
        const toggleButton = buildToggle(group.layers, map, group_name)
        buttons.push(toggleButton)

        toggleButton.addEventListener('click', () => {
          toggleButton.toggle()
          buttons.filter(b => b !== toggleButton).forEach(b => b.hide())
        })
        map.controls[google.maps.ControlPosition.TOP_RIGHT].push(toggleButton)
      }

      // Configure the click listener.
      map.addListener('click', (mapsMouseEvent) => {
        console.log('clicked @ [', mapsMouseEvent.latLng.lng(), ', ', mapsMouseEvent.latLng.lat(), '],')
      })

      if (youAreMe) {
        const group = buildLayers([marrickvilleRegion, rozelleAnnandaleRegion].map(coordinates => ({
          styles: {
            stroke: 'fuchsia',
            'stroke-width': 1,
            fill: 'fuchsia'
          },
          geometry: { coordinates }
        }), map, 'AOI'))

        const aoiButton = buildToggle(group.layers, map, 'AOI')
        aoiButton.addEventListener('click', () => {
          aoiButton.toggle()
        })
        map.controls[google.maps.ControlPosition.TOP_RIGHT].push(aoiButton)

        const pointMarkers = points.map(pt => {
          return new google.maps.Marker({
            map,
            position: { lng: pt[0], lat: pt[1] }
          })
        })
        const poiButton = buildToggle(pointMarkers, map, 'POI')
        poiButton.addEventListener('click', () => {
          poiButton.toggle()
        })
        map.controls[google.maps.ControlPosition.TOP_RIGHT].push(poiButton)
      }
    })
  }

  // setTimeout(loadNoiseCurvesToMap, 5000);
  window.addEventListener('load', loadNoiseCurvesToMap)
})()
