import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";
import { AssistantStreamEvent } from "openai/resources/beta/assistants";

export const runtime = "nodejs";

async function handleRequiresAction(
  event: AssistantStreamEvent.ThreadRunRequiresAction,
  controller: ReadableStreamDefaultController
) {
  const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
  const toolCallOutputs = await Promise.all(
    toolCalls.map(async (toolCall) => {
      let result = undefined;
      console.log("toolCall", toolCall);
      if (toolCall.function.name === "search_availability") {
        const availabilities = await (
          await fetch(
            "https://66b357b77fba54a5b7ec89d3.mockapi.io/api/v1/availabilities?tags[]=18holes&tags[]=tee1"
          )
        ).json();
        controller.enqueue(
          `${JSON.stringify({
            event: "search_availability",
            data: availabilities,
          })}\n`
        );
        result = availabilities;
      }
      return {
        output: JSON.stringify(result),
        tool_call_id: toolCall.id,
      };
    })
  );

  const submitStream = openai.beta.threads.runs.submitToolOutputsStream(
    event.data.thread_id,
    event.data.id,
    { tool_outputs: toolCallOutputs }
  );
  submitStream.on("event", (event) => {
    console.log("event - function", event.event);
    controller.enqueue(`${JSON.stringify(event)}\n`);
    if (event.event === "thread.run.completed") {
      controller.close();
    }
  });
}

export async function POST(req: Request, { params: { threadId } }) {
  const { content } = await req.json();

  return new Response(
    new ReadableStream({
      async start(controller) {
        await openai.beta.threads.messages.create(threadId, {
          role: "user",
          content: content,
        });
        openai.beta.threads.runs
          .stream(threadId, {
            assistant_id: assistantId,
          })
          .on("event", async (event) => {
            console.log("event - main", event.event);
            if (event.event === "thread.run.requires_action") {
              handleRequiresAction(event, controller);
            } else {
              controller.enqueue(`${JSON.stringify(event)}\n`);
              if (event.event === "thread.run.completed") {
                controller.close();
              }
            }
          })
          .on("error", (error) => {
            console.log("error", error);
          });
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    }
  );
}
