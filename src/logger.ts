import winston from "winston";

export var logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            // logging to stdout will break the mcp server, so
            // use stderr instead (which it a better practice anyway)
            stderrLevels: ["error", "warn", "info"],
            debugStdout: false,
        }),
    ],
});