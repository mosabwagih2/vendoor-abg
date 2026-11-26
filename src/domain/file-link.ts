/** Rules for serving stored files safely. Pure, so they are unit-tested. */

/** The text that is signed for a local file link. The content type is part of it, so a link cannot be edited to serve the same file as HTML. */
export const fileLinkMessage = (key: string, exp: number | string, type: string) => `${key}:${exp}:${type}`;

const INLINE = /^(image\/(png|jpe?g|gif|webp|avif)|audio\/[\w.+-]+|video\/[\w.+-]+|application\/pdf)$/i;
const ATTACHMENT_OK = /^(text\/plain|text\/csv|application\/zip|application\/octet-stream|application\/vnd\.[\w.+-]+|application\/msword)$/i;

/**
 * The content type we are willing to send. Anything that a browser could run (HTML, SVG, XML, JavaScript) or that we do not know
 * becomes a plain download, so an uploaded file can never execute on our origin.
 */
export function servedType(type: string | null | undefined): string {
  const t = (type ?? "").split(";")[0].trim().toLowerCase();
  return INLINE.test(t) || ATTACHMENT_OK.test(t) ? t : "application/octet-stream";
}

/** Images, audio, video and PDFs open in the browser; everything else downloads. */
export const opensInline = (type: string) => INLINE.test(type);
