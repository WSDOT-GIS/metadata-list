import { getMapServiceMetadata, IMetadataDocList } from "@wsdot/metadata-list";

import { getItemData } from "@esri/arcgis-rest-items";

interface IOperationalLayer {
  id: string;
  title: string;
  url: string;
  [key: string]: any;
}

interface IWebMap {
  [key: string]: any;
  operationalLayers: IOperationalLayer[];
}

const defaultMapId = "927b5daaa7f4434db4b312364489544d";

async function getWebMap(mapId: string) {
  const webmap: IWebMap = await getItemData(mapId, {
    httpMethod: "GET"
  });
  return webmap;
}

function createListItem(layer: IOperationalLayer): HTMLLIElement {
  const li = document.createElement("li");
  li.textContent = layer.title;
  const progress = document.createElement("progress");
  li.appendChild(progress);

  getMapServiceMetadata(layer.url).then(
    docList => {
      // TODO: setup the links and remove progress bar.
      progress.remove();
      if (!docList) {
        if (li.parentElement) {
          li.remove();
        }
        return;
      }

      const innnerList = document.createElement("ul");

      for (const datasetName in docList) {
        if (docList.hasOwnProperty(datasetName)) {
          const url = docList[datasetName];
          const innerLI = document.createElement("li");
          const a = document.createElement("a");
          a.href = url;
          a.textContent = datasetName;
          a.target = "_blank";
          innerLI.appendChild(a);
          innnerList.appendChild(innerLI);
        }
      }

      li.appendChild(innnerList);
    },
    error => {
      // TODO: remove progress and add error message info.
      progress.remove();
      li.textContent = "No metadata available";
      console.error(error);
    }
  );

  return li;
}

async function createList() {
  const webmap = await getWebMap(defaultMapId);
  const { operationalLayers } = webmap;
  const frag = document.createDocumentFragment();

  operationalLayers.map(createListItem).forEach(li => {
    frag.appendChild(li);
  });

  const list = document.createElement("ul");
  list.appendChild(frag);

  return list;
}

createList().then(list => {
  document.body.appendChild(list);
});
