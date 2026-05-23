# Scheduled Cron Jobs Layer

## Directory Purpose
The `src/cron/` directory holds schedule-driven workflows and cron-job rules running periodically using `node-cron` or `agenda`:
*   Daily billing status verification and auto-invoicing
*   System audit database archiving
*   Daily task reports compilations
*   Free-trial expiry alert checks

## Best Practices
*   Keep cron execution logic inside services (`src/modules/<module>/service.js` or `src/services/<service>.js`).
*   Only declare triggers and cron intervals inside `src/cron/jobs/`.
*   Avoid single-point failures in clustered environments by utilizing database locked-schedulers (like Agenda) rather than basic `node-cron` if running multiple app containers.
