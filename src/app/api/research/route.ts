import { getResearch } from "@/lib/research";

export async function GET() {
  return Response.json(await getResearch());
}
