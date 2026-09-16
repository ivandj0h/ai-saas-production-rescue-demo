import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import { POST } from "./route";

const createClientMock = vi.mocked(createClient);

function makeRequest(
  body: unknown,
  token?: string
) {
  return new Request("http://localhost/api/generate-reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate-reply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const response = await POST(
      makeRequest({
        ticketId: "ticket-1",
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Unauthorized",
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    createClientMock.mockReturnValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
            },
          },
          error: null,
        }),
      },

      rpc: vi.fn().mockResolvedValue({
        data: false,
        error: null,
      }),
    } as never);

    const response = await POST(
      makeRequest(
        {
          ticketId: "ticket-1",
        },
        "valid-token"
      )
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Too many requests",
    });
  });

  it("returns 400 for an invalid request body", async () => {
    createClientMock.mockReturnValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
            },
          },
          error: null,
        }),
      },

      rpc: vi.fn().mockResolvedValue({
        data: true,
        error: null,
      }),
    } as never);

    const response = await POST(
      makeRequest({}, "valid-token")
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid request",
    });
  });

  it("returns 200 for an authorized request to an accessible ticket", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "ticket-1",
        message: "I need help with my subscription.",
      },
      error: null,
    });

    const userClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
            },
          },
          error: null,
        }),
      },

      rpc: vi.fn().mockResolvedValue({
        data: true,
        error: null,
      }),

      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle,
          }),
        }),
      }),
    };

    const adminClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      }),
    };

    createClientMock
      .mockReturnValueOnce(userClient as never)
      .mockReturnValueOnce(adminClient as never);

    const response = await POST(
      makeRequest(
        {
          ticketId: "ticket-1",
        },
        "valid-token"
      )
    );

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data.summary).toContain(
      "I need help with my subscription."
    );

    expect(data.reply).toContain(
      "Thanks for reaching out."
    );
  });
});
