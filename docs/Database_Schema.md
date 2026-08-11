# Database Schema Specification

## Architecture Overview
This application operates on a stateless, client-session architecture as specified in the PRD and Implementation Brief. 

* **Database Engine:** None (N/A)
* **Persistence Layer:** None (Client-side memory and short-lived session state)
* **Storage Requirement:** External assets and temporary generation artifacts are handled directly via Tripo3D API URLs and temporary serverless memory during execution.

No migrations, ORM, or database setup (e.g., Turso/SQLite/Prisma) are required for this project.