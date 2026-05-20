# falconDB

falconDB is a distributed key-value database project built with Node.js and Express.

## Current Features

- Express server setup
- Configuration loading from `app/etc/configure.json`
- Standard response format
- Winston logging system
- File system based CRUD operations
- `/status` endpoint
- `/stat` endpoint
- `/db/c` create endpoint
- `/db/r` read endpoint
- `/db/u` update endpoint
- `/db/d` delete endpoint

## Tech Stack

- Node.js
- Express.js
- Axios
- Winston
- Forever
- MD5
- File System Storage

## Run

```bash
npm install
npm start

Test Endpoints
GET http://127.0.0.1:3000/status
GET http://127.0.0.1:3000/stat
POST http://127.0.0.1:3000/db/c
GET http://127.0.0.1:3000/db/r?key=mail@test.com
POST http://127.0.0.1:3000/db/u
GET http://127.0.0.1:3000/db/d?key=mail@test.com