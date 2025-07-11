import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());

type Event = { minute: number, team: string, type: string, player: string };
type Match = {
  id: number,
  date: string,
  teams: { home: string, away: string },
  score: { home: number | null, away: number | null },
  events: Event[]
};

const dbFile = path.join(__dirname, 'data', 'matches.json');
let matches: { [key: string]: Match[] } = { yesterday: [], today: [], tomorrow: [] };

// load data
function loadMatches() {
  matches = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
}
loadMatches();

function findMatch(id: number) {
  for (const group of Object.values(matches))
    for (const match of group)
      if (match.id === id) return match;
  return null;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// List matches for a given day - moved to avoid conflict
app.get('/matches/day/:day', (req, res) => {
  const day = req.params.day; // yesterday|today|tomorrow
  const validDays = ['yesterday', 'today', 'tomorrow'];
  
  if (!validDays.includes(day)) {
    return res.status(400).json({ error: "Invalid day. Use: yesterday, today, or tomorrow" });
  }
  
  res.json(matches[day] ?? []);
});

// Event list for a match - moved before general match detail to avoid conflict
app.get('/matches/:id/events', (req, res) => {
  const id = req.params.id;
  
  // Check if it's a number
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }
  
  const match = findMatch(Number(id));
  if (!match) return res.status(404).json({ error: "Match not found" });
  res.json(match.events || []);
});

// Match detail by ID - this should come after the more specific routes
app.get('/matches/:id', (req, res) => {
  const id = req.params.id;
  
  // Check if it's a number
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: "Invalid match ID" });
  }
  
  const match = findMatch(Number(id));
  if (!match) return res.status(404).json({ error: "Match not found" });
  res.json(match);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Local Football API running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET /health - Health check');
  console.log('  GET /matches/day/:day - List matches for yesterday|today|tomorrow');
  console.log('  GET /matches/:id - Get match details by ID');
  console.log('  GET /matches/:id/events - Get match events by ID');
});
