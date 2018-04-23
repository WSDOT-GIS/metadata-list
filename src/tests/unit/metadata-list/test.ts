/// <reference types="intern" />

import { getMapServiceMetadata } from "../../../index";
const { assert } = intern.getPlugin("chai");
const { registerSuite } = intern.getInterface("object");
import "isomorphic-fetch";

const url =
  "https://data.wsdot.wa.gov/arcgis/rest/services/AirportMapApplication/AirportFacilities/MapServer";

registerSuite("metadata-list", {
  async getMetadataList() {
    const metadata = await getMapServiceMetadata(url);
    assert.isNotNull(metadata);

    if (metadata) {
      for (const dataName in metadata) {
        if (metadata.hasOwnProperty(dataName)) {
          const metadataUrl = metadata[dataName];
          assert.isOk(dataName);
          assert.isOk(metadataUrl);
        }
      }
    }
  }
});
