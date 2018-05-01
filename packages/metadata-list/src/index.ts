/**
 * Regular expression.
 * 0. Matched string
 * 1. Capture: Map Service URL
 * 2. Capture: Layer ID integer. Will be undefined if URL contains no such identifier.
 * @example
 * const match = "http://example.com/arcgis/rest/services/folder/servicename/MapServer/0".match(mapServiceRe);
 * if (!match) {
 *  throw new Error("Invalid URL")
 * }
 * const [ wholeUrl, mapServiceUrl, layerIdString ] = match;
 * const layerId = layerIdString ? parseInt(layerIdString, 10) : null;
 */
const mapServiceRe = /^(.+?)(?:\/(\d+))?\/?$/;

export interface IMapServiceInfo {
  [key: string]: any;
  /**
   * A comma separated list of extensions.
   */
  supportedExtensions?: string[];
}

/**
 *
 * @example
 * ```json
 * {
 *  "FaaAirports.DBO.AirportControlPoint": [
 *   0,
 *   1
 *  ],
 *  "FaaAirports.DBO.RunwayCenterline": [
 *   2
 *  ],
 *  "FaaAirports.DBO.AirportRunwaysWSDOT": [
 *   3
 *  ],
 *  "FaaAirports.DBO.RunwayHelipadDesignSurface": [
 *   4,
 *   6,
 *   7,
 *   9
 *  ],
 *  "FaaAirports.DBO.MarkingArea": [
 *   5,
 *   11,
 *   13
 *  ],
 *  "FaaAirports.DBO.RunwaySafetyAreaBoundary": [
 *   8
 *  ],
 *  "FaaAirports.DBO.Building": [
 *   10
 *  ],
 *  "FaaAirports.DBO.AirportBoundary": [
 *   12
 *  ],
 *  "FaaAirports.DBO.Runway": [
 *   14
 *  ],
 *  "FaaAirports.DBO.Apron": [
 *   15
 *  ],
 *  "FaaAirports.DBO.TaxiwayElement": [
 *   16
 *  ],
 *  "FaaAirports.DBO.WaterOperatingArea": [
 *   17
 *  ]
 * }
 * ```
 */
export interface ILayerSources {
  [datasetName: string]: number[];
}

/**
 * An object with dataset names as property names and a metadata URL as values.
 */
export interface IMetadataDocList {
  [datasetName: string]: string;
}

const layerMetadataCapability = "LayerMetadata";

/**
 * Checks to see if the service URL ends with a number which would indicate a feature layer.
 * @param url A service URL
 * @example
 *
 * isSingleLayer("https://example.com/arcgis/myservice/MapServer") // false
 * isSingleLayer("https://example.com/arcgis/myservice/MapServer/0") // true
 * isSingleLayer("https://example.com/arcgis/myservice/MapServer0") // false
 */
export function isSingleLayer(url: string): boolean {
  return /\/\d+\/?$/.test(url);
}

/**
 * Custom JSON parsing.
 * @param key the name of an object's property
 * @param value the value of the property
 */
function reviver(key: string, value: any) {
  const listPropNames = /^(?:(?:keywords)|(?:supported((Extensions)|(ImageFormatTypes)))|(?:capabilities))$/i;
  if (listPropNames.test(key) && typeof value === "string") {
    return value.split(/,\s*/);
  }
  return value;
}

/**
 * Gets map service's data.
 * @param url URL to a map service
 */
export async function getMapServiceData(url: string): Promise<IMapServiceInfo> {
  const response = await fetch(`${url}?f=json`);
  const serviceInfoJson = await response.text();
  const serviceInfo = JSON.parse(serviceInfoJson, reviver);
  return serviceInfo;
}

/**
 * Checks to see if "LayerMetadata" is supported in the map service's
 * supportedExtensions list.
 * @param msInfo JSON data returned from a map service's root
 * @returns {boolean} Returns true if layerMetadata is supported, false otherwise.
 */
export function supportsLayerMetadata(msInfo: IMapServiceInfo): boolean {
  return !!(
    msInfo.supportedExtensions &&
    msInfo.supportedExtensions.includes(layerMetadataCapability)
  );
}

/**
 * Gets a list metadata URLs for all data associated with a service or layer.
 * @param url URL to an ArcGIS service or one of its sublayers.
 */
export async function getMapServiceMetadata(url: string) {
  const match = url.match(mapServiceRe);
  if (!match) {
    throw new Error("Unrecognized URL format.");
  }
  const mapServiceUrl = match[1];
  const layerId = match[2] ? parseInt(match[2], 10) : null;
  const mapServiceData = await getMapServiceData(mapServiceUrl);
  if (!supportsLayerMetadata(mapServiceData)) {
    return null;
  }

  const layerSourcesUrlPart = `exts/${layerMetadataCapability}/layerSources`;
  const layerSourcesUrl = `${url.replace(
    /\/?$/,
    ""
  )}/${layerSourcesUrlPart}?f=json`;
  const response = await fetch(layerSourcesUrl);

  function makeMetadataUrl(serviceUrl: string, id: number) {
    return `${serviceUrl}/exts/${layerMetadataCapability}/metadata/${id}`;
  }

  if (layerId !== null) {
    const metadataLayers: ILayerSources = await response.json();
    const output: IMetadataDocList = {};
    let found: boolean = false;
    for (const dataset in metadataLayers) {
      if (metadataLayers.hasOwnProperty(dataset)) {
        const layerIds = metadataLayers[dataset];
        if (layerIds && layerIds.length && layerIds.includes(layerId)) {
          output[dataset] = makeMetadataUrl(mapServiceUrl, layerId);
          found = true;
          break;
        }
      }
    }
    return found ? output : null;
  }

  /**
   * The response to the URL will be a JSON object. It's properties will be named after dataset names
   * and the value of these properties will be arrays of numbers representing layer IDs of the layers
   * that are based on these datasets. The metadata for all layer IDs in an array will be identical since they
   * point to a common dataset. For each array of layer IDs, this function will instead return the metadata URL
   * for the first layer ID in the list.
   * @param key Property name. In this case, each will be the name of a dataset.
   * @example
   * MyServer.dbo.MyTableName
   * @param value A property value. In this case these should only ever be an array of numbers. Other value types
   * will simply use the default JSON.parse behavior.
   */
  function sourceReviver(key: string, value: any) {
    if (Array.isArray(value) && value.length > 0) {
      const id = value[0];
      return `${mapServiceUrl}/exts/${layerMetadataCapability}/metadata/${id}`;
    }
    return value;
  }

  const txt = await response.text();
  return JSON.parse(txt, sourceReviver) as IMetadataDocList;
}
