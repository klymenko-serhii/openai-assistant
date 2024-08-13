import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";
import { AssistantStreamEvent } from "openai/resources/beta/assistants";
import * as toolCallFunctions from "./toolCallFunctions";

export const runtime = "nodejs";

async function handleRequiresAction(
  event: AssistantStreamEvent.ThreadRunRequiresAction,
  controller: ReadableStreamDefaultController
) {
  const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
  const toolCallOutputs = await Promise.all(
    toolCalls.map(async (toolCall) => {
      let result = undefined;
      const fn = toolCallFunctions[toolCall.function.name];
      if (fn) {
        // I don't  actually pass them here to show something on UI
        // const toolCallArguments = JSON.parse(toolCall.function.arguments);
        // result = await fn(toolCallArguments);
        result = await fn();
        controller.enqueue(
          `${JSON.stringify({
            event: toolCall.function.name,
            data: result,
          })}\n`
        );
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
