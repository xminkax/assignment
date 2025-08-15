import ReviewCard from "../components/ReviewCard";
import styles from "./page.module.css";

type Review = {
  id: string;
  author: string;
  title: string;
  content: string;
  rating: number;
  date: string;
};

async function getAppReviews(appId: string): Promise<Review[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/apps/${appId}/reviews?hours=2400`,
    {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch reviews");
  }
  return res.json();
}

export default async function Home() {
  //this would be the id of app coming from the url if we would want to display different reviews based on the app
  const reviews = await getAppReviews("595068606");

  return (
    <main className={styles.container}>
      <div className={styles.reviewsSection}>
        <h2>Customer Reviews</h2>
        <div className={styles.reviewsGrid}>
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              author={review.author}
              date={review.date}
              title={review.title}
              content={review.content}
              rating={review.rating}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
