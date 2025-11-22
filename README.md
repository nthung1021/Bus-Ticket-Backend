<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Introduction

Our team introduce The Bus Ticket Booking System web application which streamlines the process of purchasing bus tickets online. This app enables passengers to search for routes, compare prices, select seats, and make payments digitally by eliminating the need for physical ticket counters or manual reservations.

This repository is the backend code for this system.

This project is still in development.

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Authentication Architecture

### Access Token + Refresh Token Model

We utilize a dual-token system to balance security and user experience:

1.  **Access Token (Short-lived)**:
    - **Purpose**: Used to authenticate API requests.
    - **Format**: JWT (JSON Web Token).
    - **Lifespan**: Short (e.g., 1 hour).
    - **Storage**: Client-side memory (recommended) or secure cookie.
    - **Benefit**: Minimizes the window of opportunity for an attacker if the token is stolen. Since it's stateless, it doesn't require a database lookup for every request, ensuring high performance.

2.  **Refresh Token (Long-lived)**:
    - **Purpose**: Used _only_ to obtain a new Access Token when the current one expires.
    - **Format**: JWT.
    - **Lifespan**: Long (e.g., 7 days).
    - **Storage**: Secure, HTTP-only cookie (recommended) to prevent XSS attacks.
    - **Benefit**: Allows users to stay logged in without re-entering credentials frequently.

### Why Store Refresh Tokens in the Database?

While JWTs are typically stateless, we persist **Refresh Tokens** in our database (`refresh_tokens` table) for the following critical security reasons:

1.  **Revocation & Control**:
    - If a user's device is lost or stolen, or if we detect suspicious activity, we can simply delete the corresponding refresh token from the database.
    - This immediately prevents the attacker from generating new access tokens, effectively logging them out once their current short-lived access token expires.
    - Stateless refresh tokens cannot be revoked without changing the signing secret (which logs out _everyone_).

2.  **Token Rotation (Reuse Detection)**:
    - We implement **Refresh Token Rotation**. Every time a refresh token is used to get a new access token, a _new_ refresh token is also issued, and the old one is invalidated (deleted).
    - If an attacker steals a refresh token and tries to use it _after_ the legitimate user has already used it (or vice versa), the database lookup will fail.
    - This significantly limits the lifespan and utility of a stolen refresh token.

    - Storing tokens allows us to track active sessions. We can build features like "Sign out of all devices" or show users a list of their active logins.

### Why we chose Access + Refresh Token?

1.  **Scalability vs Sessions**:
    - Traditional server-side sessions require looking up the session in the database/cache for _every single API request_.
    - Access Tokens (JWT) are stateless. The server can verify them mathematically without checking the database. This reduces latency and database load significantly.

2.  **Security vs Single Long-lived JWT**:
    - If we used a single long-lived JWT (e.g., valid for 7 days), stealing it would give an attacker access for 7 days with no easy way to revoke it (unless we blacklist it, which re-introduces database lookups).
    - By using a short-lived Access Token (e.g., 1 hour), if it's stolen, the damage is limited. The Refresh Token is more secure (can be kept in HTTP-only cookies) and because we store it in the DB, we _can_ revoke it if needed.

3.  **Best of Both Worlds**:
    - We get the performance of stateless auth (for most requests).
    - We get the control/revocability of stateful sessions (via the Refresh Token flow).
