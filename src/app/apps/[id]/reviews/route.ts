import { NextResponse } from "next/server";
import reviews from "@/data/reviews.json";

interface RequestParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RequestParams) {
  const { searchParams } = new URL(request.url);
  const hours = searchParams.get("hours");
  // const appId = await params;

  let filteredReviews = [...reviews];

  if (hours) {
    const hoursNum = parseInt(hours, 10);
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursNum);

    filteredReviews = reviews.filter((review) => {
      const reviewDate = new Date(review.date);
      return reviewDate >= cutoffDate;
    });
  }

  return NextResponse.json(filteredReviews);
}
