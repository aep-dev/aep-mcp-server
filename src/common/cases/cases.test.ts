import {
  pascalCaseToKebabCase,
  kebabToCamelCase,
  kebabToPascalCase,
  kebabToSnakeCase,
  upperFirst,
} from "./cases.js";

describe("Case Conversion Functions", () => {
  describe("pascalCaseToKebabCase", () => {
    it("should convert simple PascalCase to kebab-case", () => {
      expect(pascalCaseToKebabCase("HelloWorld")).toBe("hello-world");
      expect(pascalCaseToKebabCase("FooBar")).toBe("foo-bar");
    });

    it("should handle acronyms correctly", () => {
      expect(pascalCaseToKebabCase("HTTPRequest")).toBe("http-request");
      expect(pascalCaseToKebabCase("XMLHttpRequest")).toBe("xml-http-request");
    });

    it("should handle single word", () => {
      expect(pascalCaseToKebabCase("Hello")).toBe("hello");
    });

    it("should handle empty string", () => {
      expect(pascalCaseToKebabCase("")).toBe("");
    });
  });

  describe("kebabToCamelCase", () => {
    it("should convert kebab-case to camelCase", () => {
      expect(kebabToCamelCase("hello-world")).toBe("helloWorld");
      expect(kebabToCamelCase("foo-bar-baz")).toBe("fooBarBaz");
    });

    it("should handle single word", () => {
      expect(kebabToCamelCase("hello")).toBe("hello");
    });

    it("should handle empty string", () => {
      expect(kebabToCamelCase("")).toBe("");
    });
  });

  describe("kebabToPascalCase", () => {
    it("should convert kebab-case to PascalCase", () => {
      expect(kebabToPascalCase("hello-world")).toBe("HelloWorld");
      expect(kebabToPascalCase("foo-bar-baz")).toBe("FooBarBaz");
    });

    it("should handle single word", () => {
      expect(kebabToPascalCase("hello")).toBe("Hello");
    });

    it("should handle empty string", () => {
      expect(kebabToPascalCase("")).toBe("");
    });
  });

  describe("kebabToSnakeCase", () => {
    it("should convert kebab-case to snake_case", () => {
      expect(kebabToSnakeCase("hello-world")).toBe("hello_world");
      expect(kebabToSnakeCase("foo-bar-baz")).toBe("foo_bar_baz");
    });

    it("should handle single word", () => {
      expect(kebabToSnakeCase("hello")).toBe("hello");
    });

    it("should handle empty string", () => {
      expect(kebabToSnakeCase("")).toBe("");
    });
  });

  describe("upperFirst", () => {
    it("should capitalize first letter", () => {
      expect(upperFirst("hello")).toBe("Hello");
      expect(upperFirst("world")).toBe("World");
    });

    it("should handle single character", () => {
      expect(upperFirst("h")).toBe("H");
    });

    it("should handle empty string", () => {
      expect(upperFirst("")).toBe("");
    });
  });
});
