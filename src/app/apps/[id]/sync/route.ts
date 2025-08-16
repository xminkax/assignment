import { NextResponse } from "next/server";
import { pollReviews } from "@/services/pollReviews";

type SuccessResponse = {
  message: string;
};

type ErrorResponse = {
  error: string;
};

export async function GET(
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    await pollReviews();
    
    return NextResponse.json({
      message: "Reviews polling completed"
    });
  } catch (error) {
    console.error("Error while polling reviews:", error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}