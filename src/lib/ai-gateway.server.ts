export const LOVABLE_AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
export const LOVABLE_AI_MODEL = "openai/gpt-6-astra";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function getLovableAiGatewayRunId(request: Request) {
  return request.headers.get(RUN_ID_HEADER);
}

export function createLovableAiGatewayRunIdFetch(initialRunId?: string | null) {
  let runId = initialRunId ?? undefined;

  const runIdFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId) {
      headers.set(RUN_ID_HEADER, runId);
    }

    const response = await fetch(input, { ...init, headers });
    const nextRunId = response.headers.get(RUN_ID_HEADER);
    if (nextRunId) {
      runId = nextRunId;
    }

    return response;
  };

  return {
    fetch: runIdFetch,
    getRunId: () => runId,
  };
}

export function getLovableAiGatewayResponseHeaders(
  runId?: string | null,
  headers?: HeadersInit,
) {
  const responseHeaders = new Headers(headers);
  if (runId) {
    responseHeaders.set(RUN_ID_HEADER, runId);
  }
  return responseHeaders;
}

export function withLovableAiGatewayRunIdHeader(
  response: Response,
  runIdFetch: ReturnType<typeof createLovableAiGatewayRunIdFetch>,
) {
  const headers = new Headers(response.headers);
  const runId = runIdFetch.getRunId();
  if (runId) {
    headers.set(RUN_ID_HEADER, runId);
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}