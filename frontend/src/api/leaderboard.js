import { api } from "./client";
export const leaderboardApi = {
  list: (params = {}) => api.get("/leaderboard", { params }).then((r) => r.data), // {category_id?, limit?}
};
