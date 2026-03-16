import type { ToolDef } from "./types";
import * as attestation from "./attestation";

export const tools: ToolDef[] = [...attestation.definitions];

export async function handleToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  return attestation.execute(name, input);
}
