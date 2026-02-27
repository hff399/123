const ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/pdf",
];

const ALLOWED_EXTENSIONS = [".txt", ".md", ".csv", ".pdf"];

const MAX_SIZE = 5 * 1024 * 1024;

export function validateFile(file: File): { valid: boolean; error?: string } {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.includes(file.type);
  const extAllowed = ALLOWED_EXTENSIONS.includes(ext);

  if (!mimeAllowed && !extAllowed) {
    return {
      valid: false,
      error: "File type not supported. Please upload PDF, TXT, MD, or CSV files.",
    };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: "File too large. Maximum size is 5MB." };
  }

  return { valid: true };
}

export async function extractText(file: File): Promise<string> {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  const isPdf = file.type === "application/pdf" || ext === ".pdf";

  if (isPdf) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "";
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ")
      );
    }
    return pages.join("\n\n");
  }

  const textTypes = ["text/plain", "text/markdown", "text/csv"];
  const textExts = [".txt", ".md", ".csv"];

  if (textTypes.includes(file.type) || textExts.includes(ext)) {
    return await file.text();
  }

  throw new Error("Unsupported file type for text extraction.");
}
