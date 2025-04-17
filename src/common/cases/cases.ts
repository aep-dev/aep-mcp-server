/**
 * Converts a PascalCase string to kebab-case
 * @param s The string to convert
 * @returns The converted string in kebab-case
 */
export function pascalCaseToKebabCase(s: string): string {
  // A uppercase char is a sign of a delimiter
  // except for acronyms. if it's an acronym, then you delimit
  // on the previous character.
  const delimiterIndices: number[] = [];
  let previousIsUpper = false;
  let isAcronym = false;

  for (let i = 0; i < s.length; i++) {
    const r = s[i];
    if ("A" <= r && r <= "Z") {
      if (previousIsUpper && !isAcronym) {
        isAcronym = true;
        // assuming multiple uppers in sequence is an uppercase character.
        // so there should be a delimiter there.
        delimiterIndices.push(i - 1);
      }
      previousIsUpper = true;
    } else {
      if (previousIsUpper) {
        delimiterIndices.push(i - 1);
      }
      isAcronym = false;
      previousIsUpper = false;
    }
  }

  const parts: string[] = [];
  let prevDelimIndex = 0;

  for (const d of delimiterIndices) {
    if (d !== prevDelimIndex) {
      parts.push(s.slice(prevDelimIndex, d));
      prevDelimIndex = d;
    }
  }

  parts.push(s.slice(prevDelimIndex));
  return parts.join("-").toLowerCase();
}

/**
 * Converts a kebab-case string to camelCase
 * @param s The string to convert
 * @returns The converted string in camelCase
 */
export function kebabToCamelCase(s: string): string {
  const parts = s.split("-");
  return parts
    .map((part, i) => {
      if (i === 0) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

/**
 * Converts a kebab-case string to PascalCase
 * @param s The string to convert
 * @returns The converted string in PascalCase
 */
export function kebabToPascalCase(s: string): string {
  return upperFirst(kebabToCamelCase(s));
}

/**
 * Converts a kebab-case string to snake_case
 * @param s The string to convert
 * @returns The converted string in snake_case
 */
export function kebabToSnakeCase(s: string): string {
  return s.replace(/-/g, "_");
}

/**
 * Converts the first character of a string to uppercase
 * @param s The string to convert
 * @returns The string with first character in uppercase
 */
export function upperFirst(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
