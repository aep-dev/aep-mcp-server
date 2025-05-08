import { parseArguments } from "./cli.js";

describe("parseArguments", () => {
    beforeEach(() => {
        jest.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`process.exit called with code ${code}`);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should parse required openapiUrl argument", () => {
        const argv = ["--openapi-url", "http://example.com/openapi.json"];
        const result = parseArguments(argv);
        expect(result.openapiUrl).toBe("http://example.com/openapi.json");
    });

    it("should use default values for optional arguments", () => {
        const argv = ["--openapi-url", "http://example.com/openapi.json"];
        const result = parseArguments(argv);
        expect(result.prefix).toBe("");
        expect(result.headers).toBe("{}");
    });

    it("should parse optional arguments when provided", () => {
        const argv = [
            "--openapiUrl", "http://example.com/openapi.json",
            "--prefix", "/api",
            "--headers", "{\"Authorization\":\"Bearer token\"}"
        ];
        const result = parseArguments(argv);
        expect(result.prefix).toBe("/api");
        expect(result.headers).toBe("{\"Authorization\":\"Bearer token\"}");
    });
});