# TODO

- [x] Move Claude generation to an API-key-authenticated Node backend; remove browser credentials and direct provider requests. Add password protection, bounded input, request quotas, concurrency limits, and deployment configuration.
- [x] Fix the server's provider destination to Anthropic HTTPS and reject redirects.
- [x] Rate limit API calls (default generation interval is 3100 ms).
- [ ] Before deployment, configure Anthropic workspace spending limits, verify live API key authentication, and rotate any API key previously included in a public build.
- [ ] Before broad public or multi-instance use, replace shared login and in-memory quotas with per-user authentication and durable quotas.
- [ ] Less description for each game run: display outcome after option selection, wait for next API call returns, only show after user clicks "next"
- [ ] Better response structure
do not explicitly state 你精疲力竭，但好奇心和混乱却达到了顶峰
