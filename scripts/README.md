# Data Generation Scripts

This directory contains utility scripts for the nod-chat project.

## Generate Test Data

The `generate-data.ts` script seeds Firebase emulators with test users and realistic chat data.

### Prerequisites

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Start Firebase emulators:**

   ```bash
   # From project root
   pnpm emulators
   ```

   Make sure the emulators are running before executing the seed script.

### Usage

**From project root:**

```bash
pnpm seed
```

**From scripts directory:**

```bash
cd scripts
pnpm seed
```

### What Gets Created

- **30 test users** with credentials:
  - Email: `<firstname>@<firstname>.com` (e.g., `alice@alice.com`)
  - Password: `password`
  - Display names: Alice, Bob, Charlie, David, Emma, etc.

- **~18 one-on-one chats** with:
  - 20-50 messages each
  - Random participants
  - Messages spread over 1-7 days

- **~6 group chats** with:
  - 4-8 members each
  - 30-50 messages each
  - Realistic group names
  - Random admin assignments

- **Realistic message content:**
  - Generated using faker library
  - ~20% include images (placeholder URLs)
  - Timestamps distributed naturally over time
  - Varied message lengths and styles

### Test User Accounts

After running the script, you can log in with any of these accounts:

| Name    | Email               | Password |
| ------- | ------------------- | -------- |
| Alice   | alice@alice.com     | password |
| Bob     | bob@bob.com         | password |
| Charlie | charlie@charlie.com | password |
| David   | david@david.com     | password |
| Emma    | emma@emma.com       | password |
| ...     | ...                 | password |

(All 30 users follow the same pattern)

### Customization

Edit `generate-data.ts` to adjust:

- Number of chats and groups
- Message counts
- Image probability
- Time ranges
- User names

### Troubleshooting

**Error: "ECONNREFUSED"**

- Make sure Firebase emulators are running: `pnpm emulators`
- Check that emulator ports match: Auth (9099), Firestore (8080)

**Error: "Email already exists"**

- The emulators may have data from a previous run
- Clear emulator data by restarting: Stop emulators and start again

**Script runs but no data appears**

- Verify you're connected to emulators, not production
- Check the emulator UI at http://localhost:4000
