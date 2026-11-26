/**
 * One log line per OpenAI call with its token counts, so spend can be traced per call in CloudWatch:
 * filter for "llm.usage". Reasoning tokens are billed as output but never shown, so they're listed apart.
 */
export function logLlmUsage(call, model, json) {
  const u = json?.usage;
  if (!u) return;
  console.log(
    JSON.stringify({
      event: "llm.usage",
      call,
      model: json?.model ?? model,
      input_tokens: u.prompt_tokens ?? 0,
      cached_input_tokens: u.prompt_tokens_details?.cached_tokens ?? 0,
      output_tokens: u.completion_tokens ?? 0,
      reasoning_tokens: u.completion_tokens_details?.reasoning_tokens ?? 0,
    })
  );
}
