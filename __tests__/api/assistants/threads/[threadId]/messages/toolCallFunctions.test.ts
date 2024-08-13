import {
  AVAILABILITIES_API_URL,
  search_availability,
} from "@/app/api/assistants/threads/[threadId]/messages/toolCallFunctions";

const setFetchMock = (response: any, ok = true): void => {
  global.fetch = jest.fn().mockImplementation(() => {
    return Promise.resolve({
      ok,
      json: () => response,
    } as Response);
  });
};

describe("toolCallFunctions", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls Mock API to get availabilities", async () => {
    const response = [{ id: 1 }];
    setFetchMock(response);
    const res = await search_availability({ date: new Date().toISOString() });
    expect(res).toEqual(response);
  });

  it("checks correct filters passed to the Mock API", async () => {
    const response = [{ id: 1 }];
    setFetchMock(response);
    const date = new Date().toISOString();
    const params = new URLSearchParams();
    params.set("tags[]", "18");
    params.set("tags[]", "tee1");
    params.set("date", date);
    const url = `${AVAILABILITIES_API_URL}?${params.toString()}`;
    await search_availability({ date });
    expect(fetch).toHaveBeenCalledWith(url);
  });

  it("returns empty array if no data", async () => {
    setFetchMock({}, false);
    const date = new Date().toISOString();
    expect(await search_availability({ date })).toEqual([]);
  });
});
