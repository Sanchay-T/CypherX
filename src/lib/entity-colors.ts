/**
 * Entity color mapping system
 * Each entity gets a unique color for highlighting
 */

export const ENTITY_COLORS = [
  { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800", name: "blue" },
  { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800", name: "green" },
  { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800", name: "purple" },
  { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800", name: "orange" },
  { bg: "bg-pink-50 dark:bg-pink-950/30", text: "text-pink-700 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800", name: "pink" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-200 dark:border-cyan-800", name: "cyan" },
  { bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800", name: "yellow" },
  { bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800", name: "indigo" },
];

export const ENTITY_EMOJIS: Record<string, string> = {
  person: "👤",
  company: "🏢",
  business: "🏪",
};

/**
 * Get color for an entity based on its name (deterministic hash)
 */
export function getEntityColor(entityName: string): typeof ENTITY_COLORS[0] {
  // Simple hash function to get consistent color for same entity
  let hash = 0;
  for (let i = 0; i < entityName.length; i++) {
    hash = entityName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ENTITY_COLORS.length;
  return ENTITY_COLORS[index];
}

/**
 * Check if a description contains an entity (case-insensitive, partial match)
 */
export function descriptionContainsEntity(description: string, entityName: string, aliases: string[] = []): boolean {
  const descLower = description.toLowerCase();
  const nameLower = entityName.toLowerCase();

  // Check main name
  if (descLower.includes(nameLower)) {
    return true;
  }

  // Check aliases
  for (const alias of aliases) {
    if (descLower.includes(alias.toLowerCase())) {
      return true;
    }
  }

  return false;
}