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

function mapToObjectArray<K, T>(map: Map<K, T>): T[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return Array.from(map, ([_, value]) => ({ ...value }));
}

async function  fetchSavedReviews (): Promise<SavedReviews> {
    return existsSync(DATA_FILE)
    ? JSON.parse(await readFile(DATA_FILE, "utf8"))
    : {state: null, data: []};
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

      fetchedReviews.set(reviewId, flattenedReview);
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

export async function pollReviews(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Polling reviews...`);
  const { state, data } = await fetchSavedReviews();
  const mapData = new Map<string, Review>(
    data.map((item) => [item.id, { ...item }]),
  );
  let fetchedReviews = new Map<string, Review>();
  let currentPage = (state?.page ?? 0) + 1;

  try {
    let lastPage: number | null = null;
    let isComplete = false;
    let newestDate: string | null = null;

    while (!isComplete) {
      const {
        reviews,
        lastPage: totalPages,
        isCompleted,
      } = await fetchPage({
        page: currentPage,
        country: COUNTRY,
        appId: APP_ID,
        lastUpdatedDate: state?.latestUpdatedDate ?? null,
      });

      if (!lastPage) lastPage = totalPages;

      if (reviews.size === 0) {
        console.log("No new reviews");
        break;
      }

      fetchedReviews = new Map([...fetchedReviews, ...reviews]);

      if (!newestDate && reviews.size > 0) {
        const firstReview = Array.from(reviews.values())[0];
        newestDate = firstReview.date;
      }

      if (state?.isCompleted && isCompleted) {
        await saveReviews({
          state: { latestUpdatedDate: newestDate, isCompleted },
          data: [
            ...mapToObjectArray(fetchedReviews),
            ...mapToObjectArray(mapData),
          ],
        });
        console.log(`Saved ${reviews.size} new reviews.`);
        break;
      }
      if (!state?.isCompleted && isCompleted) {
        await saveReviews({
          state: {
            latestUpdatedDate: data[0]?.date || newestDate,
            isCompleted,
          },
          data: [
            ...mapToObjectArray(mapData),
            ...mapToObjectArray(fetchedReviews),
          ],
        });
        console.log(`Saved ${reviews.size} new reviews.`);
        break;
      }
      if (!isCompleted) {
        await saveReviews({
          state: { latestUpdatedDate: null, isCompleted, page: currentPage },
          data: mapToObjectArray(fetchedReviews),
        });
        console.log(`Saved ${reviews.size} new reviews.`);
      }

      if (isCompleted || currentPage >= (lastPage || 0)) {
        isComplete = true;
      } else {
        currentPage++;
      }
    }
  } catch (err) {
    console.error("Error polling reviews:", err);
  }
}
