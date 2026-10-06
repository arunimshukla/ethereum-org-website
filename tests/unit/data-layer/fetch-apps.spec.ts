import { expect, test } from "@playwright/test"
import { retry } from "@trigger.dev/sdk/v3"

import { fetchApps } from "@/data-layer/fetchers/fetchApps"

test("rejects the refresh when one app category cannot be fetched", async () => {
  const originalApiKey = process.env.GOOGLE_API_KEY
  const originalSheetId = process.env.GOOGLE_SHEET_ID_DAPPS
  const originalFetch = retry.fetch

  process.env.GOOGLE_API_KEY = "test-api-key"
  process.env.GOOGLE_SHEET_ID_DAPPS = "test-sheet"

  ;(retry as unknown as { fetch: typeof retry.fetch }).fetch = (async (
    input: string | URL
  ) => {
    const url = input.toString()

    if (url.includes("/spreadsheets/test-sheet?")) {
      return new Response(
        JSON.stringify({
          sheets: [{ properties: { title: "Gaming" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    if (url.includes("/values/App%20of%20the%20day!A2:C")) {
      return new Response(JSON.stringify({ values: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (url.includes("/values/Gaming!A:Z")) {
      return new Response(JSON.stringify({ error: "temporary upstream error" }), {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      })
    }

    throw new Error(`Unexpected URL in test: ${url}`)
  }) as typeof retry.fetch

  try {
    await expect(fetchApps()).rejects.toThrow(
      "Failed to fetch app category Gaming"
    )
  } finally {
    ;(retry as unknown as { fetch: typeof retry.fetch }).fetch = originalFetch

    if (originalApiKey === undefined) delete process.env.GOOGLE_API_KEY
    else process.env.GOOGLE_API_KEY = originalApiKey

    if (originalSheetId === undefined) delete process.env.GOOGLE_SHEET_ID_DAPPS
    else process.env.GOOGLE_SHEET_ID_DAPPS = originalSheetId
  }
})
