# Take home assignment

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install the app:

```bash
npm run install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Info

### Backend 
When the server starts, it polls reviews and schedules regular polling at intervals defined by the `POLL_INTERVAL` environment variable (default: 30 minutes).
See `server.ts` and `/src/services/pollReviews.ts` for more details.

### Endpoints 
Endpoints are defined following the Next.js structure inside the `/app` folder.
- http://localhost:3000/apps/595068606/reviews - returns reviews, which can be queried by hours, e.g http://localhost:3000/apps/595068606/reviews?hours=48
- http://localhost:3000/apps/595068606/sync - allows polling reviews on demand

### Client
- using css modules and react    

### Scenarios types when polling reviews
The `/data` folder is used to save JSON files in the format `reviews_<id>.json`, where `<id>` is the app ID:
- If no JSON file with reviews exists, it polls all available reviews until it reaches the last page (based on the last link attribute).
- If the complete data has already been polled, it checks the state’s date and the date of the review to determine if new data were added and whether polling should continue.
- If the server stops while reviews are being polled, the current state is saved. When polling resumes, it continues from the page where it left off.

### Brainstorm: how to support any number of apps, and how this would affect your design.
I am generating file that contains also app id so this could stay to have different file per appId. I would think about scaling how to support that if we have too many apps we don't reach rate limits, maybe reviews for different apps could be polled in different intervals, also it could be handled differently based on how many reviews app has etc. For example:
- Poll apps with few seconds delayes between each
- High priority apps poll first
- Split large files
- Maybe some option to enable/disable polling for app
- Taking into account also different regions per app 

### TODOs or if I would have more time
- Add a button to load more reviews or implement infinite scrolling. Right now first amount of reviews is rendered server-side, and then on scroll next reviews would be displayed client side.
- Improve tests. I added only 3 tests with AI and made small updates, but more thorough testing is needed—for example, testing the behavior when no new reviews are added or when polling resumes after a server interruption.