export const AVAILABILITIES_API_URL =
  "https://66b357b77fba54a5b7ec89d3.mockapi.io/api/v1/availabilities";

export async function search_availability(options: { date: string }) {
  const params = new URLSearchParams();
  params.set("tags[]", "18");
  params.set("tags[]", "tee1");
  if (options && options.date) {
    params.set("date", options.date);
  }
  const response = await fetch(
    `${AVAILABILITIES_API_URL}?${params.toString()}`
  );

  if (response.ok) {
    return response.json();
  }
  return [];
}
