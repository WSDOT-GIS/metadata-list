import { createList, getWebMap } from "@wsdot/metadata-list";

/**
 * Starts the code for the demo page.
 */
function start() {
  const url = new URL(location.href);
  const { searchParams } = url;
  const mapId = searchParams.get("map");

  const form = document.forms[0];

  if (mapId) {
    // Remove the user input form.
    form.remove();
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
