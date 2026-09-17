import { getResearch } from "@/lib/research";
import { queryDataset } from "@/lib/research/questions";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Send an application/json question." }, { status: 415 });
  }
  // Stream with a byte cap, including when Content-Length is omitted.
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "A question is required." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) {
        await reader.cancel();
        return Response.json({ error: "Question body is too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    const body: unknown = JSON.parse(new TextDecoder().decode(buffer));
    if (!body || typeof body !== "object" || !("question" in body) || typeof body.question !== "string"
      || body.question.trim().length < 2 || body.question.trim().length > 500) {
      return Response.json({ error: "Use a question between 2 and 500 characters." }, { status: 400 });
    }
    return Response.json(queryDataset(await getResearch(), body.question));
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid JSON." }, { status: 400 });
    throw error;
  } finally { reader.releaseLock(); }
}
