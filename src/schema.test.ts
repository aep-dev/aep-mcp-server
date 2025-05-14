import { BuildListTool, BuildGetTool } from "./schema.js";
import { Resource } from "./common/api/types.js";

describe("BuildListTool", () => {
    it("should create a tool for listing resources", () => {
        const resource: Resource = {
            singular: "example",
            plural: "examples",
            parents: [],
            children: [],
            patternElems: [],
            schema: { properties: {} },
            customMethods: [],
        };
        const tool = BuildListTool(resource, "example");
        expect(tool.name).toBe("list-example");
        expect(tool.description).toBe("List all example resources");
        expect(tool.inputSchema).toEqual({ type: "object", properties: {} });
    });
});

describe("BuildGetTool", () => {
    it("should create a tool for getting a resource", () => {
        const resource: Resource = {
            singular: "example",
            plural: "examples",
            parents: [],
            children: [],
            patternElems: [],
            schema: { properties: {} },
            customMethods: [],
        };
        const tool = BuildGetTool(resource, "example");
        expect(tool.name).toBe("get-example");
        expect(tool.description).toBe("Get details of a specific example");
        expect(tool.inputSchema).toEqual({
            type: "object",
            properties: { path: { type: "string" } },
            required: ["path"],
        });
    });
});
