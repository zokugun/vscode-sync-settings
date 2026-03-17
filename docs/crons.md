Crons
=====

`syncSettings.crons` allows you to schedule the commands `download`, `review` or `upload`.

```jsonc
"syncSettings.crons": {
    "review": "0 * * * *",      // every hour
    "download": "0 9 * * *",    // at 9AM, every day
    "upload": "0 17 * * *"      // at 5PM, every day
}
```

It uses [the cron expression](https://en.wikipedia.org/wiki/Cron) to represent the time to execute the command.

## How to build a cron expression

The cron expression has five fields separated by spaces:

- minute (0-59)
- hour (0-23)
- day of month (1-31)
- month (1-12 or names like Jan-Dec)
- day of week (0-7 or names like Sun-Sat; both 0 and 7 mean Sunday)

You can use the following constructs in each field:

- `*` — any value (wildcard)
- `,` — list of values (e.g. `1,15,30`)
- `-` — range of values (e.g. `9-17`)
- `/` — step values (e.g. `*/15` means every 15 units)

Examples:

- `* * * * *` — every minute
- `0 * * * *` — every hour at XX:00
- `0 9 * * *` — every day at 09:00
- `0 0 1 * *` — on the first day of every month at midnight
- `*/15 9-17 * * 1-5` — every 15 minutes during 09:00–17:59 on weekdays

If you prefer a generator, try one of the following online tools to build and test expressions:

- [CodersTool - Cron Expression Generator](https://www.coderstool.com/cron-expression-generator)
- [Cron Generator](https://cronexpression.online/)
- [CronMaker](http://www.cronmaker.com/)
- [CronForge/CronSmith](https://cronsmith.com/)
