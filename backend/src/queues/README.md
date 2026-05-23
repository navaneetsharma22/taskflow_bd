# Distributed Queue System (Bull/BullMQ)

## Directory Purpose
The `src/queues/` directory contains configuration pipelines, workers, and publishers for running background jobs outside the HTTP main execution threads:
*   High-volume transactional emails
*   File conversions and document compiling
*   Recurring daily dashboard calculations
*   AI metric calculations and telemetry aggregations

## Recommended Stack
*   **BullMQ** (powered by **Redis**) for extremely fast, reliable distributed queue handling.

## Structure
*   **`connection.js`**: Initializes connection pool to standard Redis database.
*   **`emailQueue.js`**: Queue definitions and consumer workers for scheduling email notifications.
*   **`aiQueue.js`**: Background workers running AI analysis engines asynchronously.
