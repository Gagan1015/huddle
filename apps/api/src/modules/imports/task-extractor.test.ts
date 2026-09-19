import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import {
  buildExtractionParams,
  createTaskExtractor,
  readExtraction,
  TaskExtractionError,
  type CreateMessage,
  type ExtractionMessage,
  type ExtractionRequest,
} from "./task-extractor.js";

const request: ExtractionRequest = {
  notes: "Priya: we need the pricing copy by Thursday.",
  columns: [
    { id: "col_todo", name: "Upcoming" },
    { id: "col_doing", name: "In progress" },
  ],
  maxTasks: 10,
};

function textMessage(text: string): ExtractionMessage {
  return {
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
  };
}

async function kindOf(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof TaskExtractionError) {
      return error.kind;
    }
    throw error;
  }
  return null;
}

describe("buildExtractionParams", () => {
  it("hands the model every allowed column and the task cap, as structured JSON", () => {
    const params = buildExtractionParams(request, "claude-opus-5");
    const [message] = params.messages;

    expect(params.model).toBe("claude-opus-5");
    expect(params.output_config?.format?.type).toBe("json_schema");
    expect(message?.role).toBe("user");
    expect(message?.content).toContain("- col_todo: Upcoming");
    expect(message?.content).toContain("- col_doing: In progress");
    expect(message?.content).toContain("at most 10 tasks");
    expect(message?.content).toContain(request.notes);
    expect(JSON.stringify(params.output_config?.format?.schema)).toContain(
      "col_doing",
    );
  });

  it("refuses to build a request for a board without columns", () => {
    expect(() =>
      buildExtractionParams({ ...request, columns: [] }, "claude-opus-5"),
    ).toThrow();
  });
});

describe("readExtraction", () => {
  it("returns the parsed JSON from the text block", () => {
    expect(readExtraction(textMessage('{"tasks":[]}'))).toEqual({ tasks: [] });
  });

  it("classifies refusals, truncation, and unreadable output", () => {
    const refused = () =>
      readExtraction({ content: [], stop_reason: "refusal" });
    const truncated = () =>
      readExtraction({
        ...textMessage('{"tasks":[{"title":"Ship'),
        stop_reason: "max_tokens",
      });
    const empty = () =>
      readExtraction({ content: [], stop_reason: "end_turn" });
    const notJson = () => readExtraction(textMessage("Sure! Here you go."));

    expect(refused).toThrow(TaskExtractionError);
    expect(() => refused()).toThrowError(
      expect.objectContaining({ kind: "refused" }),
    );
    expect(() => truncated()).toThrowError(
      expect.objectContaining({ kind: "truncated" }),
    );
    expect(() => empty()).toThrowError(
      expect.objectContaining({ kind: "malformed" }),
    );
    expect(() => notJson()).toThrowError(
      expect.objectContaining({ kind: "malformed" }),
    );
  });
});

describe("createTaskExtractor", () => {
  it("sends the built request and returns the raw JSON", async () => {
    const createMessage = vi.fn<CreateMessage>(async () =>
      textMessage('{"tasks":[]}'),
    );

    const raw = await createTaskExtractor(
      createMessage,
      "claude-opus-5",
    ).extractTasks(request);

    expect(raw).toEqual({ tasks: [] });
    expect(createMessage).toHaveBeenCalledTimes(1);
    expect(createMessage.mock.calls[0]?.[0]?.model).toBe("claude-opus-5");
  });

  it("maps provider errors to safe failure kinds without leaking them", async () => {
    const failing = (error: unknown) =>
      createTaskExtractor(async () => {
        throw error;
      }).extractTasks(request);

    expect(
      await kindOf(() =>
        failing(
          new Anthropic.RateLimitError(
            429,
            undefined,
            "slow down",
            new Headers(),
          ),
        ),
      ),
    ).toBe("rate_limited");
    expect(
      await kindOf(() =>
        failing(
          new Anthropic.AuthenticationError(
            401,
            undefined,
            "bad key",
            new Headers(),
          ),
        ),
      ),
    ).toBe("misconfigured");
    expect(
      await kindOf(() =>
        failing(
          new Anthropic.BadRequestError(
            400,
            undefined,
            "unknown model",
            new Headers(),
          ),
        ),
      ),
    ).toBe("misconfigured");
    expect(
      await kindOf(() =>
        failing(
          new Anthropic.APIConnectionError({ message: "socket hang up" }),
        ),
      ),
    ).toBe("unavailable");
    expect(
      await kindOf(() =>
        failing(
          new Anthropic.InternalServerError(
            500,
            undefined,
            "boom",
            new Headers(),
          ),
        ),
      ),
    ).toBe("unavailable");
    expect(await kindOf(() => failing(new Error("weird")))).toBe("unavailable");
  });
});
