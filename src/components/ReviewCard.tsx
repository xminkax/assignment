"use client";
import { useState } from "react";
import StarRating from "./StarRating";
import styles from "./ReviewCard.module.css";

interface ReviewCardProps {
  author: string;
  date: string;
  title: string;
  content: string;
  rating: number;
}

const ReviewCard = ({
  author,
  date,
  title,
  content,
  rating,
}: ReviewCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 200;
  const shouldTruncate = content.length > maxLength;
  const displayContent =
    shouldTruncate && !isExpanded
      ? content.slice(0, maxLength) + "..."
      : content;

  const formattedDate = date
    ? new Date(date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "";

  return (
    <article className={styles.card} tabIndex={0}>
      <div>
        <StarRating rating={rating} size="lg" />
        <div className={styles.metadata}>
          <span>{author}</span>
          <span className={styles.reviewSeparator}>,</span>
          <time
            dateTime={date}
            aria-label={formattedDate}
            className="we-customer-review__date"
          >
            {formattedDate}
          </time>
        </div>
      </div>
      <div>
        <h3 className={styles.title}>{title}</h3>
        <blockquote className={styles.content}>
          <p>{displayContent}</p>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={styles.expandButton}
            >
              {isExpanded ? "less" : "more"}
            </button>
          )}
        </blockquote>
      </div>
    </article>
  );
};

export default ReviewCard;
