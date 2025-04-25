import nock from "nock";
import axios from "axios";
import { Client } from "./client.js";
import { Resource } from "../api/types.js";

describe("Client", () => {
  const baseUrl = "http://localhost:8081";
  const client = new Client(axios.create(), {}, () => {}, () => {});

  beforeEach(() => {
    nock.cleanAll();
  });

  describe("create", () => {
    it("should create a resource without user specified ID", async () => {
      const resource: Resource = {
        singular: "book",
        plural: "books",
        parents: [],
        children: [],
        patternElems: ["publishers", "{publisher}", "books", "{book}"],
        schema: {
          type: "object",
          properties: {
            price: { type: "string" }
          }
        },
        createMethod: {
          supportsUserSettableCreate: false
        },
        customMethods: []
      };

      const body = {
        price: "1",
      };

      const parameters = {
        publisher: "my-pub",
      };

      nock(baseUrl)
        .post("/publishers/my-pub/books")
        .reply(200, { path: "/publishers/my-pub/books/1" });

      const result = await client.create(
        {},
        resource,
        baseUrl,
        body,
        parameters
      );
      expect(result.path).toBe("/publishers/my-pub/books/1");
    });

    it("should create a resource with user specified ID", async () => {
      const resource: Resource = {
        singular: "book",
        plural: "books",
        parents: [],
        children: [],
        patternElems: ["publishers", "{publisher}", "books", "{book}"],
        schema: {
          type: "object",
          properties: {
            price: { type: "string" },
            id: { type: "string" }
          }
        },
        createMethod: {
          supportsUserSettableCreate: true
        },
        customMethods: []
      };

      const body = {
        price: "1",
        id: "my-book",
      };

      const parameters = {
        publisher: "my-pub",
      };

      nock(baseUrl)
        .post("/publishers/my-pub/books?id=my-book")
        .reply(200, { path: "/publishers/my-pub/books/my-book" });

      const result = await client.create(
        {},
        resource,
        baseUrl,
        body,
        parameters
      );
      expect(result.path).toBe("/publishers/my-pub/books/my-book");
    });
  });

  describe("get", () => {
    it("should get a resource", async () => {
      nock(baseUrl)
        .get("/publishers/my-pub/books/1")
        .reply(200, { path: "/publishers/my-pub/books/1" });

      const result = await client.get(
        {},
        baseUrl,
        "/publishers/my-pub/books/1"
      );
      expect(result.path).toBe("/publishers/my-pub/books/1");
    });
  });

  describe("delete", () => {
    it("should delete a resource", async () => {
      nock(baseUrl).delete("/publishers/my-pub/books/1").reply(200);

      await expect(
        client.delete({}, baseUrl, "/publishers/my-pub/books/1")
      ).resolves.not.toThrow();
    });
  });

  describe("update", () => {
    it("should update a resource", async () => {
      const body = {
        path: "/publishers/my-pub/books/1",
        price: "2",
      };

      nock(baseUrl)
        .patch("/publishers/my-pub/books/1")
        .reply(200, { path: "/publishers/my-pub/books/1", price: "2" });

      await expect(
        client.update({}, baseUrl, "/publishers/my-pub/books/1", body)
      ).resolves.not.toThrow();
    });
  });

  describe("list", () => {
    it("should list resources", async () => {
      const resource: Resource = {
        singular: "book",
        plural: "books",
        parents: [],
        children: [],
        patternElems: ["publishers", "{publisher}", "books", "{book}"],
        schema: {
          type: "object",
          properties: {
            price: { type: "string" }
          }
        },
        listMethod: {
          hasUnreachableResources: false,
          supportsFilter: false,
          supportsSkip: false
        },
        customMethods: []
      };

      const parameters = {
        publisher: "my-pub",
      };

      nock(baseUrl)
        .get("/publishers/my-pub/books")
        .reply(200, {
          results: [{ path: "/publishers/my-pub/books/1", price: "2" }],
        });

      const result = await client.list({}, resource, baseUrl, parameters);
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("/publishers/my-pub/books/1");
      expect(result[0].price).toBe("2");
    });
  });
});
