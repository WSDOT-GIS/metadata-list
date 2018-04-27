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

export function supportsLayerMetadata(msInfo: IMapServiceInfo) {
  return (
    msInfo.supportedExtensions &&
    msInfo.supportedExtensions.includes(layerMetadataCapability)
  );
}

/**
 * Gets the metadata URL for a feature layer.
 * @param url URL for a feature layer. Should end in a digit.
 */
export async function getFeatureLayerMetadata(
  url: string
): Promise<string | null> {
  const layerUrlRe = /^(https?:\/\/.+\/(?:(?:Map)|(?:Feature))Server)\/(\d+)\/?$/;
  const match = url.match(layerUrlRe);
  if (!match) {
    throw new Error("URL could not be parsed.");
  }

  const serviceUrl = match[1];
  const id = parseInt(match[2], 10);

  const mapServiceInfo = await getMapServiceData(serviceUrl);
  const { supportedExtensions } = mapServiceInfo;
  if (!supportsLayerMetadata(mapServiceInfo)) {
    throw new Error("Service does not support LayerMetadata SOE.");
  }

  const validLayersUrl = `${serviceUrl}/exts/${layerMetadataCapability}/validLayers?f=json`;

  const response = await fetch(validLayersUrl);
  const responseJson = (await response.json()) as {
    layerIds: number[];
  };
  const { layerIds } = responseJson;

  if (layerIds.includes(id)) {
    return `${serviceUrl}/exts/${layerMetadataCapability}/metadata/${id}`;
  }
  return null;
}

/**
 * Returns a list of URLs to geodata metadata documents.
 * @param url URL to a map service
 * @returns If the LayerMetadata SOE is supported by the service, a list of metadata links is returned.
 * Otherwise null is returned.
 * @exception {SyntaxError} A syntax error will be thrown if the web reqests do not return JSON as expected.
 * The error message will look something like this example.
 * @example
 * SyntaxError: Unexpected token < in JSON at position 0
 */
export async function getMapServiceMetadata(
  url: string
): Promise<IMetadataDocList | null> {
  const serviceInfo = await getMapServiceData(url);
  if (
    !serviceInfo.supportedExtensions ||
    serviceInfo.supportedExtensions.length === 0 ||
    !serviceInfo.supportedExtensions.includes(layerMetadataCapability)
  ) {
    return null;
  }
  const layerSourcesUrlPart = `exts/${layerMetadataCapability}/layerSources`;
  const layerSourcesUrl = `${url.replace(
    /\/?$/,
    ""
  )}/${layerSourcesUrlPart}?f=json`;
  const response = await fetch(layerSourcesUrl);
  const responseJson = await response.text();

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
      return `${url}/exts/${layerMetadataCapability}/metadata/${id}`;
    }
    return value;
  }

  const output = JSON.parse(responseJson, sourceReviver);
  return output;
}
