import yargs from "yargs";

function parseArguments(args: string[]) {
    return yargs(args)
        .option("openapi-url", {
            type: "string",
            description: "The URL of the OpenAPI specification",
            demandOption: true,
        })
        .option("prefix", {
            type: "string",
            description: "The prefix for API endpoints",
            default: "",
        })
        .option("headers", {
            type: "string",
            description: "Custom headers in JSON format",
            default: "{}",
        })
        .parseSync();
}

export { parseArguments };