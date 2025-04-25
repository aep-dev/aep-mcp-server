import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { Resource } from "../api/types.js";

type RequestLoggingFunction = (ctx: any, req: any, ...args: any[]) => void;
type ResponseLoggingFunction = (ctx: any, resp: any, ...args: any[]) => void;

export class Client {
  private headers: Record<string, string>;
  private client: AxiosInstance;
  private requestLoggingFunction: RequestLoggingFunction;
  private responseLoggingFunction: ResponseLoggingFunction;

  constructor(client: AxiosInstance, headers: Record<string, string>, requestLoggingFunction: RequestLoggingFunction, responseLoggingFunction: ResponseLoggingFunction) {
    this.client = client;
    this.headers = headers;
    this.requestLoggingFunction = requestLoggingFunction;
    this.responseLoggingFunction = responseLoggingFunction;
  }

  async create(
    ctx: any,
    resource: Resource,
    serverUrl: string,
    body: Record<string, any>,
    parameters: Record<string, string>
  ): Promise<Record<string, any>> {
    let suffix = "";
    if (resource.createMethod?.supportsUserSettableCreate) {
      const id = body.id;
      if (!id) {
        throw new Error(`id field not found in ${JSON.stringify(body)}`);
      }
      if (typeof id === "string") {
        suffix = `?id=${id}`;
      }
    }

    const url = this.basePath(ctx, resource, serverUrl, parameters, suffix);
    const response = await this.makeRequest(ctx, "POST", url, body);
    return response;
  }

  async list(
    ctx: any,
    resource: Resource,
    serverUrl: string,
    parameters: Record<string, string>
  ): Promise<Record<string, any>[]> {
    const url = this.basePath(ctx, resource, serverUrl, parameters, "");
    const response = await this.makeRequest(ctx, "GET", url);

    const kebab = this.kebabToCamelCase(resource.plural);
    const lowerKebab =
      kebab.length > 1 ? kebab.charAt(0).toLowerCase() + kebab.slice(1) : "";

    const possibleKeys = ["results", resource.plural, kebab, lowerKebab];

    for (const key of possibleKeys) {
      if (response[key] && Array.isArray(response[key])) {
        return response[key].filter((item: any) => typeof item === "object");
      }
    }

    throw new Error("No valid list key was found");
  }

  async get(
    ctx: any,
    serverUrl: string,
    path: string
  ): Promise<Record<string, any>> {
    const url = `${serverUrl}/${path.replace(/^\//, "")}`;
    return this.makeRequest(ctx, "GET", url);
  }

  async getWithFullUrl(
    ctx: any,
    url: string
  ): Promise<Record<string, any>> {
    return this.makeRequest(ctx, "GET", url);
  }

  async delete(ctx: any, serverUrl: string, path: string): Promise<void> {
    const url = `${serverUrl}/${path.replace(/^\//, "")}`;
    await this.makeRequest(ctx, "DELETE", url);
  }

  async update(
    ctx: any,
    serverUrl: string,
    path: string,
    body: Record<string, any>
  ): Promise<Record<string, any>> {
    const url = `${serverUrl}/${path.replace(/^\//, "")}`;
    return this.makeRequest(ctx, "PATCH", url, body);
  }

  private async makeRequest(
    ctx: any,
    method: string,
    url: string,
    body?: Record<string, any>
  ): Promise<Record<string, any>> {
    if (body) {
      Object.keys(body).forEach(key => {
        if (body[key] === null) {
          delete body[key];
        }
      });
    }
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: this.headers,
      data: body,
    };

    this.requestLoggingFunction(ctx, config);

    try {
      const response = await this.client.request(config);
      this.responseLoggingFunction(ctx, response);

      const data = response.data;
      this.checkErrors(data);
      return data;
    } catch (error: any) {
      if (error.response) {
        this.responseLoggingFunction(ctx, error.response);
        throw new Error(
          `Request failed: ${JSON.stringify(error.response.data)} for request ${JSON.stringify(config)}`
        );
      }
      throw error;
    }
  }

  private checkErrors(response: Record<string, any>): void {
    if (response.error) {
      throw new Error(`Returned errors: ${JSON.stringify(response.error)}`);
    }
  }

  private basePath(
    ctx: any,
    resource: Resource,
    serverUrl: string,
    parameters: Record<string, string>,
    suffix: string
  ): string {
    serverUrl = serverUrl.replace(/\/$/, "");
    const urlElems = [serverUrl];

    for (let i = 0; i < resource.patternElems.length - 1; i++) {
      const elem = resource.patternElems[i];
      if (i % 2 === 0) {
        urlElems.push(elem);
      } else {
        const paramName = elem.slice(1, -1);
        const value = parameters[paramName];
        if (!value) {
          throw new Error(
            `Parameter ${paramName} not found in parameters ${JSON.stringify(
              parameters
            )}`
          );
        }

        const lastValue = value.split("/").pop() || value;
        urlElems.push(lastValue);
      }
    }

    let result = urlElems.join("/");
    if (suffix) {
      result += suffix;
    }
    return result;
  }

  private kebabToCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}
