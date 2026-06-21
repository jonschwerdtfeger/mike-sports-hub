export type ExpectedStarter = {
  playerName: string;
  role: string;
};

export type ExpectedStarterGroup = {
  summaryLabel: "expected starters" | "core players" | "starters";
  confidence: "high" | "medium" | "low";
  players: ExpectedStarter[];
};

// Prototype-configured starter/core lists. Replace with provider or user-managed data later.
export const expectedStarterGroups: Record<string, ExpectedStarterGroup> = {
  phillies: {
    summaryLabel: "expected starters",
    confidence: "medium",
    players: [
      { playerName: "Trea Turner", role: "SS" },
      { playerName: "Kyle Schwarber", role: "DH" },
      { playerName: "Bryce Harper", role: "1B" },
      { playerName: "Alec Bohm", role: "3B" },
      { playerName: "Bryson Stott", role: "2B" },
      { playerName: "J.T. Realmuto", role: "C" },
      { playerName: "Brandon Marsh", role: "OF" },
      { playerName: "Justin Crawford", role: "OF" },
      { playerName: "Gabriel Rincones Jr.", role: "OF" },
    ],
  },
  lightning: {
    summaryLabel: "core players",
    confidence: "medium",
    players: [
      { playerName: "Brayden Point", role: "F" },
      { playerName: "Nikita Kucherov", role: "F" },
      { playerName: "Jake Guentzel", role: "F" },
      { playerName: "Brandon Hagel", role: "F" },
      { playerName: "Anthony Cirelli", role: "F" },
      { playerName: "Yanni Gourde", role: "F" },
      { playerName: "Victor Hedman", role: "D" },
      { playerName: "Ryan McDonagh", role: "D" },
      { playerName: "Erik Cernak", role: "D" },
      { playerName: "J.J. Moser", role: "D" },
      { playerName: "Andrei Vasilevskiy", role: "G" },
    ],
  },
  patriots: {
    summaryLabel: "starters",
    confidence: "medium",
    players: [
      { playerName: "Drake Maye", role: "QB" },
      { playerName: "TreVeyon Henderson", role: "RB" },
      { playerName: "A.J. Brown", role: "WR" },
      { playerName: "Romeo Doubs", role: "WR" },
      { playerName: "DeMario Douglas", role: "WR" },
      { playerName: "Hunter Henry", role: "TE" },
      { playerName: "Will Campbell", role: "OT" },
      { playerName: "Mike Onwenu", role: "G" },
      { playerName: "Ben Brown", role: "C" },
      { playerName: "Alijah Vera-Tucker", role: "G" },
      { playerName: "Morgan Moses", role: "OT" },
      { playerName: "Christian Barmore", role: "DT" },
      { playerName: "Milton Williams", role: "DE" },
      { playerName: "Harold Landry III", role: "LB" },
      { playerName: "Robert Spillane", role: "LB" },
      { playerName: "K.J. Britt", role: "LB" },
      { playerName: "Christian Gonzalez", role: "CB" },
      { playerName: "Carlton Davis III", role: "CB" },
      { playerName: "Kevin Byard", role: "S" },
      { playerName: "Dell Pettus", role: "S" },
      { playerName: "Dre'Mont Jones", role: "DE" },
      { playerName: "Marcus Jones", role: "CB" },
    ],
  },
  "gators-football": {
    summaryLabel: "starters",
    confidence: "medium",
    players: [
      { playerName: "DJ Lagway", role: "QB" },
      { playerName: "Jadan Baugh", role: "RB" },
      { playerName: "Vernell Brown III", role: "WR" },
      { playerName: "Aidan Mizell", role: "WR" },
      { playerName: "Tank Hawkins", role: "WR" },
      { playerName: "Hayden Hansen", role: "TE" },
      { playerName: "Damieon George Jr.", role: "OL" },
      { playerName: "Knijeah Harris", role: "OL" },
      { playerName: "Roderick Kearney", role: "OL" },
      { playerName: "Bryce Lovett", role: "OL" },
      { playerName: "Kamryn Waites", role: "OL" },
      { playerName: "LJ McCray", role: "EDGE" },
      { playerName: "Kamran James", role: "EDGE" },
      { playerName: "Jamari Lyons", role: "DL" },
      { playerName: "Myles Graham", role: "LB" },
      { playerName: "Grayson Howard", role: "LB" },
      { playerName: "Aaron Chiles", role: "LB" },
      { playerName: "Jordan Castell", role: "DB" },
      { playerName: "Sharif Denson", role: "DB" },
      { playerName: "Dijon Johnson", role: "DB" },
      { playerName: "Ben Hanks III", role: "DB" },
      { playerName: "Bryce Thornton", role: "DB" },
    ],
  },
};
