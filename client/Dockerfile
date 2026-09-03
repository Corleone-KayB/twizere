# Dev-mode Dockerfile for the Twizere client.
#
# NOTE (future improvement): this runs the Vite *dev server* inside the
# container rather than doing a production `vite build` served by nginx (or
# similar). That's an intentional, acceptable shortcut for this hackathon
# build — it gives fast HMR during judging/demo — but a real deployment
# should switch to a multi-stage build (`vite build` -> static file server)
# for smaller images, no dev-server overhead, and proper caching headers.

FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
