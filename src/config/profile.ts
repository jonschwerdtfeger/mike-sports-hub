export type League = "mlb" | "nhl" | "nfl" | "college-football";

export type TeamConfig = {
  id: string;
  displayName: string;
  shortName: string;
  league: League;
  sport: "baseball" | "hockey" | "football";
  espnTeamId: string;
  espnAbbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  newsTerms: string[];
};

export const michaelProfile = {
  displayName: "Michael",
  title: "Michael's SportsHub",
  teams: [
    {
      id: "phillies",
      displayName: "Philadelphia Phillies",
      shortName: "Phillies",
      league: "mlb",
      sport: "baseball",
      espnTeamId: "22",
      espnAbbreviation: "phi",
      primaryColor: "#E81828",
      secondaryColor: "#002D72",
      logoUrl: "https://a.espncdn.com/i/teamlogos/mlb/500/phi.png",
      newsTerms: ["Phillies", "Philadelphia Phillies", "MLB"],
    },
    {
      id: "lightning",
      displayName: "Tampa Bay Lightning",
      shortName: "Lightning",
      league: "nhl",
      sport: "hockey",
      espnTeamId: "20",
      espnAbbreviation: "tb",
      primaryColor: "#002868",
      secondaryColor: "#FFFFFF",
      logoUrl: "https://a.espncdn.com/i/teamlogos/nhl/500/tb.png",
      newsTerms: ["Lightning", "Tampa Bay Lightning", "NHL"],
    },
    {
      id: "patriots",
      displayName: "New England Patriots",
      shortName: "Patriots",
      league: "nfl",
      sport: "football",
      espnTeamId: "17",
      espnAbbreviation: "ne",
      primaryColor: "#002244",
      secondaryColor: "#C60C30",
      logoUrl: "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png",
      newsTerms: ["Patriots", "New England Patriots", "NFL"],
    },
    {
      id: "gators-football",
      displayName: "Florida Gators Football",
      shortName: "Gators",
      league: "college-football",
      sport: "football",
      espnTeamId: "57",
      espnAbbreviation: "fla",
      primaryColor: "#0021A5",
      secondaryColor: "#FA4616",
      logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/57.png",
      newsTerms: ["Florida Gators football", "Gators football", "college football"],
    },
  ] satisfies TeamConfig[],
};
