import { jest } from "@jest/globals";
import { pollReviews } from "./pollReviews";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { Review } from "@/types/types";

// Mock fs and fs/promises
jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe("pollReviews", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it("should fetch and save new reviews", async () => {
    const mockReview: Review = {
      id: "12345",
      author: "Test User",
      title: "Great App",
      content: "This is a test review",
      rating: 5,
      date: "2025-08-16T10:00:00Z",
    };

    // Mock existsSync to return false (no existing file)
    (existsSync as jest.Mock).mockReturnValue(false);

    // Mock fetch to return one review
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          feed: {
            link: [{ attributes: { rel: "last", href: "page=1" } }],
            entry: [
              {
                id: { label: mockReview.id },
                author: { name: { label: mockReview.author } },
                title: { label: mockReview.title },
                content: { label: mockReview.content },
                "im:rating": { label: mockReview.rating?.toString() },
                updated: { label: mockReview.date },
              },
            ],
          },
        }),
    });

    await pollReviews();

    expect(writeFile).toHaveBeenCalledTimes(1);
    const savedData = JSON.parse((writeFile as jest.Mock).mock.calls[0][1]);
    expect(savedData.data).toHaveLength(1);
    expect(savedData.data[0]).toEqual(mockReview);
  });

  it("should handle existing reviews", async () => {
    const existingReview: Review = {
      id: "12345",
      author: "Existing User",
      title: "Old Review",
      content: "This is an existing review",
      rating: 4,
      date: "2025-08-15T10:00:00Z",
    };

    // Mock existsSync to return true
    (existsSync as jest.Mock).mockReturnValue(true);

    // Mock readFile to return existing reviews
    (readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        state: { latestUpdatedDate: existingReview.date, isCompleted: true },
        data: [existingReview],
      }),
    );

    // Mock fetch to return no new reviews
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          feed: {
            link: [],
            entry: [],
          },
        }),
    });

    await pollReviews();

    expect(readFile).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledTimes(0);
  });

  it("should handle API errors", async () => {
    // Mock existsSync to return false
    (existsSync as jest.Mock).mockReturnValue(false);

    // Mock fetch to throw an error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await pollReviews();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error polling reviews:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("should keep only the latest version of a review when same ID exists", async () => {
    const oldReview: Review = {
      id: "12345",
      author: "Test User",
      title: "Old Version",
      content: "This is the old version",
      rating: 4,
      date: "2025-08-15T10:00:00Z",
    };

    const newReview: Review = {
      id: "12345", // Same ID as oldReview
      author: "Test User",
      title: "Updated Version",
      content: "This is the updated version",
      rating: 5,
      date: "2025-08-16T10:00:00Z",
    };

    // Mock existsSync to return true (existing file)
    (existsSync as jest.Mock).mockReturnValue(true);

    // Mock readFile to return the old review
    (readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        state: { latestUpdatedDate: oldReview.date, isCompleted: true },
        data: [oldReview],
      }),
    );

    // Mock fetch to return the new version of the review
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          feed: {
            link: [{ attributes: { rel: "last", href: "page=1" } }],
            entry: [
              {
                id: { label: newReview.id },
                author: { name: { label: newReview.author } },
                title: { label: newReview.title },
                content: { label: newReview.content },
                "im:rating": { label: newReview.rating?.toString() },
                updated: { label: newReview.date },
              },
            ],
          },
        }),
    });

    await pollReviews();

    // Verify that writeFile was called
    expect(writeFile).toHaveBeenCalledTimes(1);

    // Get the data that was written
    const savedData = JSON.parse((writeFile as jest.Mock).mock.calls[0][1]);

    // Verify that only one review exists
    expect(savedData.data).toHaveLength(1);

    // Verify that it's the newer version
    expect(savedData.data[0]).toEqual(newReview);
  });

  it("should resume polling from last state and page when previously stopped", async () => {
    const existingReview: Review = {
      id: "12345",
      author: "Existing User",
      title: "Old Review",
      content: "This is an existing review",
      rating: 4,
      date: "2025-08-15T10:00:00Z",
    };

    const newReview: Review = {
      id: "67890",
      author: "New User",
      title: "New Review",
      content: "This is a new review",
      rating: 5,
      date: "2025-08-16T10:00:00Z",
    };

    // Mock existsSync to return true (file exists)
    (existsSync as jest.Mock).mockReturnValue(true);

    // Mock readFile to return existing reviews with isCompleted: false and page: 2
    (readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        state: {
          latestUpdatedDate: null,
          isCompleted: false,
          page: 2,
        },
        data: [existingReview],
      }),
    );

    // Mock fetch to return new review, simulating page 3
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          feed: {
            link: [{ attributes: { rel: "last", href: "page=3" } }],
            entry: [
              {
                id: { label: newReview.id },
                author: { name: { label: newReview.author } },
                title: { label: newReview.title },
                content: { label: newReview.content },
                "im:rating": { label: newReview.rating?.toString() },
                updated: { label: newReview.date },
              },
            ],
          },
        }),
    });

    await pollReviews();

    // Verify that writeFile was called
    expect(writeFile).toHaveBeenCalledTimes(1);

    // Get the data that was written
    const savedData = JSON.parse((writeFile as jest.Mock).mock.calls[0][1]);

    // Verify that both reviews exist
    expect(savedData.data).toHaveLength(2);
    expect(savedData.data).toContainEqual(existingReview);
    expect(savedData.data).toContainEqual(newReview);

    // Verify that the state is properly updated
    expect(savedData.state.isCompleted).toBe(true);
    expect(savedData.state.latestUpdatedDate).toBe(existingReview.date);

    // Verify that fetch was called with the correct page number (continuing from page 2)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("page=3"),
    );
  });
});
