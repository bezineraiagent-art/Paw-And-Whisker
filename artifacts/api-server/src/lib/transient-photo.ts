// Validate an inline image, use it only for the current AI request, and never persist it.
export function validateTransientPhoto(value?: string): string | undefined {
  if (value === undefined) return undefined;
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 !== 0) throw new Error("Use a JPEG, PNG or WebP photo.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length < 12 || bytes.length > 3_000_000) throw new Error("Please use a smaller photo.");
  const valid = match[1] === "jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : match[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw new Error("That file does not match its image format.");
  return value;
}