import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { Review, ReviewState } from "@/types/types";

interface ReviewsData {
  state: ReviewState;
  data: Review[];
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
): Promise<
  NextResponse<
    | Review[]
    | {
        error: string;
      }
  >
> {
  const { searchParams } = new URL(request.url);
  const hours = searchParams.get("hours");

  if (hours && isNaN(parseInt(hours, 10))) {
    return NextResponse.json(
      { error: "Invalid hours parameter" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const filePath = path.join(process.cwd(), "data", `reviews_${id}.json`);

  try {
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: "Reviews not found for this app" },
        { status: 404 },
      );
    }

    const fileContents = await fs.readFile(filePath, "utf8");
    const reviews: ReviewsData = JSON.parse(fileContents);

    let filteredReviews = [...reviews.data];

    if (hours) {
      const hoursNum = parseInt(hours, 10);
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursNum);

      filteredReviews = reviews.data.filter((review: Review) => {
        if (!review.date) {
          return false;
        }
        const reviewDate = new Date(review.date);
        return reviewDate >= cutoffDate;
      });
    }

    return NextResponse.json(filteredReviews, { status: 200 });
  } catch (error) {
    console.log("Failed to load reviews:", error);
    return NextResponse.json(
      { error: "Failed to load reviews" },
      { status: 500 },
    );
  }
}
