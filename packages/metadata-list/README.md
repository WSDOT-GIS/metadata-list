metadata-list
=============

Creates an HTML list of links to metadata documents associated with the operational layers in a web map.

This module is for use with map services that have [Layer Metadata SOE] installed and enabled.

Installation
------------

Package can be installed with an npm client (e.g., npm or yarn)

```console
npm add --save @wsdot/metadata-list @esri/arcgis-rest-auth @esri/arcgis-rest-common-types @esri/arcgis-rest-items @esri/arcgis-rest-request
```

or

```console
yarn add @wsdot/metadata-list @esri/arcgis-rest-auth @esri/arcgis-rest-common-types @esri/arcgis-rest-items @esri/arcgis-rest-request
```

Usage
-----

```TypeScript
import { createList, getWebMap } from "@wsdot/metadata-list";

/**
 * Starts the code for the demo page.
 */
function start() {
  // Parse ArcGIS Online webmap ID from "map" search parameter.
  const url = new URL(location.href);
  const { searchParams } = url;
  const mapId = searchParams.get("map");

  if (mapId) {
    // Get operational layers' metadata links and display in a list.
    getWebMap(mapId).then(webmap => {
      if (webmap.operationalLayers && webmap.operationalLayers.length) {
        const list = createList(webmap);
        document.body.appendChild(list);
      } else {
        const p = document.createElement("p");
        p.textContent = "This map does not have any operational layers.";
        document.body.appendChild(p);
      }
    });
  }
}

start();
```

[Layer Metadata SOE]:https://github.com/WSDOT-GIS/LayerMetadataSoe