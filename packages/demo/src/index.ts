import { createList, getWebMap } from "@wsdot/metadata-list";

// interface IOperationalLayer {
//   id: string;
//   title: string;
//   url: string;
//   [key: string]: any;
// }

// interface IWebMap {
//   [key: string]: any;
//   operationalLayers: IOperationalLayer[];
// }

// async function getWebMap(mapId: string) {
//   const webmap: IWebMap = await getItemData(mapId, {
//     httpMethod: "GET"
//   });
//   return webmap;
// }

// /**
//  * Creates a list item that will show metadata links for data
//  * that is displayed by an operational layer.
//  * @param layer An operational layer.
//  */
// function createListItem(layer: IOperationalLayer): HTMLLIElement {
//   const li = document.createElement("li");
//   li.textContent = layer.title;
//   const progress = document.createElement("progress");
//   li.appendChild(progress);

//   getMapServiceMetadata(layer.url).then(
//     docList => {
//       // setup the links and remove progress bar.
//       progress.remove();
//       if (!docList) {
//         const message = document.createElement("p");
//         message.textContent = "No metadata available for this layer";
//         li.appendChild(message);
//         return;
//       }

//       const innnerList = document.createElement("ul");

//       for (const datasetName in docList) {
//         if (docList.hasOwnProperty(datasetName)) {
//           const url = docList[datasetName];
//           const innerLI = document.createElement("li");
//           const a = document.createElement("a");
//           a.href = url;
//           a.textContent = datasetName;
//           a.target = "_blank";
//           innerLI.appendChild(a);
//           innnerList.appendChild(innerLI);
//         }
//       }

//       li.appendChild(innnerList);
//     },
//     error => {
//       // remove progress and add error message info.
//       progress.remove();
//       const textNode = document.createTextNode(
//         error.message || "No metadata available"
//       );
//       li.appendChild(textNode);
//     }
//   );

//   return li;
// }

// /**
//  * Creates a list of all the metadata for the data associated with the operational layers in a web map.
//  * @param webmap A web map
//  */
// function createList(webmap: IWebMap) {
//   const { operationalLayers } = webmap;
//   const frag = document.createDocumentFragment();

//   operationalLayers.map(createListItem).forEach(li => {
//     frag.appendChild(li);
//   });

//   const list = document.createElement("ul");
//   list.appendChild(frag);

//   return list;
// }

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
