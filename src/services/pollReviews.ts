import { Review, ReviewState } from "@/types/types";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const APP_ID: string = process.env.APP_ID || "595068606";
const COUNTRY: string = "us";
const DATA_FILE: string = join(process.cwd(), `data/reviews_${APP_ID}.json`);

interface SavedReviews {
  state: ReviewState | null;
  data: Review[];
}

interface FetchPageParams {
  page: number;
  country: string;
  appId: string;
  lastUpdatedDate: string | null;
  fetchedPreviousReviews: Map<string, Review>;
}

interface FetchPageResult {
  reviews: Map<string, Review>;
  lastPage: number | null;
  isCompleted: boolean;
}

interface ITunesReviewEntry {
  id?: {
    label: string;
  };
  author?: {
    name?: {
      label: string;
    };
  };
  title?: {
    label: string;
  };
  content?: {
    label: string;
  };
  "im:rating"?: {
    label: string;
  };
  updated?: {
    label: string;
  };
}

interface ITunesResponse {
  feed: {
    link?: Array<{
      attributes?: {
        rel: string;
        href: string;
      };
    }>;
    entry?: ITunesReviewEntry[];
  };
}

interface Link {
  attributes?: {
    rel: string;
    href: string;
  };
}

interface SaveIntermediateResultsParams {
  isCompleted: boolean;
  currentPage: number;
  fetchedReviews: Map<string, Review>;
  reviews: Map<string, Review>;
}

interface SaveCompleteReviewsParams {
  state: ReviewState | null;
  fetchedReviews: Map<string, Review>;
  newestDate: string | null;
  mapData: Map<string, Review>;
  data: Review[];
}

function mapToObjectArray<K, T>(map: Map<K, T>): T[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return Array.from(map, ([_, value]) => ({ ...value }));
}

async function fetchSavedReviews(): Promise<SavedReviews> {
  return existsSync(DATA_FILE)
    ? JSON.parse(await readFile(DATA_FILE, "utf8"))
    : { state: null, data: [] };
}

async function saveReviews(reviews: SavedReviews): Promise<void> {
  await writeFile(DATA_FILE, JSON.stringify(reviews, null, 2));
}

async function extractLastPage(links: Link[]): Promise<number | null> {
  const lastLink = links.find(
    (link) => link.attributes && link.attributes.rel === "last",
  );
  const href = lastLink?.attributes?.href;
  const match = href?.match(/page=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

async function fetchPage({
  page,
  country,
  appId,
  lastUpdatedDate,
  fetchedPreviousReviews,
}: FetchPageParams): Promise<FetchPageResult> {
  const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/sortBy=mostRecent/page=${page}/json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = (await res.json()) as ITunesResponse;
    const totalPages = await extractLastPage(data.feed.link || []);
    const feed = data.feed;
    const reviews = feed?.entry || [];

    if (reviews.length === 0) {
      return { reviews: new Map(), lastPage: totalPages, isCompleted: true };
    }

    const fetchedReviews = new Map<string, Review>();

    for (const r of reviews) {
      const reviewId = r.id?.label || "";
      const updatedDate = r.updated?.label;

      if (
        lastUpdatedDate &&
        updatedDate &&
        new Date(lastUpdatedDate) >= new Date(updatedDate)
      ) {
        return {
          reviews: fetchedReviews,
          lastPage: totalPages,
          isCompleted: true,
        };
      }

      const flattenedReview: Review = {
        id: reviewId,
        author: r.author?.name?.label || "",
        title: r.title?.label || "",
        content: r.content?.label || "",
        rating: r["im:rating"]?.label ? parseInt(r["im:rating"].label) : null,
        date: r.updated?.label || null,
      };
      if (!fetchedPreviousReviews.has(reviewId)) {
        fetchedReviews.set(reviewId, flattenedReview);
      }
    }
    return {
      reviews: fetchedReviews,
      lastPage: totalPages,
      isCompleted: page === totalPages,
    };
  } catch (e) {
    console.error("Error fetching page:", e);
    throw e;
  }
}

function mergeMapsNoOverride<K, V>(
  map1: Map<K, V>,
  map2: Map<K, V>,
): Map<K, V> {
  const result = new Map(map1);

  for (const [key, value] of map2) {
    if (!result.has(key)) {
      result.set(key, value);
    }
  }

  return result;
}

async function saveIntermediateResults({
  isCompleted,
  currentPage,
  fetchedReviews,
  reviews,
}: SaveIntermediateResultsParams): Promise<void> {
  await saveReviews({
    state: { latestUpdatedDate: null, isCompleted, page: currentPage },
    data: mapToObjectArray(fetchedReviews),
  });
  console.log(`Saved ${reviews.size} new reviews.`);
}

async function saveCompleteReviews({
  state,
  fetchedReviews,
  newestDate,
  mapData,
  data,
}: SaveCompleteReviewsParams): Promise<void> {
  if (state?.isCompleted && fetchedReviews.size > 0) {
    await saveReviews({
      state: { latestUpdatedDate: newestDate, isCompleted: true },
      data: [...mapToObjectArray(mergeMapsNoOverride(fetchedReviews, mapData))],
    });
    console.log(`Saved ${fetchedReviews.size} new reviews.`);
  }
  if (!state?.isCompleted && fetchedReviews.size > 0) {
    await saveReviews({
      state: {
        latestUpdatedDate: data[0]?.date || newestDate,
        isCompleted: true,
      },
      data: [...mapToObjectArray(mergeMapsNoOverride(mapData, fetchedReviews))],
    });
    console.log(
      `All reviews processed, file has: ${fetchedReviews.size} reviews.`,
    );
  }
}

export async function pollReviews(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Polling reviews...`);
  const { state, data } = await fetchSavedReviews();
  const mapData = new Map<string, Review>(
    data.map((item) => [item.id, { ...item }]),
  );
  let fetchedReviews = new Map<string, Review>();
  let currentPage = (state?.page ?? 0) + 1;

  try {
    let isComplete = false;
    let newestDate: string | null = null;

    while (!isComplete) {
      const { reviews, lastPage, isCompleted } = await fetchPage({
        page: currentPage,
        country: COUNTRY,
        appId: APP_ID,
        lastUpdatedDate: state?.latestUpdatedDate ?? null,
        fetchedPreviousReviews: fetchedReviews,
      });

      if (reviews.size === 0) {
        console.log("No new reviews");
        break;
      }

      fetchedReviews = new Map([...fetchedReviews, ...reviews]);

      if (!newestDate && reviews.size > 0) {
        const firstReview = Array.from(reviews.values())[0];
        newestDate = firstReview.date;
      }
      if (isCompleted || currentPage >= (lastPage || 0)) {
        isComplete = true;
        break;
      } else {
        currentPage++;
      }
      await saveIntermediateResults({
        isCompleted,
        currentPage,
        fetchedReviews,
        reviews,
      });
    }
    await saveCompleteReviews({
      state,
      fetchedReviews,
      newestDate,
      mapData,
      data,
    });
    console.log(`[${new Date().toISOString()}] Polling reviews end.`);
  } catch (err) {
    console.error("Error polling reviews:", err);
  }
}
