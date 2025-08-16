export interface Review {
  id: string;
  author: string;
  title: string;
  content: string;
  rating: number | null;
  date: string | null;
}

export interface ReviewState {
  latestUpdatedDate: string | null;
  isCompleted: boolean;
  page?: number;
}
