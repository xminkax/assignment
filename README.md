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

### Scenarios handled when polling reviews
Using `/data` folder to save json file in format `reviews_<id>.json` where id is id of the app
- if there is no json file available with reviews, it polls all available reviews until it reaches the last page - taken from the last link attribute 
- if the complete data are polled, it checks based on the date inside the state if new data were added and if it should continue to poll data
- if the server stops while reviews are being polled then the state is saved with the current loaded reviews, for the next resume it continues from the page where it finished. 

### Think about how to support any number of apps, and how this would affect your design.

### Backend 
- when server starts it polls review, it defines also to call them in regular intervals defined via env variable `POLL_INTERVAL` or default 30 minutes
- see `server.ts` and `/src/services/pollReviews.ts` for more info 
- endpoints are defined via nextjs structure inside `/app` folder
- endpoints 
    - http://localhost:3000/apps/595068606/reviews - returns reviews possible to query by hours e.g http://localhost:3000/apps/595068606/reviews?hours=48
    - http://localhost:3000/apps/595068606/sync - it can poll reviews on demand

### Client
- using styled css modules and react    

### TODOs or if I would have more time
- add button to load more reviews or infinite scrolling in case we have too many reviews - in this way the app has server side rendered content on load and then on the client side displayed next reviews as the user scrolls
- I added tests with AI and did a small updates, it actually needs to test different conditions better such as in case no new reviews were added or resume in case during polling server was stopped 