# API (MVP)

Base URL: `http://localhost:3001`

Role header (demo/MVP): `X-Voice-Role: employee | council`

- GET `/api/concerns`
- GET `/api/concerns/:id`
- GET `/api/concerns/similar?title=&description=`
- POST `/api/concerns/precheck`
- POST `/api/concerns`
- PATCH `/api/concerns/:id/state`
- POST `/api/concerns/:id/decline`
- POST `/api/concerns/:id/merge`
- POST `/api/concerns/:id/split`
- POST `/api/concerns/:id/votes`
- GET `/api/concerns/:id/comments`
- POST `/api/concerns/:id/comments`
- GET `/api/activity`
- GET `/api/clusters`
- POST `/api/hr/ask`
- POST `/api/council/agenda`
- POST `/api/council/concerns/:id/resolution-draft`
