import { APISchema } from "./types.js";

export interface Resource {
  singular: string;
  plural: string;
  parents: Resource[];
  children: Resource[];
  patternElems: string[];
  schema: APISchema;
  getMethod?: GetMethod;
  listMethod?: ListMethod;
  createMethod?: CreateMethod;
  updateMethod?: UpdateMethod;
  deleteMethod?: DeleteMethod;
  customMethods: CustomMethod[];
}

export interface GetMethod {}

export interface ListMethod {
  hasUnreachableResources: boolean;
  supportsFilter: boolean;
  supportsSkip: boolean;
}

export interface CreateMethod {
  supportsUserSettableCreate: boolean;
}

export interface UpdateMethod {}

export interface DeleteMethod {}

export interface CustomMethod {
  name: string;
  method: string;
  request: APISchema | null;
  response: APISchema | null;
}

export function getPattern(resource: Resource): string {
  return resource.patternElems.join("/");
}

export function collectionName(resource: Resource): string {
  let collectionName = resource.plural;
  if (resource.parents.length > 0) {
    const parent = resource.parents[0].singular;
    if (collectionName.startsWith(parent)) {
      collectionName = collectionName.slice(parent.length + 1);
    }
  }
  return collectionName;
}

export function generatePatternStrings(resource: Resource): string[] {
  // Base pattern without params
  let pattern = `${collectionName(resource)}/{${resource.singular}}`;
  if (resource.parents.length > 0) {
    const parentParts = generatePatternStrings(resource.parents[0]);
    pattern = `${parentParts[0]}/${pattern}`;
  }
  return [pattern];
}
